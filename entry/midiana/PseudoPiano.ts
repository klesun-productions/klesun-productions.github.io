
/**
 * computer keyboard key codes to semitone mapping
 */
export var PseudoPiano = function(): IPseudoPiano
{
    type matrix_t = [string, string, string, string][];

    // TODO: make configurable, since different people may have different placement
    var keyNamePlacement: matrix_t = [
        ['ShiftLeft', 'CapsLock', 'Tab', 'Backquote'],
        ['KeyZ', 'KeyA', 'KeyQ', 'Digit1'],
        ['KeyX', 'KeyS', 'KeyW', 'Digit2'],
        ['KeyC', 'KeyD', 'KeyE', 'Digit3'],
        ['KeyV', 'KeyF', 'KeyR', 'Digit4'],
        ['KeyB', 'KeyG', 'KeyT', 'Digit5'],
        ['KeyN', 'KeyH', 'KeyY', 'Digit6'],
        ['KeyM', 'KeyJ', 'KeyU', 'Digit7'],
        ['Comma', 'KeyK', 'KeyI', 'Digit8'],
        ['Period', 'KeyL', 'KeyO', 'Digit9'],
        ['Slash', 'Semicolon', 'KeyP', 'Digit0'],
        ['ShiftRight', 'Quote', 'BracketLeft', 'Minus'],
    ];

    var lowest = 36;
    var semitoneByKeyName: {[keyName: string]: number} = {};

    for (var i = 0; i < keyNamePlacement.length; ++i) {
        for (var j = 0; j < 4; ++j) {
            var keyName = keyNamePlacement[i][j];
            var semitone = lowest + j * 12 + i;
            semitoneByKeyName[keyName] = semitone;
        }
    }

    return {
        semitoneByKey: semitoneByKeyName,
    };
};

interface IPseudoPiano {
    semitoneByKey: {[keyCode: string]: number},
}