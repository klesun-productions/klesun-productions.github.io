/// <reference path="../references.ts" />

import {IShmidusicChord, IShChannel} from "../DataStructures";
import {SoundFontAdapter, IFetchedSample, EStereoPan, ISoundFontAdapter} from "./SoundFontAdapter";
import {Oscillator} from "./Oscillator";
import {Tls} from "../utils/Tls";
import {ISynth} from "./ISynth";
import {Cls} from "../Cls";

// we play sample audio files on "playNote()"

interface INote { play: { (): { (): void } } }

// to make sound and graphics more fitting to each other
const DELAY_FOR_GRAPHICS = 10;

export let Fluid = Cls['Fluid'] = function(soundFont: ISoundFontAdapter): ISynth
{
    let audioCtx = Tls.audioCtx;
    let pitchShiftInput = <HTMLInputElement>$('<input type="number" step="0.5" value="0"/>')[0];
    let soundings: Set<AudioBufferSourceNode> = new Set([]);

    let channelNodes = Tls.range(0,16).map(i => {
        let node = audioCtx.createGain();
        node.gain.value = 1;
        node.connect(audioCtx.destination);
        return node;
    });

    let channels = Tls.range(0,16).map(i => 1 && {preset: 0});
    let pitchBendByChannel = Tls.range(0,16).map(i => 0);

    let sounding: {[chan: number]: Array<AudioBufferSourceNode>} = [];

    let MAX_VOLUME = 0.3;

    // used for ... suddenly fallback.
    // when new note is about to be played we need time to load it
    let fallbackOscillator = Oscillator(audioCtx);

    let semitoneToFactor = (s: number) => Math.pow(2, s / 12)

    let playSample = function(fetchedSample: IFetchedSample, channel: number): () => void
    {
        // TODO: uno what i really hate? when two next-standing notes sound very different
        // due to different samples being used. What you should do - blend them: say, you need
        // to play fa, but you got only mi and sol samples - you play them both with 0.33 and 0.67 volumes respectively

        let parentNode: AudioNode = channelNodes[channel];
        let gainNode = audioCtx.createGain();
        let gainValue = MAX_VOLUME * fetchedSample.volumeKoef;
        gainNode.gain.value = gainValue;

        let audioNodes = fetchedSample.audioNodes.concat([gainNode]);
        for (let node of audioNodes) {
            node.connect(parentNode);
            parentNode = node;
        }

        let audioSource = audioCtx.createBufferSource();
        audioSource.playbackRate.value = fetchedSample.frequencyFactor
            * semitoneToFactor(pitchBendByChannel[channel])
            * Math.pow(2, +pitchShiftInput.value / 12);

        audioSource.loopStart = fetchedSample.loopStart;
        audioSource.loopEnd = fetchedSample.loopEnd;
        audioSource.loop = fetchedSample.isLooped;
        audioSource.buffer = fetchedSample.buffer;

        if (+fetchedSample.stereoPan === EStereoPan.LEFT) {
            let splitter = audioCtx.createChannelSplitter(2);
            audioSource.connect(splitter);
            splitter.connect(gainNode, 0);
        } else if (+fetchedSample.stereoPan === EStereoPan.RIGHT) {
            let splitter = audioCtx.createChannelSplitter(2);
            audioSource.connect(splitter);
            splitter.connect(gainNode, 1);
        } else {
            audioSource.connect(gainNode);
        }

        audioSource.start();
        soundings.add(audioSource);

        return () => {
            let iterations = 10;
            let fade = (i: number) => {
                if (i >= 0) {
                    gainNode.gain.value = gainValue * (i / iterations);
                    setTimeout(() => fade(i - 1), fetchedSample.fadeMillis / iterations);
                } else {
                    soundings.delete(audioSource);
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

    let setPitchBend = function(semitones: number, chan: number)
    {
        let was = pitchBendByChannel[chan];
        pitchBendByChannel[chan] = semitones;

        // console.log('Pitch Bend!', semitones, chan);

        let factor = semitoneToFactor(semitones - was);
        Tls.list(soundings).forEach = s => s.playbackRate.value *= factor;
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
        // TODO: implement
        setPitchBend: setPitchBend,
        setVolume: (koef,chan) => {}, // TODO: implement
    };
};