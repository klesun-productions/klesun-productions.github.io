
var Util = Util || {};
Util.Synths = Util.Synths || {};

// it is wrapper for Mudcube's MIDI.js to generalize it to use as other synths

Util.Synths.Mudcube = function () {

    var firstInit = true;
    var mudcube = null;

    var init = function () {
        if (firstInit) {


            firstInit = false;
        }
    };

    return $.extend(Util.Synths.SynthAdapter(), {
        init: init,
        playNote: notImplemented,
        stopNote: notImplemented,
        consumeConfig: notImplemented
    });
};

