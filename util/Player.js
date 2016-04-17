
var Util = Util || {};

// This class destiny is to read shmidusic json structure
// and send events to MIDI.js and PianoLayoutPanel

/** @param piano - PianoLayoutPanel instance */
Util.Player = function ($controlCont)
{
    var control = Util.PlaybackControl($controlCont);

    /** @var - a list of objects that have method handleNoteOn() that returns method handleNoteOff() */
    var noteHandlers = [];
    var configConsumer = {
        // dull config consumer
        consumeConfig: (config, callback) => callback()
    };

    var toFloat = fractionString => eval(fractionString);
    var toMillis = Util.toMillis;

    // list of lambdas
    var toBeInterrupted = [];

    /** @param dontExecute - if not true, the scheduled callback will be called even
     * if interrupted pre#devremenno */
    var scheduleInterruptable = function(millis, taskList)
    {
        var interrupted = false;
        var interruptLambda = function() {
            interrupted = true;
            taskList.forEach(t => t());
        };
        toBeInterrupted.push(interruptLambda);
        setTimeout(function() {
            if (!interrupted) {
                taskList.forEach(t => t());
                var index = toBeInterrupted.indexOf(interruptLambda);
                toBeInterrupted.splice(index, 1);
            }
        }, millis);
    };

    var playChord = function(chord, tempo, index)
    {
        tempo = tempo || 120;
        index = index || -1;

        chord['noteList'].forEach(function(noteJs)
        {
            var length = toFloat(noteJs.length);
            var offList = noteHandlers.map(h => h.handleNoteOn(noteJs, index));

            scheduleInterruptable(toMillis(length, tempo), [_ => offList.forEach(c => c())]);
        });
    };

    var tabSwitched = null;
    var currentPlayback = null;
    var stopSounding = function() {
        toBeInterrupted.forEach(c => c());
        toBeInterrupted.length = 0;
    };

    var playSheetMusic = function (sheetMusic, fileInfo, whenFinished, startAt)
    {
        startAt = startAt || 0;

		whenFinished = whenFinished || (_ => {});
        currentPlayback && currentPlayback.pause();

        control.setFields(sheetMusic)
            .setFileInfo(fileInfo);
		/** @TODO: passing the callback is legacy - remove */
        configConsumer.consumeConfig(sheetMusic.config.instrumentDict, _ => {});

		var playback = currentPlayback = Util.Playback(sheetMusic, playChord, whenFinished, control.getTempoFactor() || 1, stopSounding);

		control.setPlayback(playback);

        startAt && playback.slideTo(startAt);

        // TODO: investigate, does not work if you switch tab, then move slider (to resume playback) and switch tab again

        document.removeEventListener('visibilitychange', tabSwitched);
		tabSwitched = function(e)
		{
			playback.pause();
            document.removeEventListener('visibilitychange', tabSwitched);
		};
		document.addEventListener('visibilitychange', tabSwitched);

        window.onbeforeunload = playback.pause;
    };

    /** @param shmidusicJson - json in shmidusic project format */
    var playShmidusic = function (shmidusicJson, fileName, whenFinished) {

        whenFinished = whenFinished || ((_) => {});
        fileName = fileName || 'noNameFile';

        var adapted = Shmidusicator.generalizeShmidusic(shmidusicJson);
        playSheetMusic(adapted, {fileName: fileName, score: 'Ne'}, whenFinished);
    };

    /** @TODO: move format normalization into separate class */
    var playStandardMidiFile = function (smf, fileInfo, whenFinished)
    {
        whenFinished = whenFinished || ((_) => {});

        /** @TODO: handle _all_ tempo events, not just first. Should be easy once speed change by user is implemented */
        var tempoEntry = smf.tempoEventList.filter(t => t.time == 0)[0] ||
            smf.tempoEventList[0] || {tempo: 120};
        var tempo = Math.max(Math.min(tempoEntry.tempo, 360), 15);
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
                curChord = {noteList: [note], timeFraction: curTime / division};
                chordList.push(curChord);
            }
        });

        playSheetMusic({
            chordList: chordList,
            config: {
                tempo: tempo,
                // tempoOrigin likely unused
                tempoOrigin: tempo,
                instrumentDict: smf.instrumentDict,
                loopStart: 0,
                loopTimes: 0,
            },
			misc: {
				noteCount: smf.noteList.length
			}
        }, fileInfo, whenFinished);
    };

    // this class shouldn't be instanciated more than once, right?
    // besides, the playing notes are global thing.
    window.onbeforeunload = _ => stop();

    return {
        playShmidusic: playShmidusic,
        playStandardMidiFile: playStandardMidiFile,
        playSheetMusic: playSheetMusic,
        addNoteHandler: h => noteHandlers.push(h),
        addConfigConsumer: cc => (configConsumer = cc),
        stop: () => {
            currentPlayback && currentPlayback.pause();
            stopSounding();
        },
        playChord: playChord,
    };
};
