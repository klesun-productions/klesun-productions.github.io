
import {ISoundFontAdapter, IFetchedSample, EStereoPan} from "./SoundFontAdapter";
import {Tls} from "../utils/Tls";

/**
 * uses Denya-s screaming recording as note samples
 */
export var DenyaAdapter = function(): ISoundFontAdapter
{
    var fetchSample = (semitone: number, preset: number, isDrum: boolean, velocity: number): IFetchedSample[] =>
    {
        if (isDrum || +velocity === 0) {
            return [];
        }

        var sampleSemitone = 59; // TI
        var freqFactor = Math.pow(2, (semitone - sampleSemitone) / 12);

        var sampleUrl = '/src/synths/denyaAhh.ogg';
        var fetched: IFetchedSample = null;
        Tls.getAudioBuffer(sampleUrl, (resp) => fetched = {
            buffer: resp,
            frequencyFactor: freqFactor,
            isLooped: true,
            loopStart: 0.144694,
            loopEnd: 0.319478,
            stereoPan: EStereoPan.MONO,
            volumeKoef: 4 * velocity / 127,
            fadeMillis: 500,
            audioNodes: [],
        });

        return fetched ? [fetched] : [];
    };

    return {
        fetchSamples: fetchSample,
    };
};
