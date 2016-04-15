
/// <reference path="../../libs/jqueryTyped/jquery.d.ts" />

var Ns:any = Ns || {};
// TODO: Util is too long
var Util:any = Util || {};

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

/** @param chunkSize - count of elements that will be foreached in one iteration
 * @param breakMillis - break duration between iterations */
Ns.forChunk = function<Tx>(list: Tx[], breakMillis: number, chunkSize: number, callback: { ($el: Tx): void })
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
Util.forEachBreak = Ns.forChunk;

/** @params l - left index inclusive, r - right index exclusive */
Ns.range = (l: number, r: number): Array<number> => Array.apply(null, Array(r - l))
    .map((nop: void, i: number) => l + i);

Util.range = Ns.range;

class Fraction {
    constructor (
        public num: number,
        public den: number
    ) {}

    float = () => this.num / this.den;
    apacheStr = () => this.num + ' / ' + this.den;
}

Ns.selectFileFromDisc = function(whenLoaded: { (data: any): void }): void
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

    var input = <HTMLInputElement>$('<input type="file"/>')[0];
    input.onchange = (inputEvent: Event) => loadSelectedFile(input.files[0], whenLoaded);
    $(input).click();
};

Ns.synthPresets = [
    50, 51, 84,
];

Ns.channelColors = [
    [0,0,0], // black
    [192,0,0], // red
    [0,148,0], // green
    [60,60,255], // blue
    [152,152,0], // yellow
    [0,152,152], // cyan
    [192,0,192], // magenta
    [255,128,0], // orange
    [91,0,255], // bluish magenta

    [0,255,255], // TODO: !!!
    [127,255,0], // TODO: !!!
    [255,0,255], // TODO: !!!
    [0,255,0], // TODO: !!!
    [0,255,0], // TODO: !!!
    [0,255,0], // TODO: !!!
    [0,255,0] // TODO: !!!
];

Ns.instrumentNames = ["Acoustic Grand Piano","Bright Acoustic Piano","Electric Grand Piano",
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

Util.channelColors = Ns.channelColors;

Ns.extend = function<Tx>(oldDict: Tx, newDict: Tx)
{
    return $.extend({}, oldDict, newDict);
};