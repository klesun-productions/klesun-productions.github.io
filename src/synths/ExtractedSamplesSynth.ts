/// <reference path="../references.ts" />

import {IShmidusicChord, IShChannel} from "../DataStructures";
import {SoundFontAdapter, IFetchedSample, EStereoPan, ISoundFontAdapter} from "./SoundFontAdapter";
import {Oscillator} from "./Oscillator";
import {Tls} from "../utils/Tls";
import {ISynth} from "./ISynth";
import {Cls} from "../Cls";
import {SpeedLog} from "../utils/SpeedLog";
import {S} from "../utils/S";
import $ from 'https://cdnjs.cloudflare.com/ajax/libs/jquery/2.1.4/jquery.min.js';

// we play sample audio files on "playNote()"

interface INote { play: { (): { (): void } } }

// to make sound and graphics more fitting to each other
const DELAY_FOR_GRAPHICS = 10;

interface iSounding {
    gain: GainNode,
    src: AudioBufferSourceNode,
    baseVolume: number,
    baseFrequency: number,
}

/**
 * unlike Sf3Synth, this one works with each sample as a _separate_ file on the internets
 */
export let WebAudioSfSynth = function(soundFont: ISoundFontAdapter): ISynth
{
    let audioCtx = Tls.audioCtx;
    let pitchShiftInput = <HTMLInputElement>$('<input type="number" step="0.5" value="0"/>')[0];
    let soundingsByChannel: Set<iSounding>[] = S.range(0,16).map(i => new Set([]));

    let channelNodes = S.range(0,16).map(i => {
        let node = audioCtx.createGain();
        node.gain.value = 1;
        node.connect(audioCtx.destination);
        return node;
    });

    let channels = S.range(0,16).map(i => 1 && {preset: 0});
    let pitchBendByChannel = S.range(0,16).map(i => 0);
    let volumeByChannel = S.range(0,16).map(i => 1);

    let MAX_VOLUME = 0.15;

    // used for ... suddenly fallback.
    // when new note is about to be played we need time to load it
    let fallbackOscillator = Oscillator(audioCtx);

    let semitoneToFactor = (s: number) => Math.pow(2, s / 12);

    let playSample = function(fetchedSample: IFetchedSample, channel: number): () => void
    {
        let parentNode: AudioNode = channelNodes[channel];
        let gainNode = audioCtx.createGain();
        let baseVolume = MAX_VOLUME * fetchedSample.volumeKoef;
        gainNode.gain.value = baseVolume * volumeByChannel[channel];

        let audioNodes = fetchedSample.audioNodes.concat([gainNode]);
        for (let node of audioNodes) {
            node.connect(parentNode);
            parentNode = node;
        }

        let audioSource = audioCtx.createBufferSource();
        let baseFrequency = fetchedSample.frequencyFactor * Math.pow(2, +pitchShiftInput.value / 12);
        audioSource.playbackRate.value = baseFrequency * Math.max(semitoneToFactor(pitchBendByChannel[channel]), 0.0001);

        audioSource.loopStart = fetchedSample.loopStart;
        audioSource.loopEnd = fetchedSample.loopEnd;
        audioSource.loop = fetchedSample.isLooped;
        audioSource.buffer = fetchedSample.buffer;

        audioSource.connect(gainNode);
        audioSource.start();

        let sounding = {gain: gainNode, src: audioSource, baseVolume: baseVolume, baseFrequency: baseFrequency};
        soundingsByChannel[channel].add(sounding);

        return () => {
            let iterations = 10;
            let fade = (i: number) => {
                if (i >= 0) {
                    gainNode.gain.value = Math.max(baseVolume * (i / iterations) * volumeByChannel[channel], 0.0001);
                    setTimeout(() => fade(i - 1), fetchedSample.fadeMillis / iterations);
                } else {
                    soundingsByChannel[channel].delete(sounding);
                    audioSource.stop();
                }
            };
            fade(iterations - 1);
        };
    };

    let playNote = function(semitone: number, channel: number, velocity: number)
    {
        let isDrum = +channel === 9;

        let samples = soundFont.fetchSamples(semitone, channels[channel].preset, isDrum, velocity);

        if (samples.length > 0) {
            let offs = samples.map(s => playSample(s, channel));
            return () => offs.forEach(off => off());
        } else {
            return +channel !== 9
                ? fallbackOscillator.playNote(semitone + +pitchShiftInput.value, 0, velocity, -1)
                : () => {};
        }
    };

    let consumeConfig = (programs: { [id: number]: IShChannel; }) =>
        Tls.fori(programs, (k, v) => channels[k] = v);

    let interruptLastAnalysis = () => {};

    // starts a worker that runs through chords and loads samples for notes if required
    let analyse = function(chords: IShmidusicChord[])
    {
        interruptLastAnalysis();
        let interrupted = false;
        interruptLastAnalysis = () => interrupted = true;

        let next = (i: number) => {
            let c = chords[i];
            c.noteList.forEach((n,i) => {
                soundFont.fetchSamples(n.tune, channels[n.channel].preset, +n.channel === 9, 127);
            });

            i + 1 < chords.length && !interrupted
                && setTimeout(() => next(i + 1), 50);
        };

        chords.length && next(0);
    };

    let setPitchBend = (semitones: number, chan: number) => {
        pitchBendByChannel[chan] = semitones;
        S.list(soundingsByChannel[chan]).forEach = s =>
            s.src.playbackRate.value = s.baseFrequency * semitoneToFactor(semitones);
    };

    let setVolume = (factor: number, chan: number) => {
        volumeByChannel[chan] = factor;
        S.list(soundingsByChannel[chan]).forEach = s =>
            s.gain.gain.value = s.baseVolume * Math.max(factor, 0.0001);
    };

    let init = function($cont: JQuery): void
    {
        $cont.empty();
        $cont.append([
            'Pitch Offset: ',
            pitchShiftInput,
        ]);
    };

    return {
        playNote: playNote,
        consumeConfig: consumeConfig,
        analyse: analyse,
        init : init,
        setPitchBend: setPitchBend,
        setVolume: setVolume,
    };
};