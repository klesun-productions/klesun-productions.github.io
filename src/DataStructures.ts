
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
    // midi program number in range [0..128)
    instrument: number;
    // midi channel number in range [0..16)
    channelNumber: number;
    // midi channel starting volume in percents [0..100]
    volume?: number;
}

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
            /*
            * tact size in legacy format (i used to store numbers in bytes ages ago...)
            * if you divide it with, uh well, 8, you get the tact size
            */
            numerator?: number;
            // loop start tact number
            loopStart: number,
            // count of times playback will be rewinded
            // to the loopStart after last chord
            loopTimes: number,
            channelList: IChannel[];
        };
        chordList: Array<IShmidusicChord>;
    }>;
}

export interface IMidJsNote {
    /* midi value: [0..128) */
    tune: number;
    /* in "ticks" */
    duration: number;
    /* midi channel: [0..16) */
    channel: number;
    /* in "ticks" - when note starts */
    time: number;
}

// decoded midi file
export interface IMidJsSong {
    /*
    * "ticks" per second. the "ticks" is a conventional
    * unit, in which time will be represented further
    */
    division: number;
    tempoEventList: Array<{
        tempo: number; // value
        time: number; // start on
    }>;
    /* midi program numbers by channel number */
    instrumentDict: {
        [id: number]: number;
    };
    noteList: Array<IMidJsNote>;
}

export interface IGeneralStructure {
    chordList: IShmidusicChord[],
    config: {
        tempo: number,
        // tempoOrigin likely unused
        tempoOrigin?: number,
        instrumentDict: {[ch: number]: number},
        loopStart: number,
        loopTimes: number,
        volumeByChannel: {[ch: number]: number},
    },
    misc: {
        noteCount?: number
    },
}

export interface ISmfFile {
    rawFileName: string; // relative path to file
    fileName: string; // score will be cropped
    score: string;
}

export interface ISMFevent {
    delta: number, // 0
    type: 'meta' | 'MIDI',
}

export interface ISMFmetaEvent extends ISMFevent {
    metaType: number, // see midi docs. 3 - track name, 1 - text, 88 - tact size
    metaData: number[], // array of bytes that mean different things for different metaType-s
    type: 'meta',
}

export interface ISMFmidiEvent extends ISMFevent {
    midiChannel: number, // 1
    // i believe 9 is noteOn and 8 - noteOff,
    // 11 - control change, 12 - program change
    midiEventType: number, // 8
    parameter1: number, // 68
    parameter2?: number, // 64
    type: 'MIDI',
}

export interface ISMFreaded {
    format: number, // 1
    numTracks: number, // 3
    // divide an event time by this to get time in seconds
    ticksPerBeat: number, // 384
    tracks: Array<{
        trackName?: string,
        byteLength: number,
        events: ISMFevent[]
    }>
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