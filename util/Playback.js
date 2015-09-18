
var Util = Util || {};

// This class destiny is to read shmidusic json structure and send events to MIDI.js and PianoLayoutPanel

/** @param piano - PianoLayoutPanel instance */
Util.Playback = function (piano, audioCtx) {

    var gainNode = audioCtx.createGain();
    gainNode.connect(audioCtx.destination);

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

    var toMillis = (length, tempo) => 1000 * length * 60 / (tempo / 4);  // because 1 / 4 = 1000 ms when tempo is 60

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

    /** @param noteJs - shmidusic Note external representation */
    var playNoteOnOscillator = function(noteJs, tempo) {

        // TODO: firefox got some problems with it, he ignores not play half of notes

        if (noteJs.channel != 9) {
            var oscillator = audioCtx.createOscillator();

            var volume = 0.02;

            // ["sine", "square", "saw", "triangle", "custom"]
            oscillator.type = 'square';
            oscillator.connect(gainNode);
            oscillator.frequency.value = tuneToFrequency(noteJs.tune - -12); // + 12 cuz bases sound very quiet
            gainNode.gain.value = volume;
            oscillator.start(0);

            var duration = toMillis(toFloat(noteJs.length) / (noteJs.isTriplet ? 3 : 1), tempo);
            var thread = {oscillator: oscillator, interrupted: false};
            noteThreads.push(thread);
            setTimeout(() => stopNote(thread), duration);
        } else {
            // TODO: this is drum - think something about this!
        }
    };

    var playNoteOnMudcube = function(noteJs, tempo) {
        // does not work in chromium. due to mp3 and proprietarity i suppose

        var position = 0; // offset. could be of use if they provided api to stop it (possibly they do, but it's not user-friendly enough)

        // MIDI.js has 240 default tempo...
        MIDI.noteOn(0, noteJs.tune, 127, position * 240 / tempo);
        MIDI.noteOff(0, noteJs.tune, (position + toFloat(noteJs.length) / (noteJs.isTriplet ? 3 : 1)) * 240 / tempo);
        // TODO: write bug report, they don't sound when channel is not 0
    };

    var playNoteOnMidiDevice = function(noteJs, tempo) {
		midiOutputList.forEach(output => {

            var duration = toMillis(toFloat(noteJs.length) / (noteJs.isTriplet ? 3 : 1), tempo);

            output.send( [0x90 - -noteJs.channel, noteJs.tune, 127] );  // 0x90 = noteOn, 0x7F max velocity
            //setTimeout(() => output.send([0x80 - -noteJs.channel, noteJs.tune, 0x40]), duration); // Inlined array creation- note off, middle C,
            output.send( [0x80 - -noteJs.channel, noteJs.tune, 0x40], window.performance.now() + duration ); 
        });
    };
    
    /** @param instrumentEntry - dict: {channel: int, instrument: int} */
    var changeInstrumentOnDevice = function (instrumentEntry)
    {
		// 0xC0 - program change
		midiOutputList.forEach(o => o.send([0xC0 - -instrumentEntry.channel, instrumentEntry.instrument]));
	};

    var synths = {
        oscillator: {
            playNote: playNoteOnOscillator,
            stopNote: stopNote
        },
        mudcube: {
            playNote: playNoteOnMudcube,
            stopNote: () => console.log('dunno')
        },
        midiDevice: {
            playNote: playNoteOnMidiDevice,
            stopNote: () => console.log('dunno')
        }
    };
    var synth = 'oscillator';
    var playNote = (noteJs, tempo) => synths[synth].playNote(noteJs, tempo);

    var playingThreads = [];
    var stop = () => {
        noteThreads.slice().forEach(stopNote);
        playingThreads.forEach(t => t.interrupted = true);
    }

    /** @param - json in shmidusic program format */
    var play = function (shmidusicJson) {

        stop();

        for (var staff of shmidusicJson['staffList']) {

            var tempo = staff.staffConfig.tempo;

            // flat map hujap
            var chordList = ('tactList' in staff) 
					? [].concat.apply([], staff['tactList'].map(t => t['chordList'])) // tactList not needed for logic, but it increases readability of file A LOT
					: staff['chordList'];

            var thread = {interrupted: false};
            playingThreads.push(thread);

            var playNext = idx => {
                if (idx < chordList.length && !thread.interrupted) {

                    var c = chordList[idx];
                    c['notaList'].forEach(n => playNote(n, tempo));
                    piano.repaint(c['notaList']);
                    var chordLength = Math.min.apply(null, c['notaList'].map(n => toFloat(n.length) / (n.isTriplet ? 3 : 1)));

                    setTimeout(() => playNext(idx + 1), toMillis(chordLength, tempo));
                } else {
                    midiOutputList.forEach(o => o.open());
                    var index = playingThreads.indexOf(thread);
                    playingThreads.splice(index, 1);
                }
            };

            playNext(0);
        }
    };

    var playStandardMidiFile = function (smf) {

        stop();
        var thread = {interrupted: false};
        playingThreads.push(thread);

		if (synth === 'midiDevice') {
			smf.standard_midi_file.instrumentEventList.filter(i => i.time == 0).forEach(changeInstrumentOnDevice);
		}

		var tempoEntry = smf.standard_midi_file.tempoEventList.filter(t => t.time == 0)[0] || 
				smf.standard_midi_file.tempoEventList[0] || {tempo: 120};
        var tempo = tempoEntry.tempo;
        var division = smf.standard_midi_file.division * 4;

        var chordList = [];
        var curTime = -100;
        var curChord = [-100, -100];

        smf.standard_midi_file.noteList.forEach(note => {
            note.length = note.duration / division; // DIVIDE to tempo!!!
            if (note.time == curTime) {
                curChord.notaList.push(note);
            } else {
                curTime = note.time;
                curChord = {notaList: []};
                chordList.push(curChord);
                curChord.notaList.push(note);
            }
        });

        chordList.forEach(chord => {
            var noteList = chord.notaList;
            var time = noteList[0].time;
            var play = function () {
                if (!thread.interrupted) {
                    piano.repaint(noteList);
                    noteList.forEach(n => playNote(n, tempo));
                } else if (playingThreads.indexOf(thread) > -1) {
                    var index = playingThreads.indexOf(thread);
                    playingThreads.splice(index, 1);
                }
            };

            setTimeout(play, toMillis(time / division, tempo));
        });
    };

    var mudcubeInitialised = false;
    var changeSynth = function(synthName) {
        // TODO: probably should stop playback before chaning synth
        if (synthName in synths) {
            stop();
            if (synthName === 'mudcube' && !mudcubeInitialised) {

                // TODO: forgot to include all lib files here
                //<!-- TODO: think of a better way to play sound with software or dix the bugs (thread leak is obvious even at their web site! mudcu.be) -->
                //
                //<!-- polyfill -->
                //<script src="/libs/MIDI.js/inc/shim/Base64.js" type="text/javascript"></script>
                //<script src="/libs/MIDI.js/inc/shim/Base64binary.js" type="text/javascript"></script>
                //<script src="/libs/MIDI.js/inc/shim/WebAudioAPI.js" type="text/javascript"></script>
                //    <!-- midi.js package -->
                //<script src="/libs/MIDI.js/js/midi/audioDetect.js" type="text/javascript"></script>
                //<script src="/libs/MIDI.js/js/midi/gm.js" type="text/javascript"></script>
                //<script src="/libs/MIDI.js/js/midi/loader.js" type="text/javascript"></script>
                //<script src="/libs/MIDI.js/js/midi/plugin.audiotag.js" type="text/javascript"></script>
                //<script src="/libs/MIDI.js/js/midi/plugin.webaudio.js" type="text/javascript"></script>
                //<script src="/libs/MIDI.js/js/midi/plugin.webmidi.js" type="text/javascript"></script>
                //    <!-- utils -->
                //<script src="/libs/MIDI.js/js/util/dom_request_xhr.js" type="text/javascript"></script>
                //<script src="/libs/MIDI.js/js/util/dom_request_script.js" type="text/javascript"></script>

                MIDI.loadPlugin({
                    soundfontUrl: "/libs/MIDI.js/examples/soundfont/",
                    instrument: "acoustic_grand_piano"
                });
                mudcubeInitialised = true;
            }
            synth = synthName;
        } else {
            alert('No Such Synth!');
        }
    };

    return {
        play: play,
        playStandardMidiFile: playStandardMidiFile,
        changeSynth: changeSynth
    };
};
