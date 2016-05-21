
// this synth is the container of all other
// it contains the "Select Your Synth" dropdown

import {Oscillator} from "./Oscillator";
import {MidiDevice} from "./MidiDevice";
import {Fluid} from "./Fluid";
import {ISynth} from "./ISynth";
import {Kl} from "../Tools";
import {IPresetList} from "../Views";
import {IPianoLayout} from "../PianoLayout";

export function Switch(
    dropdownEl: HTMLSelectElement,
    controlEl: HTMLDivElement,
    presetListControl: IPresetList,
    pianoLayout: IPianoLayout
): ISynth
{
    var audioCtx = Kl.audioCtx;

    var synths: {[k: string]: ISynth} = {
        oscillator: Oscillator(audioCtx),
        midiDevice: MidiDevice(),
        FluidSynth3: Fluid(audioCtx, 'http://shmidusic.lv/out/sf2parsed/fluid/'),
        Arachno: Fluid(audioCtx, 'http://shmidusic.lv/out/sf2parsed/arachno/'),
        GeneralUser: Fluid(audioCtx, 'http://shmidusic.lv/out/sf2parsed/generaluser/'),
    };

    var changeSynth = function() {
        synths[$(dropdownEl).val()].init($(controlEl));
    };

    $(dropdownEl).empty();
    Object.keys(synths).forEach(s => $(dropdownEl)
        .append($('<option></option>').val(s).html(s)));

    $(dropdownEl).val('FluidSynth3').change(_ => changeSynth()).trigger('change');

    var playNote = function(sem: number, chan: number)
    {
        if (presetListControl.enabledChannels().has(chan)) {
            var noteOffs = [
                pianoLayout.playNote(sem, chan),
                synths[$(dropdownEl).val()].playNote(sem, chan),
            ];

            return () => noteOffs.forEach((off: () => void) => off());
        } else {
            return () => {};
        }
    };

    presetListControl.hangPresetChangeHandler(presByChan =>
        synths[$(dropdownEl).val()].consumeConfig(presByChan));

    pianoLayout.hangClickListener((semitone) => playNote(semitone, 0));

    // TODO: i believe, since we distinct soundfont synth-s here, we could declare the
    // TODO: "analyse()" only in them and remove the nasty method from the general interface

    return {
        playNote: playNote,
        consumeConfig: (config: {[c: number]: number}) => {
            presetListControl.update(config);
            synths[$(dropdownEl).val()].consumeConfig(config)
        },
        init: () => {},
        analyse: chords => synths[$(dropdownEl).val()].analyse(chords),
    };
};