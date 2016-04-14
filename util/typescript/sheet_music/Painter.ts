
/// <reference path="../references.ts" />

var Ns = Ns || {};

Ns.TactMeasurer = function(tactSize: number)
{
    var sumFraction = 0;
    var tactNumber = 0;

    var inject = function(chordLength: number)
    {
        sumFraction += chordLength;

        var finishedTact = false;
        while (+sumFraction.toFixed(8) >= tactSize) {
            sumFraction -= tactSize;
            finishedTact = true;
            ++tactNumber;
        }

        return finishedTact;
    };

    return {
        inject: inject,
        hasRest: () => +sumFraction.toFixed(8) > 0,
        tactNumber: () => tactNumber,
        getRest: () => sumFraction
    };
};

/** @param R - semibreve note oval vertical radius */
Ns.CanvasProvider = function(R: number): ICanvasProvider
{
    var DX = R * 5; // half of chord span width
    var Y_STEPS_PER_SYSTEM = 40;
    var NOTE_CANVAS_HEIGHT = R * 9;

    // tuple: 16 channels, ~14 lengths each (6 (1/32 .. 1/1) * 2 (triplets) * 2 (dots))
    var noteCanvasCache: Array<{ [lenFra: string]: HTMLCanvasElement }> = [
        {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}
    ];
    // tuple: 16 channels
    var flatSignCache: HTMLCanvasElement[] = [];

    var getNoteImage = function(length: number, channel: number): HTMLCanvasElement
    {
        // well, hack, but...
        var lengthStr = typeof length === 'number'
            ? Shmidusicator.guessLength(length).apacheStr()
            : length;

        if (!noteCanvasCache[channel][lengthStr]) {
            noteCanvasCache[channel][lengthStr] = <HTMLCanvasElement>$('<canvas></canvas>canvas>')
                .attr('width', DX * 2)
                .attr('height', NOTE_CANVAS_HEIGHT + R)
                [0];

            Ns.ShapeProvider(noteCanvasCache[channel][lengthStr].getContext('2d'), R, DX, NOTE_CANVAS_HEIGHT / R - 1)
                .drawNote(channel, lengthStr);
        }

        return noteCanvasCache[channel][lengthStr];
    };

    var makeNoteCanvas = function(note: IShNote): HTMLCanvasElement
    {
        var isEbony = [1,3,6,8,10].indexOf(note.tune % 12) > -1;
        var ivoryIndex = !isEbony
            ? [0,2,4,5,7,9,11].indexOf(note.tune % 12)
            : [0,2,4,5,7,9,11].indexOf(note.tune % 12 + 1); // treating all as flats for now - ignoring file key signature
        var octave = Math.floor(note.tune / 12);

        var shift = 56 - ivoryIndex - octave * 7; // 56 - some number that divides by 7

        var noteCanvas = <HTMLCanvasElement>$('<canvas class="noteCanvas"></canvas>')
            .attr('width', DX * 2)
            .attr('height', NOTE_CANVAS_HEIGHT + R)
            .css('top', shift * R - NOTE_CANVAS_HEIGHT + 1 * R)
            .attr('data-tune', note.tune)
            .attr('data-channel', note.channel)
            .attr('data-length', note.length)
            [0]
            ;

        var ctx = noteCanvas.getContext('2d');

        ctx.drawImage(getNoteImage(note.length, note.channel), 0, 0);

        if (isEbony) {
            /** @TODO: here lies a bug - all cached flats have same color, black, since you don't change it while drawing
             * it is pretty nice, though. maybe could make flat sign color a bit darker, than note color? */
            if (!flatSignCache[note.channel]) {
                flatSignCache[note.channel] = <HTMLCanvasElement>$('<canvas></canvas>canvas>')
                    .attr('width', noteCanvas.width)
                    .attr('height', noteCanvas.height)
                    [0];

                Ns.ShapeProvider(flatSignCache[note.channel].getContext('2d'), R, DX - R * 4, NOTE_CANVAS_HEIGHT / R - 1).drawFlatSign();
            }
            ctx.drawImage(flatSignCache[note.channel], 0, 0);
        }

        return noteCanvas;
    };

    var makeChordSpan = function(chord: IShmidusicChord): JQuery
    {
        var $chordSpan = $('<span style="position: relative;"></span>')
            .append($('<span class="tactNumberCont"></span>'));

        chord.noteList
            .filter(n => +n.tune !== 0) // my stupid way to define pauses
            .map(makeNoteCanvas)
            .forEach(el => $chordSpan.append(el));

        return $chordSpan;
    };

    return {
        getNoteImage: getNoteImage,
        makeNoteCanvas: makeNoteCanvas,
        makeChordSpan: makeChordSpan,
        extractNote: (n: HTMLCanvasElement) => 1 && {
            tune: +$(n).attr('data-tune'),
            channel: +$(n).attr('data-channel'),
            length: +$(n).attr('data-length')
        },
    };
};

interface ICanvasProvider {
    getNoteImage: { (l: number, c: number): HTMLCanvasElement },
    makeNoteCanvas: { (n: IShNote): HTMLCanvasElement },
    makeChordSpan: { (c: IShmidusicChord): JQuery },
    extractNote: { (c: HTMLCanvasElement): IShNote },
};

Ns.SheetMusicPainter = function(parentId: string): IPainter
{
    var R = 3; // semibreve note oval vertical radius
    var DX = R * 5; // half of chord span width
    var Y_STEPS_PER_SYSTEM = 40;

    var $parentEl = $('#' + parentId);

    var enabled = false;

    var $chordListCont =  $('<div class="chordListCont"></div>');
    $parentEl.append($chordListCont);

    var canvaser: ICanvasProvider = Ns.CanvasProvider(R);
    var control: IControl = Ns.Compose.Control($chordListCont, canvaser);

    var toFloat = (fractionString: string) => eval(fractionString);
    var interruptDrawing = () => {};
    var currentSong: IShmidusicStructure = null;

    /** @param song - dict structure outputed by
     * shmidusic program - github.com/klesun/shmidusic */
    var draw = function(song: IShmidusicStructure)
    {
        currentSong = song;

        if (!enabled) {
            return;
        }

        interruptDrawing();
        $chordListCont.empty();

        var staff = song.staffList[0];

        var tacter = Ns.TactMeasurer(staff.staffConfig.numerator / 8);
        interruptDrawing = Util.forEachBreak(staff.chordList, 200, 200, (chord: IShmidusicChord) =>
        {
            var chordLength = Math.min.apply(null, chord.noteList.map(n => toFloat(n.length.toString())));
            var finishedTact = tacter.inject(chordLength);

            /** @debug */
            if (chord.noteList.length === 1 &&
                chord.noteList[0].tune == 0 &&
                chord.noteList[0].channel == 6)
            {
                /** @TODO: don't actually omit them, just set them width: 0 or something, cuz
                 * a tact may end on a pause - see "Detective Conan - Negaigoto Hitotsu Dake.mid" */

                // artificial pause to match shmidusic format
                return;
            }

            var $span = canvaser.makeChordSpan(chord);
            if (finishedTact) {
                $span.find('.tactNumberCont').html(tacter.tactNumber().toString());
                $span.addClass('tactFinisher');
                if (tacter.hasRest()) {
                    $span.addClass('doesNotFitIntoTact')
                        .attr('data-rest', tacter.getRest())
                }
            } else {
                $span.find('.tactNumberCont').html('&nbsp;');
            }

            $chordListCont.append($span);
        });
    };

    // TODO: likely all these dom-manipulating methods could be moved from Painter somewhere else

    var getChordList = function(startIndex?: number): IShmidusicChord[]
    {
        startIndex = startIndex || 0;

        return $chordListCont.children().toArray()
            .slice(startIndex)
            .map((c) => 1 && {
                noteList: $(c).children('.noteCanvas').toArray()
                    .map(canvaser.extractNote)
            });
    };

    var drawSystemHorizontalLines = function(ctx: CanvasRenderingContext2D)
    {
        var width = ctx.canvas.width;

        ctx.strokeStyle = "#C0C0C0";
        ctx.lineWidth = 1;
        ctx.beginPath();

        // greyed note high lines for way too high notes
        for (var i = 1; i <= 3; ++i) { // 1 - Ti; 2 - Sol; 3 - Mi
            ctx.moveTo(0, i * R * 2 - R + 0.5);
            ctx.lineTo(width, i * R * 2 - R + 0.5);
        }

        var lineSkip = 6;

        ctx.stroke();
        ctx.strokeStyle = '#88F';
        ctx.beginPath();

        // normal note height linees
        for (var i = 0; i < 11; ++i) { // 0 - top violin Fa; 11 - low bass Sol
            if (i !== 5) { // the gap between violin and bass keys
                ctx.moveTo(0, (lineSkip + i) * R * 2 - R + 0.5);
                ctx.lineTo(width, (lineSkip + i) * R * 2 - R + 0.5);
            }
        }

        ctx.stroke();
    };

    // sets the css corresponding to the constants
    var applyStyles = function()
    {
        var partLinesBgCanvas = document.createElement('canvas');
        partLinesBgCanvas.width = 640;
        partLinesBgCanvas.height = R * Y_STEPS_PER_SYSTEM;
        drawSystemHorizontalLines(partLinesBgCanvas.getContext('2d'));

        var styles: { [selector: string]: { [property: string]: string } } = {
            '': {
                'background-image': 'url(/imgs/part_keys_40r.svg), ' +
                'url(' + partLinesBgCanvas.toDataURL('image/png') + ')',
                'background-repeat': 'repeat-y, ' +
                'repeat',
                'background-size': 'Auto ' + R * Y_STEPS_PER_SYSTEM + 'px,' +
                'Auto Auto',
                'background-attachment': 'local, ' +
                'local',
                'padding-left': DX * 3 + 'px',
            },
            ' div.chordListCont > span': {
                display: 'inline-block',
                height: ((Y_STEPS_PER_SYSTEM - 4) * R) + 'px',
                width: (DX * 2) + 'px',
                'margin-bottom': 4 * R + 'px',
            },
            ':not(.playing) div.chordListCont > span.focused': {
                'background-color': 'rgba(0,0,255,0.1)',
            },
            ' div.chordListCont > span.tactFinisher': {
                'box-shadow': '1px 0 0 rgba(0,0,0,0.5)'
            },
            ' div.chordListCont > span.tactFinisher.doesNotFitIntoTact': {
                'box-shadow': '1px 0 0 red'
            },
            ' .tactNumberCont': {
                position: 'absolute',
                left: DX * 2 - R * 4 + 'px'
            },
            ' .noteCanvas': {
                position: 'absolute'
            },
            ' .noteCanvas.sounding': {
                // 'background-color': 'rgba(0,0,255,0.4)', // likely unused
                'background': 'linear-gradient(180deg, rgba(0,0,0,0) 90%, rgba(0,0,255,0.2) 10%)'
            },
            ' .noteCanvas.pointed': {
                'background': 'linear-gradient(180deg, rgba(0,0,0,0) 90%, rgba(0,255,0,0.6) 10%)'
            },
        };

        var css = document.createElement("style");
        css.type = "text/css";

        for (var selector in styles) {

            var properties = Object.keys(styles[selector])
                .map(k => '    ' + k + ': ' + styles[selector][k]);

            var complete = '#' + parentId + selector;
            css.innerHTML += complete + " {\n" + properties.join(";\n") + " \n}\n";
        }


        document.body.appendChild(css);
    };

    applyStyles();

    return {
        draw: draw,
        handleNoteOn: control.setNoteFocus,
        setEnabled: function(val: boolean)
        {
            if (enabled = val) {
                if (currentSong !== null) {
                    draw(currentSong);
                }
            } else {
                interruptDrawing();
                $chordListCont.empty();
            }
        },
        getChordList: getChordList,
        setIsPlaying: (flag: boolean) => (flag
            ? $parentEl.addClass('playing')
            : $parentEl.removeClass('playing')),
        getControl: () => control,
    };
};

interface IPainter {
    draw: { (song: IShmidusicStructure): void },
    handleNoteOn: { (note: IShNote, chordIndex: number): void },
    setEnabled: { (v: boolean): void },
    getChordList: { (start: number): IShmidusicChord[] },
    setIsPlaying: { (flag: boolean): void },
    getControl: { (): IControl },
}