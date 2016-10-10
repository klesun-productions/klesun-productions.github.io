/// <reference path="../references.ts" />

import Shmidusicator from "./Shmidusicator";
import * as Ds from "../DataStructures";
import {IControl} from "./Control";
import {Control} from "./Control";
import ShapeProvider from "./ShapeProvider";
import {Tls} from "../utils/Tls";
import {ISynth} from "../synths/ISynth"; 

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

var extractNote = (n: HTMLCanvasElement) => 1 && {
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
export function CanvasProvider(R: number): ICanvasProvider
{
    var DX = R * 5; // half of chord span width
    var NOTE_CANVAS_HEIGHT = R * 9;
    var keySignature = 0;

    // tuple: 16 channels, ~14 lengths each (6 (1/32 .. 1/1) * 2 (triplets) * 2 (dots))
    var noteCanvasCache: Array<{ [lenFra: string]: HTMLCanvasElement }> = [
        {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}
    ];
    var flatSign = <HTMLCanvasElement>$('<canvas></canvas>')
        .attr('width', DX * 2)
        .attr('height', NOTE_CANVAS_HEIGHT + R)
        [0];

    var sharpSign = <HTMLCanvasElement>$('<canvas></canvas>')
        .attr('width', DX * 2)
        .attr('height', NOTE_CANVAS_HEIGHT + R)
        [0];

    var naturalSign = <HTMLCanvasElement>$('<canvas></canvas>')
        .attr('width', DX * 2)
        .attr('height', NOTE_CANVAS_HEIGHT + R)
        [0];

    ShapeProvider(flatSign.getContext('2d'), R, DX - R * 4, NOTE_CANVAS_HEIGHT / R - 1).drawFlatSign();
    ShapeProvider(sharpSign.getContext('2d'), R, DX - R * 4, NOTE_CANVAS_HEIGHT / R - 1).drawSharpSign();
    ShapeProvider(naturalSign.getContext('2d'), R, DX - R * 4, NOTE_CANVAS_HEIGHT / R - 1).drawNaturalSign();

    var getNoteImage = function(length: number, channel: number): HTMLCanvasElement
    {
        // well, hack, but...
        var lengthStr = typeof length === 'number'
            ? Shmidusicator.guessLength(length).apacheStr()
            : length;

        if (!noteCanvasCache[channel][lengthStr]) {
            noteCanvasCache[channel][lengthStr] = <HTMLCanvasElement>$('<canvas></canvas>canvas>')
                .attr('width', DX * 2)
                .attr('height', NOTE_CANVAS_HEIGHT + R)
                [0];

            ShapeProvider(noteCanvasCache[channel][lengthStr].getContext('2d'), R, DX, NOTE_CANVAS_HEIGHT / R - 1)
                .drawNote(channel, lengthStr + '');
        }

        return noteCanvasCache[channel][lengthStr];
    };

    var makeNoteCanvas = function(note: Ds.IShNote): HTMLCanvasElement
    {
        var [ivoryIndex, sign] = determinePosition(note.tune, keySignature);

        var noteCanvas = <HTMLCanvasElement>$('<canvas class="noteCanvas"></canvas>')
            .attr('width', DX * 2)
            .attr('height', NOTE_CANVAS_HEIGHT + R)
            .attr('data-tune', note.tune)
            .attr('data-channel', note.channel)
            .attr('data-length', note.length)
            [0]
            ;

        noteCanvas.style.setProperty('--ivory-index', ivoryIndex + '');

        var ctx = noteCanvas.getContext('2d');

        ctx.drawImage(getNoteImage(note.length, note.channel), 0, 0);

        if (note.channel === 9) {
        } else  if (sign === 'flat') {
            ctx.drawImage(flatSign, 0, 0);
        } else if (sign === 'sharp') {
            ctx.drawImage(sharpSign, 0, 0);
        } else if (sign === 'natural') {
            ctx.drawImage(naturalSign, 0, 0);
        }

        return noteCanvas;
    };

    return {
        getNoteImage: getNoteImage,
        makeNoteCanvas: makeNoteCanvas,
        extractNote: extractNote,
        getChordWidth: () => DX * 2,
        setKeySignature: v => keySignature = v,
    };
};

export interface ICanvasProvider {
    getNoteImage: (l: number, c: number) => HTMLCanvasElement,
    makeNoteCanvas: (n: Ds.IShNote) => HTMLCanvasElement,
    extractNote: (c: HTMLCanvasElement) => Ds.IShNote,
    getChordWidth: () => number,
    setKeySignature: (v: number) => void,
};

export function SheetMusicPainter(parentId: string, config: HTMLElement): IPainter
{
    var R = 3; // semibreve note oval vertical radius
    var DX = R * 5; // half of chord span width
    var Y_STEPS_PER_SYSTEM = 40;

    var $parentEl = $('#' + parentId);
    $parentEl[0].style.setProperty('--b-radius', R + 'px');
    $parentEl[0].style.setProperty('--y-steps-per-system', Y_STEPS_PER_SYSTEM + '');

    var enabled = false;

    var $chordListCont =  $('<div class="chordListCont"></div>');
    $parentEl.append($chordListCont);

    var canvaser: ICanvasProvider = CanvasProvider(R);
    var control: IControl = Control($chordListCont, canvaser, config);

    var toFloat = (fractionString: string) => eval(fractionString);
    var interruptDrawing = () => {};
    var currentSong: Ds.IShmidusicStructure = null;

    /** @param song - dict structure outputed by
     * shmidusic program - github.com/klesun/shmidusic */
    var draw = function(song: Ds.IShmidusicStructure)
    {
        // TODO: replace usage with "addChord()"
    };

    /** @TODO: move to Control.ts cuz come on */
    var getChordList = () => $chordListCont.find(' > .chordSpan').toArray().map(SongAccess.extractChord);

    var getFocusedNotes = () => $chordListCont.find('.focused .pointed').length
        ? $chordListCont.find('.focused .pointed').toArray().map(canvaser.extractNote)
        : $chordListCont.find('.focused .noteCanvas').toArray().map(canvaser.extractNote);

    return {
        draw: draw,
        playNote: control.setNoteFocus,
        setEnabled: function(val: boolean)
        {
            if (enabled = val) {
                if (currentSong !== null) {
                    draw(currentSong);
                }
            } else {
                interruptDrawing();
                $chordListCont.empty();
            }
        },
        getChordList: getChordList,
        getFocusedNotes: getFocusedNotes,
        getControl: () => control,
        setKeySignature: v => {
            canvaser.setKeySignature(v);
            var chords = getChordList();
            // TODO: optimize!
            control.clear();
            chords.forEach(control.addChord);
        },

        consumeConfig: () => {},
        init: () => {},
        analyse: () => {},
        setPitchBend: (koef,chan) => {},
    };
};

export interface IPainter extends ISynth {
    draw: (song: Ds.IShmidusicStructure) => void,
    setEnabled: (v: boolean) => void,
    getChordList: () => Ds.IShmidusicChord[],
    getControl: () => IControl,
    getFocusedNotes: () => Ds.IShNote[],
    setKeySignature: (v: number) => void,
};
