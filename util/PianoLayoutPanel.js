
var Util = Util || {};

/** @param $canvas should have 420x30 size */
Util.PianoLayoutPanel = function ($canvas) {

    var TUNE_COUNT = 72; // 6 octaves
    var IVORY_COUNT = TUNE_COUNT * 7/12
	var FIRST_TUNE = 24;

	var IVORY_WIDTH = 10;
	var EBONY_WIDTH = IVORY_WIDTH * 3/5;

	var IVORY_LENGTH = 30;
	var EBONY_LENGTH = IVORY_LENGTH * 3/5;

    var context = $canvas[0].getContext("2d");
    var pressedNotes = [];

    var drawLine = function (x0, y0, x1, y1) {
        context.beginPath();
        context.moveTo(x0, y0);
        context.lineTo(x1, y1);
        context.stroke();
    };

    var fillRect = function (x,y,w,h,color) {

        context.beginPath();
        context.rect(x, y, w, h);
        context.fillStyle = "rgba(" + color.join(',') + ", 1)";
        context.fill();

        context.strokeStyle = 'black';
        return context;
    };

    /** @param tuneList - list of midi tunes that should be highlighted */
    var drawBase = function (noteList) {

        var hasFlat = [1,2,4,5,6]; // re, mi, sol, la, ti

        for (var i = 0; i <= IVORY_COUNT; ++i) {
            var x = i * IVORY_WIDTH;
            drawLine(x, 0, x, IVORY_LENGTH);
            if (hasFlat.indexOf(i % 7) > -1) {
                var color = noteList.indexOf(i - 1) > -1
                        ? [0,0,0] // highlight
                        : [191,191,191]; // don't highlight

                x -= EBONY_WIDTH / 2;
                fillRect(x, 0, EBONY_WIDTH, EBONY_LENGTH, color)
                    .stroke();
            }
        }

        drawLine(0, 0, IVORY_COUNT * IVORY_WIDTH, 0);
        drawLine(0, IVORY_LENGTH, IVORY_COUNT * IVORY_WIDTH, IVORY_LENGTH);
    };

    var clear = function () {
//        for (var i = 0; i < pressedNotes.length; ++i) {
//            // TODO: fill them with white (or black if ebony)
//        }
        pressedNotes = [];

        context.rect(0, 0, $canvas[0].width, $canvas[0].height);
        context.fillStyle="white";
        context.fill();
        drawBase([]);
    };

    /** @param tuneList - list of midi tunes that should be highlighted */
    var repaint = function (noteList) {
        // TODO: implement!
        pressedNotes = noteList;
    };

    drawBase([]);

    return {
        repaint: repaint
    };
}