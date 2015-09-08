
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

    /** @return list - [r,g,b] */
    var channelColor = function(channelNumber) {
        return [
		    [0,0,0], // black
			[192,0,0], // red
			[0,148,0], // green
			[60,60,255], // blue
			[152,152,0], // yellow
			[0,152,152], // cyan
			[192,0,192], // magenta
			[255,128,0], // orange
			[91,0,255] // bluish magenta
        ][channelNumber];
    }

    /** @param noteList - list of shmidusic Note json representations OR just something with fields "tune" and "channel" */
    var repaint = function (noteList) {

        // TODO: it definitely would be good for performance if we repainted Note-s by one, not whole piano!
        context.clearRect(0, 0, $canvas[0].width, $canvas[0].height);

        var hasFlat = [1,2,4,5,6]; // re, mi, sol, la, ti

        for (var i = 0; i <= IVORY_COUNT; ++i) {

            var octave = Math.floor(i / 7);
            var tune = FIRST_TUNE + octave * 12 + [0,2,4,5,7,9,11][i % 7];

            var x = i * IVORY_WIDTH;
            drawLine(x, 0, x, IVORY_LENGTH);

            var matches = noteList.filter(n => n['tune'] == tune);
            if (matches.length > 0) {
                var color = channelColor(matches[0].channel);
                fillRect(x, EBONY_LENGTH, IVORY_WIDTH, IVORY_LENGTH - EBONY_LENGTH, color);
            }

            if (hasFlat.indexOf(i % 7) > -1) {

                --tune;

                var matches = noteList.filter(n => n['tune'] == tune);
                var color = matches.length > 0
                        ? channelColor(matches[0].channel) // highlight
                        : [191,191,191]; // don't highlight

                x -= EBONY_WIDTH / 2;
                fillRect(x, 0, EBONY_WIDTH, EBONY_LENGTH, color)
                    .stroke();
            }
        }

        drawLine(0, 0, IVORY_COUNT * IVORY_WIDTH, 0);
        drawLine(0, IVORY_LENGTH, IVORY_COUNT * IVORY_WIDTH, IVORY_LENGTH);
    };

    var highlight = function (channel, tune) {
        console.log('highlight! ' + channel + ' ' + tune);
        // TODO: implement
    };

    var unhighlight = function (channel, tune) {
        console.log('unhighlight! ' + channel + ' ' + tune);
        // TODO: implement
    };

    repaint([]);

    return {
        repaint: repaint,
        highlight: highlight,
        unhighlight: unhighlight,
    };
}