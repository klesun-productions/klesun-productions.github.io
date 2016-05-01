/// <reference path="../references.ts" />

import Shmidusicator from "../player/Shmidusicator";
import * as Ds from "../DataStructures";
import {IControl} from "./Control";
import {Control} from "./Control";
import ShapeProvider from "./ShapeProvider";
import {Kl} from "../Tools";

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

/** @param R - semibreve note oval vertical radius */
export function CanvasProvider(R: number): ICanvasProvider
{
    var DX = R * 5; // half of chord span width
    var Y_STEPS_PER_SYSTEM = 40;
    var NOTE_CANVAS_HEIGHT = R * 9;

    // tuple: 16 channels, ~14 lengths each (6 (1/32 .. 1/1) * 2 (triplets) * 2 (dots))
    var noteCanvasCache: Array<{ [lenFra: string]: HTMLCanvasElement }> = [
        {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}
    ];
    // tuple: 16 channels
    var flatSignCache: HTMLCanvasElement[] = [];

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
        var isEbony = [1,3,6,8,10].indexOf(note.tune % 12) > -1;
        var ivoryIndex = !isEbony
            ? [0,2,4,5,7,9,11].indexOf(note.tune % 12)
            : [0,2,4,5,7,9,11].indexOf(note.tune % 12 + 1); // treating all as flats for now - ignoring file key signature
        var octave = Math.floor(note.tune / 12);

        var shift = 56 - ivoryIndex - octave * 7; // 56 - some number that divides by 7

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

        if (isEbony) {
            /** @TODO: here lies a bug - all cached flats have same color, black, since you don't change it while drawing
             * it is pretty nice, though. maybe could make flat sign color a bit darker, than note color? */
            if (!flatSignCache[note.channel]) {
                flatSignCache[note.channel] = <HTMLCanvasElement>$('<canvas></canvas>canvas>')
                    .attr('width', noteCanvas.width)
                    .attr('height', noteCanvas.height)
                    [0];

                ShapeProvider(flatSignCache[note.channel].getContext('2d'), R, DX - R * 4, NOTE_CANVAS_HEIGHT / R - 1).drawFlatSign();
            }
            ctx.drawImage(flatSignCache[note.channel], 0, 0);
        }

        return noteCanvas;
    };

    var makeChordSpan = function(chord: Ds.IShmidusicChord): JQuery
    {
        var $chordSpan = $('<span style="position: relative;"></span>')
            .append($('<span class="tactNumberCont"></span>'));

        chord.noteList
            .map(makeNoteCanvas)
            .forEach(el => $chordSpan.append(el));

        return $chordSpan;
    };

    var extractNote = (n: HTMLCanvasElement) => 1 && {
        tune: +$(n).attr('data-tune'),
        channel: +$(n).attr('data-channel'),
        length: +$(n).attr('data-length')
    };

    return {
        getNoteImage: getNoteImage,
        makeNoteCanvas: makeNoteCanvas,
        makeChordSpan: makeChordSpan,
        extractNote: extractNote,
        extractChord: (c) => 1 && {
            noteList: $(c).children('.noteCanvas').toArray()
                .map(extractNote)
        },
        getChordWidth: () => DX * 2,
    };
};

export interface ICanvasProvider {
    getNoteImage: { (l: number, c: number): HTMLCanvasElement },
    makeNoteCanvas: { (n: Ds.IShNote): HTMLCanvasElement },
    makeChordSpan: { (c: Ds.IShmidusicChord): JQuery },
    extractNote: { (c: HTMLCanvasElement): Ds.IShNote },
    extractChord: { (c: HTMLElement): Ds.IShmidusicChord },
    getChordWidth: { (): number },
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
        currentSong = song;

        if (!enabled) {
            return;
        }

        interruptDrawing();
        $chordListCont.empty();

        var staff = song.staffList[0];

        var tacter = TactMeasurer(staff.staffConfig.numerator / 8);
        interruptDrawing = Kl.forChunk(staff.chordList, 200, 200, (chord: Ds.IShmidusicChord) =>
        {
            var chordLength = Math.min.apply(null, chord.noteList.map(n => toFloat(n.length.toString())));
            var finishedTact = tacter.inject(chordLength);

            /** @debug */
            if (chord.noteList.length === 1 &&
                chord.noteList[0].tune == 0 &&
                chord.noteList[0].channel == 6)
            {
                /** @TODO: don't actually omit them, just set them width: 0 or something, cuz
                 * a tact may end on a pause - see "Detective Conan - Negaigoto Hitotsu Dake.mid" */

                // artificial pause to match shmidusic format
                return;
            }

            var $span = canvaser.makeChordSpan(chord);
            if (finishedTact) {
                $span.find('.tactNumberCont').html(tacter.tactNumber().toString());
                $span.addClass('tactFinisher');
                if (tacter.hasRest()) {
                    $span.addClass('doesNotFitIntoTact')
                        .attr('data-rest', tacter.getRest())
                }
            } else {
                $span.find('.tactNumberCont').html('&nbsp;');
            }

            $chordListCont.append($span);
        });
    };

    var getChordList = () => $chordListCont.children().toArray().map(canvaser.extractChord);

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
        handleNoteOn: control.setNoteFocus,
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
    };
};

export interface IPainter {
    draw: (song: Ds.IShmidusicStructure) => void,
    handleNoteOn: (note: Ds.IShNote, chordIndex: number) => void,
    setEnabled: (v: boolean) => void,
    getChordList: () => Ds.IShmidusicChord[],
    getControl: () => IControl,
    getFocusedNotes: () => Ds.IShNote[],
}