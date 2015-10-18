
var Util = Util || {};

// This class destiny is to read shmidusic json structure and send events to MIDI.js and PianoLayoutPanel

/** @param piano - PianoLayoutPanel instance */
Util.Playback = function (piano, $controlCont) {

    var Control = function ($cont)
    {
        var $general = $('<div class="general"></div>');

        var fileNameHolder = $('<span></span>').html('?');
        var chordIndexHolder = $('<span></span>').html('?');
        var chordCountHolder = $('<span></span>').html('?');
        var noteCountHolder = $('<span></span>').html('?');
        var tempoHolder = $('<span></span>').html('?');
        var secondsHolder = $('<span style="width: 60px"></span>').html('?');
        var secondsTotalHolder = $('<span style="width: 60px"></span>').html('?');

        $general.append($('<div></div>').append("File Name: ").append(fileNameHolder));

        var spanFillers = [
            s => s.append("Chord: ").append(chordIndexHolder).append('/').append(chordCountHolder),
            s => s.append("Note Count: ").append(noteCountHolder),
            s => s.append("Tempo: ").append(tempoHolder),
            s => s.append("Seconds: ").append(secondsHolder).append('/').append(secondsTotalHolder),
        ];
        spanFillers.forEach(l => $general.append(l($('<div class="inlineBlock"></div>'))));

        $cont.append($general.append('<br clear="all"/>'));

        var $syntControl = $('<div class="syntControl"></div>').append('<div>huj</div>');
        $cont.append($syntControl);

        var self;
        return self = {
            setFileName: n => { fileNameHolder.html(n); return self; },
            setChordCount: n => { chordCountHolder.html(n); return self; },
            setNoteCount: n => { noteCountHolder.html(n); return self; },
            setTempo: n => { tempoHolder.html(Math.floor(n)); return self; },
            setSecondsTotal: n => { secondsTotalHolder.html(Math.floor(n * 100) / 100); return self; },

            setChordIndex: n => { chordIndexHolder.html(n); return self; },
            setSeconds: n => { secondsHolder.html('>' + Math.floor(n * 100) / 100); return self; },

            $syntControl: $syntControl,
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
            synths[synth].init(control.$syntControl);

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

        synths[synth].consumeConfig(sheetMusic.config.instrumentDict, () => {

            var thread = {interrupted: false};
            playingThreads.push(thread);

            var startMillis = window.performance.now();

            var playNext = idx => {
                if (idx < sheetMusic.chordList.length && !thread.interrupted) {

                    var c = sheetMusic.chordList[idx];
                    c['noteList'].forEach(n => playNote(n, sheetMusic.config.tempo));

                    if (idx + 1 < sheetMusic.chordList.length) {
                        //var chordDuration = sheetMusic.chordList[idx + 1].timeMillis - c.timeMillis;
                        var chordDuration = sheetMusic.chordList[idx + 1].timeMillis - (window.performance.now() - startMillis);
                        if (chordDuration > 0) {
                            Util.setTimeout(() => playNext(idx + 1), chordDuration);
                        } else {
                            playNext(idx + 1);
                        }

                    } else {
                        setTimeout(whenFinished, 5000); // hope last chord finishes in 5 seconds
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

            var instrumentDict = {};

            (staff.staffConfig.channelList || [])
                .filter(e => e.channelNumber < 16)
                .forEach(e => instrumentDict[e.channelNumber] = e.instrument);

            Util.range(0, 16).forEach(i => instrumentDict[i] |= 0);

            // flat map hujap
            // tactList not needed for logic, but it increases readability of file A LOT
            var chordList = ('tactList' in staff)
                ? [].concat.apply([], staff['tactList'].map(t => t['chordList']))
                : staff['chordList'];

            if (!staff.millisecondTimeCalculated) {

                var timeMillis = 0;

                chordList.forEach(c => {
                    /** @legacy */
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
                    instrumentDict: instrumentDict
                }
            }, fileName, whenFinished);
        }
    };

    var playStandardMidiFile = function (smf, fileName, whenFinished) {

        stop();
        var thread = {interrupted: false};
        playingThreads.push(thread);

        whenFinished = whenFinished || (() => {});

        /** @TODO: handle _all_ tempo events, not just first. Should be easy once speed change by user is implemented */
        var tempoEntry = smf.tempoEventList.filter(t => t.time == 0)[0] ||
            smf.tempoEventList[0] || {tempo: 120};
        var division = smf.division * 4;

        var chordList = [];
        var curTime = -100;
        var curChord = [-100, -100];

        smf.noteList.forEach(note => {
            note.length = note.duration / division;
            if (note.time == curTime) {
                curChord.noteList.push(note);
            } else {
                curTime = note.time;
                curChord = {noteList: [note], timeMillis: toMillis(curTime / division, tempoEntry.tempo)};
                chordList.push(curChord);
            }
        });
        chordList.push(curChord);

        control.setNoteCount(smf.noteList.length);

        playGeneralFormat({
            chordList: chordList,
            config: {
                tempo: tempoEntry.tempo,
                instrumentDict: smf.instrumentDict
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
