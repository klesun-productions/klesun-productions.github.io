
/// <reference path="../references.ts" />

var Ns = Ns || {};

Ns.SheetMusicPainter = function(parentId: string)
{
    var R = 3; // semibreve note oval vertical radius
    var DX = R * 5; // half of chord span width
    var Y_STEPS_PER_SYSTEM = 40;
    var NOTE_CANVAS_HEIGHT = R * 9;

    var $parentEl = $('#' + parentId);

    var enabled = false;

    var $chordListCont =  $('<div class="chordListCont"></div>');
    $parentEl.append($chordListCont);

    /** @param float tactSize */
    var TactMeasurer = function(tactSize: number)
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

    // tuple: 16 channels, ~14 lengths each (6 (1/32 .. 1/1) * 2 (triplets) * 2 (dots))
    var noteCanvasCache: Array<{ [lenFra: string]: HTMLCanvasElement }> = [
        {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}
    ];
    // tuple: 16 channels
    var flatSignCache: HTMLCanvasElement[] = [];

    var makeNoteCanvas = function(note: IShNote)
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

        // well, hack, but...
        var length = typeof note.length === 'number'
            ? Shmidusicator.guessLength(note.length).apacheStr()
            : note.length;

        if (!noteCanvasCache[note.channel][length]) {
            noteCanvasCache[note.channel][length] = <HTMLCanvasElement>$('<canvas></canvas>canvas>')
                .attr('width', noteCanvas.width)
                .attr('height', noteCanvas.height)
                [0];

            Ns.ShapeProvider(noteCanvasCache[note.channel][length].getContext('2d'), R, DX, NOTE_CANVAS_HEIGHT / R - 1).drawNote(note.channel, length);
        }
        ctx.drawImage(noteCanvasCache[note.channel][length], 0, 0);

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

        return $(noteCanvas);
    };

    var makeChordSpan = function(chord: IShmidusicChord)
    {
        var $chordSpan = $('<span style="position: relative;"></span>')
            .append($('<span class="tactNumberCont"></span>'));

        chord.noteList
            .filter(n => +n.tune !== 0) // my stupid way to define pauses
            .map(makeNoteCanvas)
            .forEach(el => $chordSpan.append(el));

        return $chordSpan;
    };

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

        var tacter = TactMeasurer(staff.staffConfig.numerator / 8);
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

            var $span = makeChordSpan(chord);
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

    /** adds a chord element _at_ the index. or to the end, if index not provided */
    var addChord = function(chord: IShmidusicChord, index?: number): void
    {
        index = index || $chordListCont.children().length;

        var $chord = makeChordSpan(chord);

        if (index <= 0) {
            $chordListCont.prepend($chord);
        } else if (index >= $chordListCont.children().length) {
            $chordListCont.append($chord);
        } else {
            $chordListCont.children(':eq(' + index + ')').before($chord);
        }
    };

    /** adds a note to the chord element _at_ the index. or to the end, if index not provided */
    var addNote = function(note: IShNote, chordIndex?: number): void
    {
        chordIndex = chordIndex || $chordListCont.children().length - 1;

        var $note = makeNoteCanvas(note);

        $chordListCont.children(':eq(' + chordIndex + ')').append($note);
    };

    var getChordList = function(): IShmidusicChord[]
    {
        // problems?
        return $chordListCont.children().toArray()
            .map((c) => 1 && {
                noteList: $(c).children('.noteCanvas').toArray()
                    .map((n) => 1 && {
                        tune: +$(n).attr('data-tune'),
                        channel: +$(n).attr('data-channel'),
                        length: +$(n).attr('data-length')
                    })
            });
    }

    var scrollToIfNeeded = function(chordEl: HTMLElement)
    {
        /** @TODO: it does not take into account window scroll prostion
         * scroll window heavily to the buttom and play, say, elfen lied */

        var chordRect = chordEl.getBoundingClientRect();
        var scrollPaneRect = $parentEl[0].getBoundingClientRect();

        var isVisible = chordRect.top >= scrollPaneRect.top &&
            chordRect.bottom <= (window.innerHeight || document.documentElement.clientHeight);

        if (!isVisible) {
            var top = $(chordEl).offset().top -
                $parentEl.offset().top +
                $parentEl.scrollTop();

            $parentEl.scrollTop(top);
        }
    };

    var setNoteFocus = function(note: IShNote, chordIndex: number)
    {
        /** @TODO: put some limit in miliseconds, how often it can be updated, cuz
         * there are some ridiculously compact songs that are screwed because of performance:
         * "0_c1_Final Fantasy XII - Desperate Fight.mid" */

        var chord = $chordListCont.children()[chordIndex];
        chord && scrollToIfNeeded(chord);

        //$(chord).addClass('focused');

        var $note = $(chord).find('.noteCanvas[data-tune="' + note.tune + '"][data-channel="' + note.channel + '"]');
        $note.addClass('sounding');

        return () => { /*$(chord).removeClass('focused'); */$note.removeClass('sounding'); };
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
            'div.chordListCont > span': {
                display: 'inline-block',
                height: ((Y_STEPS_PER_SYSTEM - 4) * R) + 'px',
                width: (DX * 2) + 'px',
                'margin-bottom': 4 * R + 'px',
            },
            'div.chordListCont > span.focused': {
                'background-color': 'rgba(0,0,255,0.1)',
            },
            'div.chordListCont > span.tactFinisher': {
                'box-shadow': '1px 0 0 rgba(0,0,0,0.5)'
            },
            'div.chordListCont > span.tactFinisher.doesNotFitIntoTact': {
                'box-shadow': '1px 0 0 red'
            },
            '.tactNumberCont': {
                position: 'absolute',
                left: DX * 2 - R * 4 + 'px'
            },
            '.noteCanvas': {
                position: 'absolute'
            },
            '.noteCanvas.sounding': {
                'background-color': 'rgba(0,0,255,0.4)',
                'background': 'linear-gradient(180deg, rgba(0,0,0,0) 90%, rgba(0,0,255,0.2) 10%)'
            },
        };

        var css = document.createElement("style");
        css.type = "text/css";

        for (var selector in styles) {

            var properties = Object.keys(styles[selector])
                .map(k => '    ' + k + ': ' + styles[selector][k]);

            var complete = '#' + parentId + ' ' + selector;
            css.innerHTML += complete + " {\n" + properties.join(";\n") + " \n}\n";
        }


        document.body.appendChild(css);
    };

    applyStyles();

    return {
        draw: draw,
        handleNoteOn: setNoteFocus,
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
        addChord: addChord,
        addNote: addNote,
        getChordList: getChordList,
    };
};

