
/// <reference path="../references.ts" />

import MIDIMessageEvent = WebMidi.MIDIMessageEvent;
var Ns: any = Ns || {};
Ns.Compose = Ns.Compose || {};

// this function bounds some events: midi/mouse/keyboard to the
// SheetMusicPainter in other words, it allows to write the sheet music

Ns.Compose.Handler = function(contId: string): void
{
    var painter = Ns.SheetMusicPainter(contId);
    painter.setEnabled(true);
    var lastNoteOn = 0;
    var synth = Ns.Synths.Fluid(new AudioContext(), 'http://shmidusic.lv/out/sf2parsed/fluid/');
    var player = Util.Player($(''));

    // TODO: maybe using the dom class to select
    // instead of numeric index would make sense
    var chordFocusIndex = -1;
    var playing = false;

    player.addNoteHandler({
        handleNoteOn: (n: IShNote, i: number) => [
            synth.playNote(n.tune, n.channel),
            painter.handleNoteOn(n, i + chordFocusIndex + 1),
        ].reduce((offs,off) => () => { offs(); off(); })
    });
    // player.addNoteHandler(painter);

    var handleNoteOn = function(semitone: number, receivedTime: number)
    {
        var note = {
            tune: semitone,
            channel: 0,
            length: 0.25
        };

        if (!playing) {
            if (receivedTime - lastNoteOn < 100) {
                painter.addNote(note, chordFocusIndex);
            } else {
                chordFocusIndex = painter.addChord({noteList: [note]}, chordFocusIndex + 1);
            }

            lastNoteOn = receivedTime;
        } else {
            player.stop();
            playing = false;
        }
    };

    var play = function(): void
    {
        chordFocusIndex = painter.setChordFocus(chordFocusIndex - 1);
        var chordList = painter.getChordList(chordFocusIndex + 1);

        var song: IShmidusicStructure = {staffList: [{
            staffConfig: {
                tempo: 120,
                keySignature: 0,
                numerator: 8,
                channelList: []
            },
            chordList: chordList
        }]};

        playing = true;
        player.playShmidusic(song, {}, () => playing = false);
    };

    var hangKeyboardHandlers = function(): void
    {
        document.onkeydown = function(keyEvent: KeyboardEvent)
        {
            console.log('Key Event: ', keyEvent);

            var handlers: { [code: number]: { (): void } } = {
                // space
                32: play,
                // left arrow
                37: () => chordFocusIndex = painter.setChordFocus(chordFocusIndex - 1),
                // right arrow
                39: () => chordFocusIndex = painter.setChordFocus(chordFocusIndex + 1),
                // delete
                46: () => chordFocusIndex = painter.deleteChord(chordFocusIndex),
                // home
                36: () => chordFocusIndex = painter.setChordFocus(-1),
                // end
                35: () => chordFocusIndex = painter.setChordFocus(99999999999), // backoffice style!
                // shift
                16: () => painter.pointNextNote(),
                // opening square bracket
                219: () => painter.multiplyLength(0.5),
                // closing square bracket
                221: () => painter.multiplyLength(2),
            };

            if (playing) {
                player.stop();
                playing = false;
            } else if (keyEvent.keyCode in handlers) {
                handlers[keyEvent.keyCode]();
            }
        };
    };

    var handleMidiEvent = function (message: MIDIMessageEvent) {
        var eventType = // bit mask: "100X YYYY" -> x => noteOn: yes/no | YYYY => channelNumber
            (message.data[0] === 144) ? 'noteOn' :
                (message.data[0] === 128) ? 'noteOff' :
                'unknown' + message.data[0];

        var tune = message.data[1];
        var velocity = message.data[2];
        console.log('midi event tune: ' + tune + '; velocity: ' + velocity + '; type: ' + eventType, message);

        if (eventType === 'noteOn' && velocity > 0) {
            handleNoteOn(tune, message.receivedTime);
        }
    };

    var hangMidiHandlers = function(): void
    {
        var gotMidi = function (midiInfo: WebMidi.MIDIAccess)
        {
            var compose = Util.Compose($('#composeDiv')[0]);

            console.log("Midi Access Success!", midiInfo);

            var inputs = midiInfo.inputs.values();
            for (var input = inputs.next(); input && !input.done; input = inputs.next()) {
                input.value.onmidimessage = handleMidiEvent;
            }
        };

        // request MIDI access
        if (navigator.requestMIDIAccess) {
            navigator.requestMIDIAccess()
                .then(gotMidi, (e: any) => console.log("Failed To Access Midi, Even Though Your Browser Has The Method...", e));
        } else {
            console.log("No MIDI support in your browser.");
        }

    };

    hangMidiHandlers();
    hangKeyboardHandlers();
};