/// <reference path="../references.ts" />


import * as Ds from "./DataStructures";
import {Kl} from "../Tools";

// this object provides access to soundfont info
// particularly it has a method that
// takes (semitone and preset) and
// returns (AudioBuffer, frequencyFactor, loopStart, loopEnd)

export function SoundFontAdapter(audioCtx: AudioContext, soundfontDirUrl: string)
{
    var sampleDirUrl = soundfontDirUrl + '/samples/';

    var presets: Ds.IPreset[] = null;
    var drumPreset: Ds.IDrumPreset = null;
    $.getJSON(soundfontDirUrl + '/presets.json', (result) => presets = result);
    $.getJSON(soundfontDirUrl + '/drumPreset.json', (result) => drumPreset = result);

    var cachedSampleBuffers: { [url: string]: AudioBuffer; } = {};
    var awaiting: { [url: string]: Array<{ (resp: AudioBuffer): void }> } = {};

    var promiseCache: {(): IFetchedSample}[][][] = [
        Kl.range(0,128).map(_ => []), // tunable
        Kl.range(0,128).map(_ => [])  // drums
    ];

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

    var determineCorrectionCents = function(delta: number, generator: Ds.IGenerator): number
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
    var updateGenerator = function(global: Ds.IGenerator, local: Ds.IGenerator): Ds.IGenerator
    {
        return $.extend(global, local);
    };

    // adds the tuning semi-tones and cents; multiplies whatever needs to be multiplied
    var combineGenerators = function(global: Ds.IGenerator, local: Ds.IGenerator): Ds.IGenerator
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

        var sampleList: Ds.ISampleInfo[] = [].concat.apply([], sampleListList);

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
                loopStart: sampleInfo.startLoop / sampleInfo.sampleRate,
                loopEnd: sampleInfo.endLoop / sampleInfo.sampleRate,
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
    loopStart: Ds.seconds_t,
    loopEnd: Ds.seconds_t,
    frequencyFactor: number,
}