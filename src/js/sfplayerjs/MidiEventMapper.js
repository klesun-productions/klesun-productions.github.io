
const isNoteOn = (readerEvent) =>
    readerEvent.type === 'MIDI' &&
    readerEvent.midiEventType === 9 &&
    readerEvent.parameter2 > 0;

const isNoteOff = (readerEvent) =>
    readerEvent.type === 'MIDI' && (
        readerEvent.midiEventType === 8 ||
        readerEvent.midiEventType === 9 && readerEvent.parameter2 === 0
    );

/** @param webAudioSfSynth = at('WebAudioSfSynth.js').WebAudioSfSynth() */
const MidiEventMapper = (webAudioSfSynth) => {
    const handleMidiEvent = function(event) {
        const {midiEventType, midiChannel, parameter1, parameter2} = event;
        const channelState = webAudioSfSynth.getChannelState(midiChannel);
        if (isNoteOn(event)) {
            const params = {
                semitone: parameter1, bank: channelState.bank,
                velocity: parameter2, preset: channelState.preset,
            };
            if (midiChannel == 9) {
                // drum track
                if (params.bank < 128) { // in case of improper bank message
                    params.bank = 128;
                    params.preset = 0;
                }
            }
            webAudioSfSynth.pressBy(params, channelState);
        } else if (isNoteOff(event)) {
            channelState.pressedNotes
                .filter(p => p.semitone == event.parameter1)
                .forEach(webAudioSfSynth.release);
            channelState.pressedNotes = channelState.pressedNotes
                .filter(p => p.semitone != event.parameter1);
        } else if (midiEventType === 14) { // pitch bend
            const pitchBend = (parameter1 + parameter2 << 7) * 2 / 16384 - 1;
            webAudioSfSynth.setPitchBend(pitchBend, midiChannel);
        } else if (midiEventType === 12) { // program change
            channelState.preset = parameter1;
        } else if (midiEventType === 11) { // control change
            if (parameter1 === 0) { // bank change
                channelState.bank = parameter2;
            } else if (parameter1 === 1) { // volume
                const factor = parameter2 / 127;
                //setVolume(factor);
            }
        } else {
            // unhandled event
        }
    };

    return {
        handleMidiEvent: handleMidiEvent,
    };
};

export default MidiEventMapper;