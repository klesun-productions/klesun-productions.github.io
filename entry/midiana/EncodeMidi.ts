
import {IShmidusicStructure, IShmidusicChord} from "../../src/DataStructures";
import {IJsMidGen} from "../../src/toDefinitelyTyped/IJsMidGen";
import {Tls} from "../../src/utils/Tls";

// encodes IShmidusicStructure song into a Standard Midi File (.mid)
// .mid files can be opened in some popular players, like Van Basco
// .mid files are also supported by most composing software, like Musescore, Cubase
// .mid files are also used by Synthesia, a well-known educational piano application

import 'https://cdn.jsdelivr.net/npm/jsmidgen@0.1.5/lib/jsmidgen.js';
declare var Midi: IJsMidGen;

const TICKS_PER_BEAT = 384;

const str2ab = function(str: string) {
    var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
    var bufView = new Uint16Array(buf);
    for (var i=0, strLen=str.length; i<strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
};

var getLength = (c: IShmidusicChord) => Math.min.apply(null, c.noteList.map(n => n.length));

var toTicks = (academic: number) =>
    Math.round(academic * TICKS_PER_BEAT * 4); // likely correct

interface IEvent {
    eventType: 'noteOn' | 'noteOff',
    addEvent: (t: number) => void,
}

export function EncodeMidi(song: IShmidusicStructure): ArrayBuffer // sequence of bytes
{
    var configTrack = new Midi.Track();
    configTrack.setTempo(song.staffList[0].staffConfig.tempo);
    song.staffList[0].staffConfig.channelList.forEach(chan =>
        configTrack.setInstrument(chan.channelNumber, chan.instrument));

    var eventsByTime: {[t: number]: IEvent[]} = [];

    var noteTrack = new Midi.Track();
    var time = 0;
    song.staffList[0].chordList.forEach(chord => {
        chord.noteList.forEach(note => {
            let keyTime = toTicks(time);
            eventsByTime[keyTime] = keyTime in eventsByTime ? eventsByTime[keyTime] : [];
            eventsByTime[keyTime].push({
                eventType: 'noteOn',
                addEvent: ticks => noteTrack.addNoteOn(note.channel, note.tune, ticks, note.velocity || 127),
            });

            var offTime = time + note.length;
            let keyOffTime = toTicks(offTime);

            eventsByTime[keyOffTime] = keyOffTime in eventsByTime ? eventsByTime[keyOffTime] : [];
            eventsByTime[keyOffTime].push({
                eventType: 'noteOff',
                addEvent: ticks => noteTrack.addNoteOff(note.channel, note.tune, ticks),
            });
        });
        time += getLength(chord);
    });

    var sorted: {key: number, val: {(deltaTicks: number): void}[]}[] = Object
        .keys(eventsByTime)
        .map(k => +k)
        .sort((a,b) => a - b)
        .map(k => 1 && {
            key: k,
            val: eventsByTime[k]
                .sort((a, b) => (
                    (a.eventType === 'noteOn' && b.eventType === 'noteOff') ? +1 :
                    (a.eventType === 'noteOff' && b.eventType === 'noteOn') ? -1 :
                    0
                ))
                .map(e => e.addEvent)
        });

    var curTime = 0;
    sorted.forEach(tuple => {
        let {key: t, val: events} = tuple;

        events.splice(0,1).forEach(e => e(t - curTime));
        events.forEach(e => e(0));
        curTime = t;
    });

    var smf = new Midi.File({
        ticks: TICKS_PER_BEAT,
        tracks: [
            configTrack,
            noteTrack
        ]
    });

    var binaryString = smf.toBytes();

    var buf = new ArrayBuffer(binaryString.length);
    var bufView = new Uint8Array(buf);
    binaryString.split('').forEach((c,i) =>
        bufView[i] = c.charCodeAt(0));

    return buf;
};