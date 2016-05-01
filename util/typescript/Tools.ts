
/// <reference path="../../libs/jqueryTyped/jquery.d.ts" />

import {ISMFreaded} from "./DataStructures";

declare var Ns: any;
Ns.Static = Ns.Static || {};

// some usefull shorthand methods

class Optional<T>
{
    constructor(private isPresent: boolean, private value?: T) {}

    static of<T>(value: T): Optional<T>
    {
        return new Optional(true, value);
    }

    static no<T>(): Optional<T>
    {
        return new Optional(false, null);
    }

    get = () => this.value;
    has = () => this.isPresent;
}

// defined in /libs/FileSaver.js
declare var saveAs: any;

export class Kl
{
    static for = <Tx>(dict: {[k: string]: Tx}, callback: { (k: string, v: Tx): void }) =>
        Object.keys(dict).forEach(k => callback(k, dict[k]));

    static fori = <Tx>(dict: {[k: number]: Tx}, callback: { (k: number, v: Tx): void }) =>
        Object.keys(dict).forEach(k => callback(+k, dict[+k]));

    /** @params l - left index inclusive, r - right index exclusive */
    static range = (l: number, r: number): Array<number> => Array.apply(null, Array(r - l))
        .map((nop: void, i: number) => l + i);

    static selectFileFromDisc = function(whenLoaded: { (dataBase64: string): void }): void
    {
        var loadSelectedFile = function (fileInfo: File, whenLoaded: { (data: any): void }): void
        {
            var maxSize = 2 * 1024 * 1024; // 2 mebibytes

            if (fileInfo.size < maxSize) {
                var reader = new FileReader();
                reader.readAsDataURL(fileInfo);
                reader.onload = (e: any) => whenLoaded(e.target.result.split(',')[1]);
            } else {
                alert('too big file, more than 2 MiB!');
            }
        };

        var input = Ns.Static.FILE_INPUT = Ns.Static.FILE_INPUT || <HTMLInputElement>$('<input type="file"/>')[0];
        input.onchange = (inputEvent: Event) => loadSelectedFile(input.files[0], whenLoaded);
        input.onclick = (inputEvent: Event) => { input.value = null; };
        $(input).click();
    };

    static openMidi = function(whenLoaded: { (midi: ISMFreaded): void })
    {
        /** @debug */
        console.log('huj', Ns);

        Kl.selectFileFromDisc(db64 =>
            whenLoaded(
            Ns.Libs.SMFreader(
            Kl._base64ToArrayBuffer(db64))));
    };

    // http://stackoverflow.com/a/21797381/2750743
    private static _base64ToArrayBuffer = function(base64: string): ArrayBuffer
    {
        var binary_string =  atob(base64);

        return new Uint8Array(binary_string.length)
            .fill(0)
            .map((_, i) => binary_string.charCodeAt(i))
            .buffer;
    };

    static saveToDisc = function(content: string): void
    {
        var blob = new Blob([content], {type: "text/plain;charset=utf-8"});
        saveAs(blob, 'song.mid.js', true);
    };

    /** @param chunkSize - count of elements that will be foreached in one iteration
     * @param breakMillis - break duration between iterations */
    static forChunk = <Tx>(list: Tx[], breakMillis: number, chunkSize: number, callback: { ($el: Tx): void }) =>
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
    };

    static promptSelect = function(options: {[k: string]: {(): void}}, message?: string): void
    {
        message = message || 'It*s Time To Choose!';

        var $select = $('<select></select>')
            .attr('multiple', 'multiple');
        Kl.for(options, (n,_) =>
            $select.append($('<option></option>').val(n).html(n)));

        var $dialog = $('<div></div>')
            .append(message).append('<br/>')
            .append($select.change(() => {
                $select.val() in options
                    ? options[$select.val()]()
                    : alert('System Failure, Unknown Option Selected: ' + $select.val())
                $dialog.remove();
            }));

        $dialog.css({
            position: 'absolute',
            left: '40%',
            top: '40%',
            width: '20%',
            heigh: '20%',
            'background-color': 'lightgrey',
            'z-index': 1002,
        });

        $('body').prepend($dialog);
    };

    // TODO: sync somehow with .channelColors CSS
    static channelColors: [number,number,number][] = [
        [0,0,0], // black
        [192,0,0], // red
        [0,148,0], // green
        [60,60,255], // blue
        [152,152,0], // yellow
        [0,152,152], // cyan
        [192,0,192], // magenta
        [255,128,0], // orange
        [91,0,255], // bluish magenta

        [128,128,128], // drum
        [127,255,0], // TODO: !!!
        [255,0,255], // TODO: !!!
        [0,255,0], // TODO: !!!
        [0,255,0], // TODO: !!!
        [0,255,0], // TODO: !!!
        [0,255,0] // TODO: !!!
    ];

    // here is exactly 128 preset names in correct order
    static instrumentNames: string[] = ["Acoustic Grand Piano","Bright Acoustic Piano","Electric Grand Piano",
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
        "Cymbal","Fret","122 Breath Noise","Seashore","Bird Tweet","Telephone Ring","Helicopter","Applause","Gunshot"];
}

export class Fraction {
    constructor (
        public num: number,
        public den: number
    ) {}

    float = () => this.num / this.den;
    apacheStr = () => this.num + ' / ' + this.den;
}