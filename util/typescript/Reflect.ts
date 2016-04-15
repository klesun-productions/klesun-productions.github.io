
/// <reference path="references.ts" />

var Ns = Ns || {};

// this class parses a typescript file (roughly)
// and provides an object that represents the type structure

// TODO: try to find solutions on the internets
// research more: http://stackoverflow.com/a/32255264/2750743

Ns.Reflect = function()
{
    var numberifyLengths = function(song: IShmidusicStructure): IShmidusicStructure
    {
        song.staffList
            .forEach(s => s.chordList
                .forEach(c => c.noteList
                    .forEach(n => n.length = eval(n.length + ''))));

        return song;
    };

    var validateShmidusic = function(subj: any): IShmidusicStructure
    {
        // TODO: implement full type check

        return (typeof subj === 'object') && ('staffList' in subj)
            ? numberifyLengths(subj)
            : null;
    };

    return {
        validateShmidusic: validateShmidusic,
    };
};
