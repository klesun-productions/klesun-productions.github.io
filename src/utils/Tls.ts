/// <reference path="../references.ts" />

import {IGeneralStructure} from "../DataStructures";
import {DecodeMidi} from "../player/DecodeMidi";
import {Cls} from "../Cls";

var Static: any = {};

// some useful shorthand methods

class Optional<T>
{
    constructor(private isPresent: boolean, private value?: T | null) {}

    static of<T>(value: T): Optional<T>
    {
        return new Optional(true, value);
    }

    static no<T>(): Optional<T | null>
    {
        return new Optional(false, null);
    }

    get = () => this.value;
    has = () => this.isPresent;
}

// defined in /libs/FileSaver.js
declare var saveAs: any;

// for asynchronous buffer retrieval
var cachedSampleBuffers: { [url: string]: AudioBuffer; } = {};
var awaiting: { [url: string]: Array<{ (resp: AudioBuffer): void }> } = {};

const toDict = <Tv>(pairs: [string,Tv][]): {[k: string]: Tv} => {
    var result: {[k: string]: Tv} = {};
    pairs.forEach(p => result[p[0]] = p[1]);
    return result;
};

const range = (l: number, r: number): Array<number> =>
    Array.apply(null, Array(r - l)).map((nop: void, i: number) => l + i);

// firefox fails - TODO: investigate
var cssReflection: {[selector: string]: {[name: string]: string}};
try {
    cssReflection =
        <any>toDict(<any>[].concat.apply([], Array.from(document.styleSheets).map(css => Array.from(css.rules)))
            .map((r: any) => [r.selectorText, toDict(Array.from(r.style)
                .map((name: string) => <any>[name, r.style[name]]))]));
} catch (e) {
    console.log('Failed to get CSS reflection', e);
    cssReflection = {};
}

const parseRgbCss = function(rgbCss: string): [number, number, number]
{
    // TODO: also parse rgba(), #FDE, #FFDDEE

    var result = /rgb\((\d+), *(\d+), *(\d+)\)/
        .exec(rgbCss)
        .slice(1);

    return <any>result;
};

let fetchFile = function(url: string, responseType: 'arraybuffer' | 'json' | 'text', whenLoaded: { (buf: any): void })
{
    var oReq = new XMLHttpRequest();
    oReq.open("GET", url, true);
    oReq.responseType = responseType;
    oReq.onload = () => whenLoaded(oReq.response);
    oReq.send(null);
};

// http://stackoverflow.com/a/21797381/2750743
let _base64ToArrayBuffer = function(base64: string): ArrayBuffer
{
    var binary_string =  atob(base64);

    return new Uint8Array(binary_string.length)
        .fill(0)
        .map((_, i) => binary_string.charCodeAt(i))
        .buffer;
};

/** json-encodes "data" in such indent format that attributes are not line-broken */
let xmlyJson = function($var: any, $margin?: string): string
{
    var ind = '    ';
    $margin = $margin || '';

    return Array.isArray($var) ? '[\n'
            + $var.map((el: any) => $margin + ind + xmlyJson(el, $margin + ind)).join(',\n')
            + '\n' + $margin + ']'
        : (typeof $var === 'object' && $var !== null) ? '{'
            + Object.keys($var).map(k => JSON.stringify(k) + ': ' + xmlyJson($var[k], $margin)).join(', ')
            + '}'
        : JSON.stringify($var);
};

let list = function<Tel>(elmts: Tel[])
{
    return {
        // get elmts() {
        //     return elmts;
        // },
        clear: () => {
            var tmp = elmts;
            elmts = [];
            return tmp;
        },
        set more(v: Tel) {
            elmts.push(v);
        },
        set forEach(cb: (el: Tel) => void) {
            elmts.forEach(cb);
        },
        /** perform async operations on every element one by one */
        set sequence(cb: (el: Tel, i: number) => {then: (r: any) => void}) {
            let i = 0;
            let next = () => {
                if (i < elmts.length) {
                    cb(elmts[i], i++).then = next;
                }
            };
            next();
        },
        get s() {
            return elmts;
        },
    };
};

let showDialog = function(msg: string, content?: HTMLElement)
{
    content = content || $('<div>Just a message</div>')[0];

    var $dialog = $('<div class="modalDialog"></div>')
        .append(msg).append('<br/>').append(content)
        .append($('<button>Cancel</button>').click(() => { $dialog.remove(); }));

    // TODO: escape - cancel
    $('body').prepend($dialog);

    return () => $dialog.remove();
};

let showMultiInputDialog = function<T>(msg: string, initialData: T)
{
    let result = {then: (changedData: T) => {}};
    let inputs = Object.keys(initialData).map(k => 1 && {
        key: k,
        val: $('<input type="text"/>')
            .val((<any>initialData)[k])[0]
    });

    let ok = () => {
        Tls.list(inputs).forEach = pair =>
            (<any>initialData)[pair.key] = $(pair.val).val();
        result.then(initialData);
    };

    let close = showDialog(msg, $('<div class="key-values"/>')
        .append(inputs.map(i => [i.key + ': ', i.val, '<br/>'])
            .reduce((a,b) => a.concat(b))
            .concat([$('<button>Ok</button>')
                .click(() => { ok(); close(); })
                [0]]))
        [0]);

    return result;
};

export let Tls = Cls['Tls'] = {

    audioCtx: new AudioContext(),
    
    for: <Tx>(dict: {[k: string]: Tx}, callback: { (k: string, v: Tx): void }) =>
        Object.keys(dict).forEach(k => callback(k, dict[k])),

    /** @params l - left index inclusive, r - right index exclusive */
    range: range,

    /** transforms array of [key, value] tuples into a dict */
    toDict: toDict,
    dict: function<Tv>(obj: {[key: string]: Tv}) {

    },

    /** transforms object keyed by number to a list */
    digt: <Tv>(obj: {[key: number]: Tv}) => {
        let result: Tv[] = [];
        for (let k of Object.keys(obj)) {
            result[+k] = obj[+k];
        }
        return list(result);
    },

    /** transforms key-value pair tuples to a dict */
    ditu: <Tv>(pairs: {key: number, val: Tv}[]) => {
        let result = [];
        for (let pair of pairs) {
            result[pair.key] = pair.val;
        }
        return result;
    },

    map: <Tx, Ty>(val: Tx, f: (v: Tx) => Ty) => val && f(val),

    /** transforms array of [key, value] tuples into a dict */
    dicti: <Tv>(pairs: [number,Tv][]): {[k: number]: Tv} => {
        var result: {[k: number]: Tv} = {};
        pairs.forEach(p => result[p[0]] = p[1]);
        return result;
    },

    fori: <Tx>(dict: {[k: number]: Tx}, callback: { (k: number, v: Tx): void }) =>
        Object.keys(dict).forEach(k => callback(+k, dict[+k])),

    mapi: <Tx, Ty>(dict: {[k: number]: Tx}, callback: (v: Tx, k: number) => Ty) =>
        Object.keys(dict).map(k => callback(dict[+k], +k)),

    selectFileFromDisc: function(whenLoaded: { (dataBase64: string): void }): void
    {
        var loadSelectedFile = function (fileInfo: File, whenLoaded: { (data: any): void }): void
        {
            var maxSize = 2 * 1024 * 1024; // 2 mebibytes

            if (fileInfo.size < maxSize ||
                confirm('File is very large, ' + (fileInfo.size / 1024 / 1024).toFixed(2) + ' MiB . Are you sure?')
            ) {
                // TODO: chunk when file is 200+ MiB

                var reader = new FileReader();
                reader.readAsDataURL(fileInfo);
                reader.onload = (e: any) => {
                    /** @debug */
                    console.log('lodaded base64 from file system: ', e.target.result.length);
                    whenLoaded(e.target.result.split(',')[1]);
                }
            } else {
                alert('too big file, more than 2 MiB!');
            }
        };

        var input = Static.FILE_INPUT = Static.FILE_INPUT || <HTMLInputElement>$('<input type="file"/>')[0];
        input.onchange = (inputEvent: Event) => loadSelectedFile(input.files[0], whenLoaded);
        input.onclick = (inputEvent: Event) => { input.value = null; };
        $(input).click();
    },

    fetchFile: fetchFile,

    fetchBinaryFile: (url: string, whenLoaded: (buf: ArrayBuffer) => void) =>
        fetchFile(url, 'arraybuffer', whenLoaded),
    
    fetchJson: (url: string, whenLoaded: (parsedJson: {[k: string]: any}) => void) =>
        fetchFile(url, 'json', whenLoaded),

    fetchMidi: (url: string, whenLoaded: { (midi: IGeneralStructure): void }) =>
        Tls.fetchBinaryFile(url, buf =>
            whenLoaded(DecodeMidi(buf))),

    openByteBuffer: (whenLoaded: (byteBuffer: ArrayBuffer) => void) =>
        Tls.selectFileFromDisc(db64 =>
            whenLoaded(_base64ToArrayBuffer(db64))),

    openMidi: (whenLoaded: { (midi: IGeneralStructure): void }) =>
        Tls.openByteBuffer(byteBuffer =>
            whenLoaded(DecodeMidi(byteBuffer))),

    getAudioBuffer: function(url: string, onOk: { (resp: AudioBuffer): void }): void
    {
        if (!(url in cachedSampleBuffers)) {
            if (awaiting[url]) {
                awaiting[url].push(onOk);
            } else {
                awaiting[url] = [onOk];
                Tls.fetchBinaryFile(url, (resp) => Tls.audioCtx.decodeAudioData(resp, (decoded) => {
                    awaiting[url].forEach(a => a(decoded));
                    awaiting[url] = [];
                    cachedSampleBuffers[url] = decoded;
                }));
            }
        } else {
            onOk(cachedSampleBuffers[url]);
        }
    },

    saveJsonToDisc: function(content: string): void
    {
        var blob = new Blob([content], {type: "text/json;charset=utf-8"});
        saveAs(blob, 'song.mid.json', true);
    },

    saveMidiToDisc: function(content: ArrayBuffer): void
    {
        var blob = new Blob([content], {type: "midi/binary"});
        saveAs(blob, 'song.mid', true);
    },

    /** @param chunkSize - count of elements that will be foreached in one iteration
     * @param breakMillis - break duration between iterations */
    forChunk: <Tx>(list: Tx[], breakMillis: number, chunkSize: number, callback: { ($el: Tx): void }) =>
    {
        var interrupted = false;

        var doNext = function(index: number)
        {
            if (index < list.length && !interrupted) {
                for (var i = index; i < Math.min(list.length, index + chunkSize); ++i) {
                    callback(list[i]);
                }
                setTimeout(() => doNext(index + chunkSize), breakMillis);
            }
        };

        doNext(0);

        var interrupt = () => (interrupted = true);

        return interrupt;
    },

    showDialog: showDialog,
    showMultiInputDialog: showMultiInputDialog,

    showInputDialog: function<T>(msg: string, value?: T | null)
    {
        value = value === undefined ? null : value;

        let result = {then: (field: T | null) => {}};
        showMultiInputDialog(msg, {value: value})
            .then = (fields) => result.then(fields.value);
        return result;
    },

    promptAssync: function(msg: string, cb: (txt: string) => void)
    {
        let $input = $('<input type="password"/>');
        let closeDialog = showDialog(msg, $('<div></div>')
            .append($input)
            .append($('<button>Ok</button>').click(() => {
                cb($input.val());
                closeDialog();
            }))[0]);

        // TODO: enter from input - submit
        // TODO: initial focus
    },

    showError: (msg: string) => {
        let closeDialog = showDialog(msg);
        setTimeout(closeDialog, 15000);
    },

    promptSelect: function(options: {[k: string]: {(): void}}, message?: string): void
    {
        message = message || 'It*s Time To Choose!';

        var $select = $('<select></select>')
            .attr('multiple', 'multiple');
        Tls.for(options, (n, _) =>
            $select.append($('<option></option>').val(n).html(n)));

        var $dialog = $('<div class="modalDialog"></div>')
            .append(message).append('<br/>')
            .append($select.change(() => {
                $select.val() in options
                    ? options[$select.val()]()
                    : alert('System Failure, Unknown Option Selected: ' + $select.val())
                $dialog.remove();
            }));

        $('body').prepend($dialog);
    },

    xmlyJson: xmlyJson,

    list: list,
    cbList: (v: {(): void}[]) => list(v),
    timeout: (seconds: number) => 1 && {
        set set(cb: () => void) {
            setTimeout(cb, seconds * 1000);
        },
    },

    channelColors: range(0,16).map((ch): [number, number, number] => {
        let selector = '.channelColors [data-channel="' + ch + '"]';
        let colorStr = (cssReflection[selector] || {})['color'] || null;
        return colorStr ? parseRgbCss(colorStr) : <any>range(0,3).map(_ => Math.random() * 256 | 0);
    }),

    // here is exactly 128 preset names in correct order
    instrumentNames: ["Acoustic Grand Piano","Bright Acoustic Piano","Electric Grand Piano",
        "Honky-tonk Piano","Electric Piano","6 Electric Piano 2","Harpsichord","Clavinet","Celesta",
        "Glockenspiel","Music Box","Vibraphone","Marimba","Xylophone","Tubular Bells","Dulcimer",
        "Drawbar Organ","Percussive Organ","Rock Organ","Church Organ","Reed Organ","Accordion",
        "Harmonica","Tango Accordion","Acoustic Guitar (nylon)","Acoustic Guitar (steel)",
        "Electric Guitar (jazz)","Electric Guitar (clean)","Electric Guitar (muted)","Overdriven Guitar",
        "Distortion Guitar","Guitar Harmonics","Acoustic Bass","Electric Bass (finger)","Electric Bass (pick)",
        "Fretless Bass","Slap Bass 1","38 Slap Bass 2","Synth Bass 1","40 Synth Bass 2","Violin","Viola",
        "Cello","Contrabass","Tremolo","Pizzicato","Orchestral Harp","Timpani","String Ensemble 1",
        "50 String Ensemble 2","Synth","52 Synth Strings 2","Choir","Voice","55 Synth Choir","Orchestra Hit",
        "Trumpet","Trombone","Tuba","Muted Trumpet","French Horn","Brass Section","63 Synth Brass 1",
        "64 Synth Brass 2","Soprano Sax","Alto Sax","Tenor Sax","Baritone Sax","Oboe","English Horn",
        "Bassoon","Clarinet","Piccolo","Flute","Recorder","Pan Flute","Blown bottle","Shakuhachi","Whistle",
        "Ocarina","Lead 1","sawtooth","calliope","84 Lead 4 chiff","charang","86 Lead 6 (voice)","fifths",
        "88 Lead 8 (bass + lead)","89 Pad 1 (new age)","90 Pad 2 (warm)","polysynth","92 Pad 4 (choir)",
        "93 Pad 5 (bowed)","94 Pad 6 (metallic)","95 Pad 7 (halo)","96 Pad 8 (sweep)","FX",
        "98 FX 2 (soundtrack)","99 FX 3 (crystal)","100 FX 4 (atmosphere)","101 FX 5 (brightness)","goblins",
        "echoes","104 FX 8 (sci-fi)","Sitar","Banjo","Shamisen","Koto","Kalimba","Bagpipe","Fiddle","Shanai",
        "113 Tinkle Bell","Agogo","Steel Drums","Woodblock","Taiko Drum","Melodic Tom","119 Synth Drum",
        "Cymbal","Fret","122 Breath Noise","Seashore","Bird Tweet","Telephone Ring","Helicopter","Applause","Gunshot"],
};

export var Fraction = function(num: number, den: number): IFraction {
    return {
        num: () => num,
        den: () => den,
        float: () => num / den,
        apacheStr: () => num + ' / ' + den,
    };
};

export let Opt = function<T>(value: T)
{
    return {
        map: <T2>(f: (arg: T) => T2): IOpt<T2> =>
            value !== null &&
            value !== undefined
                ? Opt(f(value))
                : Opt(null),

        def: (def: T): T =>
            value !== null &&
            value !== undefined
                ? value
                : def,

        has: () =>
            value !== null &&
            value !== undefined,
    };
};

interface IOpt<T> {
    map: <T2>(f: (arg: T) => T2) => IOpt<T2>,
    def: (def: T) => T,
    has: () => boolean,
}

export interface IFraction {
    num: () => number,
    den: () => number,
    float: () => number,
    apacheStr: () => string,
}