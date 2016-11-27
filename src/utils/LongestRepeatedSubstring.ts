
import {IShmidusicChord, IShNote} from "../DataStructures";

export let LongestRepeatedSubstring = function(input: IShmidusicChord[])
{
    let compareNotes = (a: IShNote, b: IShNote) =>
        a.channel !== b.channel ? a.channel - b.channel :
        a.tune !== b.tune ? a.tune - b.tune :
        a.length - b.length > +0.00001 ? +1 :
        a.length - b.length < -0.00001 ? -1 :
        0;

    let compareChords = function(a: IShmidusicChord, b: IShmidusicChord): number
    {
        let steps = Math.min(a.noteList.length, b.noteList.length);
        for (let i = 0; i < steps; ++i) {
            let sign = compareNotes(a.noteList[i], b.noteList[i]);
            if (sign) {
                return sign;
            }
        }

        return a.noteList.length > b.noteList.length ? +1 :
            a.noteList.length < b.noteList.length ? -1 :
            0;
    };

    let compareIndexes = function(a: number, b: number)
    {
        let [aLen, bLen] = [input.length - a, input.length - b];

        let steps = Math.min(aLen, bLen);
        for (let i = 0; i < steps; ++i) {
            let sign = compareChords(input[a + i], input[b + i]);
            if (sign) {
                return {sign: sign, commonPart: i};
            }
        }

        return {sign: aLen - bLen, commonPart: steps};
    };

    let sortedIndexes = input.map((_, i) => i)
        .sort((a,b) => compareIndexes(a,b).sign);

    let maxLen = 0;
    let substringIndexes: number[] = [];

    let i = sortedIndexes.shift();
    for (let j of sortedIndexes) {
        let length = compareIndexes(i, j).commonPart;
        if (maxLen < length) {
            maxLen = length;
            substringIndexes = [i, j];
        } else if (maxLen === length && substringIndexes.includes(i)) {
            substringIndexes.push(j);
        }
        j = i;
    }

    return {
        length: maxLen,
        substringIndexes: substringIndexes,
    };
};