/// <reference path="../references.ts" />

import {seconds_t} from "../DataStructures";
import {Cls} from "../Cls";
import {Tls} from "../utils/Tls";
import {
    IInstrumentSample, IPresetInstrument, TransformSf2Parse,
    flattenSamples
} from "./soundfont/ParseSf2";
import {S, IPromise} from "../utils/S";
import {dict_t} from "../utils/SafeAccess";

// this object provides access to soundfont info
// particularly it has a method that
// takes (semitone and preset) and
// returns (AudioBuffer, frequencyFactor, loopStart, loopEnd)
export let SoundFontAdapter = Cls['SoundFontAdapter'] = function(soundfontDirUrl: string)
{
    let sampleDirUrl = soundfontDirUrl + '/samples/';

    let soundfont = Tls.http(soundfontDirUrl + '/sf2parser.out.json', 'GET', {})
        .map(JSON.parse)
        .map(TransformSf2Parse)
        .map(flattenSamples);

    soundfont.then = sf => console.log('loaded soundfont meta data', sf);

    let tunePresets = soundfont.map(sf => sf[0]);
    let drumPreset = soundfont.map(sf => sf[128][+Object.keys(sf[128])[0]]);
    let performance = {
        forceMono: true,
        disableBiQuadFilter: true,
    };

    let determineCorrectionCents = (delta: number, generator: IGenerator) =>
        delta * 100 + S.opt(generator.fineTune).def(0)
                    + S.opt(generator.coarseTune).map(n => n * 100).def(0);

    /** @param db - soundfont decibel value */
    let dBtoKoef = (db: number) => Math.pow(10, db/50); // yes, it is 50, not 10 and not 20 - see /tests/attenToPercents.txt

    let fetchSamplesAsync = (
        semitone: number, preset: number, isDrum: boolean, velocity: number
    ) => S.promise<IFetchedSample[]>(
        delayedReturn =>
        tunePresets.then = presets =>
        drumPreset.then = drumPreset =>
    {
        let fetchedSamples: IFetchedSample[] = [];

        isDrum = isDrum || false;
        velocity = S.opt(velocity).def(127);

        let sampleHeaders = (!isDrum ? presets[preset] : drumPreset)
            .map(s => s.generators
                .filter(g =>
                    g.keyRange.lo <= semitone &&
                    g.keyRange.hi >= semitone &&
                    g.velRange.lo <= velocity &&
                    g.velRange.hi >= velocity)
                .map(g => S.T3(s.sampleInfo, g, s.sampleNumber)))
            .reduce((a,b) => a.concat(b));

        if (!isDrum && sampleHeaders.length === 0) {
            console.log('no sample!', semitone, preset, velocity);
            delayedReturn([]);
            return;
        }

        for (let [sam, gen, sampleNumber] of sampleHeaders) {
            let sampleSemitone = S.opt(gen.overridingRootKey).def(sam.originalPitch);
            let correctionCents = determineCorrectionCents(semitone - sampleSemitone, gen);
            let freqFactor = Math.pow(2, correctionCents / 1200);
            let sampleUrl = sampleDirUrl + '/' + sampleNumber + '_' + sam.sampleName.replace('#', '%23') + '.ogg';
            let audioNodes: AudioNode[] = [];

            S.opt(gen.initialFilterFc).get
            = filterFc => S.If(!performance.disableBiQuadFilter).then
            = () => {
                // taking twice CPU time...
                let biquadFilter = Tls.audioCtx.createBiquadFilter();
                biquadFilter.type = 'lowpass';
                // don't ask why "0.122322364", i just found two cases that match the equation in polyphone
                biquadFilter.frequency.value = (2 ** (gen.initialFilterFc / 1200)) / 0.122322364;
                biquadFilter.Q.value = 'initialFilterQ' in gen ? gen.initialFilterQ / 10 : 1.0;
                audioNodes.push(biquadFilter);
            };

            let fetched: IFetchedSample = null!;

            Tls.getAudioBuffer(sampleUrl, (resp) => {
                fetched = {
                    buffer: resp,
                    frequencyFactor: freqFactor,
                    isLooped: S.opt(gen.sampleModes).map(m => m === 1).def(false),
                    loopStart: (sam.startLoop + (gen.startloopAddrsOffset || 0)) / sam.sampleRate,
                    loopEnd: (sam.endLoop + (gen.endloopAddrsOffset || 0)) / sam.sampleRate,
                    stereoPan: sam.sampleType,
                    volumeKoef: S.opt(gen.initialAttenuation).map(a => dBtoKoef(-a / 10)).def(1) * (velocity / 127),
                    fadeMillis: isDrum ? 10000 : 100, // TODO: update the drum sample format to include generators for instrument and presets
                    audioNodes: audioNodes,
                };

                fetchedSamples.push(fetched);
                if (fetchedSamples.length === sampleHeaders.length) {
                    delayedReturn(fetchedSamples);
                }
            });
        }
    });

    /** @return value or starts fetching so next time you call it it was ready
     * @nullable */
    let fetchSamples = (semitone: number, preset: number, isDrum: boolean, velocity: number): IFetchedSample[] =>
    {
        let result: IFetchedSample[] = [];
        fetchSamplesAsync(semitone, preset, isDrum, velocity).then = samples => result = samples;
        return result;
    };

    return {
        fetchSamples: fetchSamples,
        fetchSamplesAsync: fetchSamplesAsync,
    };
};

export interface ISoundFontAdapter {
    fetchSamples: (semitone: number, preset: number, isDrum: boolean, velocity: number) => IFetchedSample[],
}

export interface IFetchedSample {
    buffer: AudioBuffer,
    isLooped: boolean,
    loopStart: seconds_t,
    loopEnd: seconds_t,
    frequencyFactor: number,
    stereoPan: EStereoPan,
    volumeKoef: number, // in [0..1]
    fadeMillis: number,
    audioNodes: AudioNode[], // filters that will be applied to the sample
}

export interface IGenerator {
    keyRange?: { // in semitones
        lo: number
        hi: number,
    },
    velRange?: {
        lo: number
        hi: number,
    },
    overridingRootKey?: number,
    fineTune?: number, // 100 of fineTune = 1 semitone
    coarseTune?: number,
    startloopAddrsOffset?: number, // add to sample.startLoop if present
    endloopAddrsOffset?: number, // add to sample.endLoop if present
    initialAttenuation?: number, // how much volume should be reduced in centibels
    initialFilterQ?: number, // BiquadFilterNode::Q * 10
    initialFilterFc?: number, // 2 ^ (it / 1200) = BiquadFilterNode::frequency * 0.122322364
    sampleModes?: number,
    pan?: number, // from -500 (full left) to +500 (full right)

    // shall be removed after collecting to hierarchy
    instrument?: number,
    sampleID?: number,
}

export enum EStereoPan {NONE = 0, MONO = 1, LEFT = 2, LINK = 3, RIGHT = 4}

export interface ISampleInfo extends dict_t {
    sampleName: string,
    originalPitch: number, // means nothing if "overridingRootKey" is defined in generator
    sampleRate: number, // like "44100" or "22500"
    startLoop: number, // divide by sampleRate to get in seconds
    endLoop: number, // divide by sampleRate to get in seconds
    sampleType: EStereoPan,
    sampleLink: number, // most time is zero. this is an index of another
                        // sample that will be played together with this

    pitchCorrection: number, // idk, but i suspect this may say if file was
    // achieved by tuning up/down an another file
}

export interface IInstrument {
    instrumentName: string, // human readable
    samples: Array<IInstrumentSample>,
    // _own_ generator belonging to every instance of the instrument
    // overriden by specific sample values if any
    generatorApplyToAll?: IGenerator,
}

// a preset generated by "/scripts/sf2parser_adapt.py"
export interface IPreset {
    presetName: string, // human readable name
    instruments: IPresetInstrument[],
    // combined with specific instrument values if any
    generatorApplyToAll: IGenerator,
}
