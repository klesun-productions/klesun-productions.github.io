
var Ns = Ns || {};

// this class contains methods to draw stuff like Note-s,
// Violin/Bass keys, Flat/Sharp/Straight sign and so on

/** @param ctx - html5 canvas context
 * @param dy - half of height of oval part of note in pixels */
Ns.ShapeProvider = function(ctx, dy, x, ySteps)
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

    /** @params str length - format like "1 / 2" or "3 / 4" or "7 / 8" */
    var drawNote = function(channel, length)
    {
        var y = ySteps * dy;

        ctx.fillStyle = 'rgba(' + channelColors[channel].join(',') + ',1)';
        ctx.strokeStyle = 'rgba(' + channelColors[channel].join(',') + ',1)';

        var length = Fraction(length);
        length.den(length.den() % 3 === 0 ? length.den() * 3 : length.den()); // triplet have sane image for now

        ctx.beginPath();
        if (length.float() >= 1) {
            // semibreve
            drawEllipse(x, ySteps * dy, dy, dy * 1.5, 90 * Math.PI / 180);
            // hole
            drawEllipse(x, ySteps * dy, dy * 3 / 4, dy / 2, 60 * Math.PI / 180, true);
        } else {
            drawEllipse(x, ySteps * dy, dy, dy * 1.5, 60 * Math.PI / 180, true);
            /** @TODO: use some math instead of this 0.375 */
            var rightEdgeX = dy * 0.375;
            var stickTopY = - dy * 8;
            // stick
            ctx.rect(x + dy, ySteps * dy, rightEdgeX, stickTopY);

            if (length.float() >= 1/2) {
                // half note hole
                drawEllipse(x, y, dy * 0.4, dy * 1.2, 50 * Math.PI / 180);
            } else if (length.float() >= 1/4) {
                // do nothing ^_^
            } else if (length.float() >= 1/8) {

                /** @debug */
                console.log('zhopa',rightEdgeX, stickTopY);

                // draw one tail
                ctx.fill();
                ctx.closePath();
                ctx.beginPath();
                ctx.moveTo(x + dy + rightEdgeX, y + stickTopY);
                ctx.lineTo(x + dy + rightEdgeX, y + stickTopY + dy * 2);
                ctx.lineTo(x + dy + rightEdgeX + dy, y + stickTopY + dy * 1.5);
                ctx.lineTo(x + dy + rightEdgeX + dy * 3, y + stickTopY + dy * 4);
                ctx.lineTo(x + dy + rightEdgeX + dy * 1.5, y +stickTopY + dy);
                ctx.lineTo(x + dy + rightEdgeX, y + stickTopY);
                ctx.stroke();
            } else if (length.float() >= 1/16) {
                // draw two tails
            } else if (length.float() >= 1/32) {
                // draw three tails
            }
        }

        ctx.fill();
        ctx.closePath();

        /** @TODO: dots, triplets */
    };

    return {
        drawNote: drawNote,
    }
};