/// <reference path="../references.ts" />

// This class destiny is to read shmidusic json structure
// and send events to MIDI.js and PianoLayoutPanel

import {IShNote} from "../DataStructures";
import {IGeneralStructure} from "../DataStructures";
import {IPlayback} from "./Playback";
import {Playback} from "./Playback";
import PlaybackControl from "../views/PlaybackControl";
import {ISynth} from "../synths/ISynth";
import {IPlaybackControl} from "../views/PlaybackControl";
import {SpeedLog} from "../utils/SpeedLog";
import {S} from "../utils/S";

type millis_t = number;

interface IConfigConsumer {
    consumeConfig: (config: {[ch: number]: number}) => void,
}

/** @param length - float: quarter will be 0.25, semibreve will be 1.0*/
let toMillis = (length: number, tempo: number) => 1000 * length * 60 / (tempo / 4);  // because 1 / 4 = 1000 ms when tempo is 60

export function Player(control: IPlaybackControl)
{
    type handle_note_t = (sem: number, chan: number, volumeFactor: number, chordIndex: number) => () => void;

    let synths: ISynth[] = [];

    let toFloat = (fractionString: string) => eval(fractionString);

    // list of lambdas
    let toBeInterrupted: {(): void}[] = [];

    /** @param dontExecute - if not true, the scheduled callback will be called even
     * if interrupted pre#devremenno */
    let scheduleInterruptable = function(millis: millis_t, taskList: {(): void}[])
    {
        let interrupted = false;
        let interruptLambda = function() {
            interrupted = true;
            taskList.forEach(t => t());
        };
        toBeInterrupted.push(interruptLambda);
        setTimeout(function() {
            if (!interrupted) {
                taskList.forEach(t => t());
                let index = toBeInterrupted.indexOf(interruptLambda);
                toBeInterrupted.splice(index, 1);
            }
        }, millis);
    };

    let holdNote = function(tune: number, channel: number, velocity: number, index = -1)
    {
        let offList = synths.map(s => s.playNote(
            tune, channel, velocity, index
        ));
        return () => offList.forEach(release => release());
    }

    let playChord = function(notes: IShNote[], tempo?: number, index?: number)
    {
        tempo = tempo || 120;
        index = index || -1;

        S.list(notes).forEach = (noteJs) => {
            let release = holdNote(noteJs.tune, noteJs.channel, noteJs.velocity || 127, index);
            scheduleInterruptable(toMillis(noteJs.length, tempo), [release]);
        };
    };

    let tabSwitched: {(e: any): void} = null;
    let currentPlayback: IPlayback = null;
    let stopSounding = function() {
        toBeInterrupted.forEach(c => c());
        toBeInterrupted.length = 0;
    };

    let playSheetMusic = function (
        sheetMusic: IGeneralStructure,
        whenFinished?: () => void,
        startAt?: number,
        delay = 300 // for first chords to pre-load
    ) {
        startAt = startAt || 0;
        whenFinished = whenFinished || (() => {});

        currentPlayback && currentPlayback.pause();

        let playback = currentPlayback = Playback(
            sheetMusic,
            playChord,
            synths,
            whenFinished,
            control.getTempoFactor() || 1,
            stopSounding
        );

        control.setPlayback(playback);

        playback.slideTo(startAt, false);

        if (delay > 0) {
            setTimeout(playback.resume, 300);
        } else {
            playback.resume();
        }

        document.removeEventListener('visibilitychange', tabSwitched);
        tabSwitched = function(e)
        {
            playback.pause();
            document.removeEventListener('visibilitychange', tabSwitched);
        };
        document.addEventListener('visibilitychange', tabSwitched);

        window.onbeforeunload = playback.pause;
    };

    let stop = () => {
        currentPlayback && currentPlayback.pause();
        stopSounding();
        return currentPlayback && currentPlayback.getChordIndex();
    };

    let dullSynth = (h: handle_note_t): ISynth => 1 && {
        playNote: h,
        init: ($cont) => {},
        setPitchBend: () => {},
        setVolume: () => {},
        consumeConfig: (programs) => {},
        analyse: (chords) => {},
    };

    // this class shouldn't be instanciated more than once, right?
    // besides, the playing notes are global thing.
    window.onbeforeunload = () => stop();

    return {
        playSheetMusic: playSheetMusic,
        set anotherNoteHandler (h: handle_note_t) {
            synths.push(dullSynth(h));
        },
        set anotherSynth (h: ISynth) {
            synths.push(h);
        },
        stop: stop,
        holdNote: holdNote,
        playChord: playChord,
    };
};
