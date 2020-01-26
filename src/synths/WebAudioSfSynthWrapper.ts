import {ISynth} from "./ISynth";
import WebAudioSfSynth from '../../src/js/sfplayerjs/WebAudioSfSynth.js'
import {Tls} from "../utils/Tls";
import {IShChannel} from "../DataStructures";

/** @param sf3Adapter = at('SfAdapter.js').SfAdapter() */
const WebAudioSfSynthWrapper = (sf3Adapter: any): ISynth => {
    const webAudioSfSynth = WebAudioSfSynth(Tls.audioCtx, sf3Adapter);

    var openedDict: {[channel: number]: {[semitone: number]: number}} = {};
    Tls.range(0,16).forEach(n => (openedDict[n] = {}));

    /** @param noteJs - shmidusic Note external representation
     * @return function - lambda to interrupt note */
    var playNote = (tune: number, channel: number, velocity: number) => {
        if (+tune === 0) { // pauses in shmidusic... very stupid idea
            return () => {};
        }
        const channelState = webAudioSfSynth.getChannelState(channel);

        // stopping just for a moment to mark end of previous sounding if any
        if ((openedDict[channel][tune] || 0) > 0) {
            channelState.pressedNotes
                .filter((n: any) => +n.semitone === +tune)
                .forEach(webAudioSfSynth.release);
        }

        webAudioSfSynth.pressBy({
            semitone: tune,
            velocity: velocity,
            bank: channelState.bank,
            preset: channelState.preset,
        }, channelState);

        openedDict[channel][tune] |= 0;
        openedDict[channel][tune] += 1;

        const stopNote = () => {
            if (--openedDict[channel][tune] === 0) {
                channelState.pressedNotes
                    .filter((n: any) => +n.semitone === +tune)
                    .forEach(webAudioSfSynth.release);
            }
        };

        return stopNote;
    };

    const consumeConfig = (programs: { [id: number]: IShChannel; }) => {
        for (const [id, channelConfig] of Object.entries(programs)) {
            webAudioSfSynth.getChannelState(id).preset = channelConfig.preset;
        }
    };

    return {
        playNote,
        consumeConfig,
        /** not needed here, since RAM is fast AF */
        analyse: (chords) => {},
        init: ($cont) => {},
        // TODO: check, most likely there is a confusion - interface expects value
        //  to be [-1 .. +1] * range, whereas webAudioSfSynth expects it be just semitones
        setPitchBend: webAudioSfSynth.setPitchBend,
        setVolume: (koef,chan) => {}, // TODO: implement
    };
};

export default WebAudioSfSynthWrapper;
