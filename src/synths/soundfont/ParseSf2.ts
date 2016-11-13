
import {IPreset, IInstrument, EStereoPan} from "../SoundFontAdapter";
import {Tls} from "../../utils/Tls";

var popKey = (obj: any, key: string) => {
    var tmp = obj[key];
    delete obj[key];
    return tmp;
};

/**
 * wraps call to sf2parser
 * @see https://github.com/colinbdclark/sf2-parser
 * and transforms the output to more usable structure
 *
 * @param sf2Buf - bytes of an .sf2 file
 */
export var ParseSoundFontFile = function(sf2Buf: ArrayBuffer): IPreset[]
{
    var itemsToMap = (items: IItem[]) => new Map(items.map(p => <any>[
        p.type,
        p.value.amount !== undefined
            ? p.value.amount
            : p.value
    ]));

    var getInstrumentInfo = function(root: ISf2Parser, instr_idx: number): IInstrument
    {
        var instrumentName = root.instrument[instr_idx].instrumentName;
        var zone_start_idx = root.instrument[instr_idx].instrumentBagIndex;
        var result: IInstrument = {
            instrumentName: instrumentName,
            samples: [],
            generator: null,
            generatorApplyToAll: null,
        };

        var zone_end_idx = instr_idx + 1 < root.instrument.length
            ? root.instrument[instr_idx + 1].instrumentBagIndex
            : root.instrumentZone.length;

        for (var zone_idx = zone_start_idx; zone_idx < zone_end_idx; ++zone_idx) {
            var gen_start_idx = root.instrumentZone[zone_idx].instrumentGeneratorIndex;
            var gen_end_idx = zone_idx + 1 < root['instrumentZone'].length
                ? root.instrumentZone[zone_idx + 1].instrumentGeneratorIndex
                : root.instrumentZoneGenerator.length;

            var items = Tls.range(gen_start_idx, gen_end_idx)
                .map(idx => root.instrumentZoneGenerator[idx]);
            var properties = itemsToMap(items);

            if (zone_idx == zone_start_idx) {
                result.generatorApplyToAll = properties;
            } else {
                var sample_idx = <number>properties.get('sampleID');
                var sample = JSON.parse(JSON.stringify(root.sampleHeader[sample_idx]));
                sample.generator = properties;
                result.samples.push(sample);
            }
        }

        return result;
    };

    var transform = function(root: ISf2Parser): IPreset[]
    {
        var presets: IPreset[] = [];

        for (var pres_idx = 0; pres_idx < root.presetHeader.length; ++pres_idx) {
            var pres: IPreset = JSON.parse(JSON.stringify(root['presetHeader'][pres_idx]));
            var pzone_start_idx = popKey(pres, 'presetBagIndex');
            var pzone_end_idx = pres_idx + 1 < root.presetHeader.length
                ? root.presetHeader[pres_idx + 1].presetBagIndex
                : root.presetZone.length; // -1 ?

            for (var pzone_idx = pzone_start_idx; pzone_idx < pzone_end_idx; ++pzone_idx) {
                var gen_start_idx = root.presetZone[pzone_idx].presetGeneratorIndex;
                var gen_end_idx = pzone_idx + 1 < root.presetZone.length
                    ? root.presetZone[pzone_idx + 1].presetGeneratorIndex
                    : root.presetZoneGenerator.length;

                // i don't really understand what these presets are needed for yet
                // but likely, it's to have different modifiers for different velocity,
                // what sux anyway, cuz most time there is just a linear difference in "Vol env release"
                var items = Tls.range(gen_start_idx, gen_end_idx)
                    .map(idx => root.presetZoneGenerator[idx]);
                var state_props = itemsToMap(items);

                if (pzone_idx === pzone_start_idx && !state_props.has('instrument')) {
                    pres.generatorApplyToAll = state_props
                } else {
                    var instr_idx = <number>state_props.get('instrument');
                    pres.instrument = getInstrumentInfo(root, instr_idx);
                    pres.instrument.generator = state_props;
                }
            }

            presets.push(pres)
        }

        presets.sort((a,b) => a.bank * 128 + a.preset - b.bank * 128 - b.preset);

        return presets
    };

    var view = new Uint8Array(sf2Buf);

    var parser = new sf2.Parser(view);
    parser.parse();

    delete (<any>parser).sample; // wav files, i usually extract them with a separate soft

    return transform(parser);
};

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

    sampleHeader: Array<{
        sampleName: string, // snake-case name
        startLoop: number, // sampling index where the loop starts
        endLoop: number, // sampling index where the loop ends
        sampleRate: number, // samplings per second
        originalPitch: number, // defines the sample pitch if not overridden by "overridingRootKey"
                              // generator. 69 is 440 Hz LA; 67 is SOL and so on
        sampleLink: number, // this is an index of another sample that will be played together with this
                            // used when there are two separate samples for left and right stereo pan
        sampleType: EStereoPan,

        pitchCorrection: number, // idk
    }>,
}

// lib required
declare var sf2: {
    Parser: {
        prototype: ISf2Parser,
        new (sf2Data: Uint8Array): ISf2Parser,
    },
};