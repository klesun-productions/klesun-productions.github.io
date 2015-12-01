
var Util = Util || {};
Util.Synths = Util.Synths || {};

// it is wrapper for Mudcube's MIDI.js to generalize it to use as other synths

Util.Synths.Mudcube = function () {

    // var DEFAULT_INSTRUMENT = 52; // oh, yeah!
    var DEFAULT_INSTRUMENT = 0;

    var firstInit = true;
    // on demand
    var mudcube = null;

    var pianoOnly = true;

    // i do this ugliness because as you see, there is way too many scripts for such a simple task as just playing a note
    // i plan to change their code a bit and limit it to, let's see... a single script? which, of course is no problem to include from html
    var include = [
        "/libs/dont_use_it_MIDI.js//inc/shim/Base64.js",
        "/libs/dont_use_it_MIDI.js//inc/shim/Base64binary.js",
        "/libs/dont_use_it_MIDI.js//inc/shim/WebAudioAPI.js",
        //    <!-- dont_use_it_MIDI.js/ package -->
        "/libs/dont_use_it_MIDI.js//js/midi/audioDetect.js",
        "/libs/dont_use_it_MIDI.js//js/midi/gm.js",
        "/libs/dont_use_it_MIDI.js//js/midi/loader.js",
        "/libs/dont_use_it_MIDI.js//js/midi/plugin.audiotag.js",
        "/libs/dont_use_it_MIDI.js//js/midi/plugin.webaudio.js",
        "/libs/dont_use_it_MIDI.js//js/midi/plugin.webmidi.js",
        //    <!-- utils -->
        "/libs/dont_use_it_MIDI.js//js/util/dom_request_xhr.js",
        "/libs/dont_use_it_MIDI.js//js/util/dom_request_script.js",
    ];

    var loadPlugin = function () {

        var done = 0;
        include.forEach(scriptPath => $.getScript(scriptPath, function() {

            console.log(scriptPath, 'loaded!');

            if (++done === include.length) {
                MIDI.loadPlugin({
                    soundfontUrl: "/libs/midi-js-soundfonts/FluidR3_GM/",
                    instruments: [DEFAULT_INSTRUMENT], // oh, yeah...
                    onsuccess: function() {
                        mudcube = MIDI;

                        MIDI.programChange(0, DEFAULT_INSTRUMENT);
                        MIDI.setVolume(0, 127);
                        MIDI.noteOn(0, 50, 127);
                        MIDI.noteOff(0, 50, 0.75);
                    }
                });

            }
        }));
    };

    var initControl = function($controlEl) {

        var $pianoOnlyCheckbox = $('<input type="checkbox"/>')
            .change(function() {
                var warning = 'Unsetting this checkbox will allow _all_ instruments. It may take 500+ MiB of your RAM to play a complicated song (like "Terranigma - Europe (1).mid"). Are you OK with that?';
                if (!$pianoOnlyCheckbox[0].checked && !confirm(warning)) {
                    $pianoOnlyCheckbox[0].checked = true;
                }
                pianoOnly = $pianoOnlyCheckbox[0].checked ? true : false;
            });
        $pianoOnlyCheckbox[0].checked = pianoOnly;

        var $pianoOnlyFlag = $('<div></div>')
            .append('Piano Only: ').append($pianoOnlyCheckbox);

        $controlEl.empty().append($pianoOnlyFlag);
    };

    var init = function($controlEl) {
        if (firstInit) {
            firstInit = false;
            loadPlugin();
        }

        initControl($controlEl);
    };

    /** @param noteJs - shmidusic Note external representation
     * @return function - lambda to interrupt note */
    var playNote = function(noteJs) {

        // does not work in chromium. due to mp3 and proprietarity i suppose

        var position = 0;

        var toFloat = fractionString => eval(fractionString);
        var length = toFloat(noteJs.length) / (noteJs.isTriplet ? 3 : 1);

        mudcube.noteOn(noteJs.channel, noteJs.tune, 127, position);
        return (_) => mudcube.noteOff(noteJs.channel, noteJs.tune, position);
    };

    /** @param instrumentDict {channelNumber: instrumentNumber} */
    var consumeConfig = function (instrumentDict, callback) {

        // TODO: i don't remember id of real drums... it could be 192, or probably we should send drums with a sepcial message...
        var SYNTH_DRUM = 115; // default drum in mudcube repo... well... probably it could be called a drum...
        
        instrumentDict = $.extend({}, instrumentDict, {9: SYNTH_DRUM}); // Mudcube does not support real MIDI drums of 1..10th channel

        if (pianoOnly) {
            Object.keys(instrumentDict).forEach(ch => (instrumentDict[ch] = ch == 9 ? SYNTH_DRUM : DEFAULT_INSTRUMENT));
        }
        var instruments = Object.keys(instrumentDict).length > 0
            ? Object.keys(instrumentDict).map(ch => instrumentDict[ch])
            : [DEFAULT_INSTRUMENT];

        mudcube.loadPlugin({
            soundfontUrl: "/libs/midi-js-soundfonts/FluidR3_GM/",
            instruments: instruments,
            onsuccess: function() {
                Object.keys(instrumentDict).forEach(ch => mudcube.programChange(ch, instrumentDict[ch]));
                callback();
            }
        });
    };

    return $.extend(Util.Synths.SynthAdapter(), {
        init: init,
        playNote: playNote,
        consumeConfig: consumeConfig
    });
};

