
/// <reference path="../../../libs/definitelytyped/lib.es6.d.ts" />

import {ISMFreaded} from "../DataStructures";
import {IGeneralStructure} from "../DataStructures";
import {ISMFmidiEvent} from "../DataStructures";
import {ISMFmetaEvent} from "../DataStructures";
import {Kl} from "../Tools";
import {IShNote} from "../DataStructures";
import {IMidJsNote} from "../DataStructures";
import {IMidJsSong} from "../DataStructures";

type ticks_t = number;

// this function converts SMF midi events to a bit more structured representation
// - there is only single noteOn with sounding duration
// - all control messages are gathered in a single place

export function Structurator(smf: ISMFreaded): IGeneralStructure
{
    var chordByTime: {[t: number]: IMidJsNote[]} = {};
    var tempoByTime: {[t: number]: number} = {};
    var presetByChannel: {[ch: number]: number} = {};
    var volumeByChannel: {[ch: number]: number} = {};
    var pitchBends: [number, number, number, number][] = [];
    var loopStart: number = null;
    var loopEnd: number = 0;

    var unknownControlChanges: [number, number, number][] = [];

    var openNotes: ticks_t[][] = Kl.range(0,16).map(i => []);

    var handleChannelEvent = (time: ticks_t, event: ISMFmidiEvent, trackIdx: number) =>
    {
        var ch = event.midiChannel;
        var handleNote = (semitone: number, velocity: number) =>
        {
            if (!velocity && (semitone in openNotes[ch])) {

                var startedAt = +openNotes[ch][semitone];
                delete openNotes[ch][semitone];

                chordByTime[startedAt] = chordByTime[startedAt] || [];
                chordByTime[startedAt].push({
                    time: startedAt,
                    duration: time - startedAt,
                    tune: semitone,
                    channel: ch
                });
            } else if (velocity && !(semitone in openNotes[ch])) {
                openNotes[ch][semitone] = time;
            }
        };

        // http://www.nortonmusic.com/midi_cc.html
        var controlHandlers: {[n: number]: (param: number) => void} = {
            0: (p) => {}, // bank select
            7: (p) => volumeByChannel[ch] = p,
            10: (p) => {}, // pan select
            32: (p) => {}, // bank select 2
        };

        if ([8,9].includes(event.midiEventType)) {
            // noteOn/Off
            var velocity = event.midiEventType === 8 ? 0 : event.parameter2;
            handleNote(event.parameter1, velocity);
        } else if (+event.midiEventType === 12) {
            // program change
            presetByChannel[event.midiChannel] = event.parameter1;
        } else if (+event.midiEventType === 11) {
            // control change
            if (event.parameter1 in controlHandlers) {
                controlHandlers[event.parameter1](event.parameter2);
            } else {
                unknownControlChanges.push([time, event.parameter1, event.parameter2]);
            }
        } else if (+event.midiEventType === 14) {
            // pitch bend
            pitchBends.push([time, ch, event.parameter1, event.parameter2]);
        } else {
            // ???
            console.log('got unknown channel event: ', time, event);
        }
    };

    var ignoredMetas = [2];

    var handleMetaEvent = (time: ticks_t, event: ISMFmetaEvent, trackIdx: number) =>
    {
        var strBytes = (letters: number[]) =>
            letters.map(c => String.fromCharCode(c)).join('');

        // see http://www.recordingblogs.com/sa/tabid/88/Default.aspx?topic=MIDI+meta+messages
        var handlers: {[n: number]: (...bytes: number[]) => void} = {
            1: (...letters) => {}, // TextEvent
            3: (...letters) => {}, // TrackName
            4: (...letters) => console.log('Text Event, Instrument: ', strBytes(letters)),
            5: (...letters) => {}, // lyrics

            6: (...letters) => {
                console.log('Text Event, Technical Info: ', time, strBytes(letters));
                switch(strBytes(letters)) {
                    case 'loopStart':case 'Start': loopStart = time;
                    case 'loopEnd': loopEnd = time;
                }
            },
            8: (...letters) => console.log('Text Event, Song Name: ', strBytes(letters)),
            9: (...letters) => console.log('Text Event, Album Name: ', strBytes(letters)),
            10: (...letters) => console.log('Text Event, Author: ', strBytes(letters)),
            12: (...letters) => console.log('Text Event, Author 2: ', strBytes(letters)),

            33: (ch) => {}, // channel change - next meta messages are applied only for this channel
            47: (_) => {}, // EndOfTrack - useless, 8_elfenLied.mid
            81: (...bytes) => {  // SetTempo value - The number of microseconds per beat, 8_elfenLied.mid
                tempoByTime[time] = 60 * 1000000 / bytes.reduce((a,b) => (a << 8) + b);
            },
            84: (timeCodeType, h, m, s, f, ff) => {}, // SMPTEOffset, 8_bleach_never_meant_to_belong.mid
            88: (num, den, midClocksPerMetrClick, thirtySecondsPer24Clocks) => {}, // TimeSignature, 8_elfenLied.mid
            89: (fifths, mode) => {}, // KeySignature, 8_bleach_never_meant_to_belong.mid
            127: (...bytes) => {}, // Sequencer Specific
        };

        if (event.metaType in handlers) {
            handlers[event.metaType].apply(this, event.metaData);
        } else if (!ignoredMetas.includes(event.metaType)) {
            console.log(
                'got unknown meta code message', event.metaType, event.metaData,
                strBytes(event.metaData));
        }
    };

    // static
    var fillChordsAndMetas = function(smf: ISMFreaded): void
    {
        var sysexes: [number, number[]][] = [];

        smf.tracks.forEach((t,i) => {
            var time = 0;
            t.events.forEach(e => {
                time += e.delta;
                if (e.type === 'MIDI') {
                    handleChannelEvent(time, <ISMFmidiEvent>e, i);
                } else if (e.type === 'meta') {
                    handleMetaEvent(time, <ISMFmetaEvent>e, i);
                } else if (e.type === 'sysex') {
                    sysexes.push([time, (<any>e).metaData]);
                } else {
                    console.log('unexpected SMF event type', e.type, e);
                }
            });
        });

        sysexes.length && console.log('Got Sysex Events: ', sysexes);
    };

    var ticksToAcademic = (t: number) => t / smf.ticksPerBeat / 4;
    var getLongestTempo = function(): number
    {
        var prevTime = 0, prevTempo = 120;

        var longestTempo = 121;
        var longestDuration = 0;

        Object.keys(tempoByTime)
            .sort((a,b) => +a - +b)
            .concat(Object.keys(chordByTime)
                .sort((a,b) => +a - +b)
                .slice(-1))
            .forEach((eTime =>
        {
            var lastDuration = +eTime - prevTime;

            if (lastDuration >= longestDuration) {
                [longestTempo, longestDuration] = [prevTempo, lastDuration];
            }

            [prevTime, prevTempo] = [+eTime, tempoByTime[+eTime]];
        }));

        return longestTempo;
    };

    fillChordsAndMetas(smf);

    /** @debug */
    unknownControlChanges.length && console.log('got unknown control changes', unknownControlChanges);
    pitchBends.length && console.log('got pitch bends', pitchBends);

    return {
        chordList: Object.keys(chordByTime)
            .sort((a,b) => +a - +b)
            .map(k => 1 && {
                timeFraction: ticksToAcademic(+k),
                noteList: chordByTime[+k].map(n => 1 && {
                    length: ticksToAcademic(n.duration),
                    tune: n.tune,
                    channel: n.channel
                })
            }),
        config: {
            tempo: getLongestTempo(),
            instrumentDict: presetByChannel,
            loopStart: ticksToAcademic(loopStart || 0),
            loopTimes: loopStart !== null ? 1 : 0,
            volumeByChannel: volumeByChannel,
        },
        misc: {},
    };
};