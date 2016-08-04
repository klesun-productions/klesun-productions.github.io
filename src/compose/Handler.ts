/// <reference path="../references.ts" />

import MIDIMessageEvent = WebMidi.MIDIMessageEvent;
import {IPainter, SongAccess} from "./Painter";
import {IShNote} from "../DataStructures";
import {IChannel} from "../DataStructures";
import {IShmidusicChord} from "../DataStructures";
import Shmidusicator from "./Shmidusicator";
import {IShmidusicStructure} from "../DataStructures";
import {Fluid} from "../synths/Fluid";
import ShReflect from "../Reflect";
import {Tls} from "../utils/Tls";
import {Player} from "../player/Player";
import {Midiator} from "./Midiator";
import {Switch} from "../synths/Switch";
import {PresetList} from "../views/PresetList";
import PianoLayout from "../views/PianoLayout";
import {ISynth} from "../synths/ISynth";

// following constants represent the X in bits of midi message
// XXXX???? ???????? ????????

// TODO: move to some separate definitions class, since it is also used in MidiDevice.ts

const NOTE_OFF = 0x08;
const NOTE_ON = 0x09;

// and channel number is
// ????XXXX ???????? ????????

// this function bounds some events: midi/mouse/keyboard to the
// SheetMusicPainter in other words, it allows to write the sheet music

const $$ = (s: string): HTMLElement[] => <any>Array.from(document.querySelectorAll(s));

export default function Handler(painter: IPainter, configCont: HTMLDivElement)
{
    var channelListControl = PresetList(<HTMLDivElement>$$('#presetListBlock')[0]),
        synthSwitch = Switch(
            <HTMLSelectElement>$$('#synthDropdown')[0],
            <HTMLDivElement>$$('#synthControl')[0],
            channelListControl,
            PianoLayout(<HTMLCanvasElement>$$('#pianoCanvas')[0])
        ),
        enableMidiInputFlag = <HTMLInputElement>$$('#enableMidiInputFlag')[0],
        enablePlayOnKeyDownFlag = <HTMLInputElement>$$('#enablePlayOnKeyDownFlag')[0],
        O_O = 0-0;

    var lastChordOn = 0;
    const player = Player({
        setPlayback: () => {}, setFields: () => {},
        setFileInfo: () => {}, getTempoFactor: () => 1,
    });

    var control = painter.getControl();
    var playback = false; 
    var playbackFinished = () => {
        player.stop();
        playback = false;
    };

    player.addNoteHandler(synthSwitch);
    player.addNoteHandler(painter);

    // well... i suppose something is  wrong
    var oneShotPlayer = Player({
        setPlayback: () => {}, setFields: () => {},
        setFileInfo: () => {}, getTempoFactor: () => -100,
    });
    oneShotPlayer.addNoteHandler(synthSwitch);

    var playNotes = (noteList: IShNote[]) => {
        oneShotPlayer.stop();
        oneShotPlayer.playChord(noteList);
    };

    var tabActive = true;
    window.onfocus = () => tabActive = true;
    window.onblur = () => tabActive = false;

    var handleNoteOn = function(semitone: number, receivedTime: number)
    {
        if (!tabActive || !enableMidiInputFlag.checked) {
            return;
        }

        var note = {
            tune: semitone,
            channel: 0,
            length: 0.25
        };

        enablePlayOnKeyDownFlag.checked && oneShotPlayer.playChord([note]);

        if (!playback) {
            if (receivedTime - lastChordOn < 100) {
                painter.getControl().addNote(note, false);
            } else {
                painter.getControl().addNote(note, true);
                lastChordOn = receivedTime;
            }
        } else {
            playbackFinished();
        }
    };

    var collectConfig = () => 1 && {
        tempo: $(configCont).find('.holder.tempo').val(),
        channelList: channelListControl.collectData(),
        loopStart: $(configCont).find('.holder.loopStart').val(),
        loopTimes: $(configCont).find('.holder.loopTimes').val(),
        keySignature: $(configCont).find('.holder.keySignature').val(),
    };

    var collectSong = (chords: IShmidusicChord[]): IShmidusicStructure => 1 && {
        staffList: [{
            staffConfig: collectConfig(),
            chordList: chords
        }]
    };

    var play = function(): void
    {
        playback = true;

        var shmidusic = collectSong(painter.getChordList());
        var adapted = Shmidusicator.generalizeShmidusic(shmidusic);

        var index = Math.max(0, painter.getControl().getFocusIndex());
        player.playSheetMusic(adapted, playbackFinished, index);
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
        textArea.value = JSON.stringify(chordSpans.map(SongAccess.extractChord));

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
        chords && chords.forEach(painter.getControl().addChord);
    };

    var openSong = function(song: IShmidusicStructure): void
    {
        painter.getControl().clear();

        song.staffList
            .forEach(s => {
                var config: {[k: string]: any} = s.staffConfig;
                Tls.for(config, (k, v) =>
                    $(configCont).find('.holder.' + k).val(v));

                synthSwitch.consumeConfig((s.staffConfig.channelList || [])
                    .map(c => 1 && { preset: c.instrument }));
                synthSwitch.analyse(s.chordList);

                painter.setKeySignature(s.staffConfig.keySignature || 0);
                s.chordList.forEach(painter.getControl().addChord);
            });

        painter.getControl().setChordFocus(0);
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
        83: (e: KeyboardEvent) => e.ctrlKey && Tls.saveJsonToDisc(JSON.stringify(collectSong(painter.getChordList()))),
        // "e"
        69: (e: KeyboardEvent) => e.ctrlKey && Tls.saveMidiToDisc(Midiator(collectSong(painter.getChordList()))),
        // F4
        115: () => enableMidiInputFlag.checked = !enableMidiInputFlag.checked,
    };

    // TODO: Key Code constants!
    // TODO: change to tuple list to allow multiple mappings per action
    var focusedHandlers: { [code: number]: { (e?: KeyboardEvent): void } } = {
        // space
        32: e => {
            e.preventDefault();
            play();
        },
        // left arrow
        37: () => {
            control.moveChordFocus(-1);
            playNotes(painter.getFocusedNotes());
        },
        // right arrow
        39: () => {
            control.moveChordFocus(+1);
            playNotes(painter.getFocusedNotes());
        },
        // down arrow
        40: () => {
            control.moveChordFocusRow(+1);
            playNotes(painter.getFocusedNotes());
        },
        // up arrow
        38: () => {
            control.moveChordFocusRow(-1);
            playNotes(painter.getFocusedNotes());
        },
        // home
        36: () => control.setChordFocus(-1),
        // end
        35: () => control.setChordFocus(99999999999), // backoffice style!
        // shift
        16: () => playNotes(control.pointNextNote()),
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
        13: () => playNotes(painter.getFocusedNotes()),
        // pause
        19: () => painter.getControl().addNote({tune: 0, channel: 9, length: 0.25}, true),
        // delete
        46: () => control.deleteFocused(false),
        // backspace
        8: (e: KeyboardEvent) => {
            e.preventDefault();
            control.deleteFocused(true);
        },
        // "c"
        67: (e: KeyboardEvent) => e.ctrlKey && copyToClipboard(),
    };

    // 48 - zero, 96 - numpad zero
    Tls.range(0,10).forEach(i =>
        focusedHandlers[i + 48] = focusedHandlers[i + 96] = () =>
            control.setChannel(i));

    var hangKeyboardHandlers = (el: HTMLElement) => {
        el.onkeydown = function (keyEvent:KeyboardEvent) {
            if (keyEvent.keyCode in focusedHandlers) {
                if (playback) {
                    keyEvent.preventDefault();
                    playbackFinished();
                } else {
                    focusedHandlers[keyEvent.keyCode](keyEvent);
                }
            } else {
                console.log('Unknown Key Event: ', keyEvent);
            }
        };
        el.onpaste = (e: any) => pasteFromClipboard(e.clipboardData.getData('Text'));
    };

    var hangGlobalKeyboardHandlers = () => $('body')[0].onkeydown = function(keyEvent: KeyboardEvent)
    {
        if (keyEvent.keyCode in globalHandlers) {
            keyEvent.preventDefault();
            if (playback) {
                playbackFinished();
            } else {
                globalHandlers[keyEvent.keyCode](keyEvent);
            }
        }
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

            handleNoteOn(tune, message.receivedTime);
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

    window.onhashchange = handleHashChange;

    handleHashChange();
    hangMidiHandlers();

    $(configCont).find('.holder.keySignature').change((e: any) =>
        painter.setKeySignature(e.target.value));

    return {
        hangKeyboardHandlers: hangKeyboardHandlers,
        hangGlobalKeyboardHandlers: hangGlobalKeyboardHandlers,
    };
};