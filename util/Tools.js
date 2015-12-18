
var Util = Util || {};

Util.range = (l, r) => Array.apply(null, Array(r - l)).map((_, i) => l + i);

/** @TODO: use worker instead to ensure timing of inactive tabs */
Util.setTimeout = (cb, d) => setTimeout(cb, d);

/** @param length - float: quarter will be 0.25, semibreve will be 1.0*/
Util.toMillis = (length, tempo) => 1000 * length * 60 / (tempo / 4);  // because 1 / 4 = 1000 ms when tempo is 60

/** @param chunkSize - count of elements that will be foreached in one iteration
 * @param breakMillis - break duration between iterations */
Util.forEachBreak = function(list, breakMillis, chunkSize, callback)
{
    var doNext = function(index)
    {
        if (index < list.length) {
            for (var i = index; i < Math.min(list.length, index + chunkSize); ++i) {
                callback(list[i]);
            }
            setTimeout((_) => doNext(index + chunkSize), breakMillis);
        }
    };

    doNext(0);
};

Util.andThen = function(firstCallback, secondCallback)
{
    return function() {
        firstCallback();
        secondCallback();
    };
};

Util.if = (val, pred, def) => pred(val) ? val : def;
Util.map = (val, f) => val && f(val);

// a helper to provide me with one-line methods: drawLine() and fillRect()
Util.CanvasAdapter = function(canvas)
{
    var context = canvas.getContext("2d");

    var drawLine = function (x0, y0, x1, y1, color)
    {
        color = color || [0,0,0];

        context.beginPath();
        context.moveTo(x0, y0);
        context.lineTo(x1, y1);
        context.strokeStyle = "rgba(" + color.join(',') + ", 1)";
        context.stroke();
    };

    var fillRect = function (x, y, w, h, color)
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

Util.channelColors = [
    [0,0,0], // black
    [192,0,0], // red
    [0,148,0], // green
    [60,60,255], // blue
    [152,152,0], // yellow
    [0,152,152], // cyan
    [192,0,192], // magenta
    [255,128,0], // orange
    [91,0,255], // bluish magenta

    [0,255,255], // TODO: !!!
    [127,255,0], // TODO: !!!
    [255,0,255], // TODO: !!!
    [0,255,0], // TODO: !!!
    [0,255,0], // TODO: !!!
    [0,255,0], // TODO: !!!
    [0,255,0] // TODO: !!!
];