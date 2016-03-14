
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

Ns.Synths.Fluid = function(audioCtx: AudioContext, soundfontDirUrl: string): ISynth
{
    var sampleDirUrl = soundfontDirUrl + '/samples/';

    var drumPresetIndex = 158;
    var presetsByChannel: { [id: number]: number } = {
        0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0, 12:0, 13:0, 14:0, 15:0
    };

    var volumeFactor = 0.3;

    var presets: IPreset[] = null;
    var drumPreset: IDrumPreset = null;
    $.getJSON(soundfontDirUrl + '/presets.json', (result) => presets = result);
    $.getJSON(soundfontDirUrl + '/drumPreset.json', (result) => drumPreset = result);

    // used for ... suddenly fallback.
    // when new note is about to be played we need time to load it
    var fallbackOscillator = Ns.Synths.Oscillator(audioCtx);

    var cachedSampleBuffers: { [url: string]: AudioBuffer; } = {};
    var awaiting: { [url: string]: Array<{ (resp: AudioBuffer): void }> } = {};

    var getBuffer = function(url: string, onOk: { (resp: AudioBuffer): void }): void
    {
        if (!(url in cachedSampleBuffers)) {
            var request = new XMLHttpRequest();
            request.open('GET', url, true);
            request.responseType = 'arraybuffer';
            request.send();
            awaiting[url] = awaiting[url] || [];
            awaiting[url].push(onOk);
            request.onload = () => audioCtx.decodeAudioData(request.response, function(decoded)
            {
                awaiting[url].forEach(a => a(decoded));
                awaiting[url] = [];
                cachedSampleBuffers[url] = decoded;
            });
        } else {
            onOk(cachedSampleBuffers[url]);
        }
    };

    var determineCorrectionCents = function(delta: number, generator: IGenerator): number
    {
        var result = delta * 100;

        if ('fineTune' in generator) {
            result += generator.fineTune;
        }

        if ('coarseTune' in generator) {
            result += generator.coarseTune * 100;
        }

        return result;
    };

    // overwrites global keys with local if any
    var updateGenerator = function(global: IGenerator, local: IGenerator): IGenerator
    {
        return Ns.extend(global, local);
    };

    // adds the tuning semi-tones and cents; multiplies whatever needs to be multiplied
    var combineGenerators = function(global: IGenerator, local: IGenerator): IGenerator
    {
        var result = Ns.extend(local, {});

        result.fineTune = (result.fineTune || 0) + (global.fineTune || 0);
        result.coarseTune = (result.coarseTune || 0) + (global.coarseTune || 0);

        return result;
    };

    // this class should take logic of how to play new note
    // if old with same semitone and preset is still playing
    var Note = function(semitone: number, preset: number, isDrum: boolean): INote
    {
        var sampleListList = isDrum
            ? drumPreset.stateProperties.map(p => p.instrument.samples)
            : [presets[preset].instrument.samples];

        var sampleList: ISampleInfo[] = [].concat.apply([], sampleListList);

        var sampleInfo = sampleList
            .filter(s => !('keyRange' in s.generator) ? true :
                s.generator.keyRange.lo <= semitone &&
                s.generator.keyRange.hi >= semitone)[0];

        /** @debug */
        if (!sampleInfo) {
            console.log('no sample!', semitone, preset);
            return { play: () => fallbackOscillator.playNote(semitone, 0) };
        }

        var sampleUrl = sampleDirUrl + '/' + sampleInfo.sampleName.replace('#', '%23') + '.wav';
        var sampleBuffer: AudioBuffer = null;
        getBuffer(sampleUrl, (resp) => sampleBuffer = resp);

        var generator = combineGenerators(
            presets[preset].generatorApplyToAll || {},
            updateGenerator(presets[preset].instrument.generatorApplyToAll, sampleInfo.generator)
        );

        var sampleSemitone = 'overridingRootKey' in sampleInfo.generator
            ? sampleInfo.generator.overridingRootKey
            : sampleInfo.originalPitch;

        var correctionCents = determineCorrectionCents(semitone - sampleSemitone, generator);
        var freqFactor = Math.pow(2, correctionCents / 100 / 12);

        var play = function()
        {
            if (sampleBuffer === null) {
                return fallbackOscillator.playNote(semitone, 0);
            } else {

                var gainNode = audioCtx.createGain();
                gainNode.gain.value = volumeFactor;
                gainNode.connect(audioCtx.destination);

                var sample = audioCtx.createBufferSource();
                sample.playbackRate.value = freqFactor;
                sample.loopStart = sampleInfo.startLoop / sampleInfo.sampleRate;
                sample.loopEnd = sampleInfo.endLoop / sampleInfo.sampleRate;
                sample.loop = true;
                sample.connect(gainNode);
                sample.buffer = sampleBuffer;

                sample.start();

                return () => sample.stop();
            }
        };

        return {
            play: play
        };
    };

    var playNote = function(semitone: number, channel: number)
    {
        var isDrum = +channel === 9;
        var preset = presetsByChannel[channel] || 0;

        return Note(semitone, preset, isDrum).play();
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
