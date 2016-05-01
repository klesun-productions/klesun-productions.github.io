
/// <reference path="references.ts" />

import {IShmidusicStructure} from "./DataStructures";

// this class parses a typescript file (roughly)
// and provides an object that represents the type structure

// TODO: try to find solutions on the internets
// research more: http://stackoverflow.com/a/32255264/2750743

export default function ShReflect()
{
    // transforms fraction string note lengths to float numbers;
    // transforms all pauses to a drum channel
    var adapt = function(song: IShmidusicStructure): IShmidusicStructure
    {
        song.staffList
            .forEach(s => s.chordList
                .forEach(c => c.noteList
                    .forEach(n => {
                        n.length = eval(n.length + '');
                        if (+n.tune === 0) { // pause in shmidusic language
                            n.channel = 9;
                        }
                    })));

        return song;
    };

    var validateShmidusic = function(subj: any): IShmidusicStructure
    {
        // TODO: implement full type check

        return (typeof subj === 'object') && ('staffList' in subj)
            ? adapt(subj)
            : null;
    };

    return {
        validateShmidusic: validateShmidusic,
    };
};
