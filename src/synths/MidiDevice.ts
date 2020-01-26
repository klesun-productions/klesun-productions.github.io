/// <reference path="../references.ts" />


import {Tls} from "../utils/Tls";
import MIDIOutput = WebMidi.MIDIOutput;
import {ISynth} from "./ISynth";
import {IShChannel} from "../DataStructures";
import {Cls} from "../Cls";
import $ from 'https://cdnjs.cloudflare.com/ajax/libs/jquery/2.1.4/jquery.min.js';

// following constants represent the X in bits of midi message
// XXXX???? ???????? ????????

const NOTE_ON = 0x90;
const NOTE_OFF = 0x80;
const SET_PITCH_BEND = 224;

// and channel number bits are Y in the
// ????YYYY ???????? ????????

/** sends noteOn messages to a synth device rather than playing notes through speakers
  * Web MIDI is supported only by Chrome at the moment */
export var MidiDevice = (): IMidiDevice => {
    var volume = 110;

    var firstInit = true;
    var midiOutputList: MIDIOutput[] = [];
    var enabledOutputs: Set<number> = new Set([]);

    var midiAccessGranted = false;
    var whenAccessGranted: Array<() => void> = [];

    var send = (bytes: number[]) => {
        var outputs = (bytes[0] & 0xF0) === NOTE_ON
            ? Array.from(enabledOutputs).map(i => midiOutputList[i])
            : midiOutputList;

        var cb = () => outputs.forEach(o => o.send(bytes));
        if (midiAccessGranted) {
            cb();
        } else {
            whenAccessGranted.push(cb);
        }
    };

    var initControl = function($controlEl: JQuery)
    {
        $controlEl.empty()
            .append($('<div class="inlineBlock"></div>')
                .append('Volume Gain: ')
                .append($('<input type="range" min="0" max="127" step="1"/>')
                    .addClass("smallSlider").val(volume)
                    .on("input change", (e: any) => (volume = e.target.value))));

        midiOutputList.forEach((o,i) => {
            $('<div class="inlineBlock"></div>')
                .append(o.name)
                .append($('<input type="checkbox"/>')
                    .click((e: any) => e.target.checked
                        ? enabledOutputs.add(i)
                        : enabledOutputs.delete(i))
                    .click())
                .appendTo($controlEl);
        });

        $controlEl.append('<br clear="all"/>');
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
                    ma => {
                        ma.outputs.forEach(o => midiOutputList.push(o));
                        enabledOutputs = new Set(Tls.range(0, midiOutputList.length));
                        midiAccessGranted = true;
                        whenAccessGranted.splice(0).forEach(cb => cb());
                        initControl($controlEl);
                    },
                    e => console.log("Failed To Access Midi, Even Though Your Browser Has The Method...", e)
                );
            } else {
                alert('Your browser does not support midi Devices. Pity, you could listen to music on your mega-device if you used chrome =P');
            }
        } else if (midiAccessGranted) {
            initControl($controlEl);
        }
    };

    // 127 = max velocity
    var noteOn = (tune: number,channel: number, velocity: number) => send([NOTE_ON - -channel, tune, velocity * volume / 127]);
    var noteOff = (tune: number,channel: number) => send([NOTE_OFF - -channel, tune, 0x40]);
    var setInstrument = (n: number, channel: number) => send([0xC0 - -channel, n]);
    var setVolume = (val: number, chan: number) => send([0xB0 + +chan, 7, val]);
    
    var setPitchBendRange = function(semitones: number, channel: number)
    {
        send([0xB0 + channel, 100, 0]);
        send([0xB0 + channel, 101, 0]);
        send([0xB0 + channel, 6, semitones]);
    };
    
    var setPitchBend = function(koef: number, chan: number)
    {
        var intvalue = koef * (64 << 8) + (64 << 8);
        intvalue = Math.min(64 << 9 - 1, Math.max(0, intvalue));

        var [b1,b2] = [intvalue % 128, intvalue >> 8];

        send([SET_PITCH_BEND + +chan, b1, b2]);
    };

    var openedDict: {[channel: number]: {[semitone: number]: number}} = {};
    Tls.range(0,16).forEach(n => (openedDict[n] = {}));

    /** @param noteJs - shmidusic Note external representation
     * @return function - lambda to interrupt note */
    var playNote = function(tune: number, channel: number, velocity: number)
    {
        if (+tune === 0) { // pauses in shmidusic... very stupid idea
            return () => {};
        }

        // stopping just for a moment to mark end of previous sounding if any
        if ((openedDict[channel][tune] || 0) > 0) {
            noteOff(tune, channel);
        }

        noteOn(tune, channel, velocity);

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
            setPitchBendRange(instrumentDict[+ch].pitchBendRange || 2, +ch);
            setPitchBend(0, +ch);
            setVolume(127, +ch);
        });

    return {
        init: init,
        playNote: playNote,
        consumeConfig: consumeConfig,
        analyse: chords => {},
        sendCustom: send,
        setPitchBend: setPitchBend,
        setVolume: (koef,chan) => {}, // TODO: implement
    };
};

interface IMidiDevice extends ISynth {
    sendCustom: (bytes: number[]) => void,
}