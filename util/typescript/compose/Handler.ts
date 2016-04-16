
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
    var lastChordOn = 0;
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

    // well... i suppose something is wrong
    var oneShotPlayer = Util.Player($(''));
    oneShotPlayer.addNoteHandler({
        handleNoteOn: (n: IShNote, i: number) => synth.playNote(n.tune, n.channel)
    });

    var playChord = (c: IShmidusicChord) => {
        oneShotPlayer.stop();
        oneShotPlayer.playChord(c);
    };

    var handleNoteOn = function(semitone: number, receivedTime: number)
    {
        var note = {
            tune: semitone,
            channel: 0,
            length: 0.25
        };

        if (!playback) {
            if (receivedTime - lastChordOn < 100) {
                painter.getControl().addNote(note, false);
            } else {
                painter.getControl().addNote(note, true);
                lastChordOn = receivedTime;
            }
        } else {
            player.stop();
            playbackFinished();
        }
    };



    var collectSong = (chords: IShmidusicChord[]): IShmidusicStructure => 1 && {
        staffList: [{
            staffConfig: {
                tempo: 120,
                keySignature: 0,
                numerator: 8,
                channelList: []
            },
            chordList: chords
        }]
    };

    var play = function(): void
    {
        var startedAt = painter.getControl().moveChordFocus(-1);
        var chordList = painter.getChordList(startedAt + 1);
        playback = {startedAt: startedAt};

        player.playShmidusic(collectSong(chordList), {}, playbackFinished);
        painter.setIsPlaying(true);
    };

    var openSong = function(base64Song: string): void
    {
        var jsonSong = atob(base64Song);
        try {
            var parsed = JSON.parse(jsonSong);
        } catch (err) {
            alert('Your file is not JSON! ' + err.message);
            return;
        }

        var song: IShmidusicStructure;
        if (song = Ns.Reflect().validateShmidusic(parsed)) {

            painter.getControl().clear();

            song.staffList
                .forEach(s => s.chordList
                    .forEach(painter.getControl().addChord))
        } else {
            alert('Your file is valid josn, but not valid Shmidusic!');
        }
    };

    var hangKeyboardHandlers = function(): void
    {
        document.onkeydown = function(keyEvent: KeyboardEvent)
        {
            var control = painter.getControl();

            var handlers: { [code: number]: { (e?: KeyboardEvent): void } } = {
                // space
                32: play,
                // left arrow
                37: () => {
                    control.moveChordFocus(-1);
                    painter.getFocused().forEach(playChord);
                },
                // right arrow
                39: () => {
                    control.moveChordFocus(+1);
                    painter.getFocused().forEach(playChord);
                },
                // down arrow
                40: () => {
                    control.moveChordFocusRow(+1);
                    painter.getFocused().forEach(playChord);
                },
                // up arrow
                38: () => {
                    control.moveChordFocusRow(-1);
                    painter.getFocused().forEach(playChord);
                },
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
                // dot
                190: () => control.multiplyLength(1.5),
                // comma
                188: () => control.multiplyLength(2/3),
                // enter
                13: () => painter.getFocused().forEach(playChord),
                // delete
                46: () => control.deleteFocused(false),
                // backspace
                8: (e: KeyboardEvent) => {
                    e.preventDefault();
                    control.deleteFocused(true);
                },
                // "o"
                79: (e: KeyboardEvent) => {
                    if (e.ctrlKey) {
                        e.preventDefault();
                        Ns.selectFileFromDisc(openSong);
                    }
                },
                // "s"
                83: (e: KeyboardEvent) => {
                    if (e.ctrlKey) {
                        e.preventDefault();
                        Ns.saveToDisc(JSON.stringify(collectSong(painter.getChordList(0))));
                    }
                },
            };

            if (playback) {
                player.stop();
                playbackFinished();
            } else {
                if (keyEvent.keyCode in handlers) {
                    handlers[keyEvent.keyCode](keyEvent);
                } else {
                    console.log('Unknown Key Event: ', keyEvent);
                }
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