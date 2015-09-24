
var Util = Util || {};

// This class destiny is to read shmidusic json structure and send events to MIDI.js and PianoLayoutPanel

/** @param piano - PianoLayoutPanel instance */
Util.Playback = function (piano, $controlCont) {

    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    var gainNode = audioCtx.createGain();
    gainNode.connect(audioCtx.destination);

    var mudcubeInitialised = false;
    var mudcube = null;
    // var DEFAULT_INSTRUMENT = 0;
    // var DEFAULT_INSTRUMENT = 52; // oh, yeah!
    var DEFAULT_INSTRUMENT = 0;

    var midiOutputList = [];

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

    var Control = function ($cont)
    {
        var fileNameHolder = $('<span></span>').html('?');
        $cont.append($('<div></div>').append("File Name: ").append(fileNameHolder));

        var chordIndexHolder = $('<span></span>').html('?');
        var chordCountHolder = $('<span></span>').html('?');
        $cont.append($('<span></span>').append("Chord: ").append(chordIndexHolder).append('/').append(chordCountHolder));

        var noteCountHolder = $('<span></span>').html('?');
        $cont.append($('<span></span>').append("Note Count: ").append(noteCountHolder));

        var tempoHolder = $('<span></span>').html('?');
        $cont.append($('<span></span>').append("Tempo: ").append(tempoHolder));

        var secondsHolder = $('<span style="width: 60px"></span>').html('?');
        var secondsTotalHolder = $('<span style="width: 60px"></span>').html('?');
        $cont.append($('<span></span>').append("Seconds: ").append(secondsHolder).append('/').append(secondsTotalHolder));

        var self;
        return self = {
            setFileName: n => { fileNameHolder.html(n); return self; },
            setChordIndex: n => { chordIndexHolder.html(n); return self; },
            setChordCount: n => { chordCountHolder.html(n); return self; },
            setNoteCount: n => { noteCountHolder.html(n); return self; },
            setTempo: n => { tempoHolder.html(Math.floor(n)); return self; },
            setSeconds: n => { secondsHolder.html('>' + Math.floor(n * 100) / 100); return self; },
            setSecondsTotal: n => { secondsTotalHolder.html(Math.floor(n * 100) / 100); return self; },
        };
    };

    var control = Control($controlCont);

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

            //piano.unhighlight(noteThread.noteJs);
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
            oscillator.frequency.value = tuneToFrequency(noteJs.tune);
            gainNode.gain.value = volume;
            oscillator.start(0);
            //piano.highlight(noteJs);

            var duration = toMillis(toFloat(noteJs.length) / (noteJs.isTriplet ? 3 : 1), tempo);
            var thread = {oscillator: oscillator, interrupted: false, noteJs: noteJs};
            noteThreads.push(thread);
            setTimeout(() => stopNote(thread), duration); // хуйня случается если несколько раз одна нота долбится (league-of-legends.mid)
            // хуйня разрешится когда имплементируешь что когда несколько на одну ноту долбят чтоб не все закрывались, а только одна
        } else {
            // TODO: this is drum - think something about this!
        }
    };

    var playNoteOnMudcube = function(noteJs, tempo) {
        // does not work in chromium. due to mp3 and proprietarity i suppose

        var position = 0;

        mudcube.noteOn(noteJs.channel, noteJs.tune, 127, position);
        var length = toFloat(noteJs.length) / (noteJs.isTriplet ? 3 : 1);
        mudcube.noteOff(noteJs.channel, noteJs.tune, (position + length * 240 / tempo));
        // MIDI.js has 240 default tempo...
    };

    var playNoteOnMidiDevice = function(noteJs, tempo) {
		midiOutputList.forEach(output => {

            var duration = toMillis(toFloat(noteJs.length) / (noteJs.isTriplet ? 3 : 1), tempo);

            output.send( [0x90 - -noteJs.channel, noteJs.tune, 127] );  // 0x90 = noteOn, 0x7F max velocity
            //setTimeout(() => output.send([0x80 - -noteJs.channel, noteJs.tune, 0x40]), duration); // Inlined array creation- note off, middle C,
            output.send( [0x80 - -noteJs.channel, noteJs.tune, 0x40], window.performance.now() + duration ); 
        });
    };

    var pianoOnly = true;

    /** @param instrumentEntries [{channel: int, instrument: int}, ...] */
    var consumeConfigOnMudcube = function (instrumentEntries, callback) {

        // TODO: i don't remember id of real drums... it could be 192, or probably we should send drums with a sepcial message...
        var SYNTH_DRUM = 115; // default drum in mudcube repo... well... probably it could be called a drum...

        if (pianoOnly) {
            instrumentEntries = instrumentEntries.map(e => $.extend({}, e, {instrument: e.channel == 9 ? SYNTH_DRUM : DEFAULT_INSTRUMENT}));
        }
        var instruments = instrumentEntries.length > 0 ? instrumentEntries.map(e =>  e.instrument) : [DEFAULT_INSTRUMENT];

        mudcube.loadPlugin({
            soundfontUrl: "/libs/midi-js-soundfonts/FluidR3_GM/",
            instruments: instruments,
            onsuccess: () => {
                console.log('Successfully retrieved instruments for mudcube!', instruments);
                instrumentEntries.forEach(
                    instrumentEntry => mudcube.programChange(instrumentEntry.channel, instrumentEntry.instrument)
                )
                callback();
            }
        });
    };

    /** @param instrumentEntries [{channel: int, instrument: int}, ...] */
    var consumeConfigOnMidiDevice = function (instrumentEntries, callback) {
        instrumentEntries.forEach(instrumentEntry =>
            midiOutputList.forEach(o => o.send([0xC0 - -instrumentEntry.channel, instrumentEntry.instrument]))
            // 0xC0 - program change
        );
        callback();
    };

    var synths = {
        oscillator: {
            playNote: playNoteOnOscillator,
            stopNote: stopNote,
            consumeConfig: (configJs, callback) => callback()
        },
        mudcube: {
            playNote: playNoteOnMudcube,
            stopNote: () => console.log('dunno'),
            consumeConfig: consumeConfigOnMudcube
        },
        midiDevice: {
            playNote: playNoteOnMidiDevice,
            stopNote: () => console.log('dunno'),
            consumeConfig: consumeConfigOnMidiDevice
        }
    };
    var synth = 'oscillator';
    var playNote = (noteJs, tempo) => {
        synths[synth].playNote(noteJs, tempo);

        var length = toFloat(noteJs.length) / (noteJs.isTriplet ? 3 : 1);
        piano.highlight(noteJs);
        setTimeout(() => piano.unhighlight(noteJs), toMillis(length, tempo));
    };

    var playingThreads = [];
    var stop = () => {
        noteThreads.slice().forEach(stopNote);
        playingThreads.forEach(t => t.interrupted = true);
    }

    /** @param - json in shmidusic program format */
    var play = function (shmidusicJson) {

        stop();

        for (var staff of shmidusicJson['staffList']) {

            var instrumentEntries = (staff.staffConfig.channelList || []).map(c => ({channel: c.channelNumber, instrument: c.instrument}));
            instrumentEntries = instrumentEntries.filter(e => e.channel < 16); // да-да, я лох
            for (var i = 0; i < 16; ++i) {
                if (instrumentEntries.filter(e => e.channel == i).length === 0) {
                    instrumentEntries.push({channel: i, instrument: DEFAULT_INSTRUMENT});
                }
            }

            synths[synth].consumeConfig(instrumentEntries, () => {

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
                        var chordLength = Math.min.apply(null, c['notaList'].map(n => toFloat(n.length) / (n.isTriplet ? 3 : 1)));

                        setTimeout(() => playNext(idx + 1), toMillis(chordLength, tempo));
                    } else {
                        midiOutputList.forEach(o => o.open());
                        var index = playingThreads.indexOf(thread);
                        playingThreads.splice(index, 1);
                    }
                };

                playNext(0);
            });
        }
    };

    var playStandardMidiFile = function (smf, fileName, whenFinished) {

        stop();
        var thread = {interrupted: false};
        playingThreads.push(thread);

        whenFinished = whenFinished || (() => {});

        synths[synth].consumeConfig(smf.instrumentEventList.filter(i => i.time == 0), () => {

            var tempoEntry = smf.tempoEventList.filter(t => t.time == 0)[0] ||
                smf.tempoEventList[0] || {tempo: 120};
            var tempo = tempoEntry.tempo;
            var division = smf.division * 4;

            control
                .setFileName(fileName)
                .setNoteCount(smf.noteList.length)
                .setTempo(tempo)
                .setSecondsTotal(toMillis(smf.noteList.slice(-1)[0].time / division, tempo) / 1000.0)
            ;

            var scheduleChord = function (chord, chordIndex) {
                var noteList = chord.notaList;
                var time = noteList[0].time;
                var play = function () {
                    if (!thread.interrupted) {

                        // piano image lags if do it every time
                        if (chordIndex % 20 === 0) {
                            control.setChordIndex('>' + chordIndex)
                                .setSeconds(toMillis(time / division, tempo) / 1000.0);
                        }

                        noteList.forEach(n => playNote(n, tempo));

                        if (chord.notaList.indexOf(smf.noteList.slice(-1)[0]) > -1) {
                            setTimeout(whenFinished, 2000);
                        }

                    } else if (playingThreads.indexOf(thread) > -1) {

                        var index = playingThreads.indexOf(thread);
                        playingThreads.splice(index, 1);
                    }
                };

                setTimeout(play, toMillis(time / division, tempo));
            };

            var curTime = -100;
            var curChord = [-100, -100];
            var chordCount = 0;

            smf.noteList.forEach(note => {
                note.length = note.duration / division;
                if (note.time == curTime) {
                    curChord.notaList.push(note);
                } else {
                    if (curTime !== -100) { scheduleChord(curChord, chordCount++); }
                    curTime = note.time;
                    curChord = {notaList: [note]};
                }
            });
            scheduleChord(curChord, chordCount++);
            control.setChordCount(chordCount);
        });
    };

    var changeSynth = function(synthName) {
        if (synthName in synths) {
            stop();
            if (synthName === 'mudcube' && !mudcubeInitialised) {

                // i do this ugliness because as you see, there is way too many scripts for such a simple task as just playing a note
                // i plan to change their code a bit and limit it to, let's see... a single script? which, of course is no problem to include from html
                var include = [
                    "/libs/dont_use_it_MIDI.js//inc/shim/Base64.js",
                    "/libs/dont_use_it_MIDI.js//inc/shim/Base64binary.js",
                    "/libs/dont_use_it_MIDI.js//inc/shim/WebAudioAPI.js",
                    //    <!-- dont_use_it_MIDI.js/ package -->
                    "/libs/dont_use_it_MIDI.js//js/midi/audioDetect.js",
                    "/libs/dont_use_it_MIDI.js//js/midi/gm.js",
                    "/libs/dont_use_it_MIDI.js//js/midi/loader.js",
                    "/libs/dont_use_it_MIDI.js//js/midi/plugin.audiotag.js",
                    "/libs/dont_use_it_MIDI.js//js/midi/plugin.webaudio.js",
                    "/libs/dont_use_it_MIDI.js//js/midi/plugin.webmidi.js",
                    //    <!-- utils -->
                    "/libs/dont_use_it_MIDI.js//js/util/dom_request_xhr.js",
                    "/libs/dont_use_it_MIDI.js//js/util/dom_request_script.js",
                ];

                var done = 0;

                include.forEach(scriptPath => $.getScript(scriptPath, function()
                {
                    console.log(scriptPath, 'loaded!');

                    if (++done === include.length) {
                        /** @debug */
                        MIDI.loadPlugin({
                            soundfontUrl: "/libs/midi-js-soundfonts/FluidR3_GM/",
                            //instrument: "acoustic_grand_piano", // TODO: for some reason does not work with other instruments =D - investigate sometime?
                            //instruments: [0],
                            instruments: [DEFAULT_INSTRUMENT], // oh, yeah...
                            onprogress: (state, progress) => console.log(state, progress),
                            onsuccess: function() {

                                /** @debug */
                                console.log("mudcube load Success!");

                                var delay = 0; // play one note every quarter second
                                var note = 50; // the MIDI note
                                var velocity = 127; // how hard the note hits
                                // play the note
                                MIDI.programChange(0, DEFAULT_INSTRUMENT)
                                MIDI.setVolume(0, 127);
                                MIDI.noteOn(0, note, velocity, delay);
                                MIDI.noteOff(0, note, delay + 0.75);

                                mudcubeInitialised = true;
                                synth = synthName;

                                mudcube = MIDI;
                            }
                        });

                    }
                }));
            } else {
                synth = synthName;
            }
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
