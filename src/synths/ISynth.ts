
/// <reference path="../references.ts" />

// represents something that can play a note on one of 128 MIDI range instruments

import {IShmidusicChord} from "../DataStructures";
export interface ISynth
{
    /** @param $1 - semitone index; $2 - channel
     * @return lambda to call to interrupt note sounding */
    playNote: { (semitone: number, channel: number): { (): void } };
    // call this to say what midi program (instrument)
    // each channel is assigned to
    consumeConfig: { (programs: { [id: number]: number; }): void };
    // draws synth-specific controls on the passed container
    init: { ($cont: JQuery): void };
    // is supposed to be called before song playback started to pre-load samples
    analyse: {(chords: IShmidusicChord[]): void};
}

