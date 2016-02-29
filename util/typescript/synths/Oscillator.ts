
/// <reference path="../../../libs/jqueryTyped/jquery.d.ts" />
/// <reference path="../../../libs/definitelytyped/waa.d.ts" />
/// <reference path="ISynth.ts" />
/// <reference path="../Tools.ts" />

var Ns = Ns || {};
Ns.Synths = Ns.Synths || {};

// this class provides ability to play notes with js Web Audio Api oscillator

type EWave = 'sine' | 'triangle' | 'sawtooth' | 'square';

Ns.Synths.Oscillator = function(): ISynth
{
    var firstInit = true;
    var audioCtx = new window.AudioContext();

    // ['sine', 'square', 'saw', 'triangle', 'custom']
    var waveTypes: EWave[] = ['sine', 'triangle', 'sawtooth', 'square'];
    var waveType = 'sawtooth';

    var instrumentDict: { [id: number]: number } = {
        0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0, 12:0, 13:0, 14:0, 15:0
    };

    var baseVolume = 0.1;

    /** @return function - lambda to interrupt */
    var startSounding = function(frequency: number)
    {
        /** @TODO: if you feel paranoic, you may create a constant OSCILLATOR_INIT_TIME
         * and delay playback start and finish by it to deel with artifacts */

        var gainNode = audioCtx.createGain();
        gainNode.connect(audioCtx.destination);
        gainNode.gain.value = 0;
        /** this timeout is a hacky way to get rid of artifacts when oscillator starts and stops
         * a'm afraid it may affect performance... */
        setTimeout(() => (gainNode.gain.value = baseVolume));
        //gainNode.gain.value = baseVolume;

        var oscillator = audioCtx.createOscillator();
        oscillator.frequency.value = frequency;
        oscillator.type = waveType;
        oscillator.connect(gainNode);
        oscillator.start(0);

        return function()
        {
            gainNode.gain.value = 0;
            setTimeout(() => oscillator.stop(), 100);
        };
    };

    var tuneToFrequency = function(tune: number)
    {
        var shift = tune - 69; // 69 - LA, 440 hz
        var la = 440.0;
        return la * Math.pow(2, shift / 12.0);
    };

    var initControl = function($controlEl: JQuery)
    {
        firstInit = false; // TODO: likely unused

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

        var $volumeSlider: JQuery = $('<input type="range" min="0.002" max="0.2" step="0.002"/>')
            .addClass("smallSlider")
            .val(baseVolume)
            .on("input change", () => (baseVolume = $volumeSlider.val()));
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

    /** @param noteJs - shmidusic Note external representation
     * @return function - lambda to interrupt note */
    var playNote = function(tune: number, channel: number)
    {
        if (+channel !== 9) {
            if (+tune !== 0) { // stupid way to define pauses
                return startSounding(tuneToFrequency(tune));
            } else {
                return () => {};
            }
        } else {
            return () => {};
        }
    };

    var consumeConfig = function(instrByChan: { [id: number]: number })
    {
        /** @TODO: these presets that are generated from oscillator (not from samples), like
         * "Synth Bass", "Stuff from 80 to 100", "Synth Strings" should be played properly here */
        instrumentDict = instrByChan;
    };

    return $.extend(Util.Synths.ISynth(), {
        init: initControl,
        playNote: playNote,
        consumeConfig: consumeConfig
    });
};
