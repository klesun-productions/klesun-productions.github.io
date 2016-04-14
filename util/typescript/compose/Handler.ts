
/// <reference path="../references.ts" />

import MIDIMessageEvent = WebMidi.MIDIMessageEvent;
var Ns: any = Ns || {};
Ns.Compose = Ns.Compose || {};

// this function bounds some events: midi/mouse/keyboard to the
// SheetMusicPainter in other words, it allows to write the sheet music

Ns.Compose.Handler = function(contId: string): void
{
    var painter: IPainter = Ns.SheetMusicPainter(contId);
    painter.setEnabled(true);
    var lastNoteOn = 0;
    var synth = Ns.Synths.Fluid(new AudioContext(), 'http://shmidusic.lv/out/sf2parsed/fluid/');
    var player = Util.Player($(''));

    var playback: {startedAt: number} = null;
    var playbackFinished = function()
    {
        painter.setIsPlaying(false);
        playback = null;
    };

    player.addNoteHandler({
        handleNoteOn: (n: IShNote, i: number) => [
            synth.playNote(n.tune, n.channel),
            painter.handleNoteOn(n, i + playback.startedAt + 1),
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

        if (!playback) {
            if (receivedTime - lastNoteOn < 100) {
                painter.getControl().addNote(note);
            } else {
                painter.getControl().addChord({noteList: [note]});
            }

            lastNoteOn = receivedTime;
        } else {
            player.stop();
            playbackFinished();
        }
    };

    var play = function(): void
    {
        var startedAt = painter.getControl().moveChordFocus(-1);
        var chordList = painter.getChordList(startedAt + 1);
        playback = {startedAt: startedAt};

        var song: IShmidusicStructure = {staffList: [{
            staffConfig: {
                tempo: 120,
                keySignature: 0,
                numerator: 8,
                channelList: []
            },
            chordList: chordList
        }]};

        player.playShmidusic(song, {}, playbackFinished);
        painter.setIsPlaying(true);
    };

    var hangKeyboardHandlers = function(): void
    {
        document.onkeydown = function(keyEvent: KeyboardEvent)
        {
            console.log('Key Event: ', keyEvent);

            var control = painter.getControl();

            var handlers: { [code: number]: { (): void } } = {
                // space
                32: play,
                // left arrow
                37: () => control.moveChordFocus(-1),
                // right arrow
                39: () => control.moveChordFocus(+1),
                // delete
                46: () => control.deleteFocused(),
                // home
                36: () => control.setChordFocus(-1),
                // end
                35: () => control.setChordFocus(99999999999), // backoffice style!
                // shift
                16: () => control.pointNextNote(),
                // opening square bracket
                219: () => control.multiplyLength(0.5),
                // closing square bracket
                221: () => control.multiplyLength(2),
            };

            if (playback) {
                player.stop();
                playbackFinished();
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