
var Util = Util || {};
Util.Synths = Util.Synths || {};

Util.Synths.MidiDevice = function () {

    var firstInit = true;
    var midiOutputList = [];

    var toFloat = fractionString => eval(fractionString);
    var toMillis = (length, tempo) => 1000 * length * 60 / (tempo / 4);  // because 1 / 4 = 1000 ms when tempo is 60

    var init = function ($controlEl) {

        if (firstInit) {
            firstInit = false;
            // TODO: for now calling navigator.requestMIDIAccess() blocks devices for other programs
            // investigate, how to free devices (output.open() ?). we should free them each time playback finished
            // upd.: open() does not help midiana, but it may be her problems. Musescore works alright with input
            if (navigator.requestMIDIAccess) {
                navigator.requestMIDIAccess().then(
                    ma => ma.outputs.forEach(o => midiOutputList.push(o)),
                    e => console.log("Failed To Access Midi, Even Though Your Browser Has The Method...", e)
                );
            } else {
                alert('Your browser does not support midi Devices. Pity, you could listen to music on your mega-device if you used chrome =P');
            }
        }

        $controlEl.empty().append($('<div></div>').append('TODO: make possible to choose output device'));
    };

    var playNote = function(noteJs, tempo) {
        midiOutputList.forEach(output => {

            var duration = toMillis(toFloat(noteJs.length) / (noteJs.isTriplet ? 3 : 1), tempo);

            output.send( [0x90 - -noteJs.channel, noteJs.tune, 127] );  // 0x90 = noteOn, 127 = max velocity
            output.send( [0x80 - -noteJs.channel, noteJs.tune, 0x40], window.performance.now() + duration );
        });
    };

    /** @param instrumentDict {channelNumber: instrumentNumber} */
    var consumeConfig = function (instrumentDict, callback) {
        Object.keys(instrumentDict).forEach(
            // 0xC0 - program change
            ch => midiOutputList.forEach(o => o.send([0xC0 - -ch, instrumentDict[ch]]))
        );

        callback();
    };

    return $.extend(Util.Synths.SynthAdapter(), {
        init: init,
        playNote: playNote,
        consumeConfig: consumeConfig,
    });
};

