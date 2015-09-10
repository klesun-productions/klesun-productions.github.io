
var Util = Util || {};

// This class destiny is to read shmidusic json structure and send events to MIDI.js and PianoLayoutPanel

/** @param piano - PianoLayoutPanel instance */
Util.Playback = function (piano, audioCtx) {

    var gainNode = audioCtx.createGain();
    gainNode.connect(audioCtx.destination);

    var tempo = 120;

    var midiOutputList = [];
    /** @debug */
    MIDI_OUTPUT_LIST_HUJ = midiOutputList;

    // TODO: for now calling navigator.requestMIDIAccess() blocks devices for other programs
    // investigate, how to free devices (output.open() ?). we should free them each time playback finished
    // upd.: open() does not help midiana, but it may be her problems. Musescore works alright with input
    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess()
            .then(
                ma => ma.outputs.forEach(o => midiOutputList.push(o)),
                e => console.log("Failed To Access Midi, Even Though Your Browser Has The Method...", e)
            );
    } else {
        console.log('Your browser does not support midi Devices. Pity, you could listen to music on your mega-device if you used chrome =P');
    }

    var tuneToFrequency = function(tune) {

		var shift = tune - 69; // 69 - LA, 440 hz
		var la = 440.0;
		return la * Math.pow(2, shift / 12.0);
    };

    var toMillis = function (length) {
        return 1000 * length * tempo / 60; // because 1 / 4 = 1000 ms when tempo is 60
    };

    var toFloat = function (fractionString) {
        return eval(fractionString);
    };

    var noteThreads = [];
    var stopNote = function (noteThread) {
        if (!noteThread.interrupted) {

            noteThread.oscillator.stop();

            noteThread.interrupted = true;
            var index = noteThreads.indexOf(noteThread);
            noteThreads.splice(index, 1);
        }
    };

    var playNoteOnOscillator = function(noteJs) {

        var oscillator = audioCtx.createOscillator();

        var volume = 0.02;

        // ["sine", "square", "saw", "triangle", "custom"]
        oscillator.type = 'square';
        oscillator.connect(gainNode);
        oscillator.frequency.value = tuneToFrequency(noteJs.tune - -12); // + 12 cuz bases sound very quiet
        gainNode.gain.value = volume;
        oscillator.start(0);

        var duration = toMillis(toFloat(noteJs.length) / (noteJs.isTriplet ? 3 : 1));
        var thread = {oscillator: oscillator, interrupted: false};
        noteThreads.push(thread);
        setTimeout(() => stopNote(thread), duration);
    };

    /** @param noteJs - shmidusic Note external representation
      * @param position - float sum of all previous chords fractions */
    var playNote = function(noteJs) {

        for (var output of midiOutputList) {

            // looks like output undefined for some reason

            var duration = toMillis(toFloat(noteJs.length));

            output.send( [0x90 + noteJs.channel, noteJs.tune, 127] );  // 0x90 = noteOn, 0x7F max velocity
            output.send( [0x80 + noteJs.channel, noteJs.tune, 0x40], window.performance.now() + duration ); // Inlined array creation- note off, middle C,
        }

        playNoteOnOscillator(noteJs);

        // does not work in chromium. due to mp3 and proprietarity i suppose

        //var position = 0; // offset. could be of use if they provided (possibly user-friendly enough) api to stop it

        // MIDI.js has 240 default tempo...
        //MIDI.noteOn(0, noteJs.tune, 127, position * 240 / tempo);
        //MIDI.noteOff(0, noteJs.tune, (position + toFloat(noteJs.length) / (noteJs.isTriplet ? 3 : 1)) * 240 / tempo);
        // TODO: write bug report, they don't sound when channel is not 0
    };

    var playingThreads = [];
    var stop = () => {
        noteThreads.slice().forEach(stopNote);
        playingThreads.forEach(t => t.interrupted = true);
    }

    /** @param - json in shmidusic program format */
    var play = function (shmidusicJson) {

        stop();
        var thread = {interrupted: false};
        playingThreads.push(thread);

        for (staff of shmidusicJson['staffList']) {

            // flat map hujap
            var chordList = ('tactList' in staff) 
					? [].concat.apply([], staff['tactList'].map(t => t['chordList'])) // tactList not needed for logic, but it increases readability of file A LOT
					: staff['chordList'];

            var playNext = idx => {
                if (idx < chordList.length && !thread.interrupted) {

                    var c = chordList[idx];
                    c['notaList'].forEach(n => playNote(n, 0));
                    piano.repaint(c['notaList']);
                    var chordLength = Math.min.apply(null, c['notaList'].map(n => toFloat(n.length) / (n.isTriplet ? 3 : 1)));

                    setTimeout(() => playNext(idx + 1), toMillis(chordLength));
                } else {
                    midiOutputList.forEach(o => o.open());
                    var index = playingThreads.indexOf(thread);
                    playingThreads.splice(index, 1);
                }
            };

            playNext(0);
        }
    };

    return {
        play: play
    };
};
