/// <reference path="../references.ts" />

import {IShmidusicChord, IShChannel} from "../DataStructures";
import {SoundFontAdapter, IFetchedSample, EStereoPan} from "./SoundFontAdapter";
import {Oscillator} from "./Oscillator";
import {Kl} from "../Tools";
import {ISynth} from "./ISynth";

// we play sample audio files on "playNote()"

interface INote { play: { (): { (): void } } }

export function Fluid(audioCtx: AudioContext, soundfontDirUrl: string): ISynth
{
    var soundFont = SoundFontAdapter(audioCtx, soundfontDirUrl);

    var channelNodes = Kl.range(0,16).map(i => {
        var node = audioCtx.createGain();
        node.gain.value = 1;
        node.connect(audioCtx.destination);
        return node;
    });

    var channels = Kl.range(0,16).map(i =>
        1 && {preset: 0, volume: 127});

    var MAX_VOLUME = 0.3;

    // used for ... suddenly fallback.
    // when new note is about to be played we need time to load it
    var fallbackOscillator = Oscillator(audioCtx);

    var playSample = function(fetchedSample: IFetchedSample, volumeFactor: number, parentNode: GainNode): () => void
    {
        var gainNode = audioCtx.createGain();
        gainNode.gain.value = MAX_VOLUME * volumeFactor
            * fetchedSample.volumeKoef
            ;
        gainNode.connect(parentNode);

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

    var playNote = function(semitone: number, channel: number, velocity: number)
    {
        var isDrum = +channel === 9;

        var sample: IFetchedSample;

        if (sample = soundFont.fetchSample(semitone, channels[channel].preset, isDrum)) {
            var volumeFactor = velocity / 127;
            return playSample(sample, volumeFactor, channelNodes[channel]);
        } else {
            return fallbackOscillator.playNote(semitone, 0, velocity, -1);
        }
    };

    var consumeConfig = (programs: { [id: number]: IShChannel; }) =>
        Kl.fori(programs, (k,v) => channels[k] = v);

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
                soundFont.fetchSample(n.tune, channels[n.channel].preset, +n.channel === 9);
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