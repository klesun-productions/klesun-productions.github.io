
// an instance of playback request. it will stay the same
// instance when we, say, move slider or switch tab; but
// it will be new instance if we change song. do it primarily
// to avoid passing 4 arguments to the playAt() method when we need
// only one - index

import {IGeneralStructure} from "./DataStructures";
import {IShNote} from "./DataStructures";
import {Kl} from "./Tools";

type millis_t = number;

/** @param length - float: quarter will be 0.25, semibreve will be 1.0*/
var toMillis = (length: number, tempo: number) => 1000 * length * 60 / (tempo / 4);  // because 1 / 4 = 1000 ms when tempo is 60

export function Playback(
    sheetMusic: IGeneralStructure,
    onChord: (notes: IShNote[], tempo?: number, index?: number) => void,
    whenFinished: () => void,
    tempoFactor: number,
    stopSounding: () => void): IPlayback
{
    var tempo = sheetMusic.config.tempo * tempoFactor;
    var startDeltaTime = Kl.map(sheetMusic.chordList[0], c => toMillis(c.timeFraction, tempo)) || 0;
    var startMillis = window.performance.now() - startDeltaTime;

    var chordIndex = -1;
    var loopsLeft = sheetMusic.config.loopTimes;

    var findBTime = function(chordTime: number)
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

    /** list of interrupting lambdas */
    var scheduled: {(): void}[] = [];
    var scheduleScrewable = function(timeSkip: millis_t, callback: () => void)
    {
        var screwed = false;
        var interruptLambda = () => (screwed = true);
        scheduled.push(interruptLambda);
        setTimeout(function() {
            screwed || callback();
            var index = scheduled.indexOf(interruptLambda);
            index > -1 && scheduled.splice(index, 1);
        }, timeSkip);
    };

    var pauseHandler = () => {};
    var resumeHandler = () => {};

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

        if (!(chordIndex in sheetMusic.chordList)) {
            return;
        }

        onChord(sheetMusic.chordList[chordIndex].noteList, tempo, chordIndex);

        var chordEndFraction = sheetMusic.chordList[chordIndex + 1]
            ? sheetMusic.chordList[chordIndex + 1].timeFraction
            : sheetMusic.chordList[chordIndex].timeFraction
            + sheetMusic.chordList[chordIndex].noteList
                .map(n => n.length).sort()[0] || 0;

        var timeSkip = toMillis(chordEndFraction, tempo) -
            (window.performance.now() - startMillis);

        if (chordIndex < sheetMusic.chordList.length - 1) {
            timeSkip > 0
                ? scheduleScrewable(timeSkip, playNext)
                : playNext();
        } else if (loopsLeft-- > 0) {
            startMillis += toMillis(chordEndFraction - sheetMusic.config.loopStart, tempo);
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
            toMillis(sheetMusic.chordList[chordIndex].timeFraction, tempo);
        --chordIndex;
        playNext();
        resumeHandler();
    };

    var setTempo = function(newTempo: number)
    {
        tempo = newTempo;

        if ((chordIndex + 1) in sheetMusic.chordList) {
            startMillis = window.performance.now() -
                toMillis(sheetMusic.chordList[chordIndex + 1].timeFraction, tempo);
        }
    };

    var slideTo = function(n: number)
    {
        // we don't wanna mark this song
        // as "listened" on server
        whenFinished = () => {};

        stopSounding();

        startMillis = window.performance.now() -
            toMillis(sheetMusic.chordList[n].timeFraction, tempo);
        chordIndex = n;

        (n in sheetMusic.chordList) &&
            onChord(sheetMusic.chordList[n].noteList, tempo, n);
    };

    var getTime = () => (chordIndex in sheetMusic.chordList)
        ? toMillis(sheetMusic.chordList[chordIndex].timeFraction, tempo)
        : -1;

    return {
        slideTo: slideTo,
        getTempo: () => +tempo,
        setTempo: setTempo,
        getChordIndex: () => chordIndex,
        getTime: getTime,
        pause: pause,
        resume: resume,
        setPauseHandler: (h: () => void) => (pauseHandler = h),
        setResumeHandler: (h: () => void) => (resumeHandler = h),
    };
};

export interface IPlayback {
    slideTo: (n: number) => void,
    getTempo: () => number,
    setTempo: (n: number) => void,
    getChordIndex: () => number,
    getTime: () => millis_t,
    pause: () => void,
    resume: () => void,
    setPauseHandler: (h: () => void) => void,
    setResumeHandler: (h: () => void) => void,
};