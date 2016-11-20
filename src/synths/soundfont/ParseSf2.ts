
import {IPreset, IInstrument, EStereoPan, ISampleInfo, IGenerator} from "../SoundFontAdapter";
import {Tls} from "../../utils/Tls";

// overwrites global keys with local if any
var updateGenerator = function(global: IGenerator, local: IGenerator): IGenerator
{
    return $.extend({}, global, local);
};

// adds the tuning semi-tones and cents; multiplies whatever needs to be multiplied
var combineGenerators = function(global: IGenerator, local: IGenerator): IGenerator
{
    var result: IGenerator = $.extend({}, local);
    var dkr = {lo: 0, hi: 127};

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

export var TransformSf2Parse = function(root: ISf2Parser)
{
    var itemsToGenerator = (items: IItem[]): IGenerator => {
        var result: {[k: string]: any} = {};
        for (var item of items) {
            result[item.type] = item.value.amount !== undefined
                ? item.value.amount
                : item.value;
        }
        return result;
    };

    var getInstrumentInfo = function(instr_idx: number): IInstrument
    {
        var instrumentName = root.instrument[instr_idx].instrumentName;
        var zone_start_idx = root.instrument[instr_idx].instrumentBagIndex;

        var zone_end_idx = instr_idx + 1 < root.instrument.length
            ? root.instrument[instr_idx + 1].instrumentBagIndex
            : root.instrumentZone.length;

        var propertyBundles = Tls.range(zone_start_idx, zone_end_idx)
            .map(zone_idx => {
                var gen_start_idx = root.instrumentZone[zone_idx].instrumentGeneratorIndex;
                var gen_end_idx = zone_idx + 1 < root['instrumentZone'].length
                    ? root.instrumentZone[zone_idx + 1].instrumentGeneratorIndex
                    : root.instrumentZoneGenerator.length;

                var items = Tls.range(gen_start_idx, gen_end_idx)
                    .map(idx => root.instrumentZoneGenerator[idx]);

                return itemsToGenerator(items);
            });

        var generatorApplyToAll = !propertyBundles[0].sampleID
            ? propertyBundles.shift()
            : null;

        var links: IInstrumentSample[] = [];
        for (var props of propertyBundles) {
            links[props.sampleID] = links[props.sampleID] || {
                sampleNumber: props.sampleID,
                info: root.sampleHeader[+props.sampleID],
                generators: [],
            };
            links[props.sampleID].generators.push(props);
        }
        links = links.filter(a => true); // reset array indexes

        return {
            instrumentName: instrumentName,
            samples: links,
            generatorApplyToAll: generatorApplyToAll,
        };
    };

    var getSoundFont = function()
    {
        var soundfont: soundfont_t = {};

        for (var pres_idx = 0; pres_idx < root.presetHeader.length; ++pres_idx) {
            var pres = root.presetHeader[pres_idx];
            var pzone_start_idx = pres.presetBagIndex;
            var pzone_end_idx = pres_idx + 1 < root.presetHeader.length
                ? root.presetHeader[pres_idx + 1].presetBagIndex
                : root.presetZone.length; // -1 ?

            var propertyBundles = Tls.range(pzone_start_idx, pzone_end_idx)
                .map(pzone_idx => {
                    var gen_start_idx = root.presetZone[pzone_idx].presetGeneratorIndex;
                    var gen_end_idx = pzone_idx + 1 < root.presetZone.length
                        ? root.presetZone[pzone_idx + 1].presetGeneratorIndex
                        : root.presetZoneGenerator.length;

                    var items = Tls.range(gen_start_idx, gen_end_idx)
                        .map(idx => root.presetZoneGenerator[idx]);

                    return itemsToGenerator(items);
                });

            var generatorApplyToAll = !propertyBundles[0].instrument
                ? propertyBundles.shift()
                : null;

            var links: IPresetInstrument[] = [];
            for (var props of propertyBundles) {
                links[props.instrument] = links[props.instrument] || {
                    info: getInstrumentInfo(+props.instrument),
                    generators: [],
                };
                links[props.instrument].generators.push(props);
            }
            links = links.filter(a => true); // reset array indexes

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
var cleanText = function(rawText: string): string
{
    rawText = rawText + '\u0000';
    var endIdx = rawText.indexOf('\u0000');
    return rawText.substr(0, endIdx);
};

/**
 * get rid of instruments and presets - keep just single generator - the sample generator
 */
export var flattenSamples = function(soundFont: soundfont_t): IFlatSoundFont
{
    var flatFont: IFlatSoundFont = {};

    for (var bankN in soundFont) {
        flatFont[bankN] = {};
        var presets = soundFont[bankN];
        for (var presetN in presets) {
            flatFont[bankN][presetN] = [];
            var preset = presets[presetN];
            for (var presetInstrument of preset.instruments) {
                var sampleByName: {[name: string]: IInstrumentSample} = {};
                for (var instrumentSample of presetInstrument.info.samples) {
                    instrumentSample.info.sampleName = cleanText(instrumentSample.info.sampleName);
                    var name = instrumentSample.info.sampleName;
                    sampleByName[name] = sampleByName[name] || {
                        sampleNumber: instrumentSample.sampleNumber,
                        info: instrumentSample.info,
                        generators: [],
                    };
                    for (var iGen of presetInstrument.generators) {
                        for (var sGen of instrumentSample.generators) {
                            sampleByName[name].generators.push(combineGenerators(
                                updateGenerator(preset.generatorApplyToAll || {}, iGen),
                                updateGenerator(presetInstrument.info.generatorApplyToAll, sGen)
                            ));
                        }
                    }
                }

                for (var name in sampleByName) {
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
export var ParseSoundFontFile = function(sf2Buf: ArrayBuffer): [IFlatSoundFont, [Int16Array, ISampleInfo][]]
{
    var view = new Uint8Array(sf2Buf);

    var parser = new sf2.Parser(view);
    parser.parse();

    /** @debug */
    console.log(parser);

    var sampleBuffers = parser.sample.map((d,i) => [d, parser.sampleHeader[i]]);
    delete (<any>parser).sample; // wav files, i usually extract them with a separate soft

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
declare var sf2: {
    Parser: {
        prototype: ISf2Parser,
        new (sf2Data: Uint8Array): ISf2Parser,
    },
};