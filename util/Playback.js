
var Util = Util || {};

// This class destiny is to read shmidusic json structure and send events to MIDI.js and PianoLayoutPanel

/** @param piano - PianoLayoutPanel instance */
Util.Playback = function (piano) {

    // TODO: write some script to transform ALL files to new format. It's what i had to do ages ago.

    var tempo = 120;

    var toMillis = function (length) {
        return 1000 * length * tempo / 60; // because 1 / 4 = 1000 ms when tempo is 60
    };

    var toFloat = function (fractionString) {
        return eval(fractionString);
    };

    /** @param noteJs - shmidusic Note external representation
      * @param position - float sum of all previous chords fractions */
    var playNote = function(noteJs, position) {
        // does not work in chromium. due to mp3 and proprietarity i suppose

        // MIDI.js has 240 default tempo...
        MIDI.noteOn(0, noteJs.tune, 127, position * 240 / tempo);
        MIDI.noteOff(0, noteJs.tune, (position + toFloat(noteJs.length) / (noteJs.isTriplet ? 3 : 1)) * 240 / tempo);
        // TODO: write bug report, they don't sound when channel is not 0
    };

    /** @param - json in shmidusic program format */
    var play = function (shmidusicJson) { // TODO: add stop() method

        for (staff of shmidusicJson['SheetMusic']['staffList']) {

            // flat map hujap
            var chordList = [].concat.apply([], staff['tactList'].map(t => t['chordList']));

            var playNext = idx => {
                if (idx < chordList.length) {

                    c = chordList[idx];
                    c['notaList'].forEach(n => playNote(n, 0));
                    piano.repaint(c['notaList']);
                    chordLength = Math.min.apply(null, c['notaList'].map(n => toFloat(n.length) / (n.isTriplet ? 3 : 1)));

                    setTimeout(() => playNext(idx + 1), toMillis(chordLength));
                };
            };

            playNext(0);

            // i'd like to use this approach if (a) they provided api to stop it and (b) they provided addEventListener() for this way to play music
            // as i understand, we may add event listener only when playing a file, cuz elsewhere MIDI.Player just have no properties
//            var curPos = 0.0;
//            chordList.forEach(c => {
//                if (c.notaList.length) {
//                    c['notaList'].forEach(n => playNote(n, curPos));
//                    chordLength = Math.min.apply(null, c['notaList'].map(n => toFloat(n.length) / (n.isTriplet ? 3 : 1)));
//                    curPos += chordLength;
//                }
//            });
        }
    };

    return {
        play: play
    };
};