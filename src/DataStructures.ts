
import {ISynth} from "./synths/ISynth";
export interface ISongInfo {
    rawFileName: string;
}

export interface IShNote {
    // 1.0 - semibreve; 0.25 - quarter note; 0.1666 - triplet of a half note; and so on
    length: number;
    // midi channel number in range [0..16)
    channel: number;
    // midi noteOn event second byte - range [0..128)
    tune: number;
    // 127 (default) - max volume; 0 - zero volume.
    velocity?: number;
}

export interface IShmidusicChord {
    noteList: Array<IShNote>;
    // represents float absolute chord start time
    // in note lengths: (1/2, 10/4, 15/3, ...)
    timeFraction?: number;
}

export interface ITimedShChord extends IShmidusicChord {
    timeFraction: number;
}

// represents an info, persistent during song,
// that is limited to a single channel number
export interface IChannel {
    // midi program number in range [0..127]
    instrument: number;
    // midi channel number in range [0..16)
    channelNumber: number;
    // midi channel starting volume [0..127]
    volume?: number;
}

export interface IShChannel {
    preset: number,
    pitchBendRange?: number, // "2" if not present
};

// output of github.com/klesun/shmidusic
export interface IShmidusicStructure {
    staffList: Array<{
        staffConfig: {
            /*
            * when tempo is 60: 1/4 note length = 1 second;
            * when tempo is 240: 1/4 note length = 1/4 second
            */
            tempo: number;
            /*
            * a number in range [-7, 7]. when -1: Ti is flat;
            * when -2: Ti and Mi are flat; when +2: Fa and Re are sharp and so on...
            */
            keySignature?: number;
            tactSize?: number;
            // loop start tact number
            loopStart: number,
            // count of times playback will be rewinded
            // to the loopStart after last chord
            loopTimes: number,
            channelList: IChannel[],
        };
        chordList: IShmidusicChord[];
    }>;
}

/** @unused */
export interface IMidJsNote {
    /* midi value: [0..128) */
    tune: number;
    /* in "ticks" */
    duration: number;
    /* midi channel: [0..16) */
    channel: number;
    /* in "ticks" - when note starts */
    time: number;
    velocity: number;
}

export interface IGeneralStructure {
    chordList: ITimedShChord[],
    controlEvents: {[time: number]: Array<(s: ISynth) => void>},
    config: {
        tempo: number,
        loopStart: number,
        loopTimes: number,
        tactSize: number,
        keySignature: number,
        channels: {[ch: number]: IShChannel},
    },
    misc: {
        noteCount?: number,
        sourceSmf?: {},
    },
}

// should replace IGeneralStructure one day
// the idea is each midi event is a labda,
// that does something with ISynth, like playing
// a note, bending pitch or changing volume
export interface IAdaptedSmf {
    tempo: number,
    presetByChannel: {[chan: number]: number},
    loopStart: number,
    // time - absolute, float in academic 4/4 tacts,
    // like 5/4 or 2 or 3/7 or 47/2
    eventSequence: {[time: number]: Array<(s: ISynth) => [number, () => void]>},
}

export interface ISmfFile {
    rawFileName: string; // relative path to file
    fileName: string; // score will be cropped
    rating: string;
}
 
export type seconds_t = number;

declare var window: any;

var sf2parserGeneratorEnumeratorTable = [
    'startAddrsOffset',
    'endAddrsOffset',
    'startloopAddrsOffset',
    'endloopAddrsOffset',
    'startAddrsCoarseOffset',
    'modLfoToPitch',
    'vibLfoToPitch',
    'modEnvToPitch',
    'initialFilterFc',
    'initialFilterQ',
    'modLfoToFilterFc',
    'modEnvToFilterFc',
    'endAddrsCoarseOffset',
    'modLfoToVolume',
    undefined, // 14
    'chorusEffectsSend',
    'reverbEffectsSend',
    'pan',
    undefined,
    undefined,
    undefined, // 18,19,20
    'delayModLFO',
    'freqModLFO',
    'delayVibLFO',
    'freqVibLFO',
    'delayModEnv',
    'attackModEnv',
    'holdModEnv',
    'decayModEnv',
    'sustainModEnv',
    'releaseModEnv',
    'keynumToModEnvHold',
    'keynumToModEnvDecay',
    'delayVolEnv',
    'attackVolEnv',
    'holdVolEnv',
    'decayVolEnv',
    'sustainVolEnv',
    'releaseVolEnv',
    'keynumToVolEnvHold',
    'keynumToVolEnvDecay',
    'instrument',
    undefined, // 42
    'keyRange',
    'velRange',
    'startloopAddrsCoarseOffset',
    'keynum',
    'velocity',
    'initialAttenuation',
    undefined, // 49
    'endloopAddrsCoarseOffset',
    'coarseTune',
    'fineTune',
    'sampleID',
    'sampleModes',
    undefined, // 55
    'scaleTuning',
    'exclusiveClass',
    'overridingRootKey'
];