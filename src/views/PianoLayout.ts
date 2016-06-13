
import {Kl} from "../Tools";

// draws a piano layout on a canvas
// and highlights notes when asked

type color_t = [number, number, number];

// TODO: move file into views folder

// a helper to provide me with one-line methods: drawLine() and fillRect()
var CanvasAdapter = function(canvas: HTMLCanvasElement)
{
    var context = canvas.getContext("2d");

    var drawLine = function (x0: number, y0: number, x1: number, y1: number, color?: [number, number, number])
    {
        color = color || [0,0,0];

        context.beginPath();
        context.moveTo(x0, y0);
        context.lineTo(x1, y1);
        context.strokeStyle = "rgba(" + color.join(',') + ", 1)";
        context.stroke();
    };

    var fillRect = function (x: number, y: number, w: number, h: number, color: color_t)
    {
        context.beginPath();
        context.rect(x, y, w, h);
        context.fillStyle = "rgba(" + color.join(',') + ", 1)";
        context.fill();

        context.strokeStyle = 'black';
        return context;
    };

    return {
        drawLine: drawLine,
        fillRect: fillRect,
    };
};

/** @param $canvas should have 490x30 size */
export default function PianoLayout(canvas: HTMLCanvasElement): IPianoLayout
{
    var TUNE_COUNT = 84; // 7 octaves
    var IVORY_COUNT = TUNE_COUNT * 7/12;
    var FIRST_TUNE = 24;

    var IVORY_WIDTH = 10;
    var EBONY_WIDTH = IVORY_WIDTH * 3/5;

    var IVORY_LENGTH = 30;
    var EBONY_LENGTH = IVORY_LENGTH * 3/5;

    var context = canvas.getContext("2d");
    var pressedNotes: {[st: number]: number[]} = {};

    var canvasAdapter = CanvasAdapter(canvas);
    var drawLine = canvasAdapter.drawLine;
    var fillRect = canvasAdapter.fillRect;
    var channelColors = Kl.channelColors;

    var ivoryToSemitone = (ivory: number) => {
        var result = (ivory / 7 | 0) * 12 + [0,2,4,5,7,9,11][ivory % 7];

        return result;
    };

    var paintBase = function ()
    {
        context.clearRect(0, 0, canvas.width, canvas.height);

        var hasFlat = [1,2,4,5,6]; // re, mi, sol, la, ti

        for (var i = 0; i <= IVORY_COUNT; ++i) {
            var x = i * IVORY_WIDTH;
            drawLine(x, 0, x, IVORY_LENGTH);

            if (hasFlat.indexOf(i % 7) > -1) {
                var color: color_t = [191,191,191]; // don't highlight

                x -= EBONY_WIDTH / 2;
                fillRect(x, 0, EBONY_WIDTH, EBONY_LENGTH, color)
                    .stroke();
            }
        }

        drawLine(0, 0, IVORY_COUNT * IVORY_WIDTH, 0);
        drawLine(0, IVORY_LENGTH, IVORY_COUNT * IVORY_WIDTH, IVORY_LENGTH);
    };

    var fillTune = function (tune: number, color: color_t)
    {
        tune -= FIRST_TUNE;

        var isFlat = [1,3,6,8,10].indexOf(tune % 12) > -1;
        var octave = Math.floor(tune / 12);

        if (!isFlat) {
            var invory = [0,2,4,5,7,9,11].indexOf(tune % 12) + octave * 7;
            var x = invory * IVORY_WIDTH;
            fillRect(x + 1, EBONY_LENGTH + 1, IVORY_WIDTH - 2, IVORY_LENGTH - EBONY_LENGTH - 2, color); // +1 / -2 for border to be left untouched
        } else {
            var invory = [0,2,4,5,7,9,11].indexOf(tune % 12 - 1) + octave * 7;
            var x = (invory + 1) * IVORY_WIDTH - EBONY_WIDTH / 2;
            fillRect(x + 1, +1, EBONY_WIDTH - 2, EBONY_LENGTH - 2, color);
        }
    };

    /** @param {tune: int, channel: int} noteJs */
    var unhighlight = function (sem: number, chan: number)
    {
        var index = pressedNotes[sem].indexOf(chan);
        pressedNotes[sem].splice(index, 1);

        var isFlat = [1,3,6,8,10].indexOf(sem % 12) > -1;
        var color: color_t = pressedNotes[sem].length > 0
            ? channelColors[pressedNotes[sem][0]] // we could probably use some indent and draw all of them one dya, but nah...
            : (isFlat ? [191,191,191] : [255,255,255]);

        fillTune(sem, color);
    };

    /** @param [{tune: int, channel: int}, ...] noteList */
    var highlight = function (sem: number, chan: number)
    {
        var color = channelColors[chan];
        fillTune(sem, color);
        (pressedNotes[sem] || (pressedNotes[sem] = [])).push(chan);

        return () => unhighlight(sem, chan);
    };

    var detectSemitone = function(x: number, y: number): number
    {
        return FIRST_TUNE + ivoryToSemitone(x / IVORY_WIDTH | 0);
    };

    var hangClickListener = (cb: {(semitone: number): {(): void}}) => canvas.onclick = (e) =>
    {
        var sem = detectSemitone(
            e.clientX - $(canvas).offset().left,
            e.clientY - $(canvas).offset().top
        );

        var unhiglight = highlight(sem, 0);
        var interrupt = cb(sem);

        setTimeout(() => { interrupt(); unhiglight(); }, 500);
    };

    paintBase();

    return {
        playNote: highlight,
        hangClickListener: hangClickListener,
    };
};

export interface IPianoLayout {
    playNote: (sem: number, chan: number) => () => void,
    hangClickListener: (cb: {(semitone: number): {(): void}}) => void,
};