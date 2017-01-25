/// <reference path="../references.ts" />

import MIDIMessageEvent = WebMidi.MIDIMessageEvent;
import {SongAccess} from "./Painter";
import {IShNote} from "../DataStructures";
import {IShmidusicChord} from "../DataStructures";
import {IShmidusicStructure} from "../DataStructures";
import {Shmidusicator} from "./Shmidusicator";
import ShReflect from "../Reflect";
import {Tls} from "../utils/Tls";
import {Player} from "../player/Player";
import {EncodeMidi} from "./EncodeMidi";
import {PseudoPiano} from "./PseudoPiano";
import {ComposeGui} from "./ComposeGui";
import {S} from "../utils/S";
import {Dom} from "../utils/Dom";

// represents the X in bits of midi message
// XXXX???? ???????? ????????

const NOTE_ON = 0x09;

// and channel number is
// ????XXXX ???????? ????????

// this function binds some events: midi/mouse/keyboard to the
// SheetMusicPainter in other words, it allows to write the sheet music

const $$ = (s: string): HTMLElement[] => <any>Array.from(document.querySelectorAll(s));

export let Handler = function(cont: HTMLDivElement)
{
    let gui = ComposeGui(cont);
    let painter = gui.painter;
    let configCont = gui.configCont;
    let pianoCleans = Tls.cbList([]);

    let OxO = 0x0,
        synthSwitch = gui.synthSwitch,
        player = Player({
            setPlayback: () => {}, setFields: () => {},
            setFileInfo: () => {}, getTempoFactor: () => 1,
        }),
        O_O = 0-0;

    // pre-loading samples
    synthSwitch.analyzeActivePresets();
    gui.channelListControl.onChange(synthSwitch.analyzeActivePresets);

    let lastChordOn = 0;

    let control = painter.getControl();
    let playbackInfo = {
        startIndex: -100,
    };
    playbackInfo = null;
    let playbackFinished = () => {
        let stopIndex = player.stop();
        control.setChordFocus(stopIndex);
        playbackInfo = null;
    };

    player.anotherSynth = synthSwitch;
    player.anotherNoteHandler = (s,c,v,i) => {
        let interrupts = Tls.cbList([]);
        if (gui.enableVisualizedPlaybackFlag.checked) {
            interrupts.more = control.setNoteFocus(s,c,v,i);
            interrupts.more = gui.piano.highlight(s, c);
        }

        return () => interrupts.clear().forEach(i => i());
    };

    let oneShotPlayer = Player({
        setPlayback: () => {}, setFields: () => {},
        setFileInfo: () => {}, getTempoFactor: () => -100,
    });
    oneShotPlayer.anotherSynth = synthSwitch;

    let highlightNotes = (notes: IShNote[]) => {
        pianoCleans.clear().forEach(c => c());
        S.list(notes).forEach = n =>
            pianoCleans.more = gui.piano.highlight(n.tune, n.channel);
    };

    let playNotes = (notes: IShNote[]) => {
        highlightNotes(notes);
        oneShotPlayer.stop();
        oneShotPlayer.playChord(notes);
    };

    let tabActive = true;
    window.onfocus = () => tabActive = true;
    window.onblur = () => tabActive = false;

    let handleNoteOn = function(semitone: number, receivedTime: number): IShNote
    {
        let note = {
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

    let collectConfig = () => 1 && {
        tempo: $(configCont).find('.holder.tempo').val(),
        loopStart: $(configCont).find('.holder.loopStart').val(),
        loopTimes: $(configCont).find('.holder.loopTimes').val(),
        keySignature: $(configCont).find('.holder.keySignature').val(),
        tactSize: $(configCont).find('.holder.tactSize').val(),
        channelList: gui.channelListControl.collectData(),
    };

    let collectSong = (chords: IShmidusicChord[]): IShmidusicStructure => 1 && {
        staffList: [{
            staffConfig: collectConfig(),
            chordList: chords
        }]
    };

    let play = function(): void
    {
        oneShotPlayer.stop();
        pianoCleans.clear().forEach(c => c());

        let shmidusic = collectSong(control.getChordList());

        let adapted = Shmidusicator.generalizeShmidusic(shmidusic);

        let index = Math.max(0, control.getFocusIndex());

        player.playSheetMusic(adapted, playbackFinished, index, 0);

        playbackInfo = {
            startIndex: index,
        };
    };

    const copyToClipboard = function(): void
    {
        let selection = window.getSelection();
        let range = selection.getRangeAt(0);
        let allWithinRangeParent = $(range.commonAncestorContainer).find('*').toArray();

        let chordSpans: HTMLSpanElement[] = [];
        let first = true;
        for (let i = 0, el: Element; el = allWithinRangeParent[i]; i++) {
            if (el.classList.contains('chordSpan') &&
                selection.containsNode(el, first)
            ) {
                first = false;
                chordSpans.push(<HTMLSpanElement>el);
            }
        }

        let textArea = document.createElement("textarea");
        textArea.value = Tls.xmlyJson(chordSpans.map(SongAccess.extractChord));

        document.body.appendChild(textArea);

        try {
            textArea.select();
            let successful = document.execCommand('copy');
            successful || alert('Oops, unable to copy');
        } catch (err) {
            alert('Oops, unable to copy');
        }

        document.body.removeChild(textArea);
    };

    const pasteFromClipboard = function(text: string): void
    {
        let chords = ShReflect().validateChordList(text);
        chords && chords.forEach(control.addChord);
    };

    let openSong = function(song: IShmidusicStructure): void
    {
        control.clear();

        song.staffList
            .forEach(s => {
                let config: {[k: string]: any} = s.staffConfig;
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
    let openSongFromJson = function(parsed: {[k: string]: any}): void
    {
        let song: IShmidusicStructure;
        if (song = ShReflect().validateShmidusic(parsed)) {
            openSong(song);
        } else {
            alert('Your file is valid json, but not valid Shmidusic!');
        }
    };

    let openSongFromBase64 = function(b64Song: string): void
    {
        let jsonSong = atob(b64Song);

        try {
            var parsed = JSON.parse(jsonSong);
        } catch (err) {
            alert('Your file is not JSON! ' + err.message);
            return;
        }

        openSongFromJson(parsed);
    };

    let showTransitionDialog = function()
    {
        let chordIndex = control.getFocusIndex();
        let chord = control.getChordList()[chordIndex];
        if (chord) {
            Dom.showInputDialog('Select Channel', 0)
                .then = (chan) => Dom.showMultiInputDialog(
                    'Chord #' + chordIndex + ' channel #' + chan + ' transitions:',
                    {
                        startPitchBend: S.opt(chord.startState).map(s => s[chan]).map(v => v.pitchBend).def(null),
                        startVolume: S.opt(chord.startState).map(s => s[chan]).map(v => v.volume).def(null),
                        endPitchBend: S.opt(chord.finishState).map(s => s[chan]).map(v => v.pitchBend).def(null),
                        endVolume: S.opt(chord.finishState).map(s => s[chan]).map(v => v.volume).def(null),
                    }
                )
                .then = (changedValues) => {
                    chord.startState = chord.startState || {};
                    chord.finishState = chord.finishState || {};
                    chord.startState[chan] = {
                        pitchBend: changedValues.startPitchBend,
                        volume: changedValues.startVolume,
                    };
                    chord.finishState[chan] = {
                        pitchBend: changedValues.endPitchBend,
                        volume: changedValues.endVolume,
                    };

                    control.deleteFocused(true);
                    control.addChord(chord);
                };
        }
    };

    // separating to focused and global to
    // prevent conflicts with inputs, etc...
    let globalHandlers: { [code: number]: { (e?: KeyboardEvent): void } } = {
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
    let focusedHandlers: { [code: number]: key_handler_d } = {
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
        // "D" stands for "D"ialog to change chord
        68: (e: KeyboardEvent) => {
            if (e.ctrlKey) {
                e.preventDefault();
                showTransitionDialog();
            }
        }
    };

    // 48 - zero, 96 - numpad zero
    Tls.range(0,10).forEach(i =>
        focusedHandlers[i + 48] = focusedHandlers[i + 96] = () =>
            playNotes(control.setChannel(i)));

    let hangKeyboardHandlers = (el: HTMLElement) => {
        let semitoneByKey = PseudoPiano().semitoneByKey;
        el.onkeydown = function (keyEvent: KeyboardEvent) {
            if (gui.enablePseudoPianoInputFlag.checked) {
                if (!keyEvent.ctrlKey && !keyEvent.altKey) {
                    let semitone: number;
                    if (semitone = semitoneByKey[(<any>keyEvent).code]) {
                        keyEvent.preventDefault();
                        let note = handleNoteOn(semitone, window.performance.now());
                        oneShotPlayer.playChord([note]);
                        highlightNotes(control.getFocusedNotes());
                        return;
                    }
                }
            }

            let handler: key_handler_d;
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

    let handleMidiEvent = function (message: MIDIMessageEvent)
    {
        let typeHandlers: {[type: number]: (b1: number, b2: number) => void} = {
            14: (b1, b2) => console.log('Pitch Bend', ((b2 << 8) + b1 - (64 << 8)) / ((64 << 8))),
            9: (b1,b2) => {}, // console.log('Note Off', b1),
        };
        
        let midiEventType = message.data[0] >> 4;
        let channel = message.data[0] & 0x0F;

        if (midiEventType === NOTE_ON && message.data[2] > 0) {
            let tune = message.data[1];
            let velocity = message.data[2];

            let note = handleNoteOn(tune, message.receivedTime);
            gui.enablePlayOnKeyDownFlag.checked && oneShotPlayer.playChord([note]);

            highlightNotes(control.getFocusedNotes());
        } else {
            midiEventType in typeHandlers
                ? typeHandlers[midiEventType](message.data[1], message.data[2])
                : console.log('channel: ', channel, 'eventType: ', midiEventType, ' unknown midi event: ', message);
        }
    };

    let hangMidiHandlers = function(): void
    {
        let gotMidi = function (midiInfo: WebMidi.MIDIAccess)
        {
            console.log("Midi Access Success!", midiInfo);

            let inputs = midiInfo.inputs.values();
            for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
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
    
    let handleHashChange = function()
    {
        let hash = new Map(location.hash.substr(1)
            .split('&')
            .map(p => <[string, string]>p.split('=')));

        if (hash.has('songRelPath')) {
            Tls.fetchJson('/Dropbox/yuzefa_git/a_opuses_json/' + hash.get('songRelPath'), songJson => {
                openSongFromJson(songJson);
                play();
            });
        }
    };

    let init = function()
    {
        window.onhashchange = handleHashChange;

        handleHashChange();
        hangMidiHandlers();
        gui.piano.onClick(semitone => {
            let note = handleNoteOn(semitone, window.performance.now());
            oneShotPlayer.playChord([note]);
            return () => {}; // () => handleNoteOff()
        });
        hangKeyboardHandlers(gui.sheetMusictCont);

        $(configCont).find('.holder.keySignature').change((e: any) =>
            painter.setKeySignature(e.target.value));
    };

    init();
};
