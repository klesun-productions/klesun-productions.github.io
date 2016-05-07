
var Util = Util || {};

// an instance of playback request. it will stay the same
// instance when we, say, move slider or switch tab; but
// it will be new instance if we change song. do it primarily
// to avoid passing 4 arguments to the playAt() method when we need
// only one - index

Util.Playback = function(sheetMusic, onChord, whenFinished, tempoFactor, stopSounding)
{
    var tempo = sheetMusic.config.tempo * tempoFactor;
	var startDeltaTime = Util.map(sheetMusic.chordList[0], c => Util.toMillis(c.timeFraction, tempo)) || 0;
	var startMillis = window.performance.now() - startDeltaTime;
	
    var chordIndex = -1;
    var loopsLeft = sheetMusic.config.loopTimes;

    var findBTime = function(chordTime)
    {
        var sumFrac = 0;
        for (var i = 0; i < sheetMusic.chordList.length; ++i) {
            if (sumFrac >= chordTime) {
                return i;
            } else {
                sumFrac += sheetMusic.chordList[i].noteList
                    .map(n => n.length).sort()[0] || 0;
            }
        }

        return -1;
    };

    var scheduled = [];
    var scheduleScrewable = function(timeSkip, callback)
    {
        var screwed = false;
        var interruptLambda = _ => (screwed = true);
        scheduled.push(interruptLambda);
        setTimeout(function() {
            screwed || callback();
            var index = scheduled.indexOf(interruptLambda);
            index > -1 && scheduled.splice(index, 1);
        }, timeSkip);
    };

    var pauseHandler = _ => {};
    var resumeHandler = _ => {};

    var pause = function()
    {
        stopSounding();
        scheduled.forEach(c => c());
        scheduled.length = 0;
        pauseHandler();
    };

	var playNext = function()
	{
        ++chordIndex;
        onChord(sheetMusic.chordList[chordIndex].noteList, tempo, chordIndex);

        var chordEndFraction = sheetMusic.chordList[chordIndex + 1]
            ? sheetMusic.chordList[chordIndex + 1].timeFraction
            : sheetMusic.chordList[chordIndex].timeFraction
            + sheetMusic.chordList[chordIndex].noteList
                .map(n => n.length).sort()[0] || 0;

        var timeSkip = Util.toMillis(chordEndFraction, tempo) -
                (window.performance.now() - startMillis);

		if (chordIndex < sheetMusic.chordList.length - 1) {
            timeSkip > 0
                ? scheduleScrewable(timeSkip, playNext)
                : playNext();
		} else if (loopsLeft-- > 0) {
            startMillis += Util.toMillis(chordEndFraction - sheetMusic.config.loopStart, tempo);
            chordIndex = findBTime(sheetMusic.config.loopStart) - 1;
            timeSkip > 0
                ? scheduleScrewable(timeSkip, playNext)
                : playNext();
        } else {
            scheduleScrewable(timeSkip, whenFinished);
		}
	};
	playNext();

    var resume = function()
    {
        startMillis = window.performance.now() -
            Util.toMillis(sheetMusic.chordList[chordIndex].timeFraction, tempo);
        --chordIndex;
        playNext();
        resumeHandler();
    };

    var setTempo = function(newTempo)
    {
        tempo = newTempo;
        pause();
        resume();
    };

    var slideTo = function(n)
    {
        // we don't wanna mark this song
        // as "listened" on server
        whenFinished = _ => {};

        chordIndex = n;
        pause();
        resume();
    };

    var getTime = _ => (chordIndex > -1 && chordIndex < sheetMusic.chordList.length)
            ? Util.toMillis(sheetMusic.chordList[chordIndex].timeFraction, tempo)
            : '?';

    return {
        slideTo: slideTo,
        getTempo: _ => +tempo,
        setTempo: setTempo,
        getChordIndex: _ => chordIndex,
        getTime: getTime,
        pause: pause,
        resume: resume,
        setPauseHandler: h => (pauseHandler = h),
        setResumeHandler: h => (resumeHandler = h),
    };
};