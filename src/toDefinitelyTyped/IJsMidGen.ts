
// contains definitions from https://github.com/dingram/jsmidgen

// the main object, which is referenced by the "Midi" var in their docs
export interface IJsMidGen {
    // constructor (config?: IConfig) => IFile
    File: {
        prototype: IFile,
        new (config?: IConfig): IFile,
    },
    // constructor
    Track: {
        prototype: ITrack,
        new (config?: {events: IMidiEvent[]}): ITrack,
    },
};

interface IConfig {
    // TODO: please, always use 384 cuz it divides to both 3 and 128,
    // TODO: or else you'll get an error when note is triplet
    ticks?: number,
    /* initial tracks */
    tracks?: ITrack[],
}

// top level container of the midi data
// the container of Track list
interface IFile {
    addTrack: (t: ITrack) => void,
    toBytes: () => string,
};

// the container of Midi Messages
interface ITrack {
    setInstrument: (channel: number, instrument: number) => void
    // when 60, 1/4 note lasts 1 second, when 120 - 0.5 seconds and so on
    setTempo: (bpm: number) => void,
    /** @param time - in ticks. Pass ticks per beat to File constructor in IConfig */
    addNoteOn: (channel: number, pitch: number, time?: number, velocity?: number) => void,
    addNoteOff: (channel: number, pitch: number, time?: number) => void,
};

interface IMidiEvent {
    toBytes: () => string,
};