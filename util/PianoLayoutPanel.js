
var Util = Util || {};

/** @param $canvas should have 490x30 size */
Util.PianoLayoutPanel = function ($canvas) {

    var TUNE_COUNT = 84; // 7 octaves
    var IVORY_COUNT = TUNE_COUNT * 7/12
	var FIRST_TUNE = 24;

	var IVORY_WIDTH = 10;
	var EBONY_WIDTH = IVORY_WIDTH * 3/5;

	var IVORY_LENGTH = 30;
	var EBONY_LENGTH = IVORY_LENGTH * 3/5;

    var context = $canvas[0].getContext("2d");
    var pressedNotes = {};

    var canvasAdapter = Util.CanvasAdapter($canvas[0]);
    var drawLine = canvasAdapter.drawLine;
    var fillRect = canvasAdapter.fillRect;
    var channelColors = Util.channelColors;

    var paintBase = function () {
        context.clearRect(0, 0, $canvas[0].width, $canvas[0].height);

        var hasFlat = [1,2,4,5,6]; // re, mi, sol, la, ti

        for (var i = 0; i <= IVORY_COUNT; ++i) {
            var x = i * IVORY_WIDTH;
            drawLine(x, 0, x, IVORY_LENGTH);

            if (hasFlat.indexOf(i % 7) > -1) {
                var color = [191,191,191]; // don't highlight

                x -= EBONY_WIDTH / 2;
                fillRect(x, 0, EBONY_WIDTH, EBONY_LENGTH, color)
                    .stroke();
            }
        }

        drawLine(0, 0, IVORY_COUNT * IVORY_WIDTH, 0);
        drawLine(0, IVORY_LENGTH, IVORY_COUNT * IVORY_WIDTH, IVORY_LENGTH);
    };

    var fillTune = function (tune, color) {

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
    var unhighlight = function (noteJs) {

        var index = pressedNotes[noteJs.tune].indexOf(noteJs.channel);
        pressedNotes[noteJs.tune].splice(index, 1);

        var isFlat = [1,3,6,8,10].indexOf(noteJs.tune % 12) > -1;
        var color = pressedNotes[noteJs.tune].length > 0
            ? channelColors[pressedNotes[noteJs.tune][0]] // we could probably use some indent and draw all of them one dya, but nah...
            : (isFlat ? [191,191,191] : [255,255,255]);

        fillTune(noteJs.tune, color);
    };

    /** @param [{tune: int, channel: int}, ...] noteList */
    var highlight = function (noteJs) {
        var color = channelColors[noteJs.channel];
        fillTune(noteJs.tune, color);
        (pressedNotes[noteJs.tune] || (pressedNotes[noteJs.tune] = [])).push(noteJs.channel);

        return _ => unhighlight(noteJs);
    };

    paintBase();

    return {
        handleNoteOn: highlight,
    };
};
