
import 'https://cdn.jsdelivr.net/npm/file-saver@2.0.2/dist/FileSaver.min.js';
import {Tls} from "../../src/utils/Tls";
import {SongAccess} from "../../src/compose/Painter";
import ShReflect from "../../src/Reflect";
import {IShmidusicChord, IShmidusicStructure} from "../../src/DataStructures";
import {Dom} from "../../src/utils/Dom";
import {S} from "../../src/utils/S";

/** manages various utility actions */
const ComposeActions = ({control, synthSwitch, configCont, painter, gui}: any) => {
    const copyToClipboard = function(): void
    {
        let selection = window.getSelection();
        let range = selection.getRangeAt(0);
        let allWithinRangeParent = [...(<HTMLElement>range.commonAncestorContainer).querySelectorAll('*')];

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
                Tls.for(config, (k, v) => (<HTMLInputElement>configCont.querySelector('.holder.' + k)).value = v);

                synthSwitch.consumeConfig((s.staffConfig.channelList || [])
                    .map(c => 1 && { preset: c.instrument || 0 }));
                synthSwitch.analyse(s.chordList);

                painter.setKeySignature(s.staffConfig.keySignature || 0);
                s.chordList.forEach(control.addChord);
            });

        control.setChordFocus(0);
    };

    // TODO reset to default before opening. some legacy songs do not have loopTimes/Start
    let openSongFromJson = function(parsed: valid_json_t): void
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

    let collectConfig = () => 1 && {
        tempo: +(<HTMLInputElement>configCont.querySelector('.holder.tempo')).value,
        loopStart: +(<HTMLInputElement>configCont.querySelector('.holder.loopStart')).value,
        loopTimes: +(<HTMLInputElement>configCont.querySelector('.holder.loopTimes')).value,
        keySignature: +(<HTMLInputElement>configCont.querySelector('.holder.keySignature')).value,
        tactSize: +(<HTMLInputElement>configCont.querySelector('.holder.tactSize')).value,
        channelList: gui.channelListControl.collectData(),
    };

    let collectSong = (chords: IShmidusicChord[]): IShmidusicStructure => ({
        staffList: [{
            staffConfig: collectConfig(),
            chordList: chords
        }]
    });

    return {
        openSongFromBase64,
        showTransitionDialog,
        copyToClipboard,
        collectSong,
        openSong,
        pasteFromClipboard,
        openSongFromJson,
    };
};

export default ComposeActions;