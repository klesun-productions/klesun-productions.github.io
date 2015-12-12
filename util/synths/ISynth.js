
var Util = Util || {};
Util.Synths = Util.Synths || {};

// TODO: move synth-specific code (mudcube/midiDevice/oscillator) from Playback here
Util.Synths.ISynth = function ()
{
    var notImplemented = function () {
        var msg = 'Called to not implemented method. Please, generate a blue screen of death or something to sign Death and Destruction.';
        console.trace();
        alert(msg);
        throw new Error(msg);
    };

    return {
        playNote: notImplemented,
        consumeConfig: notImplemented,
        init: notImplemented
    };
};
