
/// <reference path="DataStructures.ts" />
/// <reference path="Tools.ts" />

// this class provides some static methods to convert midi files back and forth to github.com/klesun/shmidusic format

class Shmidusicator
{
    static fromMidi(midi: ISmfStructure): IShmidusicStructure
    {
        var academicDivision = midi.division * 4;

        // group events by time, creating chord list

        return {
            staffList: [{
                staffConfig: {
                    numerator: 8, // 4/4. TODO: it's usually present in midi
                    tempo: midi.tempoEventList.map(e => e.tempo)[0] || 120,
                    keySignature: 0, // TODO: it's usually present in midi
                    channelList: Object.keys(midi.instrumentDict).map(channel => 1 && {
                        channelNumber: +channel,
                        instrument: midi.instrumentDict[+channel],
                        volume: 127, // TODO: it's usually present in midi, .../issues/16
                    }),
                },
                chordList: Shmidusicator.collectChords(midi.noteList, academicDivision)
            }]
        };
    }

    /** @TODO: when doing playback, use this instead of StandardMidiFile - it is the solution to the
     * problem that leak pause-chords may be inserted and break indexing */
    static collectChords(notes: Array<ISmfNote>, division: number): Array<ITimedShChord>
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

        var chordList: Array<ITimedShChord> = [];
        var curChord: ITimedShChord = null;

        var getLength = (c: IShmidusicChord) => Math.min.apply(null, c.noteList.map(n => n.length));
        var makePause = (length: number) => 1 && {length: length, channel: 6, tune: 0};
        var makeShnote = (n: ISmfNote) => 1 && {length: fixDuration(n.duration) / division, channel: n.channel, tune: n.tune};

        curChord = {noteList: [makeShnote(notes[0])], timeFraction: notes[0].time / division};
        chordList.push(curChord);

        notes.slice(1).forEach(function(note)
        {
            var shNote: IShNote = makeShnote(note);
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

    /** @return - guessed fraction length of the note */
    static guessLength(floatLength: number): Fraction
    {
        var fr = (n:number,d:number) => new Fraction(n,d);

        var options: Array<Fraction> = [
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
        ].sort((a,b) => b.float() - a.float()); // greater first

        var result = fr(1, 1);

        options.forEach(function(e)
        {
            if (floatLength <= e.float()) {
                result = e;
            }
        });

        return result;
    }
}