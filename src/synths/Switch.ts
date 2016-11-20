
// this synth is the container of all other
// it contains the "Select Your Synth" dropdown

import {Oscillator} from "./Oscillator";
import {MidiDevice} from "./MidiDevice";
import {Fluid} from "./Fluid";
import {ISynth} from "./ISynth";
import {Tls} from "../utils/Tls";
import {IChannel, IShChannel, IShmidusicChord} from "../DataStructures";
import {IPresetList} from "../views/PresetList";
import {SoundFontAdapter} from "./SoundFontAdapter";
import {DenyaAdapter} from "./DenyaAdapter";

export let Switch = function(
    dropdownEl: HTMLSelectElement,
    controlEl: HTMLDivElement,
    presetListControl: IPresetList
): ISwitch
{
    let channels: {[c: number]: IShChannel} = Tls.range(0,16).map(i => 1 && {preset: 0});
    
    let pitchBendByChannel: {[c: number]: number} = Tls.range(0,16).map(i => 0);

    let synths: {[k: string]: ISynth} = {
        oscillator: Oscillator(Tls.audioCtx),
        midiDevice: MidiDevice(),
        FluidSynth3: Fluid(SoundFontAdapter('/out/sf2parsed/fluid/')),
        Arachno: Fluid(SoundFontAdapter('/out/sf2parsed/arachno/')),
        GeneralUser: Fluid(SoundFontAdapter('/out/sf2parsed/generaluser/')),
        ZUNPet: Fluid(SoundFontAdapter('/out/sf2parsed/zunpet/')),
        DenyaSynth: Fluid(DenyaAdapter()),
    };

    let initSynth = function(choosen: ISynth)
    {
        choosen.init($(controlEl));
        choosen.consumeConfig(channels);

        Tls.fori(pitchBendByChannel, (chan, koef) => choosen.setPitchBend(koef, chan));
    };

    Object.keys(synths).forEach(s => $(dropdownEl)
        .append($('<option></option>').val(s).html(s)));

    $(dropdownEl).val('FluidSynth3').change(_ => {
        let newValue = $(dropdownEl).val();
        $('body.withDenya').css('background-image', newValue === 'DenyaSynth' ? 'url(/imgs/denya_evil.png)' : 'url(/imgs/denya.png)');
        initSynth(synths[newValue]);
    }).trigger('change');

    let playNote = (sem: number, chan: number, volumeFactor: number, chordIndex: number) =>
        presetListControl.enabledChannels().has(chan)
            ?  synths[$(dropdownEl).val()].playNote(sem, chan, volumeFactor, chordIndex)
            : () => {};

    let analyse = (chords: IShmidusicChord[]) => synths[$(dropdownEl).val()].analyse(chords);

    let init = function()
    {
        presetListControl.onChange(presByChan =>
            synths[$(dropdownEl).val()].consumeConfig(presByChan));
    };

    init();

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
        analyse: analyse,
        analyzeActivePresets: () => analyse([{
            noteList: Tls.range(0, 16 * 128).map(i => 1 && {
                channel: i / 128 | 0,
                tune: i % 128,
                length: 0,
            }),
        }]),
    };
};

interface ISwitch extends ISynth {
    analyzeActivePresets: () => void,
}