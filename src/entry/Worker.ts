
import {Player} from "../player/Player";
import {Fluid} from "../synths/Fluid";
import {SoundFontAdapter} from "../synths/SoundFontAdapter";
import {Shmidusicator} from "../compose/Shmidusicator";
interface IWorkerIo {
    postMessage: (data: any) => void,
    onmessage: (data: any) => void,
};

let checkType = function<T>(value: T, typeName: string) {
    // TODO: check type!
    return {
        set then(cb: (arg: T) => void) {
            cb(value);
        }
    };
};

export let Worker
= (io: IWorkerIo) => checkType(io, 'IWorkerIo').then
= (io) => {
    io.onmessage = (data) => io.postMessage(['you messaged me with: ', data]);

    let player = Player({
        setPlayback: () => {}, setFields: () => {},
        setFileInfo: () => {}, getTempoFactor: () => 1,
    });

    // let soundFont  = SoundFontAdapter('/out/sf2parsed/fluid/');
    // player.anotherSynth = Fluid(soundFont );

    // player.playSheetMusic(Shmidusicator.generalizeShmidusic({
    //     staffList: [{
    //         staffConfig: {
    //             tempo: 120,
    //             loopStart: 0,
    //             loopTimes: 0,
    //             tactSize: 1,
    //             keySignature: 0,
    //             channelList: [],
    //         },
    //         chordList: [
    //             {noteList: [
    //                 {tune: 69, length: 0.5, channel: 0},
    //                 {tune: 72, length: 0.5, channel: 0},
    //             ]},
    //             {noteList: [
    //                 {tune: 71, length: 0.5, channel: 0},
    //                 {tune: 74, length: 0.5, channel: 0},
    //             ]},
    //             {noteList: [
    //                 {tune: 68, length: 0.5, channel: 0},
    //                 {tune: 72, length: 0.5, channel: 0},
    //             ]},
    //         ],
    //     }],
    // }))
};