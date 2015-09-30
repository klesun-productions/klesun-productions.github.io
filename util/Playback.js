
var Util = Util || {};

// This class destiny is to read shmidusic json structure and send events to MIDI.js and PianoLayoutPanel

/** @param piano - PianoLayoutPanel instance */
Util.Playback = function (piano, $controlCont) {

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
            setChordCount: n => { chordCountHolder.html(n); return self; },
            setNoteCount: n => { noteCountHolder.html(n); return self; },
            setTempo: n => { tempoHolder.html(Math.floor(n)); return self; },
            setSecondsTotal: n => { secondsTotalHolder.html(Math.floor(n * 100) / 100); return self; },

            setChordIndex: n => { chordIndexHolder.html(n); return self; },
            setSeconds: n => { secondsHolder.html('>' + Math.floor(n * 100) / 100); return self; },
        };
    };

    var control = Control($controlCont);

    var toFloat = fractionString => eval(fractionString);
    var toMillis = (length, tempo) => 1000 * length * 60 / (tempo / 4);  // because 1 / 4 = 1000 ms when tempo is 60

    /** @testing */
    var synths = {
        oscillator: Util.Synths.Oscillator(),
        mudcube: Util.Synths.Mudcube(),
        midiDevice: Util.Synths.MidiDevice(),
    };

    var synth = 'notSet';

    var playNote = (noteJs, tempo) => {
        synths[synth].playNote(noteJs, tempo);

        var length = toFloat(noteJs.length) / (noteJs.isTriplet ? 3 : 1);
        piano.highlight(noteJs);
        setTimeout(() => piano.unhighlight(noteJs), toMillis(length, tempo));
    };

    var playingThreads = [];
    var stop = () => playingThreads.forEach(t => t.interrupted = true);

    var changeSynth = function(synthName) {
        if (synthName in synths) {
            stop();
            synth = synthName;
            synths[synth].init();

        } else {
            alert('No Such Synth!');
        }
    };
    changeSynth('oscillator');

    // TODO: rename to playSheetMusic()
    var playGeneralFormat = function (sheetMusic) {

        stop();

        synths[synth].consumeConfig(sheetMusic.config.instrumentEntries, () => {

            var thread = {interrupted: false};
            playingThreads.push(thread);

            var playNext = idx => {
                if (idx < sheetMusic.chordList.length && !thread.interrupted) {

                    var c = sheetMusic.chordList[idx];
                    c['noteList'].forEach(n => playNote(n, sheetMusic.config.tempo));

                    setTimeout(() => playNext(idx + 1), sheetMusic.chordList[idx + 1].timeMillis - c.timeMillis || 0);
                } else {
                    var index = playingThreads.indexOf(thread);
                    playingThreads.splice(index, 1);
                }
            };

            playNext(0);
        });
    };

    // TODO: rename to playShmidusic()
    /** @param shmidusicJson - json in shmidusic project format */
    var play = function (shmidusicJson) {

        for (var staff of shmidusicJson['staffList']) {

            var instrumentEntries = (staff.staffConfig.channelList || []).map(c => ({channel: c.channelNumber, instrument: c.instrument}));
            instrumentEntries = instrumentEntries.filter(e => e.channel < 16); // да-да, я лох
            for (var i = 0; i < 16; ++i) {
                if (instrumentEntries.filter(e => e.channel == i).length === 0) {
                    instrumentEntries.push({channel: i, instrument: DEFAULT_INSTRUMENT});
                }
            }

            // flat map hujap
            var chordList = ('tactList' in staff)
                ? [].concat.apply([], staff['tactList'].map(t => t['chordList'])) // tactList not needed for logic, but it increases readability of file A LOT
                : staff['chordList'];

            var timeMillis = 0;
            chordList.forEach(c => {
                /** @legacy */
                c.noteList = c.notaList;
                delete c.notaList;
                c.noteList.forEach(n => {
                    n.length += '/' + (n.isTriplet ? 3 : 1);
                    delete n.isTriplet;
                });

                c.timeMillis = timeMillis;
                var chordLength = Math.min.apply(null, c.noteList.map(n => toFloat(n.length)));
                timeMillis += toMillis(chordLength, staff.staffConfig.tempo);
            });

            playGeneralFormat({
                chordList: chordList,
                config: {
                    tempo: staff.staffConfig.tempo,
                    instrumentEntries: instrumentEntries
                }
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

    return {
        play: play,
        playStandardMidiFile: playStandardMidiFile,
        changeSynth: changeSynth
    };
};
