
var Util = Util || {};
Util.Synths = Util.Synths || {};

Util.Synths.Oscillator = function () {

    var firstInit = true;
    // on demand
    var gainNode;
    var audioCtx;

    var noteThreads = [];

    var tuneToFrequency = function(tune) {

        var shift = tune - 69; // 69 - LA, 440 hz
        var la = 440.0;
        return la * Math.pow(2, shift / 12.0);
    };

    var toFloat = fractionString => eval(fractionString);
    var toMillis = (length, tempo) => 1000 * length * 60 / (tempo / 4);  // because 1 / 4 = 1000 ms when tempo is 60

    var init = function () {
        if (firstInit) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)()
            gainNode = audioCtx.createGain();
            gainNode.connect(audioCtx.destination);

            firstInit = false;
        }
    };

    var stopNote = function (noteThread) {

        if (!noteThread.interrupted) {

            noteThread.oscillator.stop();

            noteThread.interrupted = true;
            var index = noteThreads.indexOf(noteThread);
            noteThreads.splice(index, 1);
        }
    };

    /** @param noteJs - shmidusic Note external representation */
    var playNote = function(noteJs, tempo) {

        // TODO: firefox got some problems with it, he ignores not play half of notes

        if (noteJs.channel != 9) {
            var oscillator = audioCtx.createOscillator();

            var volume = 0.02;

            // ["sine", "square", "saw", "triangle", "custom"]
            oscillator.type = 'square';
            oscillator.connect(gainNode);
            oscillator.frequency.value = tuneToFrequency(noteJs.tune);
            gainNode.gain.value = volume;
            oscillator.start(0);

            var duration = toMillis(toFloat(noteJs.length) / (noteJs.isTriplet ? 3 : 1), tempo);
            var thread = {oscillator: oscillator, interrupted: false, noteJs: noteJs};
            noteThreads.push(thread);
            setTimeout(() => stopNote(thread), duration);

        } else {
            // TODO: this is drum - think something about this!
        }
    };

    return $.extend(Util.Synths.SynthAdapter(), {
        init: init,
        playNote: playNote,
        consumeConfig: (_, callback) => callback()
    });
};
