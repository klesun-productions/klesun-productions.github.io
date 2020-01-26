import {Player} from "../../src/player/Player";
import {Tls} from "../../src/utils/Tls";
import {IShNote} from "../../src/DataStructures";
import {S} from "../../src/utils/S";
import {Shmidusicator} from "../../src/compose/Shmidusicator";

/** manages playback-related actions triggered by the user */
const ComposePlayback = ({gui, control, composeActions}: any) => {

    const synthSwitch = gui.synthSwitch;
    const player = Player({
        setPlayback: () => {}, setFields: () => {},
        setFileInfo: () => {}, getTempoFactor: () => 1,
    });

    // pre-loading samples
    synthSwitch.analyzeActivePresets();
    gui.channelListControl.onChange(synthSwitch.analyzeActivePresets);

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

    let pianoCleans = Tls.cbList([]);
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

    let lastChordOn = 0;
    let tabActive = true;
    let handleNoteOn = (semitone: number, velocity: number): IShNote => {
        let receivedTime = window.performance.now();
        let note = {
            tune: semitone,
            channel: +gui.inputChannelDropdown.value,
            length: 0.25,
            velocity: velocity,
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

    let play = function(): void
    {
        oneShotPlayer.stop();
        pianoCleans.clear().forEach(c => c());

        let shmidusic = composeActions.collectSong(control.getChordList());
        let adapted = Shmidusicator.generalizeShmidusic(shmidusic);
        let index = Math.max(0, control.getFocusIndex());

        player.playSheetMusic(adapted, playbackFinished, index, 0);

        playbackInfo = {
            startIndex: index,
        };
    };

    let heldMidiKeys: {[chan: number]: {[tune: number]: {(): void}[]}} = {};
    const handleMidiNoteEvent = ({channel, tune, velocity, midiEventType}: any) => {
        heldMidiKeys[channel] = heldMidiKeys[channel] || {};
        heldMidiKeys[channel][tune] = heldMidiKeys[channel][tune] || [];
        if (midiEventType === 9 && velocity > 0) {
            let note = handleNoteOn(tune, velocity);
            if (gui.enablePlayOnKeyDownFlag.checked) {
                let release = oneShotPlayer.holdNote(tune, channel, velocity, -1);
                heldMidiKeys[channel][tune].push(release);
            }
            highlightNotes(control.getFocusedNotes());
        } else {
            // NOTE OFF
            S.opt(heldMidiKeys[channel][tune].shift()).get = (release) => release();
        }
    };

    const handleMouseNoteClick = (semitone: number) => {
        let note = handleNoteOn(semitone, 127);
        oneShotPlayer.playChord([note]);
        return () => {}; // () => handleNoteOff()
    };

    const handleKeyboardNotePress = (semitone: number) => {
        let note = handleNoteOn(semitone, 127);
        oneShotPlayer.playChord([note]);
        highlightNotes(control.getFocusedNotes());
    };

    const stopPlayback = () => {
        if (playbackInfo) {
            playbackFinished();
            return true;
        } else {
            return false;
        }
    };

    return {
        play,
        playNotes,
        handleMidiNoteEvent,
        handleMouseNoteClick,
        handleKeyboardNotePress,
        stopPlayback,
        setTabActive: (flag: boolean) => tabActive = flag,
    };
};

export default ComposePlayback;