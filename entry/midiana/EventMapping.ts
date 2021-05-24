import {Tls} from "../../src/utils/Tls";
import {EncodeMidi} from "./EncodeMidi";
import {Shmidusicator} from "../../src/compose/Shmidusicator";
import {PseudoPiano} from "./PseudoPiano";
import MIDIMessageEvent = WebMidi.MIDIMessageEvent;
import {S} from "../../src/utils/S";

declare var saveAs: any;

const saveJsonToDisc = (content: string) => {
    const blob = new Blob([content], {type: "text/json;charset=utf-8"});
    saveAs(blob, 'song.mid.json', true);
};

const saveMidiToDisc = (content: ArrayBuffer) => {
    const blob = new Blob([content], {type: "midi/binary"});
    saveAs(blob, 'song.mid', true);
};

/**
 * subscribes to all sorts of input from user and maps them to respective actions
 */
const EventMapping = ({control, gui, composeActions, painter, composePlayback}: any) => {

    const {
        openSongFromBase64, copyToClipboard, collectSong, showTransitionDialog, openSong,
        openSongFromJson, pasteFromClipboard,
    } = composeActions;

    const {play, playNotes} = composePlayback;

    // separating to focused and global to
    // prevent conflicts with inputs, etc...
    let globalHandlers: { [code: number]: { (e?: KeyboardEvent): void } } = {
        // "o"
        79: (e: KeyboardEvent) => e.ctrlKey && Tls.selectFileFromDisc(openSongFromBase64),
        // "s"
        83: (e: KeyboardEvent) => e.ctrlKey && saveJsonToDisc(Tls.xmlyJson(collectSong(control.getChordList()))),
        // "e" stands for "export midi"
        69: (e: KeyboardEvent) => e.ctrlKey && saveMidiToDisc(EncodeMidi(collectSong(control.getChordList()))),
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

    let subscribeToKeyboardEvents = (el: HTMLElement) => {
        let semitoneByKey = PseudoPiano().semitoneByKey;
        el.onkeydown = function (keyEvent: KeyboardEvent) {
            if (gui.enablePseudoPianoInputFlag.checked) {
                if (!keyEvent.ctrlKey && !keyEvent.altKey) {
                    let semitone: number;
                    if (semitone = semitoneByKey[(<any>keyEvent).code]) {
                        keyEvent.preventDefault();
                        composePlayback.handleKeyboardNotePress(semitone);
                        return;
                    }
                }
            }

            let handler: key_handler_d;
            if (handler = focusedHandlers[keyEvent.keyCode]) {
                if (composePlayback.stopPlayback()) {
                    keyEvent.preventDefault();
                } else {
                    handler(keyEvent);
                }
            }
        };
        el.onpaste = (e: any) => pasteFromClipboard(e.clipboardData.getData('Text'));

        document.body.onkeydown = (keyEvent: KeyboardEvent) => {
            if (keyEvent.keyCode in globalHandlers) {
                keyEvent.preventDefault();
                if (!composePlayback.stopPlayback()) {
                    globalHandlers[keyEvent.keyCode](keyEvent);
                }
            }
        };
    };

    let handleMidiEvent = function (message: MIDIMessageEvent)
    {
        let typeHandlers: {[type: number]: (b1: number, b2: number) => void} = {
            14: (b1, b2) => console.log('Pitch Bend', ((b2 << 8) + b1 - (64 << 8)) / ((64 << 8))),
            // 8: (b1,b2) => {}, // console.log('Note Off', b1),
        };

        // represents the X in bits of midi message
        // XXXX???? ???????? ????????
        let midiEventType = message.data[0] >> 4;
        // ????XXXX ???????? ????????
        let channel = message.data[0] & 0x0F;

        let isNoteEvent = [8,9].includes(midiEventType);

        if (isNoteEvent) {
            let tune = message.data[1];
            let velocity = message.data[2];
            composePlayback.handleMidiNoteEvent({
                channel, tune, velocity, midiEventType,
            })
        } else {
            midiEventType in typeHandlers
                ? typeHandlers[midiEventType](message.data[1], message.data[2])
                : console.log('channel: ', channel, 'eventType: ', midiEventType, ' unknown midi event: ', message);
        }
    };

    const subscribeToMidiEvents = () => {
        let gotMidi = function (midiInfo: WebMidi.MIDIAccess)
        {
            console.log("Midi Access Success!", midiInfo);

            let inputs = midiInfo.inputs.values();
            for (let input of [...<any>inputs]) {
                input.onmidimessage = handleMidiEvent;
            }
        };

        // request MIDI access
        if (navigator.requestMIDIAccess) {
            navigator.requestMIDIAccess()
                .then(gotMidi, (e: unknown) => console.error("Failed To Access Midi, Even Though Your Browser Has The Method... May happen on linux", e));
        } else {
            console.log("No MIDI support in your browser.");
        }
    };

    let handleHashChange = function()
    {
        let hash = new Map(location.hash.substr(1)
            .split('&')
            .map(p => <[string, string]>p.split('=')));

        S.opt(hash.get('songUrl')).get = url =>
            Tls.fetchJson(url, songJson => {
                openSongFromJson(songJson);
            });
        S.opt(hash.get('songRelUrl')).get = relUrl =>
            Tls.fetchJson('/unv/gits/riddle-needle/Assets/Audio/midjs/' + relUrl, songJson => {
                openSongFromJson(songJson);
            });
    };

    const main = () => {
        window.onhashchange = handleHashChange;
        window.onfocus = () => composePlayback.setTabActive(true);
        window.onblur = () => composePlayback.setTabActive(false);

        handleHashChange();
        subscribeToMidiEvents();
        gui.piano.onClick(composePlayback.handleMouseNoteClick);
        subscribeToKeyboardEvents(gui.sheetMusicCont);

        gui.configCont.querySelector('.holder.keySignature')
            .addEventListener('change', (e: any) => painter.setKeySignature(e.target.value));
    };

    return main();
};

export default EventMapping;