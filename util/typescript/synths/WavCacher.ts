
/// <reference path="../../../libs/jqueryTyped/jquery.d.ts" />
/// <reference path="ISynth.ts" />
/// <reference path="../Tools.ts" />

var Ns = Ns || {};
Ns.Synths = Ns.Synths || {};

// well, since chrome does not support "preservesPitch", and firefox just sux at rhytmically playing sounds with WebAudio,
// all that's left to do - load each semitone as a separate file so it could be played on chrome at least

Ns.Synths.WavCacher = function(): ISynth
{
    // nothing venture nothing win

    var instrumentFolderLink = '/libs/soundfonts/samples/generated_tunable/';
    var instrumentDict: { [id: number]: number } = {
        0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0, 12:0, 13:0, 14:0, 15:0
    };
    // dict {instrumentCode: {semitone: WebAudio}}
    var cachedNotes: { [instr: number]: { [semitone: number]:HTMLAudioElement } } = {};
    var redirectCodes: { [instr: number]: number } = {
        1: 0, // using grand instead of bright piano
        3: 0, // using grand instead of honky piano
        23: 21, // using Accordian instead of Bandeon
        47: 44, 48: 44, // using Strings instead of String Ensamble

    };
    // u see, stuff is like that
    var takeClosest = function(requestedCode: number)
    {
        return (requestedCode in redirectCodes)
            ? redirectCodes[requestedCode]
            : requestedCode;
    };
    // used for ... suddenly fallback.
    // when new note is about to be played we need to load it
    var fallbackOscillator = Ns.Synths.Oscillator(); // TODO: move Oscillator to typescript
    // it would likely be better to pass the existing, so user could customize (volume, etc)
    var volumeFactor = 0.3;

    var freeNotes: { [instr: number]: { [semitone: number]: HTMLAudioElement[] } } = {};

    var playNote = function(semitone: number, channel: number): { (): void }
    {
        var instrumentCode = instrumentDict[channel] || 0;
        cachedNotes[instrumentCode] = cachedNotes[instrumentCode] || {};
        freeNotes[instrumentCode] = freeNotes[instrumentCode] || {};
        freeNotes[instrumentCode][semitone] = freeNotes[instrumentCode][semitone] || [];

        /** @TODO: start loading future during playback of present */

        /** @TODO: loop sample playback */

        /** @TODO: correct some pitches */

        /** @TODO: drums */
        if (+channel === 9) {
            return () => {};
        }

        /** TODO: this check does take into account that internet connection may be slow
         * so - we should fallback also in case file not loaded yet */
        if (!(semitone in cachedNotes[instrumentCode])) {
            var takeCode = takeClosest(instrumentCode);
            var link = instrumentFolderLink + '/' + takeCode + '/' + semitone + '.wav';

            var note: HTMLAudioElement;
            freeNotes[instrumentCode][semitone] = [
                  note
                = cachedNotes[instrumentCode][semitone]
                = new Audio(link)
            ];

            note.volume = volumeFactor;
            note.addEventListener('ended', () => { note.currentTime = 0.90659375; note.play(); }, false);

            return fallbackOscillator.playNote.apply(this, arguments);
        } else {

            var sample = freeNotes[instrumentCode][semitone].length
                ? freeNotes[instrumentCode][semitone].pop()
                : new Audio(cachedNotes[instrumentCode][semitone].src);

            sample.volume = volumeFactor;
            sample.currentTime = 0;
            sample.play();

            var fadeTime = 200;
            var iterations = 10;

            var fade = function(i: number)
            {
                if (i < 10) {
                    sample.volume = volumeFactor * (1 - i / iterations);
                    setTimeout(() => fade(i + 1), fadeTime / iterations);
                } else {
                    sample.pause();
                    sample.volume = volumeFactor;
                    freeNotes[instrumentCode][semitone].push(sample);
                }
            };

            return () => fade(0);
        }
    };
    var consumeConfig = function(programs: { [id: number]: number; }): void
    {
        instrumentDict = programs;
    };
    var init = function($cont: JQuery): void
    {
        $cont.empty();
        $cont.append('This Synth plays notes with WebAudio api! Each note of each instrument is a wav file');
    };

    return {
        playNote: playNote,
        consumeConfig: consumeConfig,
        init : init
    };
};
