
import {IShmidusicChord, IShNote} from "./DataStructures";
import {Shmidusicator} from "./compose/Shmidusicator";

/**
 * "Adp" stands for "Adapters"
 *
 * Few times a thought crossed my mind: "hey, it would be nice if i could work
 * with this DOM object as with an object with some logic and specific functions;
 * or with this json object but preserving it being simple plain serializable and compatible stuff"
 *
 * So, here is the solution. You are welcome to remind me that i'm genius when you meet me.
 */
export var Adp = {
    Chord: function(c: IShmidusicChord) {
        let getLength = () => Math.min.apply(null, c.noteList.map(n => n.length));
        let getLengthNoDrum = () => Math.min.apply(null, c.noteList.filter(n => n.channel !== 9).map(n => n.length));
        let setLength = function(value: number)
        {
            if (value >= getLength()) {
                c.noteList
                    .filter(n => n.length < value)
                    .forEach(n => n.length = value);
            } else {
                var pausingNote = c.noteList.filter(n => n.channel === 9)[0] || null;
                if (pausingNote === null) {
                    pausingNote = {tune: 0, channel: 9, length: value};
                    c.noteList.push(pausingNote);
                } else {
                    pausingNote.length = value;
                }
            }
        };
        let removeRedundantPauses = function()
        {
            var length = getLength();
            c.noteList = c.noteList.filter(n => n.channel !== 9 || n.tune !== 0);
            setLength(length);
        };

        return {
            s: c, // "s" stands for "subject"
            getLength: getLength,
            getLengthNoDrum: getLengthNoDrum,
            isPause: () => c.noteList.length === 1 && c.noteList[0].tune === 0 && c.noteList[0].channel === 9,
            removeRedundantPauses: removeRedundantPauses,

            /**
             * lengthen all notes that are below the value to it
             * intended for fixing epsilon time discrepancies
             */
            setLength: setLength,
        };
    },

    /** matches only note with valid academic length: 1/4, 1/6, 1/16, 3/4... */
    Note: (n: IShNote) => Shmidusicator.findLength(n.length)
        .map(frac => 1 && {
            n: n,
            num: frac.num,
            den: frac.den,
        }),
};
