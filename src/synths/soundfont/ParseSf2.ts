
import {IPreset, IInstrument, EStereoPan, ISampleInfo, IGenerator} from "../SoundFontAdapter";
import {Tls, Opt} from "../../utils/Tls";

// overwrites global keys with local if any
let updateGenerator = function(global: IGenerator, local: IGenerator): IGenerator
{
    return $.extend({}, global, local);
};

// adds the tuning semi-tones and cents; multiplies whatever needs to be multiplied
let combineGenerators = function(global: IGenerator, local: IGenerator): IGenerator
{
    let result: IGenerator = $.extend({}, local);
    let dkr = {lo: 0, hi: 127};

    result.keyRange = {
        lo: Math.max(
            (global.keyRange || dkr).lo,
            (local.keyRange || dkr).lo
        ),
        hi: Math.min(
            (global.keyRange || dkr).hi,
            (local.keyRange || dkr).hi
        ),
    };

    result.velRange = {
        lo: Math.max(
            (global.velRange || dkr).lo,
            (local.velRange || dkr).lo
        ),
        hi: Math.min(
            (global.velRange || dkr).hi,
            (local.velRange || dkr).hi
        ),
    };

    result.fineTune = (+local.fineTune || 0) + (+global.fineTune || 0);
    result.coarseTune = (+local.coarseTune || 0) + (+global.coarseTune || 0);
    result.initialAttenuation = (+local.initialAttenuation || 0) + (+global.initialAttenuation || 0);

    return result;
};

/**
 * takes a bunch of generators and extends
 * lowest and highest key ranges to 0 and 127
 * @mutates
 */
let fillBorders = function(generators: IGenerator[])
{
    if (generators.filter(g => !Opt(g.keyRange).has()).length > 0) {
        // there are generators that are not limited by key range
        return;
    }

    let lo = 127;
    let loGens = Tls.list([]);
    let hi = 0;
    let hiGens = Tls.list([]);

    for (let gen of generators) {
        if (lo > gen.keyRange.lo) {
            lo = gen.keyRange.lo;
            loGens = Tls.list([gen]);
        } else if (gen.keyRange.lo === lo) {
            loGens.more = gen;
        }

        if (hi < gen.keyRange.hi) {
            hi = gen.keyRange.hi;
            hiGens = Tls.list([gen]);
        } else if (gen.keyRange.hi === hi) {
            hiGens.more = gen;
        }
    }

    loGens.forEach = g => g.keyRange.lo = 0;
    hiGens.forEach = g => g.keyRange.hi = 127;
};

export let TransformSf2Parse = function(root: ISf2Parser)
{
    let itemsToGenerator = (items: IItem[]): IGenerator => {
        let result: {[k: string]: any} = {};
        for (let item of items) {
            result[item.type] = item.value.amount !== undefined
                ? item.value.amount
                : item.value;
        }
        return result;
    };

    let getInstrumentInfo = function(instr_idx: number): IInstrument
    {
        let instrumentName = root.instrument[instr_idx].instrumentName;
        let zone_start_idx = root.instrument[instr_idx].instrumentBagIndex;

        let zone_end_idx = instr_idx + 1 < root.instrument.length
            ? root.instrument[instr_idx + 1].instrumentBagIndex
            : root.instrumentZone.length;

        let propertyBundles = Tls.range(zone_start_idx, zone_end_idx)
            .map(zone_idx => {
                let gen_start_idx = root.instrumentZone[zone_idx].instrumentGeneratorIndex;
                let gen_end_idx = zone_idx + 1 < root['instrumentZone'].length
                    ? root.instrumentZone[zone_idx + 1].instrumentGeneratorIndex
                    : root.instrumentZoneGenerator.length;

                let items = Tls.range(gen_start_idx, gen_end_idx)
                    .map(idx => root.instrumentZoneGenerator[idx]);

                return itemsToGenerator(items);
            });

        let generatorApplyToAll = !propertyBundles[0].sampleID
            ? propertyBundles.shift()
            : null;

        let links: IInstrumentSample[] = [];
        for (let props of propertyBundles) {
            links[props.sampleID] = links[props.sampleID] || {
                sampleNumber: props.sampleID,
                info: root.sampleHeader[+props.sampleID],
                generators: [],
            };
            links[props.sampleID].generators.push(props);
        }
        links = links.filter(a => true); // reset array indexes
        fillBorders(links.map(l => l.generators).reduce((a,b) => a.concat(b), []));

        return {
            instrumentName: instrumentName,
            samples: links,
            generatorApplyToAll: generatorApplyToAll,
        };
    };

    let getSoundFont = function()
    {
        let soundfont: soundfont_t = {};

        for (let pres_idx = 0; pres_idx < root.presetHeader.length; ++pres_idx) {
            let pres = root.presetHeader[pres_idx];
            let pzone_start_idx = pres.presetBagIndex;
            let pzone_end_idx = pres_idx + 1 < root.presetHeader.length
                ? root.presetHeader[pres_idx + 1].presetBagIndex
                : root.presetZone.length; // -1 ?

            let propertyBundles = Tls.range(pzone_start_idx, pzone_end_idx)
                .map(pzone_idx => {
                    let gen_start_idx = root.presetZone[pzone_idx].presetGeneratorIndex;
                    let gen_end_idx = pzone_idx + 1 < root.presetZone.length
                        ? root.presetZone[pzone_idx + 1].presetGeneratorIndex
                        : root.presetZoneGenerator.length;

                    let items = Tls.range(gen_start_idx, gen_end_idx)
                        .map(idx => root.presetZoneGenerator[idx]);

                    return itemsToGenerator(items);
                });

            let generatorApplyToAll = !propertyBundles[0].instrument
                ? propertyBundles.shift()
                : null;

            let links: IPresetInstrument[] = [];
            for (let props of propertyBundles) {
                links[props.instrument] = links[props.instrument] || {
                    info: getInstrumentInfo(+props.instrument),
                    generators: [],
                };
                links[props.instrument].generators.push(props);
            }
            links = links.filter(a => true); // reset array indexes
            fillBorders(links.map(l => l.generators).reduce((a,b) => a.concat(b), []));

            soundfont[pres.bank] = soundfont[pres.bank] || {};
            soundfont[pres.bank][pres.preset] = {
                presetName: pres.presetName,
                instruments: links,
                generatorApplyToAll: generatorApplyToAll,
            };
        }

        return soundfont
    };

    return getSoundFont();
};

// Sf2-Parser lefts null characters when name length is less than 20
let cleanText = function(rawText: string): string
{
    rawText = rawText + '\u0000';
    let endIdx = rawText.indexOf('\u0000');
    return rawText.substr(0, endIdx);
};

/**
 * get rid of instruments and presets - keep just single generator - the sample generator
 */
export let flattenSamples = function(soundFont: soundfont_t): IFlatSoundFont
{
    let flatFont: IFlatSoundFont = {};

    for (let bankN in soundFont) {
        flatFont[bankN] = {};
        let presets = soundFont[bankN];
        for (let presetN in presets) {
            flatFont[bankN][presetN] = [];
            let preset = presets[presetN];
            for (let presetInstrument of preset.instruments) {
                let sampleByName: {[name: string]: IInstrumentSample} = {};
                for (let instrumentSample of presetInstrument.info.samples) {
                    let name = instrumentSample.info.sampleName;
                    sampleByName[name] = sampleByName[name] || {
                        sampleNumber: instrumentSample.sampleNumber,
                        info: instrumentSample.info,
                        generators: [],
                    };
                    for (let iGen of presetInstrument.generators) {
                        for (let sGen of instrumentSample.generators) {
                            sampleByName[name].generators.push(combineGenerators(
                                updateGenerator(preset.generatorApplyToAll || {}, iGen),
                                updateGenerator(presetInstrument.info.generatorApplyToAll, sGen)
                            ));
                        }
                    }
                }

                for (let name in sampleByName) {
                    flatFont[bankN][presetN].push({
                        sampleNumber: sampleByName[name].sampleNumber,
                        sampleInfo: sampleByName[name].info,
                        generators: sampleByName[name].generators,
                    });
                }
            }
        }
    }

    return flatFont;
};

/**
 * wraps call to sf2parser
 * @see https://github.com/colinbdclark/sf2-parser
 * and transforms the output to more usable structure
 *
 * @param sf2Buf - bytes of an .sf2 file
 */
export let ParseSoundFontFile = function(sf2Buf: ArrayBuffer): [IFlatSoundFont, [Int16Array, ISampleInfo][]]
{
    let view = new Uint8Array(sf2Buf);

    let parser = new sf2.Parser(view);
    parser.parse();

    for (let sampleHeader of parser.sampleHeader) {
        sampleHeader.sampleName = cleanText(sampleHeader.sampleName);
    }

    /** @debug */
    console.log(parser);

    let sampleBuffers = parser.sample.map((d,i) => [d, parser.sampleHeader[i]]);
    // delete (<any>parser).sample;

    return <any>[flattenSamples(TransformSf2Parse(parser)), sampleBuffers];
};

/**
 * soundfont without instruments - the presetNumber => sample/generator pairs mapping
 */
interface IFlatSoundFont {
    [bank: number]: {
        [preset: number]: Array<{
            sampleNumber: number,
            sampleInfo: ISampleInfo,
            generators: IGenerator[],
        }>
    }
}

export type soundfont_t = {[bank: number]: {[preset: number]: IPreset}};

export interface IPresetInstrument {
    info: IInstrument,
    generators: IGenerator[],
}

export interface IInstrumentSample {
    sampleNumber: number,
    info: ISampleInfo,
    generators: IGenerator[],
}

interface IItem {
    type: string,
    value: {
        // most generators
        amount?: number,

        // "keyRange", "velRange"
        lo?: number,
        hi?: number,
    },
}

interface ISf2Parser {
    parse: () => void,

    presetHeader: Array<{
        preset: number, // piano - 0, church organ - 19, choir - 52
        bank: number, // pitchable instruments have it 0; drums have it 128; misc stuff - other values
        presetName: string, // human readable
        presetBagIndex: number, // points to /presetZone elements
    }>,

    // links to /presetZoneGenerator and /presetZoneModulator
    presetZone: Array<{
        presetGeneratorIndex: number, // points to /presetZoneGenerator elements
        presetModulatorIndex: number, // points to /presetZoneModulator elements
    }>,

    // generators describe how sample should be played
    // (pitch, fade time, chorus, some other effects, etc...)
    // when type is "instrument", points to /instrument elements
    presetZoneGenerator: Array<IItem>,

    // links to /instrumentZone
    instrument: Array<{
        instrumentName: string, // human readable
        instrumentBagIndex: number, // points to /instrumentZone elements
    }>,

    // links /instrument to
    instrumentZone: Array<{
        instrumentGeneratorIndex: number, // points to /instrumentZoneGenerator elements
        instrumentModulatorIndex: number, // points to /instrumentZoneModulator elements
    }>,

    instrumentZoneGenerator: Array<IItem>,

    sampleHeader: Array<ISampleInfo>,

    sample: Array<Int16Array>,
}

// lib required
declare let sf2: {
    Parser: {
        prototype: ISf2Parser,
        new (sf2Data: Uint8Array): ISf2Parser,
    },
};