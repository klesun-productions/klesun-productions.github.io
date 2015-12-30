
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

	var playNext = function()
	{
        ++chordIndex;
        onChord(sheetMusic.chordList[chordIndex], tempo, chordIndex);

		if (chordIndex < sheetMusic.chordList.length - 1) {

			var timeSkip = Util.toMillis(sheetMusic.chordList[chordIndex + 1].timeFraction, tempo) -
					(window.performance.now() - startMillis);

            timeSkip > 0
                ? scheduleScrewable(timeSkip, playNext)
                : playNext();

		} else {
            // hope last chord finishes in 5 seconds
            scheduleScrewable(5000, whenFinished);
		}
	};
	playNext();

    var pauseHandler = _ => {};
    var resumeHandler = _ => {};

    var pause = function()
    {
        stopSounding();
        scheduled.forEach(c => c());
        scheduled.length = 0;
        pauseHandler();
    };

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