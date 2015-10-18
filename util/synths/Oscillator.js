
var Util = Util || {};
Util.Synths = Util.Synths || {};

Util.Synths.Oscillator = function () {

    var firstInit = true;
    // on demand
    var gainNode;
    var audioCtx;

    // ["sine", "square", "saw", "triangle", "custom"]
    var waveTypes = ["sine", "square", "sawtooth", "triangle"];
    var waveType = "sawtooth";

    var baseVolume = 0.02;

    var noteThreads = [];

    var tuneToFrequency = function(tune) {

        var shift = tune - 69; // 69 - LA, 440 hz
        var la = 440.0;
        return la * Math.pow(2, shift / 12.0);
    };

    var toFloat = fractionString => eval(fractionString);
    var toMillis = (length, tempo) => 1000 * length * 60 / (tempo / 4);  // because 1 / 4 = 1000 ms when tempo is 60

    var initControl = function($controlEl) {

        var $waveDropDown = $('<select></select>');
        /** @TODO: draw it moving on canvas instead =3 */
        var $waveImage = $('<img alt="wave_image"/>').css('margin-bottom', '-5px'); // -7px, sry, too lazy to investigate
        waveTypes
            .map(wt => $('<option value="' + wt + '">' + wt + '</option>'))
            .forEach(opt => $waveDropDown.append(opt));
        $waveDropDown.val(waveType)
            .change(() => {
                waveType = $waveDropDown.val();
                $waveImage.attr('src', '/imgs/wave_' + waveType + '.png');
            }).trigger("change");

        var waveTypeField = $('<div class="inlineBlock"></div>')
            .append('Wave Type: ').append($waveDropDown).append($waveImage);

        $volumeSlider = $('<input type="range" min="0.002" max="0.2" step="0.002"/>')
            .addClass("smallSlider")
            .val(baseVolume)
            .on("input change", () => gainNode.gain.value = $volumeSlider.val());

        var volumeField = $('<div class="inlineBlock"></div>')
            .append('Volume Gain: ').append($volumeSlider);

        $controlEl
            .empty()
            .append(waveTypeField)
            .append(volumeField)
            .append('<br clear="all"/>')
        ;
    };

    var init = function($controlEl) {
        if (firstInit) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)()
            gainNode = audioCtx.createGain();
            gainNode.connect(audioCtx.destination);
            gainNode.gain.value = baseVolume;

            firstInit = false;
        }

        initControl($controlEl);
    };

    var stopNote = function(noteThread) {

        if (!noteThread.interrupted) {

            noteThread.oscillator.stop();

            noteThread.interrupted = true;
            var index = noteThreads.indexOf(noteThread);
            noteThreads.splice(index, 1);
        }
    };

    /** @param noteJs - shmidusic Note external representation */
    var playNote = function(noteJs, tempo) {

        if (noteJs.channel != 9) {
            var oscillator = audioCtx.createOscillator();

            oscillator.connect(gainNode);
            oscillator.frequency.value = tuneToFrequency(noteJs.tune);
            oscillator.type = waveType;

            oscillator.start(0);

            var duration = toMillis(toFloat(noteJs.length) / (noteJs.isTriplet ? 3 : 1), tempo);

            var thread = {oscillator: oscillator, interrupted: false, noteJs: noteJs};
            noteThreads.push(thread);
            Util.setTimeout(() => stopNote(thread), duration);

        } else {
            // TODO: this is drum - think something about this!
        }
    };

    return $.extend(Util.Synths.SynthAdapter(), {
        init: init,
        playNote: playNote,
        consumeConfig: (_, callback) => callback()
    });
};
