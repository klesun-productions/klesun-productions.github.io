
// this class contains methods to draw stuff like Note-s,
// Violin/Bass keys, Flat/Sharp/Straight sign and so on

/// <reference path="../references.ts" />

import {Kl} from "../Tools";
/** @param ctx - html5 canvas context
 * @param r - note oval vertical radius */
export default function ShapeProvider(ctx: CanvasRenderingContext2D, r: number, x: number, ySteps: number)
{
    var y = ySteps * r;

    // https://github.com/google/canvas-5-polyfill/issues/1
    var drawEllipseManually = function(ctx: CanvasRenderingContext2D, x: number, y: number,
                                       radiusX: number, radiusY: number, rotation: number,
                                       startAngle: number, endAngle: number, antiClockwise: boolean)
    {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.scale(radiusX, radiusY);
        ctx.arc(0, 0, 1, startAngle, endAngle, antiClockwise);
        ctx.restore();
    };

    /** @param rotation - in radians */
    var drawEllipse = function(x: number,y: number,rx: number,ry: number,rotation?: number,subtract?: boolean): void
    {
        var rotation = rotation || 0;
        var subtract = subtract || false;

        if ('ellipse' in ctx) {
            (<any>ctx).ellipse(x,y,rx,ry,rotation, 0, Math.PI*2, subtract);
        } else {
            drawEllipseManually(ctx, x,y,rx,ry,rotation, 0, Math.PI*2, subtract);
        }
    };

    var Fraction = function(apacheMathStr: string)
    {
        var match = apacheMathStr.match(/(\d+) \/ (\d+)/);
        var numerator = match !== null ? +match[1] : +apacheMathStr;
        var denominator = match !== null ? +match[2] : 1;

        return {
            num: (val?: number) => numerator = (val || numerator),
            den: (val?: number) => denominator = (val || denominator),
            float: () => numerator / denominator
        };
    };

    var drawTail = function(x: number,y: number)
    {
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + r * 2);
        ctx.lineTo(x + r * 0.5, y + r * 1);
        ctx.lineTo(x + r * 3, y + r * 4);
        ctx.lineTo(x + r * 1.5, y + r);
        ctx.lineTo(x, y);
    };

    var getDotCount = (numerator: number) => (<any>Math).log2(+numerator + 1) - 1;

    var drawCross = function(crossRadius: number)
    {
        var cr = crossRadius;
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.beginPath();
        ctx.moveTo(x - cr, y + cr);
        ctx.lineTo(x + cr, y - cr);
        ctx.moveTo(x - cr, y - cr);
        ctx.lineTo(x + cr, y + cr);
        ctx.stroke();
    };

    /** @params str length - format like "1 / 2" or "3 / 4" or "7 / 8" */
    var drawNote = function(channel: number, lengthStr: string)
    {
        +channel === 9 && drawCross(r * 2);

        ctx.fillStyle = 'rgba(' + Kl.channelColors[channel].join(',') + ',0.85)';
        ctx.strokeStyle = 'rgba(' + Kl.channelColors[channel].join(',') + ',1)';

        var length = Fraction(lengthStr);
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
            drawEllipse(x, y, r, r * 1.5, 60 * Math.PI / 180);
            /** @TODO: use some math instead of this 0.375 */
            var rightEdgeX = r * 0.375;
            var stickTopY = - r * 8;
            // stick
            ctx.rect(x + r, ySteps * r + stickTopY, rightEdgeX, -stickTopY);

            if (length.float() >= 1/2) {
                // half note hole
                drawEllipse(x, y, r * 0.4, r * 1.2, 50 * Math.PI / 180, true);
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

    var drawFlatSign = function()
    {
        // zooming
        var rZoomed = r * 0.6;

        ctx.beginPath();
        drawEllipse(x, y, rZoomed * 1.5, rZoomed * 2, 40 * Math.PI / 180);
        drawEllipse(x, y, rZoomed * 1, rZoomed * 1.2, 30 * Math.PI / 180, true);

        ctx.fill();

        ctx.lineWidth = rZoomed / 2;
        ctx.beginPath();
        ctx.moveTo(x - rZoomed / 2, y + 2 * rZoomed);
        ctx.lineTo(x - rZoomed / 2, y - 5 * rZoomed);
        ctx.stroke();

        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.rect(x - rZoomed / 2 - rZoomed / 4, y - rZoomed*2, -rZoomed, rZoomed*4);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    };

    var drawSharpSign = function()
    {
        ctx.beginPath();
        ctx.moveTo(x - r * 0.5, y - r * 2);
        ctx.lineTo(x - r * 0.5, y + r * 2);

        ctx.moveTo(x + r * 0.5, y - r * 2);
        ctx.lineTo(x + r * 0.5, y + r * 2);

        ctx.moveTo(x - r, y - r * 0.25);
        ctx.lineTo(x + r, y - r * 1.25);

        ctx.moveTo(x - r, y + r * 1.25);
        ctx.lineTo(x + r, y + r * 0.25);

        ctx.stroke();
    };

    var drawNaturalSign = function()
    {
        ctx.beginPath();
        ctx.moveTo(x - r * 0.5, y - r * 2);
        ctx.lineTo(x - r * 0.5, y + r * 1.5);
        ctx.lineTo(x + r * 0.5, y + r * 0.5);

        ctx.moveTo(x + r * 0.5, y + r * 2);
        ctx.lineTo(x + r * 0.5, y - r * 1.5);
        ctx.lineTo(x - r * 0.5, y - r * 0.5);
        ctx.stroke();
    };

    // we treat image borders center for pivot point during scaling
    var drawSvg = function(img: any, scaleFactor: number)
    {
        var width = img.width * scaleFactor;
        var height = img.height * scaleFactor;

        var localX = x - width / 2;
        var localY = y - height / 2;

        ctx.drawImage(img, localX + r * 4, localY, width, height);
    };

    return {
        drawNote: drawNote,
        drawFlatSign: drawFlatSign,
        drawSharpSign: drawSharpSign,
        drawNaturalSign: drawNaturalSign,
    }
};
