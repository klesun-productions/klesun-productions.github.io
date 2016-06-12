
/// <reference path="../references.ts" />

import {IShmidusicChord, IShChannel} from "../DataStructures";

// represents something that can play a note on one of 128 MIDI range instruments

export interface ISynth
{
    /** draws synth-specific controls on the passed container */
    init: ($cont: JQuery) => void,

    // TODO: it is likely a lame that we pass the channel each time. probably should
    // make a separate interface ISynthChannel and move all the following methods there

    /** @param $1 - semitone index; $2 - channel
     * @return lambda to call to interrupt note sounding */
    playNote: (sem: number, cha: number, velocity: number, chordIndex: number) => () => void,

    /** call this to say what midi program (instrument)
     * each channel is assigned to */
    consumeConfig: (programs: { [id: number]: IShChannel; }) => void,

    /** is supposed to be called before song playback started to pre-load samples */
    analyse: (chords: IShmidusicChord[]) => void,

    /** @param {unsigned int} semitones - so many semitones
     * will pitch be changed when 1.0 koef is passed to setPitchBend... */
    // setPitchBendRange: (semitones: number, channel: number) => void,

    /** @param {float} absolute koef [-1 ... +1] per channel.
     * multiply by current bend range to get the shift in semitones
     * examples if bend radius is set to 2
     * setPitchBend(1.75, 0) will highen pitch 2 * 1.75 = 3.5 semitones for zeroth channel
     * setPitchBend(-1.01, 4) will lower pitch 2 * 1.01 = 2.02 semitones for fourth channel */
    setPitchBend: (koef: number, channel: number) => void,
}

