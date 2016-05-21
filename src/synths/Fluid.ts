/// <reference path="../references.ts" />

import {IShmidusicChord} from "../DataStructures";
import {SoundFontAdapter, IFetchedSample, EStereoPan} from "./SoundFontAdapter";
import {Oscillator} from "./Oscillator";
import {Kl} from "../Tools";
import {ISynth} from "./ISynth";

// we play sample audio files on "playNote()"

interface INote { play: { (): { (): void } } }

export function Fluid(audioCtx: AudioContext, soundfontDirUrl: string): ISynth
{
    var soundFont = SoundFontAdapter(audioCtx, soundfontDirUrl);

    var presetsByChannel: { [id: number]: number } = {
        0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0, 12:0, 13:0, 14:0, 15:0
    };

    var volumeFactor = 0.3;

    // used for ... suddenly fallback.
    // when new note is about to be played we need time to load it
    var fallbackOscillator = Oscillator(audioCtx);

    var playSample = function(fetchedSample: IFetchedSample): {(): void}
    {
        var gainNode = audioCtx.createGain();
        gainNode.gain.value = volumeFactor;
        gainNode.connect(audioCtx.destination);

        var sample = audioCtx.createBufferSource();
        sample.playbackRate.value = fetchedSample.frequencyFactor;
        sample.loopStart = fetchedSample.loopStart;
        sample.loopEnd = fetchedSample.loopEnd;
        sample.loop = true;
        sample.buffer = fetchedSample.buffer;

        if (+fetchedSample.stereoPan === EStereoPan.LEFT) {
            var splitter = audioCtx.createChannelSplitter(2);
            sample.connect(splitter);
            splitter.connect(gainNode, 0);
        } else if (+fetchedSample.stereoPan === EStereoPan.RIGHT) {
            var splitter = audioCtx.createChannelSplitter(2);
            sample.connect(splitter);
            splitter.connect(gainNode, 1);
        } else {
            sample.connect(gainNode);
        }

        sample.start();

        return () => sample.stop();
    };

    var playNote = function(semitone: number, channel: number)
    {
        var isDrum = +channel === 9;
        var preset = presetsByChannel[channel] || 0;

        var sample: IFetchedSample;

        if (sample = soundFont.fetchSample(semitone, preset, isDrum)) {
            return playSample(sample);
        } else {
            return fallbackOscillator.playNote(semitone, 0);
        }
    };

    var consumeConfig = (programs: { [id: number]: number; }) =>
        Kl.fori(programs, (k,v) => presetsByChannel[k] = v);

    var interruptLastAnalysis = () => {};

    // starts a worker that runs through chords and loads samples for notes if required
    var analyse = function(chords: IShmidusicChord[])
    {
        interruptLastAnalysis();
        var interrupted = false;
        interruptLastAnalysis = () => interrupted = true;

        var next = (i: number) => {
            var c = chords[i];
            c.noteList.forEach((n,i) => {
                soundFont.fetchSample(n.tune, presetsByChannel[n.channel], +n.channel === 9);
            });

            i + 1 < chords.length && !interrupted
                && setTimeout(() => next(i + 1), 50);
        };

        chords.length && next(0);
    };

    var init = function($cont: JQuery): void
    {
        $cont.empty();
        $cont.append('This Synth plays Fluid soundfonts!');
    };

    return {
        playNote: playNote,
        consumeConfig: consumeConfig,
        analyse: analyse,
        init : init,
    };
};