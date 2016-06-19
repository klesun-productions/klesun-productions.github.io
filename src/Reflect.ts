/// <reference path="references.ts" />

import {IShmidusicStructure, IShmidusicChord} from "./DataStructures";
import {SafeAccess} from "./utils/SafeAccess";

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

    const validateChordList = function(json: string): IShmidusicChord[]
    {
        try {
            var validJson = JSON.parse(json);
        } catch (e) {
            console.log('It is not valid JSON! See log for details', e);
            return null;
        }

        var [valid, error] = SafeAccess(validJson, a => a.isList(a => 1 && {
            noteList: a.sub('noteList', a => a.isList(a => 1 && {
                length: a.sub('length', a => a.isNumber()),
                channel: a.sub('channel', a => a.isNumber()),
                tune: a.sub('tune', a => a.isNumber()),
            })),
        }));
        if (!error) {
            return valid;
        } else {
            console.log('Invalid JSON format - this is not a Shmidusic song!', error);
            return null;
        }
    };

    return {
        validateShmidusic: validateShmidusic,
        validateChordList: validateChordList,
    };
};
