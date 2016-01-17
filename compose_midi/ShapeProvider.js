
var Ns = Ns || {};

// this class contains methods to draw stuff like Note-s,
// Violin/Bass keys, Flat/Sharp/Straight sign and so on

/** @param ctx - html5 canvas context
 * @param r - note oval vertical radius */
Ns.ShapeProvider = function(ctx, r, x, ySteps)
{
    var channelColors = [
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

    /** @param rotation - in radians */
    var drawEllipse = function(x,y,rx,ry,rotation,subtract)
    {
        var rotation = rotation || 0;
        var subtract = subtract || false;

        if (typeof(ctx.ellipse) === 'function') {
            ctx.ellipse(x,y,rx,ry,rotation, 0, Math.PI*2, subtract);
        } else {
            /** @TODO: implement sanely or wait, till firefox adds that
             * http://stackoverflow.com/questions/2172798/how-to-draw-an-oval-in-html5-canvas */
            ctx.arc(x, y, rx, 0, Math.PI*2, subtract);
        }
    };

    var Fraction = function(apacheMathStr)
    {
        var match = apacheMathStr.match(/(\d+) \/ (\d+)/);
        var numerator = match !== null ? match[1] : +apacheMathStr;
        var denominator = match !== null ? match[2] : 1;

        return {
            num: val => numerator = (val || numerator),
            den: val => denominator = (val || denominator),
            float: _ => numerator / denominator
        };
    };

    var drawTail = function(x,y)
    {
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + r * 2);
        ctx.lineTo(x + r * 0.5, y + r * 1);
        ctx.lineTo(x + r * 3, y + r * 4);
        ctx.lineTo(x + r * 1.5, y + r);
        ctx.lineTo(x, y);
    };

    var getDotCount = numerator => Math.log2(+numerator + 1) - 1;

    /** @params str length - format like "1 / 2" or "3 / 4" or "7 / 8" */
    var drawNote = function(channel, length)
    {
        var y = ySteps * r;

        ctx.fillStyle = 'rgba(' + channelColors[channel].join(',') + ',1)';
        ctx.strokeStyle = 'rgba(' + channelColors[channel].join(',') + ',1)';

        var length = Fraction(length);
        if (length.den() % 3 === 0) {
            ctx.fillText('3', x - r * 3, ySteps * r + r);
            length.den(length.den() / 3);
        }

        ctx.beginPath();
        if (length.float() >= 1) {
            // semibreve
            drawEllipse(x, y, r, r * 1.5, 90 * Math.PI / 180);
            // hole
            drawEllipse(x, y, r * 3 / 4, r / 2, 60 * Math.PI / 180, true);
        } else {
            drawEllipse(x, y, r, r * 1.5, 60 * Math.PI / 180, true);
            /** @TODO: use some math instead of this 0.375 */
            var rightEdgeX = r * 0.375;
            var stickTopY = - r * 8;
            // stick
            ctx.rect(x + r, ySteps * r, rightEdgeX, stickTopY);

            if (length.float() >= 1/2) {
                // half note hole
                drawEllipse(x, y, r * 0.4, r * 1.2, 50 * Math.PI / 180);
            } else if (length.float() >= 1/4) {
                // do nothing ^_^
            } else {
                drawTail(x + r + rightEdgeX, y + stickTopY);
                if (length.float() < 1 / 8) {
                    drawTail(x + r + rightEdgeX, y + stickTopY + r * 1.5);
                }
                if (length.float() < 1 / 16) {
                    drawTail(x + r + rightEdgeX, y + stickTopY + r * 3);
                }
            }
        }

        for (var i = 1; i <= getDotCount(length.num()); ++i) {
            ctx.moveTo(x + r * i, y + r);
            drawEllipse(x + r * 1.5 + r * i, y + r, r / 2, r / 2);
        }

        ctx.fill();
        ctx.closePath();
    };

    return {
        drawNote: drawNote,
    }
};