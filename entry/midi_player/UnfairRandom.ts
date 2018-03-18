/// <reference path="../../src/DataStructures.ts" />
/// <reference path="../../src/references.ts" />

// and so i thought, that we could have pretty complicated logic of how
// frequently should be played this song and how rarely this... that's
// what this class is needed for - to store the logic

import {ISmfFile} from "../../src/DataStructures";

export default function UnfairRandom(songList: ISmfFile[])
{
    /** @TODO: write some tester. I'm absolutely unsure whether it does what you think */

    var weightRules: Array<[number, (song: ISmfFile) => boolean]> = [
        [0.0, (song) => song.rating.startsWith('-')],
        [0.0, (song) => song.rating.startsWith('+---')],
        [0.3, (song) => song.rawFileName.startsWith('random/notre_dame/')],
        [0.3, (song) => song.rawFileName.startsWith('random/monkey_island/')],
        [0.3, (song) => song.rawFileName.startsWith('touhou') &&
            !song.rawFileName.startsWith('touhou/06_eosd') &&
            !song.rawFileName.startsWith('touhou/07_pcb') &&
            !song.rawFileName.startsWith('touhou/08_in') &&
            !song.rawFileName.startsWith('touhou/11_sa') &&
            !song.rawFileName.startsWith('touhou/12_ufo') &&
            true],
        [0.1, (song) => song.rawFileName.startsWith('ismayil112')],
        [1, (song) => true], // default
    ];

    var getAny = function(): ISmfFile
    {
        var index = Math.floor(Math.random() * songList.length);
        var song = songList[index];
        var weight = weightRules.filter(r => r[1](song))[0][0];

        return Math.random() < weight ? song : getAny();
    };

    return {
        getAny: getAny
    };
};
