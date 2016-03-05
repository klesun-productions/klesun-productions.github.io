
/// <reference path="../../../libs/jqueryTyped/jquery.d.ts" />
/// <reference path="ISynth.ts" />
/// <reference path="../Tools.ts" />
/// <reference path="../DataStructures.ts" />

var ZHOPA_PRESETS: any = null;

var Ns = Ns || {};
Ns.Synths = Ns.Synths || {};

// this class is rival of WavCasher.ts
// the idea is same - we play sample audio files on "playNote()"
// the difference is that here we stick to soundfonts a bit more
//    the WavCasher treats single note as single audio file, it conflicts a bit with soundfont idea
//    where one instrument may have mapping to many samples of different instruments

interface INote { play: { (): { (): void } } }

Ns.Synths.Fluid = function(): ISynth
{
    var sampleUrl = '/out/fluidSamples';
    var drumPresetIndex = 158;
    var presetsByChannel: { [id: number]: number } = {
        0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0, 12:0, 13:0, 14:0, 15:0
    };

    var volumeFactor = 0.3;

    var presets: IPreset[] = null;
    $.getJSON('/out/fluidPresets.json', function(result)
    {
        presets = ZHOPA_PRESETS = result;
        console.log('loaded mazafaka!', presets);
    });

    // used for ... suddenly fallback.
    // when new note is about to be played we need to load it
    var fallbackOscillator = Ns.Synths.Oscillator();

    // this class should take the logic of synchronizing
    // the sample and sampleLoop and fading on pause
    var Sample = function()
    {

    };

    // this class should take logic of how to play new note
    // if old with same semitone and preset is still playing
    var Note = function(semitone: number, preset: number): INote
    {
        var sampleInfo = presets[preset].instrument.samples
            .filter(s => !('keyRange' in s) ? true :
                s.keyRange.lo <= semitone &&
                s.keyRange.hi >= semitone)[0];

        var dirUrl = sampleUrl + '/' + sampleInfo.sampleName.replace('#', '%23');
        var delta = semitone - ('overridingRootKey' in sampleInfo
                                ? sampleInfo.overridingRootKey.amount
                                : sampleInfo.originalPitch);

        var sample = new Audio(dirUrl + '/' + delta + '.wav');
        var sampleLoop = new Audio(dirUrl + '/' + delta + '_loop.wav');
        // TODO: it does not loop seamlessly for some reason. see: seamless_loop.html
        sampleLoop.loop = true;

        var sampleLoaded = false, loopLoaded = false;
        sample.onloadeddata = () => { sampleLoaded = true; };
        sampleLoop.onloadeddata = () => { loopLoaded = true; };
        sample.volume = sampleLoop.volume = volumeFactor;

        var play = function()
        {
            if (!sampleLoaded || !loopLoaded) {
                return fallbackOscillator.playNote(semitone, 0);
            } else {
                sample.currentTime = sampleLoop.currentTime = 0;
                sample.play();
                sampleLoop.play();

                return function()
                {
                    sample.pause();
                    sampleLoop.pause();
                };
            }
        };

        return {
            play: play
        };
    };

    var cachedNotes: { [instr: number]: { [semitone: number]: INote } } = {};

    var playNote = function(semitone: number, channel: number)
    {
        /** @TODO: drums */
        if (+channel === 9) {
            return () => {};
        }

        var preset = presetsByChannel[channel] || 0;
        cachedNotes[preset] = cachedNotes[preset] || {};

        if (!(semitone in cachedNotes[preset])) {
            return (cachedNotes[preset][semitone] = Note(semitone, preset)).play();
        } else {
            return cachedNotes[preset][semitone].play();
        }
    };

    var consumeConfig = function(programs: { [id: number]: number; }): void
    {
        presetsByChannel = programs;
    };

    var init = function($cont: JQuery): void
    {
        $cont.empty();
        $cont.append('This Synth plays Fluid soundfonts!');
    };

    return {
        playNote: playNote,
        consumeConfig: consumeConfig,
        init : init
    };
};