
import {KeyCodes} from "./KeyCodes";
/**
 * computer keyboard key codes to semitone mapping
 */
export var PseudoPiano = function(): IPseudoPiano
{
    // TODO: implement
    return {
        semitoneByKey: {
            [KeyCodes.A]: 49,
            [KeyCodes.B]: 50,
            [KeyCodes.C]: 51,
        },
    };
};

interface IPseudoPiano {
    semitoneByKey: {[keyCode: number]: number},
}