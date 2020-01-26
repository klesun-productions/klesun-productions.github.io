
const makeChanGain = (audioCtx) => {
    const node = audioCtx.createGain();
    node.gain.value = 1;
    node.connect(audioCtx.destination);
    return node;
};

const makeChannelState = audioCtx => {
    return {
        bank: 0,
        preset: 0,
        pitchBend: 0,
        volume: 1,
        gainNode: makeChanGain(audioCtx),
        pressedNotes: [],
    };
};

/**
 * a software analog of a MIDI device that
 * takes a MIDI event and produces the sound
 *
 * @param {AudioContext} audioCtx
 * @param sfAdapter = at('SfAdapter.js').SfAdapter()
 */
const WebAudioSfSynth = (audioCtx, sfAdapter) => {
    const range = (l, r) => new Array(r - l).fill(0).map((_, i) => l + i);

    const channels = range(0, 16).map(i => makeChannelState(audioCtx));
    const toneToFactor = (s) => Math.pow(2, 2 * s / 12);

    const setPitchBend = (pitchBend, chan) => {
        channels[chan].pitchBend = pitchBend;
        channels[chan].pressedNotes.forEach(s => s.audioSource.playbackRate.value = s.baseFrequency * toneToFactor(pitchBend));
    };

    const setVolume = (factor, chan) => {
        channels[chan].volume = factor;
        channels[chan].gainNode.gain.value = factor;
    };

    const MAX_VOLUME = 0.20;

    const press = function(sampleData, channel) {
        const gainNode = audioCtx.createGain();
        const panNode = audioCtx.createStereoPanner();
        const audioSource = audioCtx.createBufferSource();

        const baseVolume = MAX_VOLUME * sampleData.volumeKoef;
        const baseFrequency = sampleData.frequencyFactor;
        gainNode.gain.value = baseVolume;
        audioSource.buffer = sampleData.buffer;
        audioSource.playbackRate.value = baseFrequency * toneToFactor(channel.pitchBend);
        audioSource.loopStart = sampleData.loopStart;
        audioSource.loopEnd = sampleData.loopEnd;
        audioSource.loop = sampleData.isLooped;

        gainNode.connect(audioCtx.destination);
        panNode.connect(gainNode);
        audioSource.connect(panNode);

        audioSource.start();
        return {
            audioSource: audioSource,
            gainNode: gainNode,
            baseVolume: baseVolume,
            baseFrequency: sampleData.frequencyFactor,
            fadeMillis: sampleData.fadeMillis,
        };
    };

    const release = function(audio) {
        const now = audioCtx.currentTime;
        audio.gainNode.gain.exponentialRampToValueAtTime(0.000001, now + audio.fadeMillis / 1000);
        audio.audioSource.stop(now + audio.fadeMillis / 1000);
    };

    const pressBy = (params, channelState) => {
        sfAdapter.getSampleData(params, (samples) => {
            if (samples.length === 0) {
                console.error('No sample in the bank: ' + channelState.bank + ' ' + channelState.preset, params);
            } else {
                samples.forEach(sampleData => {
                    const pressed = press(sampleData, channelState);
                    pressed.semitone = params.semitone;
                    channelState.pressedNotes.push(pressed);
                });
            }
        });
    };

    const stopAll = function() {
        for (const channel of channels) {
            channel.pressedNotes.forEach(release);
            channel.pressedNotes = [];
        }
    };

    return {
        pressBy,
        release,
        getChannelState: channelId => channels[channelId],
        setPitchBend,
        stopAll,
    };
};

export default WebAudioSfSynth;