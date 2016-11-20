/// <reference path="../references.ts" />


import {seconds_t} from "../DataStructures";
import {Cls} from "../Cls";
import {Tls} from "../utils/Tls";
import {
    IInstrumentSample, IPresetInstrument, TransformSf2Parse,
    flattenSamples
} from "./soundfont/ParseSf2";

// this object provides access to soundfont info
// particularly it has a method that
// takes (semitone and preset) and
// returns (AudioBuffer, frequencyFactor, loopStart, loopEnd)

var Opt = function<T>(value?: T)
{
    var isPresent = value !== null && value !== undefined;

    return {
        map: <T2>(f: (arg: T) => T2): IOpt<T2> => isPresent
            ? Opt(f(value))
            : Opt(null),

        or: (def: T) => isPresent
            ? value
            : def,

        is: () => isPresent,
    };
};

interface IOpt<T> {
    map: <T2>(f: (arg: T) => T2) => IOpt<T2>,
    or: (def: T) => T,
    is: () => boolean,
}

export var SoundFontAdapter = Cls['SoundFontAdapter'] = function(soundfontDirUrl: string): ISoundFontAdapter
{
    var sampleDirUrl = soundfontDirUrl + '/samples/';

    var drumPreset: Array<{
        sampleNumber: number,
        sampleInfo: ISampleInfo,
        generators: IGenerator[],
    }>;
    var presets: {[preset: number]: Array<{
        sampleNumber: number,
        sampleInfo: ISampleInfo,
        generators: IGenerator[],
    }>};
    var whenLoaded: Array<() => void> = [];
    $.getJSON(soundfontDirUrl + '/sf2parser.out.json', (result) => {
        var transformed = flattenSamples(TransformSf2Parse(result));
        presets = transformed[0];
        var drumPresets = transformed[128];
        drumPreset = drumPresets[+Object.keys(drumPresets)[0]];
        whenLoaded.forEach(c => c());
    });

    var determineCorrectionCents = function(delta: number, generator: IGenerator): number
    {
        var result = delta * 100;

        if ('fineTune' in generator) {
            result += generator.fineTune;
        }

        if ('coarseTune' in generator) {
            result += generator.coarseTune * 100;
        }

        return result;
    };

    // overwrites global keys with local if any
    var updateGenerator = function(global: IGenerator, local: IGenerator): IGenerator
    {
        return $.extend({}, global, local);
    };

    // adds the tuning semi-tones and cents; multiplies whatever needs to be multiplied
    var combineGenerators = function(global: IGenerator, local: IGenerator): IGenerator
    {
        var result: IGenerator = $.extend({}, local);

        result.fineTune = (+result.fineTune || 0) + (+global.fineTune || 0);
        result.coarseTune = (+result.coarseTune || 0) + (+global.coarseTune || 0);
        result.initialAttenuation = (+result.initialAttenuation || 0) + (+global.initialAttenuation || 0);

        return result;
    };

    /** @param db - soundfont decibel value */
    var dBtoKoef = (db: number) => Math.pow(10, db/50); // yes, it is 50, not 10 and not 20 - see /tests/attenToPercents.txt

    /** @return value or starts fetching so next time you call it it was ready
     * @nullable */
    let fetchSample = (semitone: number, preset: number, isDrum: boolean, velocity: number): IFetchedSample[] =>
    {
        isDrum = isDrum || false;

        if (!presets || !drumPreset) {
            whenLoaded.push(() => fetchSample(semitone, preset, isDrum, velocity));
            return [];
        }

        let samples = !isDrum ? presets[preset] : drumPreset;

        // TODO: measure performance. it seems to me this guy eats lots of performance
        let matchingSamples: [ISampleInfo, IGenerator, number][] = samples
            .map(s => s.generators
                .filter(g =>
                    g.keyRange.lo <= semitone &&
                    g.keyRange.hi >= semitone &&
                    g.velRange.lo <= velocity &&
                    g.velRange.hi >= velocity)
                .map(g => <[ISampleInfo, IGenerator, number]>[s.sampleInfo, g, s.sampleNumber]))
            .reduce((a,b) => a.concat(b))
            ;

        if (matchingSamples.length === 0) {
            // matchingSamples = findClosest(semitone, samples);
            console.log('no sample!', semitone, preset);
            return [];
        }

        return matchingSamples.map(tuple => {
            var [sam, gen, sampleNumber] = tuple;
            let sampleSemitone = Opt(gen.overridingRootKey).or(sam.originalPitch);

            let correctionCents = determineCorrectionCents(semitone - sampleSemitone, gen);
            let freqFactor = Math.pow(2, correctionCents / 1200);

            // TODO: index rest soundfont samples
            let indexed = /zunpet/.test(soundfontDirUrl);

            var sampleUrl = sampleDirUrl + '/' + (indexed ? sampleNumber + '_' : '') + sam.sampleName.replace('#', '%23') + '.ogg';

            let audioNodes: AudioNode[] = [];
            if (Opt(gen.initialFilterFc).is()) {
                // // taking twice CPU time... should cache it somehow
                // var biquadFilter = Tls.audioCtx.createBiquadFilter();
                // biquadFilter.type = 'lowpass';
                // // don't ask why "0.122322364", i just found two cases that match the equation in polyphone
                // biquadFilter.frequency.value = (2 ** (generator.initialFilterFc / 1200)) / 0.122322364;
                // biquadFilter.Q.value = 'initialFilterQ' in generator ? generator.initialFilterQ / 10 : 1.0;
                // audioNodes.push(biquadFilter);
            }

            let fetched: IFetchedSample = null;
            Tls.getAudioBuffer(sampleUrl, (resp) => fetched = {
                buffer: resp,
                frequencyFactor: freqFactor,
                isLooped: Opt(gen.sampleModes).map(m => m === 1).or(false),
                loopStart: (sam.startLoop + (gen.startloopAddrsOffset || 0)) / sam.sampleRate,
                loopEnd: (sam.endLoop + (gen.endloopAddrsOffset || 0)) / sam.sampleRate,
                stereoPan: sam.sampleType,
                volumeKoef: Opt(gen.initialAttenuation).map(a => dBtoKoef(-a / 10)).or(1) * (velocity / 127),
                fadeMillis: isDrum ? 10000 : 100, // TODO: update the drum sample format to include generators for instrument and presets
                audioNodes: audioNodes,
            });

            return fetched;
        }).filter(s => s !== null);
    };

    return {
        fetchSamples: fetchSample,
    };
};

export interface ISoundFontAdapter {
    fetchSamples: (semitone: number, preset: number, isDrum: boolean, velocity: number) => IFetchedSample[],
};

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

    // shall be removed after collecting to hierarchy
    instrument?: number,
    sampleID?: number,
}
 
export enum EStereoPan {LEFT, MONO, RIGHT, LINK}

export interface ISampleInfo {
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

export interface IDrumPreset {
    stateProperties: Array<{
        instrument: IInstrument,
        samples: Array<ISampleInfo>,
    }>,
}