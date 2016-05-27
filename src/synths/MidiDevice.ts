/// <reference path="../references.ts" />

// sends noteOn messages to a synth device rather than playing notes through speakers
// Web MIDI is supported only by Chrome at the moment

import {Kl} from "../Tools";
import MIDIOutput = WebMidi.MIDIOutput;
import {ISynth} from "./ISynth";
import {IShChannel} from "../DataStructures";

export function MidiDevice(): ISynth
{
    var NOTE_ON = 0x90;
    var NOTE_OFF = 0x80;

    var volume = 127;

    var firstInit = true;
    var midiOutputList: MIDIOutput[] = [];

    var initControl = function($controlEl: JQuery)
    {
        $controlEl.empty()
            .append($('<div class="inlineBlock"></div>')
                .append('Volume Gain: ')
                .append($('<input type="range" min="0" max="127" step="1"/>')
                    .addClass("smallSlider").val(volume)
                    .on("input change", (e: any) => (volume = e.target.value))));
    };

    var init = function ($controlEl: JQuery)
    {
        if (firstInit) {
            firstInit = false;
            // TODO: for now calling navigator.requestMIDIAccess() blocks devices for other programs
            // investigate, how to free devices (output.open() ?). we should free them each time playback finished
            // upd.: open() does not help midiana, but it may be her problems. Musescore works alright with input
            if (navigator.requestMIDIAccess) {
                navigator.requestMIDIAccess().then(
                    ma => ma.outputs.forEach(o => midiOutputList.push(o)),
                    e => console.log("Failed To Access Midi, Even Though Your Browser Has The Method...", e)
                );
            } else {
                alert('Your browser does not support midi Devices. Pity, you could listen to music on your mega-device if you used chrome =P');
            }
        }

        initControl($controlEl);
    };

    // 127 = max velocity
    var noteOn = (tune: number,channel: number) =>
        midiOutputList.forEach(o => o.send([NOTE_ON - -channel, tune, volume] ));

    var noteOff = (tune: number,channel: number) =>
        midiOutputList.forEach(o => o.send([NOTE_OFF - -channel, tune, 0x40]));

    var setInstrument = (n: number, channel: number) =>
        midiOutputList.forEach(o => o.send([0xC0 - -channel, n]));

    var setVolume = (val: number, chan: number) =>
        midiOutputList.forEach(o => o.send([0xB0 + +chan, 7, val]));

    var openedDict: {[channel: number]: {[semitone: number]: number}} = {};
    Kl.range(0,16).forEach(n => (openedDict[n] = {}));

    /** @TODO: change arguments from "noteJs" to explicit "tune" and "channel" */

    /** @param noteJs - shmidusic Note external representation
     * @return function - lambda to interrupt note */
    var playNote = function(tune: number, channel: number)
    {
        if (+tune === 0) { // pauses in shmidusic... very stupid idea
            return () => {};
        }

        // stopping just for a moment to mark end of previous sounding if any
        if ((openedDict[channel][tune] || 0) > 0) {
            noteOff(tune, channel);
        }

        noteOn(tune, channel);

        openedDict[channel][tune] |= 0;
        openedDict[channel][tune] += 1;

        var stopNote = function() {
            if (--openedDict[channel][tune] === 0) {
                noteOff(tune, channel);
            }
        };

        return stopNote;
    };

    /** @param instrumentDict {channelNumber: instrumentNumber} */
    var consumeConfig = (instrumentDict: {[ch: number]: IShChannel}) =>
        Object.keys(instrumentDict).forEach(ch => {
            setInstrument(instrumentDict[+ch].preset, +ch);
            setVolume(instrumentDict[+ch].volume, +ch);
        });

    return {
        init: init,
        playNote: playNote,
        consumeConfig: consumeConfig,
        analyse: chords => {},
    };
};

