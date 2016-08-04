
// this synth is the container of all other
// it contains the "Select Your Synth" dropdown

import {Oscillator} from "./Oscillator";
import {MidiDevice} from "./MidiDevice";
import {Fluid} from "./Fluid";
import {ISynth} from "./ISynth";
import {Tls} from "../utils/Tls";
import {IPianoLayout} from "../views/PianoLayout";
import {IChannel, IShChannel} from "../DataStructures";
import {IPresetList} from "../views/PresetList";
import {SoundFontAdapter} from "./SoundFontAdapter";
import {DenyaAdapter} from "./DenyaAdapter";

export function Switch(
    dropdownEl: HTMLSelectElement,
    controlEl: HTMLDivElement,
    presetListControl: IPresetList,
    pianoLayout: IPianoLayout
): ISynth
{
    var channels: {[c: number]: IShChannel} = Tls.range(0,16).map(i => 1 && {preset: 0});
    
    var pitchBendByChannel: {[c: number]: number} = Tls.range(0,16).map(i => 0);

    var synths: {[k: string]: ISynth} = {
        oscillator: Oscillator(Tls.audioCtx),
        midiDevice: MidiDevice(),
        FluidSynth3: Fluid(SoundFontAdapter('/out/sf2parsed/fluid/')),
        Arachno: Fluid(SoundFontAdapter('/out/sf2parsed/arachno/')),
        GeneralUser: Fluid(SoundFontAdapter('/out/sf2parsed/generaluser/')),
        DenyaSynth: Fluid(DenyaAdapter()), 
    };

    var initSynth = function(choosen: ISynth)
    {
        choosen.init($(controlEl));
        choosen.consumeConfig(channels);

        Tls.fori(pitchBendByChannel, (chan, koef) => choosen.setPitchBend(koef, chan));
    };

    Object.keys(synths).forEach(s => $(dropdownEl)
        .append($('<option></option>').val(s).html(s)));

    $(dropdownEl).val('FluidSynth3').change(_ => initSynth(synths[$(dropdownEl).val()])).trigger('change');

    var playNote = function(sem: number, chan: number, volumeFactor: number, chordIndex: number)
    {
        if (presetListControl.enabledChannels().has(chan)) {
            var noteOffs = [
                pianoLayout.playNote(sem, chan),
                synths[$(dropdownEl).val()].playNote(sem, chan, volumeFactor, chordIndex),
            ];

            return () => noteOffs.forEach((off: () => void) => off());
        } else {
            return () => {};
        }
    }; 

    presetListControl.hangPresetChangeHandler(presByChan =>
        synths[$(dropdownEl).val()].consumeConfig(presByChan));

    pianoLayout.hangClickListener((semitone) => playNote(semitone, 0, 127, -1));

    // TODO: i believe, since we distinct soundfont synth-s here, we could declare the
    // TODO: "analyse()" only in them and remove the nasty method from the general interface

    return {
        playNote: playNote,
        consumeConfig: (config) => {
            channels = config;
            presetListControl.update(config);
            synths[$(dropdownEl).val()].consumeConfig(config);
        },
        setPitchBend: (koef, chan) => {
            pitchBendByChannel[chan] = koef;
            synths[$(dropdownEl).val()].setPitchBend(koef, chan);
        },
        init: () => {},
        analyse: chords => synths[$(dropdownEl).val()].analyse(chords),
    };
};