/* @flow */

var doFor = function<Tx>(dict: {[k: string]: Tx}, callback: { (k: string, v: Tx): void }) {
    return Object.keys(dict).forEach(k => callback(k, dict[k]));
};

var stafify = function(staffConfig: StaffConfigT)
{
    doFor(staffConfig, (k,v) => console.log(k, v * 10));
};

type StaffConfigT = {
    /*
    * when tempo is 60: 1/4 note length = 1 second;
    * when tempo is 240: 1/4 note length = 1/4 second
    */
    tempo: number;
    /*
    * a number in range [-7, 7]. when -1: Ti is flat;
    * when -2: Ti and Mi are flat; when +2: Fa and Re are sharp and so on...
    */
    keySignature: number;
    /*
    * tact size in legacy format (i used to store numbers in bytes ages ago...)
    * if you divide it with, uh well, 8, you get the tact size
    */
    numerator: number;
    // loop start tact number
    loopStart: number,
    // count of times playback will be rewinded
    // to the loopStart after last chord
    loopTimes: number,
};