/// <reference path="../references.ts" />


import * as Ds from "../DataStructures";
import {Kl} from "../Tools";
import {seconds_t} from "../DataStructures";

// this object provides access to soundfont info
// particularly it has a method that
// takes (semitone and preset) and
// returns (AudioBuffer, frequencyFactor, loopStart, loopEnd)

export function SoundFontAdapter(audioCtx: AudioContext, soundfontDirUrl: string)
{
    var sampleDirUrl = soundfontDirUrl + '/samples/';

    var presets: IPreset[] = null;
    var drumPreset: IDrumPreset = null;
    $.getJSON(soundfontDirUrl + '/presets.json', (result) => presets = result);
    $.getJSON(soundfontDirUrl + '/drumPreset.json', (result) => drumPreset = result);

    var cachedSampleBuffers: { [url: string]: AudioBuffer; } = {};
    var awaiting: { [url: string]: Array<{ (resp: AudioBuffer): void }> } = {};

    var getBuffer = function(url: string, onOk: { (resp: AudioBuffer): void }): void
    {
        if (!(url in cachedSampleBuffers)) {
            var request = new XMLHttpRequest();
            request.open('GET', url, true);
            request.responseType = 'arraybuffer';
            request.send();
            awaiting[url] = awaiting[url] || [];
            awaiting[url].push(onOk);
            request.onload = () => audioCtx.decodeAudioData(request.response, function(decoded)
            {
                awaiting[url].forEach(a => a(decoded));
                awaiting[url] = [];
                cachedSampleBuffers[url] = decoded;
            });
        } else {
            onOk(cachedSampleBuffers[url]);
        }
    };

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
        return $.extend(global, local);
    };

    // adds the tuning semi-tones and cents; multiplies whatever needs to be multiplied
    var combineGenerators = function(global: IGenerator, local: IGenerator): IGenerator
    {
        var result = $.extend(local, {});

        result.fineTune = (result.fineTune || 0) + (global.fineTune || 0);
        result.coarseTune = (result.coarseTune || 0) + (global.coarseTune || 0);

        return result;
    };

    /** @return value or starts fetching so next time you call it it was ready
     * @nullable */
    var fetchSample = (semitone: number, preset: number, isDrum: boolean): IFetchedSample =>
    {
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
        } else {
            var generator = combineGenerators(
                presets[preset].generatorApplyToAll || {},
                updateGenerator(presets[preset].instrument.generatorApplyToAll, sampleInfo.generator)
            );

            var sampleSemitone = 'overridingRootKey' in sampleInfo.generator
                ? sampleInfo.generator.overridingRootKey
                : sampleInfo.originalPitch;

            var correctionCents = determineCorrectionCents(semitone - sampleSemitone, generator);
            var freqFactor = Math.pow(2, correctionCents / 100 / 12);

            var sampleUrl = sampleDirUrl + '/' + sampleInfo.sampleName.replace('#', '%23') + '.ogg';

            var fetched: IFetchedSample = null;
            getBuffer(sampleUrl, (resp) => fetched = {
                buffer: resp,
                frequencyFactor: freqFactor,
                loopStart: (sampleInfo.startLoop + (generator.startloopAddrsOffset || 0)) / sampleInfo.sampleRate,
                loopEnd: (sampleInfo.endLoop + (generator.endloopAddrsOffset || 0)) / sampleInfo.sampleRate,
                stereoPan: sampleInfo.sampleType,
            });

            return fetched;
        }
    };

    return {
        fetchSample: fetchSample,
    };
};

export interface IFetchedSample {
    buffer: AudioBuffer,
    loopStart: seconds_t,
    loopEnd: seconds_t,
    frequencyFactor: number,
    stereoPan: EStereoPan,
}

interface IGenerator {
    keyRange?: { // in semitones
        hi: number,
        lo: number
    };
    overridingRootKey?: number;
    fineTune?: number; // 100 of fineTune = 1 semitone
    coarseTune?: number;
    startloopAddrsOffset?: number; // add to sample.startLoop if present
    endloopAddrsOffset?: number; // add to sample.endLoop if present
}
 
export enum EStereoPan {LEFT, MONO, RIGHT, LINK}

interface ISampleInfo {
    generator: IGenerator;
    sampleName: string;
    originalPitch: number; // means nothing if "overridingRootKey" is defined in generator
    sampleRate: number; // like "44100" or "22500"
    startLoop: number; // divide by sampleRate to get in seconds
    endLoop: number; // divide by sampleRate to get in seconds
    sampleType: EStereoPan;
    sampleLink: number; // most time is zero. this is an index of another
                        // sample that will be played together with this
}

// a preset generated by "/scripts/sf2parser_adapt.py"
interface IPreset {
    instrument: {
        samples: Array<ISampleInfo>;
        generatorApplyToAll: IGenerator; // overriden by specific sample values if any
    };
    generatorApplyToAll: IGenerator; // combined with specific instrument values if any
}

export interface IDrumPreset {
    stateProperties: Array<{
        instrument: {
            samples: Array<ISampleInfo>
        }
        samples: Array<ISampleInfo>
    }>;
}