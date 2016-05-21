/// <reference path="references.ts" />

// This class destiny is to read shmidusic json structure
// and send events to MIDI.js and PianoLayoutPanel

import {IShNote} from "./DataStructures";
import {IShmidusicChord} from "./DataStructures";
import {IGeneralStructure} from "./DataStructures";
import {IShmidusicStructure} from "./DataStructures";
import Shmidusicator from "./player/Shmidusicator";
import {IMidJsSong} from "./DataStructures";
import {Kl} from "./Tools";
import {IPlayback} from "./Playback";
import {Playback} from "./Playback";
import PlaybackControl from "./views/PlaybackControl";
import {ISynth} from "./synths/ISynth";

type millis_t = number;
export interface IFileInfo {
    fileName?: string,
    score?: string
}

interface IConfigConsumer {
    consumeConfig: (config: {[ch: number]: number}) => void,
}

/** @param length - float: quarter will be 0.25, semibreve will be 1.0*/
var toMillis = (length: number, tempo: number) => 1000 * length * 60 / (tempo / 4);  // because 1 / 4 = 1000 ms when tempo is 60

// TODO: instead of $controlCont we should pass something like "IControlProvider"
/** @param piano - PianoLayoutPanel instance */
export function Player($controlCont: JQuery)
{
    var control = PlaybackControl($controlCont);

    /** @var - a list of objects that have method handleNoteOn() that returns method handleNoteOff() */
    var noteHandlers: ISynth[] = [];

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
            var offList = noteHandlers.map(h => h.playNote(noteJs.tune, noteJs.channel));

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
        fileInfo: IFileInfo,
        whenFinished?: () => void,
        startAt?: number)
    {
        startAt = startAt || 0;
        whenFinished = whenFinished || (() => {});

        currentPlayback && currentPlayback.pause();

        control.setFields(sheetMusic);
        control.setFileInfo(fileInfo);

        noteHandlers.forEach(h => {
            h.consumeConfig(sheetMusic.config.instrumentDict);
            h.analyse(sheetMusic.chordList);
        });

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

    /** @param shmidusicJson - json in shmidusic project format */
    var playShmidusic = function (shmidusicJson: IShmidusicStructure, fileName: string, whenFinished: () => void) {

        whenFinished = whenFinished || (() => {});
        fileName = fileName || 'noNameFile';

        var adapted = Shmidusicator.generalizeShmidusic(shmidusicJson);
        playSheetMusic(adapted, {fileName: fileName, score: 'Ne'}, whenFinished, 0);
    };

    /** @TODO: move format normalization into separate class
     * @TODO: rename to playMidJs */
    var playStandardMidiFile = function (smf: IMidJsSong, fileInfo: IFileInfo, whenFinished: () => void)
    {
        whenFinished = whenFinished || (() => {});

        /** @TODO: handle _all_ tempo events, not just first. Should be easy once speed change by user is implemented */
        var tempoEntry = smf.tempoEventList.filter(t => t.time == 0)[0] ||
            smf.tempoEventList[0] || {tempo: 120};
        var tempo = Math.max(Math.min(tempoEntry.tempo, 360), 15);
        var division = smf.division * 4;

        var chordList: IShmidusicChord[] = [];
        var curTime = -100;
        var curChord: IShmidusicChord = null;

        smf.noteList.forEach(function(note: any) {
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
                volumeByChannel: Kl.dicti(Kl.range(0,16).map((i): [number,number] => [i,127])),
            },
            misc: {
                noteCount: smf.noteList.length
            }
        }, fileInfo, whenFinished, 0);
    };

    var stop = () => {
        currentPlayback && currentPlayback.pause();
        stopSounding();
    };

    // this class shouldn't be instanciated more than once, right?
    // besides, the playing notes are global thing.
    window.onbeforeunload = () => stop();

    return {
        playShmidusic: playShmidusic,
        playStandardMidiFile: playStandardMidiFile,
        playSheetMusic: playSheetMusic,
        addNoteHandler: (h: ISynth) => noteHandlers.push(h),
        stop: () => stop,
        playChord: playChord,
    };
};
