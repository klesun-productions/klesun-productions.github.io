
export enum NoteValue {
    NONE = "0", // No note
    TAP = "1", // Normal note
    HOLD_HEAD = "2", // Hold head
    TAIL = "3", // Hold/Roll tail
    ROLL_HEAD = "4", // Roll head
    MINE = "M", // Mine (or other negative note)
    // in newer StepMania versions:
    KEYSOUND = "K", // Automatic keysound
    LIFT = "L", // Lift note
    FAKE = "F", // Fake note
}

export type MeasureDivision = (NoteValue | string)[];

export type Measure = MeasureDivision[];

//---------------dance-couple - ----------------
// #NOTES:
//      dance-couple:
//      :
//      Hard:
//      6:
//      0.728,0.754,1.000,0.000,0.034:

export type Chart = {
    STEPSTYPE: "dance-single" | "dance-solo" | "dance-double" | "dance-couple" | string,
    DESCRIPTION: string,
    DIFFICULTY: "Beginner" | "Easy" | "Medium" | "Hard" | "Challenge" | "Edit" | string,
    METER: number,
    RADARVALUES: number[],
    MEASURES: Measure[],
};

export type YaSmParsed = {
    BPMS: { beat: number, bpm: number }[], // 0.000=100.00;
    MUSIC: string, // ;
    TITLE?: string, // ;
    SUBTITLE?: string, // ;
    ARTIST?: string, // ;
    TITLETRANSLIT?: string, // ;
    SUBTITLETRANSLIT?: string, // ;
    ARTISTTRANSLIT?: string, // ;
    CREDIT?: string, // ;
    BANNER?: string, // ;
    BACKGROUND?: string, // ;
    LYRICSPATH?: string, // ;
    CDTITLE?: string, // ;
    OFFSET?: number, // 0.000;
    SAMPLESTART?: number, // 0.000;
    SAMPLELENGTH?: number, // 0.000;
    SELECTABLE?: boolean, // YES;
    STOPS?: { beat: number, seconds: number }[], // ;
    BGCHANGES?: string, // ;
    NOTES: Chart[],
    [k: string]: unknown,
};

export class YaSmParserError extends Error {
    constructor(
        detailsMessage: string,
        public readonly offset: number,
        public readonly parsed: YaSmParsed
    ) {
        super("Unexpected token at offset #" + offset + ". " + detailsMessage);
    }
}

/**
 * @see https://github.com/stepmania/stepmania/wiki/sm
 *
 * if implementation will end up harder than I anticipate, should either port or
 * call via server API the https://simfile.readthedocs.io/en/latest/index.html
 */
export function YaSmParser(smText: string): YaSmParsed {
    let offset = 0;
    const parsed: YaSmParsed = {
        BPMS: [], MUSIC: "", NOTES: [],
    };

    function trimStart() {
        let trimDone = false;
        while (!trimDone) {
            const oldOffset = offset;
            const asWhitespace = smText.slice(offset).match(/^\s+/);
            if (asWhitespace) {
                offset += asWhitespace[0].length;
            }
            const asComment = smText.slice(offset).match(/^\/\/.*[\n\r]+/);
            if (asComment) {
                offset += asComment[0].length;
            }
            trimDone = oldOffset === offset;
        }
    }

    function makeError(detailsMessage: string) {
        return new YaSmParserError(detailsMessage, offset, parsed);
    }

    while (offset < smText.length) {
        trimStart();
        const asHeader = smText.slice(offset).match(/^#\s*([^:]*?)\s*:\s*([^;]*?)\s*;/);
        if (asHeader && asHeader[1] !== "NOTES") {
            const [, keyUntyped, value] = asHeader;
            const key = keyUntyped as keyof YaSmParsed;
            if (key === "BPMS") {
                parsed.BPMS = value.split(/\s*,\s*/g).map(update => {
                    const [beat, bpm] = update.split("=");
                    return {
                        beat: Number(beat),
                        bpm: Number(bpm),
                    };
                });
            } else if (key === "STOPS") {
                parsed.STOPS = value.split(/\s*,\s*/g).map(update => {
                    const [beat, seconds] = update.split("=");
                    return {
                        beat: Number(beat),
                        seconds: Number(seconds),
                    };
                });
            } else if (key === "OFFSET") {
                parsed.OFFSET = Number(value);
            } else if (key === "SAMPLESTART") {
                parsed.SAMPLESTART = Number(value);
            } else if (key === "SAMPLELENGTH") {
                parsed.SAMPLELENGTH = Number(value);
            } else if (key === "SELECTABLE") {
                parsed.SELECTABLE = value === "YES" ? true : value === "NO" ? false : undefined;
            } else {
                parsed[key] = value;
            }
            offset += asHeader[0].length;
        } else {
            break;
        }
    }

    while (offset < smText.length) {
        trimStart();
        const expectedHeader = "#NOTES:";
        const actualHeader = smText.slice(offset, offset + expectedHeader.length);
        if (actualHeader !== expectedHeader) {
            const message = "Expected \"#NOTES:\", but got \"" + actualHeader + "\"";
            throw makeError(message);
        }
        offset += actualHeader.length;

        const values: string[] = [];
        while (offset < smText.length && values.length < 5) {
            trimStart();
            const asValue = smText.slice(offset).match(/^([^:]*?)\s*:/);
            if (asValue) {
                values.push(asValue[1]);
                offset += asValue[0].length;
            } else {
                break;
            }
        }

        const [
            STEPSTYPE,
            DESCRIPTION,
            DIFFICULTY,
            METER,
            RADARVALUES,
        ] = values;

        const chart: Chart = {
            STEPSTYPE,
            DESCRIPTION,
            DIFFICULTY,
            METER: Number(METER || "0"),
            RADARVALUES: !RADARVALUES ? [] : RADARVALUES.split(",").map(v => Number(v)),
            MEASURES: [],
        };
        parsed.NOTES.push(chart);

        while (offset < smText.length) {
            trimStart();
            const asMeasureBlock = smText.slice(offset).match(/^([^,;]*?)\s*([,;])/);
            if (asMeasureBlock) {
                const [wholeText, notesBlock, terminator] = asMeasureBlock;
                chart.MEASURES.push(
                    notesBlock.split(/[\s\n]+/g)
                        .map(line => line.split("").map(c => c))
                );
                offset += wholeText.length;
                if (terminator === ";") {
                    break;
                }
            } else {
                const message = "Expected notes block terminated by a \",\" or \";\", but got EoF";
                throw makeError(message);
            }
        }
        trimStart();
    }

    return parsed;
}