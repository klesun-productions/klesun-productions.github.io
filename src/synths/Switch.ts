
// this synth is the container of all other
// it contains the "Select Your Synth" dropdown

import {Oscillator} from "./Oscillator";
import {MidiDevice} from "./MidiDevice";
import {ExtractedSamplesSynth} from "./ExtractedSamplesSynth";
import {ISynth} from "./ISynth";
import {Tls} from "../utils/Tls";
import {IChannel, IShChannel, IShmidusicChord} from "../DataStructures";
import {IPresetList} from "../views/PresetList";
import {DenyaAdapter} from "./DenyaAdapter";
import $ from 'https://cdnjs.cloudflare.com/ajax/libs/jquery/2.1.4/jquery.min.js';
import WebAudioSfSynthWrapper from "./WebAudioSfSynthWrapper";

export let Switch = function(
    dropdownEl: HTMLSelectElement,
    controlEl: HTMLDivElement,
    presetListControl: IPresetList,
    sf3Adapter: any = null
): ISwitch
{
    let channels: {[c: number]: IShChannel} = Tls.range(0,16).map(i => 1 && {preset: 0});
    
    let pitchBendByChannel: {[c: number]: number} = Tls.range(0,16).map(i => 0);
    let volumeByChannel: {[c: number]: number} = Tls.range(0,16).map(i => 1);

    let synths: {[k: string]: ISynth} = {
        oscillator: Oscillator(Tls.audioCtx),
        midiDevice: MidiDevice(),
        DenyaSynth: ExtractedSamplesSynth(DenyaAdapter()),
        ...(!sf3Adapter ? {} : {sf3: WebAudioSfSynthWrapper(sf3Adapter)}),
    };

    let initSynth = function(chosen: ISynth)
    {
        chosen.init($(controlEl));
        chosen.consumeConfig(channels);

        Tls.fori(pitchBendByChannel, (chan, koef) => chosen.setPitchBend(koef, chan));
        Tls.fori(volumeByChannel, (chan, koef) => chosen.setVolume(koef, chan));
    };

    Object.keys(synths).forEach(s => $(dropdownEl)
        .append($('<option></option>').val(s).html(s)));

    $(dropdownEl).val('sf3').change(() => {
        let newValue = $(dropdownEl).val();
        $('body.withDenya').css('background-image', newValue === 'DenyaSynth' ? 'url(/imgs/denya_evil.png)' : 'url(/imgs/denya.png)');
        initSynth(synths[newValue]);
    }).trigger('change');

    let playNote = (sem: number, chan: number, volumeFactor: number, chordIndex: number) =>
        presetListControl.enabledChannels().has(chan)
            ? synths[$(dropdownEl).val()].playNote(sem, chan, volumeFactor, chordIndex)
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
        setVolume: (koef, chan) => {
            volumeByChannel[chan] = koef;
            synths[$(dropdownEl).val()].setVolume(koef, chan);
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