
/// <reference path="../references.ts" />

var Ns = Ns || {};
Ns.Synths = Ns.Synths || {};

// this class is rival of WavCasher.ts
// the idea is same - we play sample audio files on "playNote()"
// the difference is that here we stick to soundfonts a bit more
//    the WavCasher treats single note as single audio file, it conflicts a bit with soundfont idea
//    where one instrument may have mapping to many samples of different instruments

interface INote { play: { (): { (): void } } }

Ns.Synths.Fluid = function(audioCtx: AudioContext, soundfontDirUrl: string): IFuid
{
    var soundFont = Ns.SoundFontAdapter(audioCtx, soundfontDirUrl);

    var presetsByChannel: { [id: number]: number } = {
        0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0, 12:0, 13:0, 14:0, 15:0
    };

    var volumeFactor = 0.3;

    // used for ... suddenly fallback.
    // when new note is about to be played we need time to load it
    var fallbackOscillator = Ns.Synths.Oscillator(audioCtx);

    var playSample = function(fetchedSample: IFetchedSample): {(): void}
    {
        var gainNode = audioCtx.createGain();
        gainNode.gain.value = volumeFactor;
        gainNode.connect(audioCtx.destination);

        var sample = audioCtx.createBufferSource();
        sample.playbackRate.value = fetchedSample.frequencyFactor;
        sample.loopStart = fetchedSample.loopStart;
        sample.loopEnd = fetchedSample.loopEnd;
        sample.loop = true;
        sample.connect(gainNode);
        sample.buffer = fetchedSample.buffer;

        sample.start();

        return () => sample.stop();
    };

    var playNote = function(semitone: number, channel: number)
    {
        var isDrum = +channel === 9;
        var preset = presetsByChannel[channel] || 0;

        var sample: IFetchedSample;

        if (sample = soundFont.fetchSample(semitone, preset, isDrum)) {
            return playSample(sample);
        } else {
            return fallbackOscillator.playNote(semitone, 0);
        }
    };

    var consumeConfig = function(programs: { [id: number]: number; }): void
    {
        Kl.fori(programs, (k,v) => presetsByChannel[k] = v);
    };

    // starts a worker that runs through chords and loads samples for notes if required
    var analyse = (chords: IShmidusicChord[]) => Kl.forChunk(chords, 100, 1, c =>
        c.noteList.forEach(n =>
            soundFont.fetchSample(n.tune, presetsByChannel[n.channel])));

    var init = function($cont: JQuery): void
    {
        $cont.empty();
        $cont.append('This Synth plays Fluid soundfonts!');
    };

    return {
        playNote: playNote,
        consumeConfig: consumeConfig,
        analyse: analyse,
        init : init,
    };
};

interface IFuid extends ISynth {
    analyse: {(chords: IShmidusicChord[]): void}
}