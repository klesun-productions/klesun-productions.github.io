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

type millis_t = number;

interface IConfigConsumer {
    consumeConfig: (config: {[ch: number]: number}) => void,
}

/** @param length - float: quarter will be 0.25, semibreve will be 1.0*/
var toMillis = (length: number, tempo: number) => 1000 * length * 60 / (tempo / 4);  // because 1 / 4 = 1000 ms when tempo is 60

export function Player(control: IPlaybackControl)
{
    type handle_note_t = (sem: number, chan: number, volumeFactor: number, chordIndex: number) => () => void;

    var noteHandlers: handle_note_t[] = [];

    var toFloat = (fractionString: string) => eval(fractionString);

    // list of lambdas
    var toBeInterrupted: {(): void}[] = [];

    /** @param dontExecute - if not true, the scheduled callback will be called even
     * if interrupted pre#devremenno */
    var scheduleInterruptable = function(millis: millis_t, taskList: {(): void}[])
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

    var playChord = function(notes: IShNote[], tempo?: number, index?: number)
    {
        tempo = tempo || 120;
        index = index || -1;

        notes.forEach(function(noteJs)
        {
            var length = toFloat(noteJs.length + '');
            var offList = noteHandlers.map(h => h(
                noteJs.tune, noteJs.channel, noteJs.velocity || 127, index
            ));

            scheduleInterruptable(toMillis(length, tempo), [() => offList.forEach(c => c())]);
        });
    };

    var tabSwitched: {(e: any): void} = null;
    var currentPlayback: IPlayback = null;
    var stopSounding = function() {
        toBeInterrupted.forEach(c => c());
        toBeInterrupted.length = 0;
    };

    var playSheetMusic = function (
        sheetMusic: IGeneralStructure,
        whenFinished?: () => void,
        startAt?: number)
    {
        startAt = startAt || 0;
        whenFinished = whenFinished || (() => {});

        currentPlayback && currentPlayback.pause();

        var playback = currentPlayback = Playback(sheetMusic, playChord,
            whenFinished, control.getTempoFactor() || 1, stopSounding);

        playback.pause();

        control.setPlayback(playback);

        startAt && playback.slideTo(startAt);

        // time-outing to give it time to pre-load the first chord
        // samples. at least on my pc it will be in time =P
        setTimeout(playback.resume, 300);

        document.removeEventListener('visibilitychange', tabSwitched);
        tabSwitched = function(e)
        {
            playback.pause();
            document.removeEventListener('visibilitychange', tabSwitched);
        };
        document.addEventListener('visibilitychange', tabSwitched);

        window.onbeforeunload = playback.pause;
    };
    
    var stop = () => {
        currentPlayback && currentPlayback.pause();
        stopSounding();
        return currentPlayback && currentPlayback.getChordIndex();
    };

    // this class shouldn't be instanciated more than once, right?
    // besides, the playing notes are global thing.
    window.onbeforeunload = () => stop();

    return {
        playSheetMusic: playSheetMusic,
        set anotherNoteHandler (h: handle_note_t) {
            noteHandlers.push(h);
        },
        stop: stop,
        playChord: playChord,
    };
};
