/// <reference path="../references.ts" />

// this class provides some static methods to convert midi files back and forth to github.com/klesun/shmidusic format

import * as Ds from "../DataStructures";
import {Tls} from "../utils/Tls";
import {Fraction} from "../utils/Tls";
import {IShChannel} from "../DataStructures";

export default class Shmidusicator
{
    /** @TODO: when doing playback, use this instead of StandardMidiFile - it is the solution to the
     * problem that leak pause-chords may be inserted and break indexing
     * @unused */
    static collectChords(notes: Array<Ds.IMidJsNote>, division: number): Array<Ds.ITimedShChord>
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

    static getLengthOptions(): Array<Fraction>
    {
        var fr = (n:number,d:number) => new Fraction(n,d);

        return [
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
    }

    /** @return - guessed fraction length of the note */
    static guessLength(floatLength: number): Fraction
    {
        var result = new Fraction(1, 1);

        Shmidusicator.getLengthOptions().forEach(function(e)
        {
            if (floatLength <= e.float()) {
                result = e;
            }
        });

        return result;
    }

    static isValidLength(length: number): boolean
    {
        return Shmidusicator.getLengthOptions()
            .some(o => o.float().toFixed(8) === length.toFixed(8));
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

        Tls.range(0, 16).forEach((i: number) => (instrumentDict[i] = instrumentDict[i] || {
            preset: 0,
        }));

        var chordList = staff['chordList'];

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
            },
            misc: {
                noteCount: -100
            }
        };
    };
};