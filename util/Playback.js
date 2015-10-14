
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

    // must be called from outside on page load!
    var changeSynth = function(synthName) {
        if (synthName in synths) {
            stop();
            synth = synthName;
            synths[synth].init();

        } else {
            alert('No Such Synth!');
        }
    };

    // TODO: rename to playSheetMusic()
    var playGeneralFormat = function (sheetMusic, fileName, whenFinished) {

        stop();

        control
            .setFileName(fileName)
            .setTempo(sheetMusic.config.tempo)
            .setSecondsTotal(sheetMusic.chordList.slice(-1)[0].timeMillis / 1000.0)
            .setNoteCount('?')
            .setChordCount(sheetMusic.chordList.length)
        ;

        synths[synth].consumeConfig(sheetMusic.config.instrumentEntries, () => {

            var thread = {interrupted: false};
            playingThreads.push(thread);

            var playNext = idx => {
                if (idx < sheetMusic.chordList.length && !thread.interrupted) {

                    var c = sheetMusic.chordList[idx];
                    c['noteList'].forEach(n => playNote(n, sheetMusic.config.tempo));

                    if (idx + 1 < sheetMusic.chordList.length) {
                        var chordDuration = sheetMusic.chordList[idx + 1].timeMillis - c.timeMillis;
                        setTimeout(() => playNext(idx + 1), chordDuration);
                    } else {
                        setTimeout(whenFinished, 5000); // hope chord finishes in that time
                    }

                    // piano image lags if do it every time
                    if (idx % 20 === 0) {
                        control
                            .setChordIndex('>' + idx)
                            .setSeconds(c.timeMillis / 1000.0);
                    }
                } else {
                    var index = playingThreads.indexOf(thread);
                    playingThreads.splice(index, 1);
                }
            };

            playNext(0);
        });
    };

    /** @param shmidusicJson - json in shmidusic project format */
    var playShmidusic = function (shmidusicJson, fileName, whenFinished) {

        whenFinished = whenFinished || (() => {});
        fileName = fileName || 'noNameFile';

        for (var staff of shmidusicJson['staffList']) {

            var instrumentEntries = (staff.staffConfig.channelList || []).map(c => ({channel: c.channelNumber, instrument: c.instrument}));
            instrumentEntries = instrumentEntries.filter(e => e.channel < 16); // да-да, я лох
            for (var i = 0; i < 16; ++i) {
                if (instrumentEntries.filter(e => e.channel == i).length === 0) {
                    instrumentEntries.push({channel: i, instrument: 0});
                }
            }

            // flat map hujap
            var chordList = ('tactList' in staff)
                ? [].concat.apply([], staff['tactList'].map(t => t['chordList'])) // tactList not needed for logic, but it increases readability of file A LOT
                : staff['chordList'];

            if (!staff.millisecondTimeCalculated) {

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

                staff.millisecondTimeCalculated = true;
            }

            playGeneralFormat({
                chordList: chordList,
                config: {
                    tempo: staff.staffConfig.tempo,
                    instrumentEntries: instrumentEntries
                }
            }, fileName, whenFinished);
        }
    };

    var playStandardMidiFile = function (smf, fileName, whenFinished) {

        stop();
        var thread = {interrupted: false};
        playingThreads.push(thread);

        whenFinished = whenFinished || (() => {});

        var tempoEntry = smf.tempoEventList.filter(t => t.time == 0)[0] ||
            smf.tempoEventList[0] || {tempo: 120};
        var tempo = tempoEntry.tempo;
        var division = smf.division * 4;

        var chordList = [];
        var curTime = -100;
        var curChord = [-100, -100];

        smf.noteList.forEach(note => {
            note.length = note.duration / division;
            if (note.time == curTime) {
                curChord.noteList.push(note);
            } else {
                if (curTime !== -100) {

                }
                curTime = note.time;
                curChord = {noteList: [note], timeMillis: toMillis(curTime / division, tempoEntry.tempo)};
                chordList.push(curChord);
            }
        });
        chordList.push(curChord);

        control.setNoteCount(smf.noteList.length);
        control.setSecondsTotal(toMillis(curTime / division));

        playGeneralFormat({
            chordList: chordList,
            config: {
                tempo: tempoEntry.tempo,
                instrumentEntries: smf.instrumentEventList.filter(i => i.time == 0)
            }
        }, fileName, whenFinished);

        control.setNoteCount(smf.noteList.length);
    };

    return {
        playShmidusic: playShmidusic,
        playStandardMidiFile: playStandardMidiFile,
        changeSynth: changeSynth
    };
};
