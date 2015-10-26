
var Util = Util || {};

// This class destiny is to read shmidusic json structure and send events to MIDI.js and PianoLayoutPanel

/** @param piano - PianoLayoutPanel instance */
Util.Playback = function (piano, $controlCont) {

    var control = Util.PlaybackControl($controlCont);

    var toFloat = fractionString => eval(fractionString);
    var toMillis = Util.toMillis;

    var synths = {
        oscillator: Util.Synths.Oscillator(),
        mudcube: Util.Synths.Mudcube(),
        midiDevice: Util.Synths.MidiDevice()
    };

    var synth = 'notSet';

    // list of lambdas
    var toBeInterrupted = [];

    var scheduleInterruptable = function(millis, callback, dontExecute)
    {
        var interrupted = false;
        var interruptLambda = () => {
            interrupted = true;
            dontExecute || callback();
        };
        toBeInterrupted.push(interruptLambda);
        setTimeout(() => {
            if (!interrupted) {
                callback();
                var index = toBeInterrupted.indexOf(interruptLambda);
                toBeInterrupted.splice(index, 1);
            }
        }, millis);
    };

    var playNote = function(noteJs, tempo) {
        var interrupt = synths[synth].playNote(noteJs, tempo);

        var length = toFloat(noteJs.length) / (noteJs.isTriplet ? 3 : 1);
        piano.highlight(noteJs);

        scheduleInterruptable(toMillis(length, tempo), function()
        {
            piano.unhighlight(noteJs);
            interrupt();
        });
    };

    var playingThreads = [];
    var stop = (_) => {
        toBeInterrupted.forEach(c => c());
        toBeInterrupted.length = 0;
    };

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
    var playGeneralFormat = function (sheetMusic, fileName, whenFinished, startIndex) {
		
		whenFinished = whenFinished || ((_) => {});
        startIndex = +startIndex || 0;

        stop();

        var playAtIndex = ((chordIndex) => playGeneralFormat(sheetMusic, fileName, whenFinished, chordIndex));

        control.setFields(sheetMusic, playAtIndex).setFileName(fileName).setChordIndex(startIndex);

        if (startIndex == 0) {
            control.repaintStaff(sheetMusic);
        }

        synths[synth].consumeConfig(sheetMusic.config.instrumentDict, function() {

            var thread = {interrupted: false};
            playingThreads.push(thread);

            var startMillis = window.performance.now() - sheetMusic.chordList[startIndex].timeMillis;

            var playNext = function(idx) {
                if (idx < sheetMusic.chordList.length && !thread.interrupted) {

                    var c = sheetMusic.chordList[idx];
                    c['noteList'].forEach(n => playNote(n, sheetMusic.config.tempo));

                    var updateSlider = () => control
                        .setChordIndex(idx)
                        .setSeconds(c.timeMillis / 1000.0);

                    if (idx + 1 < sheetMusic.chordList.length) {
                        //var chordDuration = sheetMusic.chordList[idx + 1].timeMillis - c.timeMillis;
                        var chordDuration = sheetMusic.chordList[idx + 1].timeMillis - (window.performance.now() - startMillis);

                        if (chordDuration > 0) {

                            // piano image blinks if do it every time
                            if (idx % 20 === 0 || chordDuration > 250) {
                                updateSlider();
                            }

                            scheduleInterruptable(chordDuration, (_) => playNext(idx + 1), true);
                        } else {
                            playNext(idx + 1);
                        }

                    } else {

                        setTimeout(whenFinished, 5000); // hope last chord finishes in 5 seconds
                    }
                } else {
                    var index = playingThreads.indexOf(thread);
                    playingThreads.splice(index, 1);
                }
            };

            playNext(startIndex);
        });
    };

    /** @TODO: move playShmidusic() and playStandardMidiFile() implementations into
     * a separate class which would deal with format differences*/

    /** @param shmidusicJson - json in shmidusic project format */
    var playShmidusic = function (shmidusicJson, fileName, whenFinished) {

        whenFinished = whenFinished || ((_) => {});
        fileName = fileName || 'noNameFile';

		shmidusicJson['staffList'].forEach(function(staff) {

            var instrumentDict = {};

            (staff.staffConfig.channelList || [])
                .filter(e => e.channelNumber < 16)
                .forEach((e) => (instrumentDict[e.channelNumber] = e.instrument));

            Util.range(0, 16).forEach(i => (instrumentDict[i] |= 0));

            // flat map hujap
            // tactList not needed for logic, but it increases readability of file A LOT
            var chordList = ('tactList' in staff)
                ? [].concat.apply([], staff['tactList'].map(t => t['chordList']))
                : staff['chordList'];

            if (!staff.millisecondTimeCalculated) {

                var timeMillis = 0;

                chordList.forEach(function(c) {
                    /** @legacy */
                    c.noteList.forEach(function(n) {
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
        });
    };

    var playStandardMidiFile = function (smf, fileName, whenFinished) {

        stop();
        var thread = {interrupted: false};
        playingThreads.push(thread);

        whenFinished = whenFinished || ((_) => {});

        /** @TODO: handle _all_ tempo events, not just first. Should be easy once speed change by user is implemented */
        var tempoEntry = smf.tempoEventList.filter(t => t.time == 0)[0] ||
            smf.tempoEventList[0] || {tempo: 120};
        var division = smf.division * 4;

        var chordList = [];
        var curTime = -100;
        var curChord = [-100, -100];

        smf.noteList.forEach(function(note) {
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
