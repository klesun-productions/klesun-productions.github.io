
import Tls from "./Tls.js";
import sf2 from 'https://klesun-misc.github.io/sf3-parser-es6/src/sf3-parser-es6.js';

/**
 * takes .sf2 file contents, parses it with sf2-parser
 * by colinbdclark and transforms result to convenient format
 * @param {Uint8Array} sf2Buf
 */
const SfAdapter = (sf2Buf, audioCtx, isSf3) => {

    const {opt} = Tls();
    const range = (l, r) => new Array(r - l).fill(0).map((_, i) => l + i);

    // Sf2-Parser lefts null characters when name length is less than 20
    const cleanText = function(rawText)
    {
        rawText = rawText + '\u0000';
        const endIdx = rawText.indexOf('\u0000');
        return rawText.substr(0, endIdx);
    };

    const view = new Uint8Array(sf2Buf);
    const root = new sf2.Parser(view, {
        parserOptions: {isSf3: isSf3},
    });
    root.parse();
    for (const sampleHeader of root.sampleHeader) {
        sampleHeader.sampleName = cleanText(sampleHeader.sampleName);
    }

    const sampleToAudio = {};

    console.log('sf2 flat: ', root);

    /**
     * @param {ArrayBuffer} sf2Sample
     * @param {ISampleInfo} sampleInfo
     * @return {ArrayBuffer}
     * @see http://soundfile.sapp.org/doc/WaveFormat/
     */
    const sf2ToWav = function(sf2Sample, sampleInfo)
    {
        const size = sf2Sample.byteLength + 44; // 44 - RIFF header data
        const sourceView = new DataView(sf2Sample);
        const wavBuf = new ArrayBuffer(size);
        const view = new DataView(wavBuf);

        const subChunkSize = 16;
        const chanCnt = 1;
        const sampleRate = sampleInfo.sampleRate;
        const bitsPerSample = 16;
        const blockAlign = chanCnt * bitsPerSample / 8;
        const byteRate = blockAlign * sampleRate;

        view.setInt32(0 , 0x52494646, false); // RIFF
        view.setInt32(4 , size - 16, true); // following data length
        view.setInt32(8 , 0x57415645, false); // WAVE
        view.setInt32(12, 0x666D7420, false); // fmt
        view.setInt32(16, subChunkSize, true);
        view.setInt16(20, 1, true); // PCM = 1 means data is not compressed
        view.setInt16(22, chanCnt, true);
        view.setInt32(24, sampleRate, true);
        view.setInt32(28, byteRate, true);
        view.setInt16(32, blockAlign, true);
        view.setInt16(34, bitsPerSample, true);
        view.setInt32(36, 0x64617461, false); // data
        view.setInt32(40, sf2Sample.length * 2, true);

        for (let i = 0; i < sf2Sample.byteLength; ++i) {
            view.setInt8(44 + i, sourceView.getInt8(i));
        }

        return wavBuf;
    };

    /** @see http://freepats.zenvoid.org/sf2/sfspec24.pdf grep "38 releaseVolEnv" */
    const decodeReleaseVolEnv = volEnv => 2 ** (volEnv / 1200);

    /** @param db - soundfont decibel value */
    const dBtoKoef = (db) => Math.pow(10, db/50); // yes, it is 50, not 10 and not 20 - see /tests/attenToPercents.txt

    // overwrites global keys with local if any
    const updateGenerator = function(global, local)
    {
        return Object.assign({}, global, local);
    };

    // adds the tuning semi-tones and cents; multiplies whatever needs to be multiplied
    const combineGenerators = function(presetInstrMods, instrSampleMods)
    {
        const result = Object.assign({}, instrSampleMods);
        const dkr = {lo: 0, hi: 127};

        result.keyRange = {
            lo: Math.max(
                (presetInstrMods.keyRange || dkr).lo,
                (instrSampleMods.keyRange || dkr).lo
            ),
            hi: Math.min(
                (presetInstrMods.keyRange || dkr).hi,
                (instrSampleMods.keyRange || dkr).hi
            ),
        };

        result.velRange = {
            lo: Math.max(
                (presetInstrMods.velRange || dkr).lo,
                (instrSampleMods.velRange || dkr).lo
            ),
            hi: Math.min(
                (presetInstrMods.velRange || dkr).hi,
                (instrSampleMods.velRange || dkr).hi
            ),
        };

        result.fineTune = (+instrSampleMods.fineTune || 0) + (+presetInstrMods.fineTune || 0);
        result.coarseTune = (+instrSampleMods.coarseTune || 0) + (+presetInstrMods.coarseTune || 0);
        result.initialAttenuation = (+instrSampleMods.initialAttenuation || 0) + (+presetInstrMods.initialAttenuation || 0);

        // could not hold the pattern above with keeping values in original units
        // since when you merge preset and instrument, they need to be multiplied
        const volEnvSeco = opt(instrSampleMods.releaseVolEnv).map(decodeReleaseVolEnv).def(0);
        const volEnvMult = opt(presetInstrMods.releaseVolEnv).map(decodeReleaseVolEnv).def(1);
        delete(result.releaseVolEnv);
        result.releaseVolEnvSeconds = volEnvSeco * volEnvMult;

        return result;
    };

    /** get rid of instruments and presets - keep just single generator - the sample generator */
    const flattenSamples = function(soundFont)
    {
        const flatFont = {};

        for (const bankN in soundFont) {
            flatFont[bankN] = {};
            const presets = soundFont[bankN];
            for (const presetN in presets) {
                flatFont[bankN][presetN] = [];
                const preset = presets[presetN];
                for (const presetInstrument of preset.instruments) {
                    const sampleByNum = {};
                    for (const instrumentSample of presetInstrument.info.samples) {
                        const num = instrumentSample.sampleNumber;
                        sampleByNum[num] = sampleByNum[num] || {
                            sampleNumber: instrumentSample.sampleNumber,
                            info: instrumentSample.info,
                            generators: [],
                        };
                        for (const iGen of presetInstrument.generators) {
                            for (const sGen of instrumentSample.generators) {
                                sampleByNum[num].generators.push(combineGenerators(
                                    updateGenerator(preset.generatorApplyToAll || {}, iGen),
                                    updateGenerator(presetInstrument.info.generatorApplyToAll, sGen)
                                ));
                            }
                        }
                    }

                    for (const num in sampleByNum) {
                        flatFont[bankN][presetN].push({
                            sampleNumber: sampleByNum[num].sampleNumber,
                            sampleInfo: sampleByNum[num].info,
                            generators: sampleByNum[num].generators,
                        });
                    }
                }
            }
        }

        return flatFont;
    };

    const itemsToGenerator = (items) => {
        const result = {};
        for (const item of items) {
            result[item.type] = item.value.amount !== undefined
                ? item.value.amount
                : item.value;
        }
        return result;
    };

    const isNull = val => [undefined, null].includes(val);

    /**
     * takes a bunch of generators and extends
     * lowest and highest key ranges to 0 and 127
     * @mutates
     */
    const fillBorders = function(generators)
    {
        if (generators.filter(g => isNull(g.keyRange)).length > 0) {
            // there are generators that are not limited by key range
            return;
        }

        let lo = 127;
        let loGens = [];
        let hi = 0;
        let hiGens = [];

        for (const gen of generators) {
            if (lo > gen.keyRange.lo) {
                lo = gen.keyRange.lo;
                loGens = [gen];
            } else if (gen.keyRange.lo === lo) {
                loGens.more = gen;
            }

            if (hi < gen.keyRange.hi) {
                hi = gen.keyRange.hi;
                hiGens = [gen];
            } else if (gen.keyRange.hi === hi) {
                hiGens.more = gen;
            }
        }

        loGens.forEach(g => g.keyRange.lo = 0);
        hiGens.forEach(g => g.keyRange.hi = 127);
    };

    const getInstrumentInfo = function(instr_idx, extendKeyRanges)
    {
        const instrumentName = root.instrument[instr_idx].instrumentName;
        const zone_start_idx = root.instrument[instr_idx].instrumentBagIndex;

        const zone_end_idx = instr_idx + 1 < root.instrument.length
            ? root.instrument[instr_idx + 1].instrumentBagIndex
            : root.instrumentZone.length;

        const propertyBundles = range(zone_start_idx, zone_end_idx)
            .map(zone_idx => {
                const gen_start_idx = root.instrumentZone[zone_idx].instrumentGeneratorIndex;
                const gen_end_idx = zone_idx + 1 < root['instrumentZone'].length
                    ? root.instrumentZone[zone_idx + 1].instrumentGeneratorIndex
                    : root.instrumentZoneGenerator.length;

                const items = range(gen_start_idx, gen_end_idx)
                    .map(idx => root.instrumentZoneGenerator[idx]);

                return itemsToGenerator(items);
            });

        const generatorApplyToAll = isNull(propertyBundles[0].sampleID)
            ? propertyBundles.shift()
            : null;

        let links = [];
        for (const props of propertyBundles) {
            links[props.sampleID] = links[props.sampleID] || {
                sampleNumber: props.sampleID,
                info: root.sampleHeader[+props.sampleID],
                generators: [],
            };
            links[props.sampleID].generators.push(props);
        }
        links = links.filter(a => true); // reset array indexes
        extendKeyRanges && fillBorders(links.map(l => l.generators).reduce((a,b) => a.concat(b), []));

        return {
            instrumentName: instrumentName,
            samples: links,
            generatorApplyToAll: generatorApplyToAll,
        };
    };

    const makeSampleTree = function()
    {
        const bankToPresetToData = {};

        for (let pres_idx = 0; pres_idx < root.presetHeader.length; ++pres_idx) {
            const pres = root.presetHeader[pres_idx];
            if ((bankToPresetToData[pres.bank] || {})[pres.preset] !== undefined) {
                // EOS artifact in sf2-parser has bank 0 and preset 0 and overwrote piano
                continue;
            }

            const pzone_start_idx = pres.presetBagIndex;
            const pzone_end_idx = pres_idx + 1 < root.presetHeader.length
                ? root.presetHeader[pres_idx + 1].presetBagIndex
                : root.presetZone.length; // -1 ?
            // let extendKeyRanges = pres.bank === 0; // no for drums, since they are not pitchable
            const extendKeyRanges = pres.bank < 128; // 128 - drums
            const propertyBundles = range(pzone_start_idx, pzone_end_idx)
                .map(pzone_idx => {
                    const gen_start_idx = root.presetZone[pzone_idx].presetGeneratorIndex;
                    const gen_end_idx = pzone_idx + 1 < root.presetZone.length
                        ? root.presetZone[pzone_idx + 1].presetGeneratorIndex
                        : root.presetZoneGenerator.length;

                    const items = range(gen_start_idx, gen_end_idx)
                        .map(idx => root.presetZoneGenerator[idx]);

                    return itemsToGenerator(items);
                });
            const generatorApplyToAll = isNull(propertyBundles[0].instrument)
                ? propertyBundles.shift()
                : null;

            let links = [];
            for (const props of propertyBundles) {
                links[props.instrument] = links[props.instrument] || {
                    info: getInstrumentInfo(+props.instrument, extendKeyRanges),
                    generators: [],
                };
                links[props.instrument].generators.push(props);
            }
            links = links.filter(a => true); // reset array indexes
            extendKeyRanges && fillBorders(links.map(l => l.generators).reduce((a,b) => a.concat(b), []));

            bankToPresetToData[pres.bank] = bankToPresetToData[pres.bank] || {};
            bankToPresetToData[pres.bank][pres.preset] = {
                presetName: pres.presetName,
                instruments: links,
                generatorApplyToAll: generatorApplyToAll,
            };
        }
        console.log('sf2 tree: ', JSON.parse(JSON.stringify(bankToPresetToData)));
        return flattenSamples(bankToPresetToData);
    };

    const bankToPresetToSamples = makeSampleTree();

    console.log('sf2 tree flat samples: ', JSON.parse(JSON.stringify(bankToPresetToSamples)));

    const filterSamples = function(params)
    {
        const {bank, preset, semitone, velocity} = params;
        let presets = bankToPresetToSamples[bank];
        let samples = presets ? presets[preset] : undefined;
        if (!samples) {
            const fallbackBank = bank < 128 ? 0 : 128; // 128 - drums
            presets = bankToPresetToSamples[fallbackBank];
            samples = presets ? presets[preset] : undefined;
        }
        if (!samples) return [];

        const filtered = samples
            .map(s => s.generators
                .filter(g =>
                    g.keyRange.lo <= semitone &&
                    g.keyRange.hi >= semitone &&
                    g.velRange.lo <= velocity &&
                    g.velRange.hi >= velocity)
                .map(g => 1 && {
                    sam: s.sampleInfo,
                    gen: g,
                    sampleNumber: s.sampleNumber,
                }))
            .reduce((a,b) => a.concat(b), []);
        return filtered;
    };

    const determineCorrectionCents = (delta, generator) => {
        const fineTune = !isNull(generator.fineTune) ? generator.fineTune : 0;
        const coarseTune = !isNull(generator.coarseTune) ? generator.coarseTune * 100 : 0;
        return delta * 100 + fineTune + coarseTune;
    };

    /** sample num -> array of funcs to call when it is fetched */
    const awaiting = {};
    let onIdles = [];

    // let saveWavToDisc = function(buff, fileName = 'sample')
    // {
    //     let blob = new Blob([buff], {type: "wav/binary"});
    //     saveAs(blob, fileName + '.wav', true);
    // };
    //
    // let saveOggToDisc = function(buff, fileName = 'sample')
    // {
    //     let blob = new Blob([buff], {type: "ogg/binary"});
    //     saveAs(blob, fileName + '.ogg', true);
    // };

    const getSampleAudio = function(sampleNumber, then) {
        if (sampleToAudio[sampleNumber]) {
            then(sampleToAudio[sampleNumber]);
        } else {
            if (awaiting[sampleNumber]) {
                awaiting[sampleNumber].push(then);
            } else {
                awaiting[sampleNumber] = [then];
                const sampleInfo = root.sampleHeader[sampleNumber];
                const sampleBuf = root.sample[sampleNumber];

                let fullBuf;
                if (isSf3) {
                    fullBuf = sampleBuf;
                } else {
                    fullBuf = sf2ToWav(sampleBuf, sampleInfo);
                }
                audioCtx.decodeAudioData(fullBuf, (decoded) => {
                    awaiting[sampleNumber].forEach(a => a(decoded));
                    delete awaiting[sampleNumber];
                    sampleToAudio[sampleNumber] = decoded;
                    if (Object.keys(awaiting).length === 0) {
                        onIdles.forEach(handler => handler());
                        onIdles = [];
                    }
                }, console.error);
            }
        }
    };

    const onIdle = function(callback) {
        if (Object.keys(awaiting).length === 0) {
            callback();
        } else {
            onIdles.push(callback);
        }
    };

    /** @param {{
     *     bank: number, preset: number,
     *     semitone: number, velocity: number,
     * }} params */
    const getSampleData = (params, then) => {
        const sampleHeaders = filterSamples(params);
        if (sampleHeaders.length === 0) then([]);
        const sources = [];
        const reportAnother = () => {
            if (sources.length === sampleHeaders.length) {
                then(sources);
            }
        };
        for (const {sam, gen, sampleNumber} of sampleHeaders) {
            const sampleSemitone = !isNull(gen.overridingRootKey)
                ? gen.overridingRootKey : sam.originalPitch;
            const correctionCents = determineCorrectionCents(
                params.semitone - sampleSemitone, gen
            );
            const freqFactor = Math.pow(2, correctionCents / 1200);
            const genVolumeKoef = isNull(gen.initialAttenuation) ? 1 :
                dBtoKoef(-gen.initialAttenuation / 10);
            getSampleAudio(sampleNumber, decoded => {
                sources.push({
                    buffer: decoded,
                    frequencyFactor: freqFactor,
                    isLooped: gen.sampleModes === 1,
                    loopStart: (sam.startLoop + (gen.startloopAddrsOffset || 0)) / sam.sampleRate,
                    loopEnd: (sam.endLoop + (gen.endloopAddrsOffset || 0)) / sam.sampleRate,
                    stereoPan: sam.sampleType,
                    volumeKoef: genVolumeKoef * params.velocity / 127,
                    fadeMillis: gen.releaseVolEnvSeconds * 1000,
                });
                reportAnother();
            });
        }
    };

    return {
        getSampleData: getSampleData,
        getSampleDataPr: (params) => {
            return new Promise((ok, err) => {
                getSampleData(params, ok);
            });
        },
        onIdle: onIdle,
    };
};

export default SfAdapter;