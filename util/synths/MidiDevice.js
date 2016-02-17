
var Util = Util || {};
Util.Synths = Util.Synths || {};

Util.Synths.MidiDevice = function ()
{
    var NOTE_ON = 0x90;
    var NOTE_OFF = 0x80;

    var volume = 64;

    var firstInit = true;
    var midiOutputList = [];

    var initControl = function($controlEl)
    {
        $controlEl.empty()
            .append($('<div class="inlineBlock"></div>')
                .append('Volume Gain: ')
                .append($('<input type="range" min="0" max="127" step="1"/>')
                    .addClass("smallSlider").val(volume)
                    .on("input change", (e) => (volume = e.target.value))));
    };

    var init = function ($controlEl)
    {
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

        initControl($controlEl);
    };

    // 127 = max velocity
    var noteOn = (tune,channel) => midiOutputList.forEach(o => o.send([NOTE_ON - -channel, tune, volume] ));
    var noteOff = (tune,channel) => midiOutputList.forEach(o => o.send([NOTE_OFF - -channel, tune, 0x40]));

    var setInstrument = (n,channel) => midiOutputList.forEach(o => o.send([0xC0 - -channel, n]));

    // a dict {noteIndex: openedCount}
    var openedDict = {};
    Util.range(0,16).forEach(n => (openedDict[n] = {}));

    /** @TODO: change arguments from "noteJs" to explicit "tune" and "channel" */

    /** @param noteJs - shmidusic Note external representation
     * @return function - lambda to interrupt note */
    var playNote = function(tune, channel)
    {
        if (+tune === 0) { // pauses in shmidusic... very stupid idea
            return () => {};
        }
        
        // stopping just for a moment to mark end of previous sounding if any
        if ((openedDict[channel][tune] || 0) > 0) {
            noteOff(tune, channel);
        }

        noteOn(tune, channel);

        openedDict[channel][tune] |= 0;
        openedDict[channel][tune] += 1;

        var stopNote = function() {
            if (--openedDict[channel][tune] === 0) {
                noteOff(tune, channel);
            }
        };

        return stopNote;
    };

    /** @param instrumentDict {channelNumber: instrumentNumber} */
    var consumeConfig = function (instrumentDict, callback)
    {
        Object.keys(instrumentDict).forEach(ch => setInstrument(instrumentDict[ch],ch));
        callback();
    };

    return $.extend(Util.Synths.ISynth(), {
        init: init,
        playNote: playNote,
        consumeConfig: consumeConfig,
    });
};

