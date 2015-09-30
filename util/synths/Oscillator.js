
var Util = Util || {};
Util.Synths = Util.Synths || {};

Util.Synths.Oscillator = function () {

    var firstInit = true;
    var gainNode;

    var init = function () {
        if (firstInit) {
            var audioCtx = new (window.AudioContext || window.webkitAudioContext)()
            gainNode = audioCtx.createGain();
            gainNode.connect(audioCtx.destination);

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
