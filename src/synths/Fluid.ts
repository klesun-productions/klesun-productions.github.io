/// <reference path="../references.ts" />

import {IShmidusicChord, IShChannel} from "../DataStructures";
import {SoundFontAdapter, IFetchedSample, EStereoPan, ISoundFontAdapter} from "./SoundFontAdapter";
import {Oscillator} from "./Oscillator";
import {Kl} from "../Tools";
import {ISynth} from "./ISynth";
import {Cls} from "../Cls";

// we play sample audio files on "playNote()"

interface INote { play: { (): { (): void } } }

export var Fluid = Cls['Fluid'] = function(soundFont: ISoundFontAdapter): ISynth
{
    var audioCtx = Kl.audioCtx;

    var channelNodes = Kl.range(0,16).map(i => {
        var node = audioCtx.createGain();
        node.gain.value = 1;
        node.connect(audioCtx.destination);
        return node;
    });

    var channels = Kl.range(0,16).map(i => 1 && {preset: 0});

    var sounding: {[chan: number]: Array<AudioBufferSourceNode>} = [];

    var MAX_VOLUME = 0.3;

    // used for ... suddenly fallback.
    // when new note is about to be played we need time to load it
    var fallbackOscillator = Oscillator(audioCtx);

    var playSample = function(fetchedSample: IFetchedSample, parentNode: AudioNode): () => void
    {
        var gainNode = audioCtx.createGain();
        var gainValue = MAX_VOLUME * fetchedSample.volumeKoef;
        gainNode.gain.value = gainValue;

        var audioNodes = fetchedSample.audioNodes.concat([gainNode]);
        for (var node of audioNodes) {
            node.connect(parentNode);
            parentNode = node;
        }

        var sample = audioCtx.createBufferSource();
        sample.playbackRate.value = fetchedSample.frequencyFactor;
        sample.loopStart = fetchedSample.loopStart;
        sample.loopEnd = fetchedSample.loopEnd;
        sample.loop = fetchedSample.isLooped;
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

        return () => {
            var iterations = 10;
            sample.loop = false;
            var fade = (i: number) => {
                if (i >= 0) {
                    gainNode.gain.value = gainValue * (i / iterations);
                    setTimeout(() => fade(i - 1), fetchedSample.fadeMillis / iterations);
                } else {
                    sample.stop();
                }
            };
            fade(iterations - 1);
        };
    };

    var playNote = function(semitone: number, channel: number, velocity: number)
    {
        var isDrum = +channel === 9;

        var sample: IFetchedSample;

        if (sample = soundFont.fetchSample(semitone, channels[channel].preset, isDrum, velocity)) {
            return playSample(sample, channelNodes[channel]);
        } else {
            return +channel !== 9
                ? fallbackOscillator.playNote(semitone, 0, velocity, -1)
                : () => {};
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
                soundFont.fetchSample(n.tune, channels[n.channel].preset, +n.channel === 9, 0);
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
        setPitchBend: (koef, chan) => {}, // TODO: implement
    };
};