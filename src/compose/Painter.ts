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
    },
};

type sign_e = 'none' | 'flat' | 'sharp' | 'natural';

// damn typescript with wrong signatures
interface huj_t {
    findIndex: (predicate: (value: number, i: number) => boolean) => number,
}

/** @return [ivoryIndex, sign] */
const determinePosition = function(semitone: number, keySignature: number): [number, sign_e]
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
    var Y_STEPS_PER_SYSTEM = 40;
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

        var shift = 56 - ivoryIndex; // 56 - some number that divides by 7

        if (+note.channel === 9) { // drum
            shift = 35 + 2; // lowest note on my synth and 2 more steps downer
        }

        var noteCanvas = <HTMLCanvasElement>$('<canvas class="noteCanvas"></canvas>')
            .attr('width', DX * 2)
            .attr('height', NOTE_CANVAS_HEIGHT + R)
            .css('top', shift * R - NOTE_CANVAS_HEIGHT + 1 * R)
            .attr('data-tune', note.tune)
            .attr('data-channel', note.channel)
            .attr('data-length', note.length)
            [0]
            ;

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

    var makeChordSpan = function(chord: Ds.IShmidusicChord): JQuery
    {
        var $chordSpan = $('<span style="position: relative;" class="chordSpan"></span>')
            .append($('<span class="tactNumberCont"></span>'));

        chord.noteList
            .map(makeNoteCanvas)
            .forEach(el => $chordSpan.append(el));

        return $chordSpan;
    };

    return {
        getNoteImage: getNoteImage,
        makeNoteCanvas: makeNoteCanvas,
        makeChordSpan: makeChordSpan,
        extractNote: extractNote,
        getChordWidth: () => DX * 2,
        setKeySignature: v => keySignature = v,
    };
};

export interface ICanvasProvider {
    getNoteImage: (l: number, c: number) => HTMLCanvasElement,
    makeNoteCanvas: (n: Ds.IShNote) => HTMLCanvasElement,
    makeChordSpan: (c: Ds.IShmidusicChord) => JQuery,
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

    var drawSystemHorizontalLines = function(ctx: CanvasRenderingContext2D)
    {
        var width = ctx.canvas.width;

        ctx.strokeStyle = "#C0C0C0";
        ctx.lineWidth = 1;
        ctx.beginPath();

        // greyed note high lines for way too high notes
        for (var i = 1; i <= 3; ++i) { // 1 - Ti; 2 - Sol; 3 - Mi
            ctx.moveTo(0, i * R * 2 - R + 0.5);
            ctx.lineTo(width, i * R * 2 - R + 0.5);
        }

        var lineSkip = 6;

        ctx.stroke();
        ctx.strokeStyle = '#88F';
        ctx.beginPath();

        // normal note height linees
        for (var i = 0; i < 11; ++i) { // 0 - top violin Fa; 11 - low bass Sol
            if (i !== 5) { // the gap between violin and bass keys
                ctx.moveTo(0, (lineSkip + i) * R * 2 - R + 0.5);
                ctx.lineTo(width, (lineSkip + i) * R * 2 - R + 0.5);
            }
        }

        ctx.stroke();
    };

    // sets the css corresponding to the constants
    var applyStyles = function()
    {
        var partLinesBgCanvas = document.createElement('canvas');
        partLinesBgCanvas.width = 640;
        partLinesBgCanvas.height = R * Y_STEPS_PER_SYSTEM;
        drawSystemHorizontalLines(partLinesBgCanvas.getContext('2d'));

        var styles: { [selector: string]: { [property: string]: string } } = {
            '': {
                'background-image': 'url(/imgs/part_keys_40r.svg), ' +
                'url(' + partLinesBgCanvas.toDataURL('image/png') + ')',
                'background-repeat': 'repeat-y, ' +
                'repeat',
                'background-size': 'Auto ' + R * Y_STEPS_PER_SYSTEM + 'px,' +
                'Auto Auto',
                'background-attachment': 'local, ' +
                'local',
                'padding-left': DX * 3 + 'px',
            },
            ' div.chordListCont > span': {
                display: 'inline-block',
                height: ((Y_STEPS_PER_SYSTEM - 4) * R) + 'px',
                width: (DX * 2) + 'px',
                'margin-bottom': 4 * R + 'px',
            },
            ' div.chordListCont > span.focused': {
                'background-color': 'rgba(255,192,0,0.3)',
            },
            ' div.chordListCont > span.tactFinisher': {
                'box-shadow': '1px 0 0 rgba(0,0,0,0.3)'
            },
            ' div.chordListCont > span.tactFinisher.doesNotFitIntoTact': {
                'box-shadow': '1px 0 0 red'
            },
            ' .tactNumberCont': {
                position: 'absolute',
                left: DX * 2 - R * 3 + 'px',
                'font-size': R * 3 + 'px',
                'font-weight': 'bold',
                'color': 'rgb(0,128,0)',
            },
            ' .noteCanvas': {
                position: 'absolute'
            },
            ' .noteCanvas.sounding': {
                // 'background-color': 'rgba(0,0,255,0.4)', // likely unused
                'background': 'linear-gradient(180deg, rgba(0,0,0,0) 90%, rgba(0,0,255,0.2) 10%)'
            },
            ' .noteCanvas.pointed': {
                'background': 'linear-gradient(180deg, rgba(0,0,0,0) 90%, rgba(0,255,0,0.6) 10%)'
            },
        };

        var css = document.createElement("style");
        css.type = "text/css";

        for (var selector in styles) {

            var properties = Object.keys(styles[selector])
                .map(k => '    ' + k + ': ' + styles[selector][k]);

            var complete = '#' + parentId + selector;
            css.innerHTML += complete + " {\n" + properties.join(";\n") + " \n}\n";
        }


        document.body.appendChild(css);
    };

    applyStyles();

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
