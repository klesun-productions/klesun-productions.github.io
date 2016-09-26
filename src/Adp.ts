
import {IShmidusicChord} from "./DataStructures";

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
        return {
            s: c, // "s" stands for "subject"
            getLength: () => Math.min.apply(null, c.noteList.map(n => n.length)),

            /**
             * lengthen all notes that are below the value to it
             * intended for fixing epsilon time discrepancies
             */
            setLength: (value: number) =>
                c.noteList
                    .filter(n => n.length < value)
                    .forEach(n => n.length = value),
        };
    },
};
