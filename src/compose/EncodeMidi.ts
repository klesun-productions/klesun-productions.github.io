
import {IShmidusicStructure, IShmidusicChord} from "../DataStructures";
import {IJsMidGen} from "../toDefinitelyTyped/IJsMidGen";
import {Tls} from "../utils/Tls";

// encodes IShmidusicStructure song into a Standard Midi File (.mid)
// .mid files can be opened in some popular players, like Van Basco
// .mid files are also supported by most composing software, like Musescore, Cubase
// .mid files are also used by Synthesia, a well-known educational piano application

// this module provides access to the jsmidgen https://github.com/dingram/jsmidgen

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
    academic * TICKS_PER_BEAT * 4; // likely correct

export function EncodeMidi(song: IShmidusicStructure): ArrayBuffer // sequence of bytes
{
    var configTrack = new Midi.Track();
    configTrack.setTempo(song.staffList[0].staffConfig.tempo);
    song.staffList[0].staffConfig.channelList.forEach(chan =>
        configTrack.setInstrument(chan.channelNumber, chan.instrument));

    var eventsByTime: {[t: number]: {(deltaTicks: number): void}[]} = [];

    var noteTrack = new Midi.Track();
    var time = 0;
    song.staffList[0].chordList.forEach(chord => {
        chord.noteList.forEach(note => {
            eventsByTime[time] = time in eventsByTime ? eventsByTime[time] : [];
            eventsByTime[time].push(ticks =>
                noteTrack.addNoteOn(note.channel, note.tune, ticks, note.velocity || 127));

            var offTime = time + note.length;

            eventsByTime[offTime] = offTime in eventsByTime ? eventsByTime[offTime] : [];
            eventsByTime[offTime].push(ticks =>
                noteTrack.addNoteOff(note.channel, note.tune, ticks));
        });
        time += getLength(chord);
    });

    // ebanij majkrosoft tupli ne inferiruet
    var sorted: [number, {(deltaTicks: number): void}[]][] = <any>Object
        .keys(eventsByTime)
        .map(k => +k)
        .sort((a,b) => a - b)
        .map(k => [k, eventsByTime[k]]);

    var curTime = 0;
    sorted.forEach(tuple => {
        let [t,events] = tuple;

        events.splice(0,1).forEach(e => e(toTicks(t - curTime)));
        events.forEach(e => e(toTicks(0)));
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