
var Util = Util || {};
Util.Synths = Util.Synths || {};

Util.Synths.Oscillator = function () {

    var firstInit = true;
    // on demand
    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // ["sine", "square", "saw", "triangle", "custom"]
    var waveTypes = ["sine", "triangle", "sawtooth", "square"];
    var waveType = "sawtooth";

    var baseVolume = 0.1;

    /** @return function - lambda to interrupt */
    var startSounding = function(frequency, customWaveType)
    {
        /** @TODO: if you feel paranoic, you may create a constant OSCILLATOR_INIT_TIME
         * and delay playback start and finish by it to deel with artifacts */

        var gainNode = audioCtx.createGain();
        gainNode.connect(audioCtx.destination);
        gainNode.gain.value = 0;
        /** this timeout is a hacky way to get rid of artifacts when oscillator starts and stops
         * a'm afraid it may affect performance... */
        setTimeout((_) => (gainNode.gain.value = baseVolume));
        //gainNode.gain.value = baseVolume;

        var oscillator = audioCtx.createOscillator();
        oscillator.frequency.value = frequency;
        oscillator.type = customWaveType || waveType;
        oscillator.connect(gainNode);
        oscillator.start(0);

        return function()
        {
            gainNode.gain.value = 0;
            setTimeout((_) => oscillator.stop(), 100);
        };
    };

    var tuneToFrequency = function(tune)
    {
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
            .change(function() {
                waveType = $waveDropDown.val();
                $waveImage.attr('src', '/imgs/wave_' + waveType + '.png');
            }).trigger("change");

        var waveTypeField = $('<div class="inlineBlock"></div>')
            .append('Wave Type: ').append($waveDropDown).append($waveImage);

        var $volumeSlider = $('<input type="range" min="0.002" max="0.2" step="0.002"/>')
            .addClass("smallSlider")
            .val(baseVolume)
            .on("input change", (_) => (baseVolume = $volumeSlider.val()));
            //.on("input change", (_) => (gainNode.gain.value = $volumeSlider.val()));

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
            firstInit = false;
        }

        initControl($controlEl);
    };

    /** @param noteJs - shmidusic Note external representation
     * @return function - lambda to interrupt note */
    var playNote = function(tune, channel) 
	{
        if (+channel !== 9) {
            if (+tune !== 0) { // stupid way to define pauses
                return startSounding(tuneToFrequency(tune));
            } else {
                return (_) => {};
            }
        } else { // this is drum
            // following https://www.youtube.com/watch?v=NmGRrPyvHdU
            var click = startSounding(tuneToFrequency(50), 'sine');
            click();
            return (_) => {};
        }
    };

    return $.extend(Util.Synths.ISynth(), {
        init: init,
        playNote: playNote,
        consumeConfig: (_, callback) => callback()
    });
};
