
/// <reference path="ISynth.ts" />
/// <reference path="../../../libs/jqueryTyped/jquery.d.ts" />

var Ns = Ns || {};
Ns['Synths'] = Ns.Synths || {};

// available only in firefox, cuz stupid developers of webkit
// denied preservesPitch. if webkit developer is reading this - CURSE ON YOU!

// DONT USE IT, IT'S BROKEN

Ns.Synths.PitchShifter = function(): ISynth
{
    var sampleLinks: { [id: number]: string } = {
        // 3
        44: 'G#3',
        // 4
        55: 'G4',
        50: 'D4',
        // 5
        64: 'E5',
        60: 'C5',
        70: 'A#5',
        // 6
        73: 'C#6',
        77: 'F6',
        // 7
        88: 'E7',
        90: 'F#7',
        // 8
        103: 'G8'
    };

    // this function accepts semitone shift
    // and returns frequency factor
    var tuneShiftFactor = shift => Math.pow(2, shift / 12.0);

    var notes = [];
    for (var i = 0; i < 128; ++i) {
        var closest: number = +Object.keys(sampleLinks)
            .reduce((a,b) => Math.abs(+a - i) < Math.abs(+b - i) ? a : b);
        var fileName = 'Music Box ' + sampleLinks[closest].replace('#', '%23') + '.wav'

        notes[i] = new Audio('http://shmidusic.lv/libs/soundfonts/samples/' + fileName);
        notes[i].mozPreservesPitch = false;
        notes[i].webkitPreservesPitch = false; // maybe in some beautiful future
        notes[i].preservesPitch = false; // maybe in some beautiful future
        notes[i].playbackRate *= tuneShiftFactor(i - closest);

        notes[i].addEventListener('ended', (n => _ => { n.currentTime = 0.1; n.play(); })(notes[i]));
    }

    var consumeConfig = function(programs: { [id: number]: number }): void
    {
        // TODO: implement
    };

    var init = function($cont: JQuery): void
    {
    };

    var playNote = function(semitone: number, channel: number): { (): void }
    {
        notes[semitone].currentTime = 0;
        notes[semitone].play();
        var interrupt = () => { setTimeout(function()
        {
            notes[semitone].pause();
            notes[semitone].currentTime = 0;
        }, 50) };

        return interrupt;
    };

    return {
        playNote: playNote,
        consumeConfig: consumeConfig,
        // draws synth-specific controls on the passed container
        init: init,
    };
};