/// <reference path="../references.ts" />


import {seconds_t} from "../DataStructures";
import {Cls} from "../Cls";
import {Tls} from "../utils/Tls";

// this object provides access to soundfont info
// particularly it has a method that
// takes (semitone and preset) and
// returns (AudioBuffer, frequencyFactor, loopStart, loopEnd)

export var SoundFontAdapter = Cls['SoundFontAdapter'] = function(soundfontDirUrl: string): ISoundFontAdapter
{
    var sampleDirUrl = soundfontDirUrl + '/samples/';

    var presets: IPreset[] = null;
    var drumPreset: IDrumPreset = null;
    var whenLoaded: Array<() => void> = [];
    $.getJSON(soundfontDirUrl + '/presets.json', (result) => {
        presets = result;
        drumPreset && whenLoaded.forEach(c => c());
    });
    $.getJSON(soundfontDirUrl + '/drumPreset.json', (result) => {
        drumPreset = result;
        presets && whenLoaded.forEach(c => c());
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
    var fetchSample = (semitone: number, preset: number, isDrum: boolean, velocity: number): IFetchedSample =>
    {
        isDrum = isDrum || false;

        if (!presets || !drumPreset) {
            whenLoaded.push(() => fetchSample(semitone, preset, isDrum, velocity));
            return null;
        }

        var sampleListList = isDrum
            ? drumPreset.stateProperties.map(p => p.instrument.samples)
            : [presets[preset].instrument.samples];

        var sampleList: ISampleInfo[] = [].concat.apply([], sampleListList);

        var sampleInfo = sampleList
            .filter(s => !('keyRange' in s.generator) ? true :
            s.generator.keyRange.lo <= semitone &&
            s.generator.keyRange.hi >= semitone)[0];

        /** @debug */
        if (!sampleInfo) {
            console.log('no sample!', semitone, preset);
            return null;
        } else {
            var generator = combineGenerators(
                updateGenerator(presets[preset].generatorApplyToAll || {}, presets[preset].instrument.generator),
                updateGenerator(presets[preset].instrument.generatorApplyToAll, sampleInfo.generator)
            );

            var sampleSemitone = 'overridingRootKey' in sampleInfo.generator
                ? sampleInfo.generator.overridingRootKey
                : sampleInfo.originalPitch;

            var correctionCents = determineCorrectionCents(semitone - sampleSemitone, generator);
            var freqFactor = Math.pow(2, correctionCents / 1200);

            var sampleUrl = sampleDirUrl + '/' + sampleInfo.sampleName.replace('#', '%23') + '.ogg';

            var audioNodes: AudioNode[] = [];
            if ('initialFilterFc' in generator) {
                // taking twice CPU time... should cache it somehow
                // var biquadFilter = audioCtx.createBiquadFilter();
                // biquadFilter.type = 'lowpass';
                // // don't ask why "0.122322364", i just found two cases that match the equation in polyphone
                // biquadFilter.frequency.value = (2 ** (generator.initialFilterFc / 1200)) / 0.122322364;
                // biquadFilter.Q.value = 'initialFilterQ' in generator ? generator.initialFilterQ / 10 : 1.0;
                // audioNodes.push(biquadFilter);
            }

            var fetched: IFetchedSample = null;
            Tls.getAudioBuffer(sampleUrl, (resp) => fetched = {
                buffer: resp,
                frequencyFactor: freqFactor,
                isLooped: 'sampleModes' in generator && generator.sampleModes === 1,
                loopStart: (sampleInfo.startLoop + (generator.startloopAddrsOffset || 0)) / sampleInfo.sampleRate,
                loopEnd: (sampleInfo.endLoop + (generator.endloopAddrsOffset || 0)) / sampleInfo.sampleRate,
                stereoPan: sampleInfo.sampleType,
                volumeKoef: ('initialAttenuation' in generator ? dBtoKoef(-generator.initialAttenuation / 10) : 1) * (velocity / 127),
                fadeMillis: 50,
                audioNodes: audioNodes,
            });

            return fetched;
        }
    };

    return {
        fetchSample: fetchSample,
    };
};

export interface ISoundFontAdapter {
    fetchSample: (semitone: number, preset: number, isDrum: boolean, velocity: number) => IFetchedSample,
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

interface IGenerator {
    keyRange?: { // in semitones
        hi: number,
        lo: number
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
}
 
export enum EStereoPan {LEFT, MONO, RIGHT, LINK}

interface ISampleInfo {
    generator: IGenerator,
    sampleName: string,
    originalPitch: number, // means nothing if "overridingRootKey" is defined in generator
    sampleRate: number, // like "44100" or "22500"
    startLoop: number, // divide by sampleRate to get in seconds
    endLoop: number, // divide by sampleRate to get in seconds
    sampleType: EStereoPan,
    sampleLink: number, // most time is zero. this is an index of another
                        // sample that will be played together with this
}

// a preset generated by "/scripts/sf2parser_adapt.py"
interface IPreset {
    instrument: {
        samples: Array<ISampleInfo>,
        generator: IGenerator,
        generatorApplyToAll: IGenerator, // overriden by specific sample values if any
    },
    generatorApplyToAll: IGenerator, // combined with specific instrument values if any
}

export interface IDrumPreset {
    stateProperties: Array<{
        instrument: {
            samples: Array<ISampleInfo>
        }
        samples: Array<ISampleInfo>
    }>,
}