/// <reference path="../references.ts" />

import * as Ds from "../DataStructures";
import {Tls, IFraction} from "../utils/Tls";
import {Fraction} from "../utils/Tls";
import {IShChannel} from "../DataStructures";
import {IShmidusicChord} from "../DataStructures";
import {ITimedShChord} from "../DataStructures";
import {Adp} from "../Adp";

var roundNoteLength = (v: number) => +v.toFixed(8);

var fr = (n:number,d:number) => Fraction(n,d);
var lengthOptions = [
    // all accepted variations of semibreve: clean | triplet| with dot | with two dots
    fr(1, 1), fr(1, 3), fr(3, 2), fr(7, 4),
    // half
    fr(1, 2), fr(1, 6), fr(3, 4), fr(7, 8),
    // quarter
    fr(1, 4), fr(1, 12), fr(3, 8), fr(7, 16),
    // 1/8 does not have triplet and two dots
    fr(1, 8), fr(1, 24), fr(3, 16), // TODO: apparently needs triplet...
    // 1/16 does not need triplet and dots
    fr(1,16),
    // so does 1/32
    fr(1,32)
].sort((a,b) => b.float() - a.float()); // greater first;

var isValidLength = (length: number) => +length.toFixed(8) === 0 || lengthOptions.some(o => roundNoteLength(o.float()) === roundNoteLength(length));

var findMinSuperPart = (subpart: number) =>
    lengthOptions.filter(o => o.float() <= subpart).slice(-1)[0] || fr(2, 1);

var findMaxSubPart = (superpart: number) =>
    lengthOptions.filter(o => o.float() <= superpart)[0] || fr(0, 1);

// this class provides some static methods to convert midi files back and forth to github.com/klesun/shmidusic format
export default class Shmidusicator
{
    static generalToShmidusic(source: Ds.IGeneralStructure): Ds.IShmidusicStructure
    {
        var timedChords: ITimedShChord[] = JSON.parse(JSON.stringify(source.chordList));
        var pausedChords: IShmidusicChord[] = [];

        var firstChord: IShmidusicChord;
        if (firstChord = timedChords[0]) {
            if (isValidLength(firstChord.timeFraction)) {
                let pause = {tune: 0, channel: 9, length: firstChord.timeFraction};
                pausedChords.push({noteList: [pause]});
            }
        }

        for (var i = 0; i < timedChords.length; ++i) {
            let chord = Adp.Chord(timedChords[i]);
            pausedChords.push(chord.s); // note that we may mutate chord further

            let next: ITimedShChord;
            if (next = timedChords[i + 1]) {
                let requiredLength = next.timeFraction - chord.s.timeFraction;
                let actualLength = chord.getLength();
                if (requiredLength > actualLength) {
                    let pauseLength = requiredLength - actualLength;
                    let eps = 0.001;
                    // if (!isValidLength(actualLength) &&
                    //     !isValidLength(pauseLength)
                    // ) {
                    //     // watched/8_elfenLied.mid
                    //     // watched/8_Bakemonogatari - Sugar sweet nightmare-piano version-.mid
                    //     // maybe more, but since i fixed it i can't see them
                    //     // sometimes MIDI noteOff events are fired shortly before they are supposed to, probably to prevent portamento
                    //     // TODO: if this becomes relevant one day, fix the length of notes not affecting chor length too
                    //     // this is likely possible, the stoccato time is relative to note length in ticks... i believe
                    //     // just fixing it
                    //     chord.setLength(requiredLength);
                    // } else {
                        let pause = {tune: 0, channel: 9, length: pauseLength};
                        pausedChords.push({noteList: [pause]});
                    // }
                } else if (requiredLength < actualLength) {
                    let pause = {tune: 0, channel: 9, length: requiredLength};
                    chord.s.noteList.push(pause);
                }
            }
        }

        var result = {
            staffList: [{
                staffConfig: {
                    tempo: source.config.tempo,
                    loopStart: source.config.loopStart,
                    loopTimes: source.config.loopTimes,
                    tactSize: source.config.tactSize,
                    keySignature: source.config.keySignature,
                    channelList: Tls.mapi(source.config.channels, (c, i) => 1 && {
                        instrument: c.preset,
                        channelNumber: i,
                    }),
                },
                chordList: pausedChords,
            }],
        };

        /** @debug */
        console.log('General to Shmidusic conversion');
        console.log('Input: ', source);
        console.log('Output: ', result);

        var badLengthCount = pausedChords
            .map(Adp.Chord)
            .filter(c => !isValidLength(c.getLength()))
            .length;

        if (badLengthCount > 0) {
            console.log('Failed to detect length of ' + badLengthCount + ' chords');
            var occurrenceCountByLength = pausedChords.reduce((r, chord) => {
                chord.noteList.forEach(n => r[n.length] = (r[n.length] || 0) + 1);
                return r;
            }, <{[l: number]: number}>{});
            console.log(occurrenceCountByLength);
            Shmidusicator.fixChordLengths(pausedChords, source.config.tactSize);
        }

        return result;
    };

    /**
     * touhou songs got some unexplainable mess:
     * some notes start/end slightly earlier/later but their sum always have valid length
     */
    static fixChordLengths(chords: Ds.IShmidusicChord[], tactSize: number): void
    {
        var position = 0;
        for (var i = 0; i < chords.length - 1; ++i) {
            var curr = Adp.Chord(chords[i]);
            var next = Adp.Chord(chords[i + 1]);

            if (!isValidLength(curr.getLength()) && !isValidLength(next.getLength())) {
                var sameTact = (position / tactSize | 0) === ((position + curr.getLength()) / tactSize | 0);
                if (sameTact) {
                    let totalLength = curr.getLength() + next.getLength();
                    if (next.isPause()) {
                        curr.setLength(totalLength);
                        next.setLength(0);
                    } else {
                        var epsilon = 1/32;
                        if (curr.getLength() < epsilon) {
                            next.s.noteList = next.s.noteList.concat(curr.s.noteList.splice(0));
                            next.setLength(totalLength);
                            next.removeRedundantPauses();
                            curr.setLength(0);
                        } else {
                            var subpart = findMaxSubPart(curr.getLength()).float();
                            var superpart = findMinSuperPart(curr.getLength()).float();
                            if (subpart > 0 && curr.getLength() - subpart < epsilon && isValidLength(totalLength - subpart)) {
                                curr.setLength(subpart);
                                next.setLength(totalLength - subpart);
                            } else if (superpart < totalLength
                                    && superpart > curr.getLength()
                                    && superpart - curr.getLength() < epsilon
                                    && isValidLength(totalLength - superpart)
                            ) {
                                curr.setLength(superpart);
                                next.setLength(totalLength - superpart);
                            }
                        }
                    }
                    if (+curr.getLength().toFixed(8) === 0) {
                        chords.splice(i, 1);
                        --i;
                        continue;
                    }
                    if (+next.getLength().toFixed(8) === 0) {
                        chords.splice(i + 1, 1);
                        --i;
                        continue;
                    }
                }
            }

            position += curr.getLength();
        }

        // TODO: fix lengths in whole tact, not just in two note next to each other
    };

    /** @unused */
    static putPauses(notes: Array<Ds.IMidJsNote>, division: number): Array<Ds.IShmidusicChord>
    {
        if (notes.length < 1) {
            return [];
        }

        // two random good songs had duration 47 / 96 and 63 / 384
        // it was probably some workaround in midies, to separate note starts from note ends
        var fixDuration = function(rawDuration: number)
        {
            var midiDivision = division / 4;

            // TODO: it does not handle cases like 1/3 = 0.6666666. do something!
            if (rawDuration * 1000000 % midiDivision === 0 ||
                (rawDuration + 1) * 1000000 % midiDivision !== 0)
            {
                return rawDuration;
            } else {
                return rawDuration + 1;
            }
        };

        var chordList: Array<Ds.ITimedShChord> = [];
        var curChord: Ds.ITimedShChord = null;

        var getLength = (c: Ds.IShmidusicChord) => Math.min.apply(null, c.noteList.map(n => n.length));
        var makePause = (length: number) => 1 && {length: length, channel: 6, tune: 0};
        var makeShnote = (n: Ds.IMidJsNote) => 1 && {length: fixDuration(n.duration) / division, channel: n.channel, tune: n.tune};

        curChord = {noteList: [makeShnote(notes[0])], timeFraction: notes[0].time / division};
        chordList.push(curChord);

        notes.slice(1).forEach(function(note)
        {
            var shNote: Ds.IShNote = makeShnote(note);
            var notePos = note.time / division;

            if (notePos == curChord.timeFraction) {
                curChord.noteList.push(shNote);
            } else {
                var shouldLength = notePos - curChord.timeFraction;
                var isLength = +getLength(curChord);

                if (isLength.toFixed(8) > shouldLength.toFixed(8)) {
                    // adding pause to chord to make it shorter
                    curChord.noteList.push(makePause(shouldLength));
                }

                curChord = {noteList: [shNote], timeFraction: notePos};
                chordList.push(curChord);

                if (isLength.toFixed(8) < shouldLength.toFixed(8)) {

                    var rest = shouldLength - isLength;
                    chordList.push({
                        noteList: [makePause(rest)],
                        timeFraction: notePos + rest
                    });
                }
            }
        });

        return chordList;
    }

    static getLengthOptions(): Array<IFraction>
    {
        return lengthOptions;
    }

    /** @return - guessed fraction length of the note */
    static guessLength(floatLength: number): IFraction
    {
        var lengthByDistance = lengthOptions.reduce((sum, len) => {
            sum[Math.abs(floatLength - len.float())] = len;
            return sum;
        }, <{[d: number]: IFraction}>{});

        return lengthByDistance[Object.keys(lengthByDistance).map(l => +l).sort((a,b) => a - b)[0]];
    }

    static isValidLength(length: number): boolean
    {
        return isValidLength(length);
    }

    /** @param shmidusicJson - json in shmidusic project format */
    static generalizeShmidusic = function (shmidusicJson: Ds.IShmidusicStructure): Ds.IGeneralStructure
    {
        var staff = shmidusicJson['staffList'][0];
        
        var instrumentDict: {[ch: number]: IShChannel} = {};

        (staff.staffConfig.channelList || [])
            .filter(e => e.channelNumber < 16)
            .forEach((e) => (instrumentDict[e.channelNumber] = {
                preset: e.instrument,
            }));

        Tls.range(0, 16).forEach((i: number) => (instrumentDict[i] = instrumentDict[i] || {preset: 0}));

        var chordList: ITimedShChord[] = JSON.parse(JSON.stringify(staff.chordList));

        var timeFraction = 0;

        chordList.forEach(function(c)
        {
            c.timeFraction = timeFraction;
            var chordLength = Math.min.apply(null, c.noteList.map(n => eval(n.length + '')));
            timeFraction += chordLength;
        });

        return {
            chordList: chordList,
            controlEvents: [],
            config: {
                tempo: staff.staffConfig.tempo,
                channels: instrumentDict,
                loopStart: staff.staffConfig.loopStart || 0,
                loopTimes: staff.staffConfig.loopTimes || 0,
                tactSize: staff.staffConfig.tactSize || 1,
                keySignature: staff.staffConfig.keySignature || 0,
            },
            misc: {
                noteCount: -100
            }
        };
    };
};