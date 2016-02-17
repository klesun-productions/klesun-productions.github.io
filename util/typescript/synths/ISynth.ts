
/// <reference path="../../../libs/jqueryTyped/jquery.d.ts" />

interface ISynth
{
    /** @param $1 - semitone index; $2 - channel
     * @return lambda to call to interrupt note sounding */
    playNote: { (semitone: number, channel: number): { (): void } };
    // call this to say what midi program (instrument)
    // each channel is assigned to
    consumeConfig: { (programs: { [id: number]: number; }): void };
    // draws synth-specific controls on the passed container
    init: { ($cont: JQuery): void };
}

