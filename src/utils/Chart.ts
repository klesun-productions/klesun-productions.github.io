
/// <reference path="../references.ts" />

import {S} from "./S";
interface args_t {
    canvas: HTMLCanvasElement,
    maxY: number,
    minY: number,
    pairs: {x: number, y: number}[],
    color?: [number, number, number, number],
}


interface p_t {
    x: number,
    y: number,
}

let avg = (arr: number[]) => (arr.reduce((sum, el) => sum + el, 0) / arr.length);

// get factor of _disagreement_ between numbers
// if there are [0,0,0,10,10,10] scores, this will return 1
// if there are [5,5,5,5,5,5] scores, this will return 0
let argue = (arr: number[]) => {
    let average = avg(arr);
    let result = 0;
    for (let num of arr) {
        result += Math.abs(average - num) / arr.length;
    }
    return result;
};

/**
 * prints passed x,y pairs on a canvas
 */
export let Chart = function(args: args_t)
{
    /** @debug */
    console.log(new Date().toISOString(), 'charting!');

    let minX: number = null;
    let minY: number = null;
    let maxX: number = null;
    let maxY: number = null;
    let w = args.canvas.width;
    let h = args.canvas.height;
    let color = S.opt(args.color).def([255,0,0,1]);
    let semiColor = S.t4(color[0], color[1], color[2], 0.05);
    let darkColor = S.t4(color[0] / 2, color[1] / 2, color[2] / 2, color[3]);

    for (let {x, y} of args.pairs) {
        minX = S.opt(minX).map(m => Math.min(m, x)).def(x);
        minY = S.opt(minY).map(m => Math.min(m, y)).def(y);
        maxX = S.opt(maxX).map(m => Math.max(m, x)).def(x);
        maxY = S.opt(maxY).map(m => Math.max(m, y)).def(y);
    }

    let pxPerX = w / (maxX - minX);
    let pxPerY = h / (args.maxY - args.minY);

    let context = args.canvas.getContext("2d");

    let drawLine = (p0: p_t, p1: p_t, color: [number, number, number, number]) => {
        color = color || [0, 0, 0, 1];
        context.beginPath();
        let x0 = (p0.x - minX) * pxPerX;
        let y0 = h - p0.y * pxPerY;
        let x1 = (p1.x - minX) * pxPerX;
        let y1 = h - p1.y * pxPerY;
        context.moveTo(x0, y0);
        context.lineTo(x1, y1);
        context.strokeStyle = "rgba(" + color.join(',') + ")";
        context.stroke();
    };

    let xPxToYs: Map<number, number[]> = new Map();

    for (let {x, y} of args.pairs) {
        // drawLine({x:x,y:y}, {x:x+1/pxPerX,y:y}, semiColor);
        let pxX = x * pxPerX | 0;
        if (y > 0) {
            if (!xPxToYs.has(pxX)) {
                xPxToYs.set(pxX, []);
            }
            xPxToYs.get(pxX).push(y);
        }
    }

    let argueP0 = null;
    let p0 = null;
    for (let [pxX, ys] of xPxToYs) {
        let avgY = avg(ys.filter(y => y !== 0));
        let argueY = argue(ys.filter(y => y !== 0));
        let p1 = {
            x: pxX / pxPerX,
            y: avgY,
        };
        let argueP1 = {
            x: pxX / pxPerX,
            y: argueY,
        };
        if (p0 !== null) {
            drawLine(p0, p1, color);
            drawLine(argueP0, argueP1, darkColor);
        }
        p0 = p1;
        argueP0 = argueP1;
    }
};
