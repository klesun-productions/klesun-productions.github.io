
/// <reference path="../../../libs/jqueryTyped/jquery.d.ts" />

// well, since chrome does not support "preservesPitch", and firefox just sux at rhytmically playing sounds with WebAudio,
// all that's left to do - load each semitone as a separate file so it could be played on chrome at least

class WavCacher
{
    private instrumentFolderLink = '/libs/soundfonts/samples/generated_tunable/';
    private instrumentDict = {
        0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0, 12:0, 13:0, 14:0, 15:0
    };
    // dict {instrumentCode: {semitone: WebAudio}}
    private cachedNotes = {};
    private redirectCodes = {
        1: 0, // using grand instead of bright piano
        3: 0, // using grand instead of honky piano
        23: 21, // using Accordian instead of Bandeon
        47: 43, 48: 43, // using Strings instead of String Ensamble

    };
    // u see, stuff is like that
    private takeClosest = function(requestedCode)
    {
        return (requestedCode in this.redirectCodes)
            ? this.redirectCodes[requestedCode]
            : requestedCode;
    };
    // used for ... suddenly fallback.
    // when new note is about to be played we need to load it
    private fallbackOscillator = Util.Synths.Oscillator(); // TODO: move Oscillator to typescript
    // it would likely be better to pass the existing, so user could customize (volume, etc)

    playNote = function(semitone: number, channel: number): { (): void }
    {
        var instrumentCode = this.instrumentDict[channel] || 0;
        this.cachedNotes[instrumentCode] = this.cachedNotes[instrumentCode] || {};

        /** @TODO: start loading future during playback of present */

        /** @TODO: loop sample playback */

        /** @TODO: correct some pitches */

        /** @TODO: drums */
        if (+channel === 9) {
            return () => {};
        }

        /** TODO: this check does take into account that internet connection may be slow
         * so - we should fallback also in case file not loaded yet */
        if (!(semitone in this.cachedNotes[instrumentCode])) {
            var takeCode = this.takeClosest(instrumentCode);
            var link = this.instrumentFolderLink + '/' + takeCode + '/' + semitone + '.wav';
            this.cachedNotes[instrumentCode][semitone] = new Audio(link);
            this.cachedNotes[instrumentCode][semitone].volume = 0.3;

            return this.fallbackOscillator.playNote.apply(this, arguments);
        } else {
            /** @TODO: it should not reset current time of current sample -
             * it should play in a separate thread */
            this.cachedNotes[instrumentCode][semitone].currentTime = 0;
            this.cachedNotes[instrumentCode][semitone].play();

            /** @TODO: don't pause suddenly - take some 30 or so ms to fade
             * http://stackoverflow.com/questions/7451508/html5-audio-playback-with-fade-in-and-fade-out */
            return () => this.cachedNotes[instrumentCode][semitone].pause();;
        }
    };
    consumeConfig = function(programs: { [id: number]: number; }): void
    {
        this.instrumentDict = programs;
    };
    init = function($cont: JQuery): void
    {
        $cont.empty();
        $cont.append('This Synth plays notes with WebAudio api! Each note of each instrument is a wav file');
        // TODO: sounds like a good idea, eh?
        $cont.append('Loading 64 semitone of 52 instrument (Choir Aah)');
        $cont.append($('<button>Free RAM</button>').click(_ => alert('sorry, not implemented yet')));
    };
}