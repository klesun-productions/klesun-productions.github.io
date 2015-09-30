
var Util = Util || {};
Util.Synths = Util.Synths || {};

Util.Synths.MidiDevice = function () {

    return $.extend(Util.Synths.SynthAdapter(), {
        playNote: notImplemented,
        stopNote: notImplemented,
        consumeConfig: notImplemented,
    });
};

