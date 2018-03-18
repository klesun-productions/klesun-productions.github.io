
import {IShmidusicStructure, IGeneralStructure} from "../DataStructures";
import {Adp} from "../Adp";
import {SoundFontAdapter, IFetchedSample} from "../synths/SoundFontAdapter";
import {Tls} from "../utils/Tls";

let soundFont = SoundFontAdapter('/out/sf2parsed/zunpet/');

let tuple = <T1, T2>(a: T1, b: T2): [T1, T2] => [a, b];

/**
 * create .wav file data from midi
 */
export let BuildWaveForm = function(song: IShmidusicStructure): AudioBuffer
{
    let toMillis = (length: number, tempo: number) => 1000 * length * 60 / (tempo / 4);
    let millisToSamples = (m: number) => m / 1000 * 44100;
    let toSamples = (t: number) => millisToSamples(toMillis(t, 120));

    // TODO: no hardcoded length
    let buffer = Tls.audioCtx.createBuffer(1, millisToSamples(240 * 1000), Tls.audioCtx.sampleRate);
    let data = buffer.getChannelData(0);

    let channelToPreset = new Map(song.staffList[0].staffConfig.channelList.map(c => tuple(c.channelNumber, c.instrument)));

    let time = 0;
    for (let chordData of song.staffList[0].chordList) {
        let chord = Adp.Chord(chordData);
        for (let note of chord.s.noteList) {
            if (note.tune === 0 && note.channel === 9) continue;

            let noteFrames = toSamples(note.length);
            let fileList = soundFont.fetchSamples(note.tune, channelToPreset.get(note.channel) || 0, note.channel === 9, 127);

            for (let file of fileList) {
                let fileData = file.buffer.getChannelData(0);
                let i = 0;
                for (i = 0; i < Math.min(noteFrames, fileData.byteLength); ++i) {
                    let frame = i / file.frequencyFactor;
                    let value = fileData[i];

                    let floatIndex = toSamples(time) + frame;

                    let l = floatIndex | 0;
                    let r = l + 1;

                    // 0.3 - attenuation

                    data[l] += (1 - (floatIndex - l)) * value * 0.3;
                    data[r] += (1 - (r - floatIndex)) * value * 0.3;
                }
            }
        }

        time += chord.getLength();
    }

    return buffer;
};
