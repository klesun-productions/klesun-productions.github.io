/// <reference path="../references.ts"/>

// an instance of playback request. it will stay the same
// instance when we, say, move slider or switch tab; but
// it will be new instance if we change song. do it primarily
// to avoid passing 4 arguments to the playAt() method when we need
// only one - index

import {IGeneralStructure, IStateChannel} from "../DataStructures";
import {IShNote} from "../DataStructures";
import {Tls, Opt} from "../utils/Tls";
import {IPlaybackControl} from "../views/PlaybackControl";
import {ISynth} from "../synths/ISynth";
import {Adp} from "../Adp";

type millis_t = number;

interface IDynamicInstruction {
    getFromChord: (s: IStateChannel) => number,
    sendToSynth: (value: number, channel: number) => void,
    nextAtByChan: Array<{fromValue: number, toIndex: number}>,
};

/** @param length - float: quarter will be 0.25, semibreve will be 1.0*/
let toMillis = (length: number, tempo: number) => 1000 * length * 60 / (tempo / 4);  // because 1 / 4 = 1000 ms when tempo is 60

export function Playback(
    sheetMusic: IGeneralStructure,
    onChord: (notes: IShNote[], tempo?: number, index?: number) => void,
    synths: ISynth[],
    whenFinished: () => void,
    tempoFactor: number,
    stopSounding: () => void): IPlayback
{
    let tempo = sheetMusic.config.tempo * tempoFactor;
    let startDeltaTime = Tls.map(sheetMusic.chordList[0], c => toMillis(c.timeFraction, tempo)) || 0;
    let startMillis = window.performance.now() - startDeltaTime;

    let chordIndex = 0;
    let loopsLeft = sheetMusic.config.loopTimes;
    let onStops: Set<() => void> = new Set([]);

    let dynamicInstructions: IDynamicInstruction[] = [
        {
            getFromChord: (s) => s.pitchBend,
            sendToSynth: (v,c) => Tls.list(synths).forEach = s => s.setPitchBend(v, c),
            nextAtByChan: Tls.range(0, 16).map(i => 1 && {fromValue: 0, toIndex: -1}),
        }, {
            getFromChord: (s) => s.volume,
            sendToSynth: (v,c) => Tls.list(synths).forEach = s => s.setVolume(v, c),
            nextAtByChan: Tls.range(0, 16).map(i => 1 && {fromValue: 1, toIndex: -1}),
        },
    ];

    let findByTime = function(chordTime: number)
    {
        let sumFrac = 0;
        for (let i = 0; i < sheetMusic.chordList.length; ++i) {
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
    let scheduled: {(): void}[] = [];
    let scheduleScrewable = function(timeSkip: millis_t, callback: () => void)
    {
        let screwed = false;
        let interruptLambda = () => (screwed = true);
        scheduled.push(interruptLambda);
        setTimeout(function() {
            screwed || callback();
            let index = scheduled.indexOf(interruptLambda);
            index > -1 && scheduled.splice(index, 1);
        }, timeSkip);
    };

    let pauseHandler = () => {};
    let resumeHandler = () => {};

    let resetSynth = function(synth: ISynth)
    {
        Tls.list(Tls.range(0,16)).forEach = chan =>
            synth.setPitchBend(0, chan);
        Tls.list(Tls.range(0,16)).forEach = chan =>
            synth.setVolume(1, chan);
    };

    let pause = function()
    {
        stopSounding();
        scheduled.forEach(c => c());
        scheduled.length = 0;
        pauseHandler();
        Tls.list(onStops).clear().forEach(cb => cb());
        Tls.list(synths).forEach = resetSynth;
    };

    /** request to perform some operation over time */
    let performOverTime = function(time: number, from: number, to: number, cb: (n: number) => void)
    {
        let steps = 40;
        let period = toMillis(time, tempo) / steps;
        let chunk = (to - from) / steps;
        let i = 0;
        let next = () => {
            if (i++ < steps) {
                cb(from + chunk * i);
                setTimeout(next, period);
            }
        };
        next();
        onStops.add(() => i = steps);
    };

    let scheduleDynamics = function(chordIndex: number) {
        let startChord = sheetMusic.chordList[chordIndex];
        if (!chordIndex) {
            return;
        }

        Tls.list(dynamicInstructions).forEach = d =>
            Tls.digt(startChord.startState || {}).forEach = (state, chan) => {
                let value = d.getFromChord(state);
                d.sendToSynth(value, chan);
                d.nextAtByChan[chan] = {fromValue: value, toIndex: chordIndex};
            };

        for (let ion of dynamicInstructions) {
            let expired = ion.nextAtByChan
                .filter(t => t.toIndex <= chordIndex)
                .map((t,c) => 1 && {fromValue: t.fromValue, chan: c});

            let time = 0;
            // TODO: swap this and outer for so we iterated through songs just once
            for (let i = chordIndex; i < sheetMusic.chordList.length; ++i) {
                let chord = Adp.Chord(sheetMusic.chordList[i]);
                let nextTime = time + chord.getLength();
                for (let j = expired.length - 1; j >= 0; --j) {
                    let {fromValue, chan} = expired[j];

                    let found = false;
                    Opt(chord.s.startState).map(s => s[+chan]).map(ion.getFromChord).map(v => i > chordIndex ? v : null)
                        .get = statedValue => {
                            performOverTime(time, fromValue, statedValue, (v) => ion.sendToSynth(v, chan));
                            ion.nextAtByChan[chan].fromValue = statedValue;
                            ion.nextAtByChan[chan].toIndex = i;
                            expired.splice(j, 1);
                            found = true;
                        };
                    Opt(chord.s.finishState).map(s => s[+chan]).map(ion.getFromChord).map(v => !found ? v : null)
                        .get = statedValue => {
                            performOverTime(nextTime, fromValue, statedValue, (v) => ion.sendToSynth(v, chan));
                            ion.nextAtByChan[chan].fromValue = statedValue;
                            ion.nextAtByChan[chan].toIndex = i;
                            expired.splice(j, 1);
                        };
                }

                if (expired.length === 0 &&
                    expired.length === 0
                ) {
                    break;
                } else if (i === sheetMusic.chordList.length - 1) {
                    // remove tasks that left even when we reached end so
                    // we did not have to re-iterate whole song each time
                    Tls.list(expired).forEach = e =>
                        ion.nextAtByChan[e.chan].toIndex = i + 1;
                }
                time = nextTime;
            }
        }
    };

    let playNext = function()
    {
        ++chordIndex;

        if (!(chordIndex in sheetMusic.chordList)) {
            return;
        }

        onChord(sheetMusic.chordList[chordIndex].noteList, tempo, chordIndex);

        let chordEndFraction = sheetMusic.chordList[chordIndex + 1]
            ? sheetMusic.chordList[chordIndex + 1].timeFraction
            : sheetMusic.chordList[chordIndex].timeFraction
            + sheetMusic.chordList[chordIndex].noteList
                .map(n => n.length).sort()[0] || 0;

        let timeSkip = toMillis(chordEndFraction, tempo) -
            (window.performance.now() - startMillis);

        if (chordIndex < sheetMusic.chordList.length - 1) {
            // do nothing ^_^
        } else if (loopsLeft-- > 0) {
            startMillis += toMillis(chordEndFraction - sheetMusic.config.loopStart, tempo);
            chordIndex = findByTime(sheetMusic.config.loopStart) - 1;
        } else {
            scheduleScrewable(timeSkip, whenFinished);
            return;
        }
        timeSkip > 0
            ? scheduleScrewable(timeSkip, playNext)
            : playNext();

        scheduleDynamics(chordIndex);
    };

    let resume = function()
    {
        startMillis = window.performance.now() -
            toMillis(sheetMusic.chordList[chordIndex].timeFraction, tempo);
        --chordIndex;
        playNext();
        resumeHandler();
    };

    let setTempo = function(newTempo: number)
    {
        tempo = newTempo;

        if ((chordIndex + 1) in sheetMusic.chordList) {
            startMillis = window.performance.now() -
                toMillis(sheetMusic.chordList[chordIndex + 1].timeFraction, tempo);
        }
    };

    let slideTo = function(n: number)
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

    let getTime = () => (chordIndex in sheetMusic.chordList)
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