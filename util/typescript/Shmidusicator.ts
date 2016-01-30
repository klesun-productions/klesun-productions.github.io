
/// <reference path="DataStructures.ts" />

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
                    numerator: 24, // 12/4. TODO: it's usually present in midi
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

    static collectChords(notes: Array<ISmfNote>, division): Array<ITimedShChord>
    {
        if (notes.length < 1) {
            return [];
        }

        var chordList: Array<ITimedShChord> = [];
        var curTime = null;
        var curChord: ITimedShChord = null;

        var getLength = (c: IShmidusicChord) => Math.min.apply(null, c.noteList.map(n => n.length));
        var makePause = (length) => 1 && {length: length, channel: 0, tune: 0};
        var makeShnote = (n: ISmfNote) => 1 && {length: n.duration / division, channel: n.channel, tune: n.tune};

        curChord = {noteList: [makeShnote(notes[0])], timeFraction: notes[0].time / division};
        chordList.push(curChord);

        notes.slice(1).forEach(function(note)
        {
            var shNote = makeShnote(note);
            var notePos = note.time / division;

            if (notePos == curChord.timeFraction) {
                curChord.noteList.push(shNote);
            } else {
                var shouldLength = notePos - curChord.timeFraction;
                var isLength = +getLength(curChord).toFixed(8);

                if (isLength > shouldLength) {
                    // adding pause to chord to make it shorter
                    curChord.noteList.push(makePause(shouldLength));
                }

                curChord = {noteList: [shNote], timeFraction: notePos};
                chordList.push(curChord);

                if (isLength < shouldLength) {
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
}