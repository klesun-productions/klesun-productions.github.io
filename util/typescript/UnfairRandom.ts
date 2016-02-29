
/// <reference path="DataStructures.ts" />
/// <reference path="../../libs/definitelytyped/lib.es6.d.ts" />

var Ns: any = Ns || {};

// and so i thought, that we could have pretty complicated logic of how
// frequently should be played this song and how rarely this... that's
// what this class is needed for - to store the logic

Ns.UnfairRandom = function(songList: ISmfFile[])
{
    /** @TODO: write some tester. I'm absolutely unsure whether it does what you think */

    var weightRules: Array<[number, (song: ISmfFile) => boolean]> = [
        [0.2, (song) => song.rawFileName.startsWith('random_good_stuff/notre_dame/')],
        [0.1, (song) => song.rawFileName.startsWith('random_good_stuff/monkey_island/')],
        [0.2, (song) => (song.rawFileName.startsWith('touhoumidi.altervista.org/') &&
                        !song.rawFileName.startsWith('touhoumidi.altervista.org/th6'))], // leaving normal priority only for EoSD
        [0.2, (song) => song.score === 'c7'],
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
