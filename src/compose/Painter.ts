/// <reference path="../references.ts" />

import * as Ds from "../DataStructures";
import {Control} from "./Control";
import {IShNote} from "../DataStructures";

export function TactMeasurer(tactSize: number)
{
    var sumFraction = 0;
    var tactNumber = 0;

    var inject = function(chordLength: number)
    {
        sumFraction += chordLength;

        var finishedTact = false;
        while (+sumFraction.toFixed(8) >= tactSize) {
            sumFraction -= tactSize;
            finishedTact = true;
            ++tactNumber;
        }

        return finishedTact;
    };

    return {
        inject: inject,
        hasRest: () => +sumFraction.toFixed(8) > 0,
        tactNumber: () => tactNumber,
        getRest: () => sumFraction
    };
};

export var extractNote = (n: HTMLCanvasElement): IShNote => 1 && {
    tune: +$(n).attr('data-tune'),
    channel: +$(n).attr('data-channel'),
    length: +$(n).attr('data-length')
};

export var SongAccess = {
    extractChord: (c: HTMLSpanElement) => 1 && {
        noteList: $(c).children('.noteCanvas').toArray()
            .map(extractNote)
            .sort((n1, n2) => n2.tune - n1.tune),
    },
};

type sign_e = 'none' | 'flat' | 'sharp' | 'natural';

// damn typescript with wrong signatures
interface huj_t {
    findIndex: (predicate: (value: number, i: number) => boolean) => number,
}

/** @return [ivoryIndex, sign] */
export const determinePosition = function(semitone: number, keySignature: number): [number, sign_e]
{
    var ebonySignMap: {[s: number]: number[]} = {
        [-7]: [-1, -1, -1, -1, -1, -1, -1],
        [-6]: [-1, -1, -1,  0, -1, -1, -1],
        [-5]: [ 0, -1, -1,  0, -1, -1, -1],
        [-4]: [ 0, -1, -1,  0,  0, -1, -1],
        [-3]: [ 0,  0, -1,  0,  0, -1, -1],
        [-2]: [ 0,  0, -1,  0,  0,  0, -1],
        [-1]: [ 0,  0,  0,  0,  0,  0, -1],
        [+0]: [ 0,  0,  0,  0,  0,  0,  0],
        [+1]: [ 0,  0,  0, +1,  0,  0,  0],
        [+2]: [+1,  0,  0, +1,  0,  0,  0],
        [+3]: [+1,  0,  0, +1, +1,  0,  0],
        [+4]: [+1, +1,  0, +1, +1,  0,  0],
        [+5]: [+1, +1,  0, +1, +1, +1,  0],
        [+6]: [+1, +1, +1, +1, +1, +1,  0],
        [+7]: [+1, +1, +1, +1, +1, +1, +1],
    };

    var octave = Math.floor(semitone / 12);

    var ivory = (<huj_t>ebonySignMap[keySignature]).findIndex((sign, idx) =>
        [0,2,4,5,7,9,11][idx] + sign === semitone % 12);

    if (ivory > -1) {
        // present in base key signature
        return [ivory + octave * 7, 'none'];
    } else {
        var becarIvory = (<huj_t>ebonySignMap[keySignature]).findIndex((sign, idx) =>
            sign !== 0 && [0,2,4,5,7,9,11][idx] === semitone % 12);

        if (becarIvory > -1) {
            return [becarIvory + octave * 7, 'natural'];
        } else {
            // treating all special note-s as flat - even when it is clearly heard as sharp
            var ivoryIndex = [0,2,4,5,7,9,11].indexOf(semitone % 12 + 1);

            return [ivoryIndex + octave * 7, 'flat'];
        }
    }
};

/** @param R - semibreve note oval vertical radius */
export function CanvasProvider(R: number)
{
    var DX = R * 5; // half of chord span width
    var keySignature = 0;

    return {
        extractNote: extractNote,
        getChordWidth: () => DX * 2,
        setKeySignature: (v: number) => keySignature = v,
    };
};

/** TODO: get rid of this class, we i the stuff with clean CSS now */
export function SheetMusicPainter(parentId: string, config: HTMLElement)
{
    var R = 3.5; // semibreve note oval vertical radius
    var Y_STEPS_PER_SYSTEM = 40;

    var $parentEl = $('#' + parentId);
    $parentEl[0].style.setProperty('--b-radius', R + 'px');
    $parentEl[0].style.setProperty('--y-steps-per-system', Y_STEPS_PER_SYSTEM + '');

    var enabled = false;

    var $chordListCont =  $('<div class="chordListCont"></div>');
    $parentEl.append($chordListCont);

    var canvaser = CanvasProvider(R);
    var control = Control($chordListCont, config);

    var interruptDrawing = () => {};
    var currentSong: Ds.IShmidusicStructure = null;

    return {
        setEnabled: (val: boolean) => {},
        getControl: () => control,
        setKeySignature: (v: number) => {
            canvaser.setKeySignature(v);
            var chords = control.getChordList();
            // TODO: optimize!
            control.clear();
            chords.forEach(control.addChord);
        },
    };
};