/// <reference path="../references.ts" />

import MIDIMessageEvent = WebMidi.MIDIMessageEvent;
import {SongAccess} from "./Painter";
import {IShNote} from "../DataStructures";
import {IShmidusicChord} from "../DataStructures";
import Shmidusicator from "./Shmidusicator";
import {IShmidusicStructure} from "../DataStructures";
import ShReflect from "../Reflect";
import {Tls} from "../utils/Tls";
import {Player} from "../player/Player";
import {EncodeMidi} from "./EncodeMidi";
import {PseudoPiano} from "./PseudoPiano";
import {ComposeGui} from "./ComposeGui";

// represents the X in bits of midi message
// XXXX???? ???????? ????????

const NOTE_ON = 0x09;

// and channel number is
// ????XXXX ???????? ????????

// this function binds some events: midi/mouse/keyboard to the
// SheetMusicPainter in other words, it allows to write the sheet music

const $$ = (s: string): HTMLElement[] => <any>Array.from(document.querySelectorAll(s));

export var Handler = function(cont: HTMLDivElement)
{
    var gui = ComposeGui(cont);
    var painter = gui.painter;
    var configCont = gui.configCont;
    var pianoCleans = Tls.cbList([]);

    var OxO = 0x0,
        synthSwitch = gui.synthSwitch,
        player = Player({
            setPlayback: () => {}, setFields: () => {},
            setFileInfo: () => {}, getTempoFactor: () => 1,
        }),
        O_O = 0-0;

    // pre-loading samples
    synthSwitch.analyzeActivePresets();
    gui.channelListControl.onChange(synthSwitch.analyzeActivePresets);

    var lastChordOn = 0;

    var control = painter.getControl();
    var playbackInfo = {
        startIndex: -100,
    };
    playbackInfo = null;
    var playbackFinished = () => {
        var stopIndex = player.stop();
        control.setChordFocus(stopIndex);
        playbackInfo = null;
    };

    player.anotherNoteHandler = (s,c,v,i) => {
        var interrupts = Tls.cbList([]);
        interrupts.more = synthSwitch.playNote(s,c,v,i);
        if (gui.enableVisualizedPlaybackFlag.checked) {
            interrupts.more = control.setNoteFocus(s,c,v,i);
            interrupts.more = gui.piano.highlight(s, c);
        }

        return () => interrupts.clear().forEach(i => i());
    };

    var oneShotPlayer = Player({
        setPlayback: () => {}, setFields: () => {},
        setFileInfo: () => {}, getTempoFactor: () => -100,
    });
    oneShotPlayer.anotherNoteHandler = synthSwitch.playNote;

    var highlightNotes = (notes: IShNote[]) => {
        pianoCleans.clear().forEach(c => c());
        Tls.list(notes).forEach = n =>
            pianoCleans.more = gui.piano.highlight(n.tune, n.channel);
    };

    let playNotes = (notes: IShNote[]) => {
        highlightNotes(notes);
        oneShotPlayer.stop();
        oneShotPlayer.playChord(notes);
    };

    var tabActive = true;
    window.onfocus = () => tabActive = true;
    window.onblur = () => tabActive = false;

    var handleNoteOn = function(semitone: number, receivedTime: number): IShNote
    {
        var note = {
            tune: semitone,
            channel: +$(gui.inputChannelDropdown).val(),
            length: 0.25
        };

        if (tabActive && gui.enableMidiInputFlag.checked) {
            if (!playbackInfo) {
                if (receivedTime - lastChordOn < 100) {
                    control.addNote(note, false);
                } else {
                    control.addNote(note, true);
                    lastChordOn = receivedTime;
                }
            } else {
                playbackFinished();
            }
        }

        return note;
    };

    var collectConfig = () => 1 && {
        tempo: $(configCont).find('.holder.tempo').val(),
        loopStart: $(configCont).find('.holder.loopStart').val(),
        loopTimes: $(configCont).find('.holder.loopTimes').val(),
        keySignature: $(configCont).find('.holder.keySignature').val(),
        tactSize: $(configCont).find('.holder.tactSize').val(),
        channelList: gui.channelListControl.collectData(),
    };

    var collectSong = (chords: IShmidusicChord[]): IShmidusicStructure => 1 && {
        staffList: [{
            staffConfig: collectConfig(),
            chordList: chords
        }]
    };

    var play = function(): void
    {
        oneShotPlayer.stop();
        pianoCleans.clear().forEach(c => c());

        var shmidusic = collectSong(control.getChordList());
        var adapted = Shmidusicator.generalizeShmidusic(shmidusic);

        var index = Math.max(0, control.getFocusIndex());
        player.playSheetMusic(adapted, playbackFinished, index);

        playbackInfo = {
            startIndex: index,
        };
    };

    const copyToClipboard = function(): void
    {
        var selection = window.getSelection();
        var range = selection.getRangeAt(0);
        var allWithinRangeParent = $(range.commonAncestorContainer).find('*').toArray();

        var chordSpans: HTMLSpanElement[] = [];
        var first = true;
        for (var i = 0, el: Element; el = allWithinRangeParent[i]; i++) {
            if (el.classList.contains('chordSpan') &&
                selection.containsNode(el, first)
            ) {
                first = false;
                chordSpans.push(<HTMLSpanElement>el);
            }
        }

        var textArea = document.createElement("textarea");
        textArea.value = Tls.xmlyJson(chordSpans.map(SongAccess.extractChord));

        document.body.appendChild(textArea);

        try {
            textArea.select();
            var successful = document.execCommand('copy');
            successful || alert('Oops, unable to copy');
        } catch (err) {
            alert('Oops, unable to copy');
        }

        document.body.removeChild(textArea);
    };

    const pasteFromClipboard = function(text: string): void
    {
        var chords = ShReflect().validateChordList(text);
        chords && chords.forEach(control.addChord);
    };

    var openSong = function(song: IShmidusicStructure): void
    {
        control.clear();

        song.staffList
            .forEach(s => {
                var config: {[k: string]: any} = s.staffConfig;
                Tls.for(config, (k, v) => $(configCont).find('.holder.' + k).val(v));

                synthSwitch.consumeConfig((s.staffConfig.channelList || [])
                    .map(c => 1 && { preset: c.instrument || 0 }));
                synthSwitch.analyse(s.chordList);

                painter.setKeySignature(s.staffConfig.keySignature || 0);
                s.chordList.forEach(control.addChord);
            });

        control.setChordFocus(0);
    };

    // TODO reset to default before opening. some legacy songs do not have loopTimes/Start
    var openSongFromJson = function(parsed: {[k: string]: any}): void
    {
        var song: IShmidusicStructure;
        if (song = ShReflect().validateShmidusic(parsed)) {
            openSong(song);
        } else {
            alert('Your file is valid json, but not valid Shmidusic!');
        }
    };

    var openSongFromBase64 = function(b64Song: string): void
    {
        var jsonSong = atob(b64Song);

        try {
            var parsed = JSON.parse(jsonSong);
        } catch (err) {
            alert('Your file is not JSON! ' + err.message);
            return;
        }

        openSongFromJson(parsed);
    };

    // separating to focused and global to
    // prevent conflicts with inputs, etc...
    var globalHandlers: { [code: number]: { (e?: KeyboardEvent): void } } = {
        // "o"
        79: (e: KeyboardEvent) => e.ctrlKey && Tls.selectFileFromDisc(openSongFromBase64),
        // "s"
        83: (e: KeyboardEvent) => e.ctrlKey && Tls.saveJsonToDisc(Tls.xmlyJson(collectSong(control.getChordList()))),
        // "e" stands for "export midi"
        69: (e: KeyboardEvent) => e.ctrlKey && Tls.saveMidiToDisc(EncodeMidi(collectSong(control.getChordList()))),
        // "i" stands for "import midi"
        73: (e: KeyboardEvent) => e.ctrlKey && Tls.openMidi(m => openSong(Shmidusicator.generalToShmidusic(m))),
        // F4
        115: () => gui.enableMidiInputFlag.checked = !gui.enableMidiInputFlag.checked,
        // Insert
        45: () => gui.enableMidiInputFlag.checked = !gui.enableMidiInputFlag.checked,
    };

    type key_handler_d = (e?: KeyboardEvent) => void;

    // TODO: Key Code constants!
    // TODO: change to tuple list to allow multiple mappings per action
    var focusedHandlers: { [code: number]: key_handler_d } = {
        // space
        32: e => {
            e.preventDefault();
            play();
        },
        // left arrow
        37: () => {
            control.moveChordFocus(-1);
            playNotes(control.getFocusedNotes());
        },
        // right arrow
        39: () => {
            control.moveChordFocus(+1);
            playNotes(control.getFocusedNotes());
        },
        // down arrow
        40: () => {
            control.moveChordFocusRow(+1);
            playNotes(control.getFocusedNotes());
        },
        // up arrow
        38: () => {
            control.moveChordFocusRow(-1);
            playNotes(control.getFocusedNotes());
        },
        // home
        36: () => control.setChordFocus(-1),
        // end
        35: () => control.setChordFocus(99999999999), // backoffice style!
        // backslash
        220: () => playNotes(control.pointNextNote()),
        // num-pad dot
        110: () => playNotes(control.pointNextNote()),
        // opening square bracket
        219: () => control.multiplyLength(0.5),
        // num-pad minus
        109: () => control.multiplyLength(0.5),
        // closing square bracket
        221: () => control.multiplyLength(2),
        // num-pad plus
        107: () => control.multiplyLength(2),
        // dot
        190: () => control.multiplyLength(1.5),
        // num-pad star
        106: () => control.multiplyLength(1.5),
        // comma
        188: () => control.multiplyLength(2/3),
        // num-pad slash
        111: () => control.multiplyLength(2/3),
        // enter
        13: () => playNotes(control.getFocusedNotes()),
        // pause
        19: () => control.addNote({tune: 0, channel: 9, length: 0.25}, true),
        // delete
        46: () => {
            control.deleteFocused(false);
            playNotes(control.getFocusedNotes());
        },
        // backspace
        8: (e: KeyboardEvent) => {
            e.preventDefault();
            control.deleteFocused(true);
            playNotes(control.getFocusedNotes());
        },
        // "c"
        67: (e: KeyboardEvent) => e.ctrlKey && copyToClipboard(),
    };

    // 48 - zero, 96 - numpad zero
    Tls.range(0,10).forEach(i =>
        focusedHandlers[i + 48] = focusedHandlers[i + 96] = () =>
            playNotes(control.setChannel(i)));

    var hangKeyboardHandlers = (el: HTMLElement) => {
        var semitoneByKey = PseudoPiano().semitoneByKey;
        el.onkeydown = function (keyEvent: KeyboardEvent) {
            if (gui.enablePseudoPianoInputFlag.checked) {
                if (!keyEvent.ctrlKey && !keyEvent.altKey) {
                    var semitone: number;
                    if (semitone = semitoneByKey[(<any>keyEvent).code]) {
                        keyEvent.preventDefault();
                        var note = handleNoteOn(semitone, window.performance.now());
                        oneShotPlayer.playChord([note]);
                        highlightNotes(control.getFocusedNotes());
                        return;
                    }
                }
            }

            var handler: key_handler_d;
            if (handler = focusedHandlers[keyEvent.keyCode]) {
                if (playbackInfo) {
                    keyEvent.preventDefault();
                    playbackFinished();
                } else {
                    handler(keyEvent);
                }
            }
        };
        el.onpaste = (e: any) => pasteFromClipboard(e.clipboardData.getData('Text'));

        $('body')[0].onkeydown = function(keyEvent: KeyboardEvent)
        {
            if (keyEvent.keyCode in globalHandlers) {
                keyEvent.preventDefault();
                if (playbackInfo) {
                    playbackFinished();
                } else {
                    globalHandlers[keyEvent.keyCode](keyEvent);
                }
            }
        };
    };

    var handleMidiEvent = function (message: MIDIMessageEvent)
    {
        var typeHandlers: {[type: number]: (b1: number, b2: number) => void} = {
            // TODO: with this
            14: (b1, b2) => console.log('Pitch Bend', ((b2 << 8) + b1 - (64 << 8)) / ((64 << 8))),
            9: (b1,b2) => console.log('Note Off', b1),
        };
        
        var midiEventType = message.data[0] >> 4;
        var channel = message.data[0] & 0x0F;

        if (midiEventType === NOTE_ON && message.data[2] > 0) {
            var tune = message.data[1];
            var velocity = message.data[2];

            console.log('Note On:', tune, velocity / 127);

            var note = handleNoteOn(tune, message.receivedTime);
            gui.enablePlayOnKeyDownFlag.checked && playNotes([note]);
        } else {
            midiEventType in typeHandlers
                ? typeHandlers[midiEventType](message.data[1], message.data[2])
                : console.log('channel: ', channel, 'eventType: ', midiEventType, ' unknown midi event: ', message);
        }
    };

    var hangMidiHandlers = function(): void
    {
        var gotMidi = function (midiInfo: WebMidi.MIDIAccess)
        {
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
    
    var handleHashChange = function()
    {
        var hash = new Map(location.hash.substr(1)
            .split('&')
            .map(p => <[string, string]>p.split('=')));

        if (hash.has('songRelPath')) {
            Tls.fetchJson('/Dropbox/yuzefa_git/a_opuses_json/' + hash.get('songRelPath'), songJson => {
                openSongFromJson(songJson);
                play();
            });
        }
    };

    var init = function()
    {
        window.onhashchange = handleHashChange;

        handleHashChange();
        hangMidiHandlers();
        gui.piano.onClick(semitone => {
            var note = handleNoteOn(semitone, window.performance.now());
            oneShotPlayer.playChord([note]);
            return () => {}; // () => handleNoteOff()
        });
        hangKeyboardHandlers(gui.sheetMusictCont);

        $(configCont).find('.holder.keySignature').change((e: any) =>
            painter.setKeySignature(e.target.value));
    };

    init();
};
