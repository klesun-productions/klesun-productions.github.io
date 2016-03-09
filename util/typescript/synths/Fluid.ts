
/// <reference path="../../../libs/jqueryTyped/jquery.d.ts" />
/// <reference path="ISynth.ts" />
/// <reference path="../Tools.ts" />
/// <reference path="../DataStructures.ts" />
/// <reference path="../../../libs/definitelytyped/waa.d.ts" />

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

    var audioCtx = new window.AudioContext();
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

    var getBuffer = function(url: string, onOk: { (resp: AudioBuffer): void })
    {
        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
        request.send();
        request.onload = () => audioCtx.decodeAudioData(request.response, onOk);
    };

    var initBufferSource = (url: string, onOk: { (): void }): AudioBufferSourceNode =>
    {
        var sample = audioCtx.createBufferSource();
        sample.connect(audioCtx.destination);
        getBuffer(url, (decoded: AudioBuffer) =>
        {
            sample.buffer = decoded;
            onOk();
        });

        return sample;
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

        var sampleBuffer: AudioBuffer = null,
            loopBuffer: AudioBuffer = null;
        getBuffer(dirUrl + '/' + delta + '.wav', (resp) => sampleBuffer = resp);
        getBuffer(dirUrl + '/' + delta + '_loop.wav', (resp) => loopBuffer = resp);

        // sample.volume = sampleLoop.volume = volumeFactor;

        var play = function()
        {
            if (sampleBuffer === null || loopBuffer === null) {
                return fallbackOscillator.playNote(semitone, 0);
            } else {

                var gainNode = audioCtx.createGain();
                gainNode.gain.value = volumeFactor;
                gainNode.connect(audioCtx.destination);

                var sample = audioCtx.createBufferSource(),
                    sampleLoop = audioCtx.createBufferSource();

                sample.connect(gainNode);
                sampleLoop.connect(gainNode);

                sample.buffer = sampleBuffer;
                sampleLoop.buffer = loopBuffer;

                sample.start();
                sampleLoop.start();

                return function()
                {
                    sample.stop();
                    sampleLoop.stop();
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