
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
    var song: IGeneralStructure = {
        chordList: [],
        config: {
            tempo: 120,
            instrumentDict: {},
            loopStart: 0,
            loopTimes: 0,
        },
        misc: {},
    };

    var handleChannelEvent =
        (chordByTime: {[t: number]: IMidJsNote[]}, openNotes: ticks_t[][]) =>
        (time: ticks_t, event: ISMFmidiEvent, trackIdx: number) =>
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

        if ([8,9].includes(event.midiEventType)) {
            // noteOn/Off
            var velocity = event.midiEventType === 8 ? 0 : event.parameter2;
            handleNote(event.parameter1, velocity);
        } else if (+event.midiEventType === 12) {
            // program change
            song.config.instrumentDict[event.midiChannel] = event.parameter1;
        } else if (+event.midiEventType === 11) {
            // control change
        } else {
            // ???
        }
    };

    var ignoredMetas = [2];

    var handleMetaEvent = (time: ticks_t, event: ISMFmetaEvent, trackIdx: number) =>
    {
        // see http://www.recordingblogs.com/sa/tabid/88/Default.aspx?topic=MIDI+meta+messages
        var handlers: {[n: number]: (...bytes: number[]) => void} = {
            1: (...letters) => {}, // TextEvent - each byte in e.metaData is a character, 8_elfenLied.mid
            3: (...letters) => {}, // TrackName - each byte in e.metaData is a character, 8_elfenLied.mid
            9: (...letters) => {}, // Song Name - each byte in e.metaData is a character, 8_elfenLied.mid
            10: (...letters) => {}, // Transcribed by - each byte in e.metaData is a character, 8_elfenLied.mid

            33: (ch) => {}, // channel change - next meta messages are applied only for this channel
            47: (_) => {}, // EndOfTrack - useless, 8_elfenLied.mid
            81: (value) => {}, // SetTempo value - The number of microseconds per beat, 8_elfenLied.mid
                              // i believe due to uselessness cuz got TimeSignature,
            84: (timeCodeType, h, m, s, f, ff) => {}, // SMPTEOffset, 8_bleach_never_meant_to_belong.mid
            88: (num, den, midClocksPerMetrClick, thirtySecondsPer24Clocks) => {}, // TimeSignature, 8_elfenLied.mid
            89: (fifths, mode) => {}, // KeySignature, 8_bleach_never_meant_to_belong.mid
        };

        if (event.metaType in handlers) {
            handlers[event.metaType].apply(this, event.metaData);
        } else if (!ignoredMetas.includes(event.metaType)) {
            console.log(
                'got unknown meta code message', event.metaType, event.metaData,
                event.metaData.map(c => String.fromCharCode(c)).join(''));
        }
    };

    // static
    var getChordsAndMetas = function(smf: ISMFreaded): [{[t: number]: IMidJsNote[]}, any]
    {
        var chordByTime: {[t: number]: IMidJsNote[]} = {};
        var openNotes: ticks_t[][] = Kl.range(0,16).map(i => []);

        smf.tracks.forEach((t,i) => {
            var time = 0;
            t.events.forEach(e => {
                time += e.delta;

                if (e.type === 'MIDI') {
                    handleChannelEvent(chordByTime, openNotes)(time, <ISMFmidiEvent>e, i);
                } else if (e.type === 'meta') {
                    handleMetaEvent(time, <ISMFmetaEvent>e, i);
                } else {
                    console.log('unexpected SMF event type', e.type, e);
                }
            });
        });

        return [chordByTime, -100];
    };

    var [tickChords, config] = getChordsAndMetas(smf);

    var ticksToAcademic = (t: number) => t / smf.ticksPerBeat / 4;

    song.chordList = Object.keys(tickChords)
        .sort((a,b) => +a - +b)
        .map(k => 1 && {
            timeFraction: ticksToAcademic(+k),
            noteList: tickChords[+k].map(n => 1 && {
                length: ticksToAcademic(n.duration),
                tune: n.tune,
                channel: n.channel
            })
        });

    return song;
};