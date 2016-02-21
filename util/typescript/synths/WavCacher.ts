
/// <reference path="../../../libs/jqueryTyped/jquery.d.ts" />
/// <reference path="ISynth.ts" />
/// <reference path="../Tools.ts" />

var Ns = Ns || {};

// well, since chrome does not support "preservesPitch", and firefox just sux at rhytmically playing sounds with WebAudio,
// all that's left to do - load each semitone as a separate file so it could be played on chrome at least

Ns.WavCacher = function(): ISynth
{
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
        47: 43, 48: 43, // using Strings instead of String Ensamble

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
    var fallbackOscillator = Util.Synths.Oscillator(); // TODO: move Oscillator to typescript
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
            freeNotes[instrumentCode][semitone] = [cachedNotes[instrumentCode][semitone] = new Audio(link)];
            cachedNotes[instrumentCode][semitone].volume = volumeFactor;

            return fallbackOscillator.playNote.apply(this, arguments);
        } else {

            var sample = freeNotes[instrumentCode][semitone].length
                ? freeNotes[instrumentCode][semitone].pop()
                : new Audio(cachedNotes[instrumentCode][semitone].src);

            /** @debug */
            sample.volume = volumeFactor;

            /** @TODO: it should not reset current time of current sample -
             * http://stackoverflow.com/questions/17461776/clone-audio-object
             * it should play in a separate thread */
            sample.currentTime = 0;
            sample.play();

            /** @TODO: don't pause suddenly - take some 30 or so ms to fade
             * http://stackoverflow.com/questions/7451508/html5-audio-playback-with-fade-in-and-fade-out */
            return function()
            {
                sample.pause();
                freeNotes[instrumentCode][semitone].push(sample);
            };
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
        // TODO: sounds like a good idea, eh?
        $cont.append('Loading 64 semitone of 52 instrument (Choir Aah)');
        $cont.append($('<button>Free RAM</button>').click(_ => alert('sorry, not implemented yet')));
    };

    return {
        playNote: playNote,
        consumeConfig: consumeConfig,
        init : init
    };
};
