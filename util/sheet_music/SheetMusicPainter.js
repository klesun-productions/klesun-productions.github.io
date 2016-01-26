
var Ns = Ns || {};

Ns.SheetMusicPainter = function(parentId)
{
    var R = 3; // note oval vertical radius
    var DX = R * 5; // half of chord span width
    var Y_STEPS_PER_SYSTEM = 40;
    var NOTE_CANVAS_HEIGHT = R * 9;
    
    var TOPPEST_TUNE = 98; // the re that would be paint at 0th pixel from top
    
    var $parentEl = $('#' + parentId);

    var $chordListCont =  $('<div class="chordListCont"></div>');
    $parentEl.append($chordListCont);

    /** @param float tactSize */
    var TactMeasurer = function(tactSize)
    {
        /** @var float */
        var sumFraction = 0;
        var tactNumber = 0;

        var inject = function(chordLength)
        {
            sumFraction += chordLength;

            var finishedTact = false;
            while (sumFraction.toFixed(8) >= tactSize) {
                sumFraction -= tactSize;
                finishedTact = true;
                ++tactNumber;
            }

            return finishedTact;
        };

        return {
            inject: inject,
            hasRest: _ => sumFraction.toFixed(8) > 0,
            tactNumber: _ => tactNumber
        };
    };

    // tuple: 16 channels, ~14 lengths each (6 (1/32 .. 1/1) * 2 (triplets) * 2 (dots))
    var noteCanvasCache = [
        {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}
    ];
    // tuple: 16 channels
    var flatSignCache = [];

    var makeNoteCanvas = function(note)
    {
        var isEbony = [1,3,6,8,10].indexOf(note.tune % 12) > -1;
        var ivoryIndex = !isEbony
            ? [0,2,4,5,7,9,11].indexOf(note.tune % 12)
            : [0,2,4,5,7,9,11].indexOf(note.tune % 12 + 1); // treating all as flats for now - ignoring file key signature
        var octave = Math.floor(note.tune / 12);
        
        var shift = 56 - ivoryIndex - octave * 7; // 56 - some number that divides by 7

        var $noteCanvas = $('<canvas class="noteCanvas"></canvas>')
            .attr('width', DX * 2)
            .attr('height', NOTE_CANVAS_HEIGHT + R)
            .css('top', shift * R - NOTE_CANVAS_HEIGHT + 1 * R)
            .attr('data-tune', note.tune)
            .attr('data-channel', note.channel)
            ;

        var ctx = $noteCanvas[0].getContext('2d');

        if (!noteCanvasCache[note.channel][note.length]) {
            noteCanvasCache[note.channel][note.length] = $('<canvas></canvas>canvas>')
                    .attr('width', $noteCanvas[0].width)
                    .attr('height', $noteCanvas[0].height)
                    [0];

            Ns.ShapeProvider(noteCanvasCache[note.channel][note.length].getContext('2d'), R, DX, NOTE_CANVAS_HEIGHT / R - 1).drawNote(note.channel, note.length);
        }
        ctx.drawImage(noteCanvasCache[note.channel][note.length], 0, 0);

        if (isEbony) {
            if (!flatSignCache[note.channel]) {
                flatSignCache[note.channel] = $('<canvas></canvas>canvas>')
                    .attr('width', $noteCanvas[0].width)
                    .attr('height', $noteCanvas[0].height)
                    [0];

                Ns.ShapeProvider(flatSignCache[note.channel].getContext('2d'), R, DX - R * 4, NOTE_CANVAS_HEIGHT / R - 1).drawFlatSign();
            }
            ctx.drawImage(flatSignCache[note.channel], 0, 0);
        }

        return $noteCanvas;
    };

    var makeChordSpan = function(chord)
    {
        var $chordSpan = $('<span style="position: relative;"></span>')
            .append($('<span class="tactNumberCont"></span>'));

        chord.noteList
            .filter(n => +n.tune !== 0) // my stupid way to define pauses
            .map(makeNoteCanvas)
            .forEach(el => $chordSpan.append(el));

        return $chordSpan;
    };

    var toFloat = fractionString => eval(fractionString);
    
    /** @param song - dict structure outputed by 
     * shmidusic program - github.com/klesun/shmidusic */
    var draw = function(song)
    {
        $chordListCont.empty();

        var staff = song.staffList[0];

        var tacter = TactMeasurer(staff.staffConfig.numerator / 8);
        staff.chordList.forEach(function(chord)
        {
            var chordLength = Math.min.apply(null, chord.noteList.map(n => toFloat(n.length)));
            var finishedTact = tacter.inject(chordLength);
            var $span = makeChordSpan(chord);
            if (finishedTact) {
                $span.find('.tactNumberCont').html(tacter.tactNumber());
                $span.addClass('tactFinisher');
                if (tacter.hasRest()) {
                    $span.addClass('doesNotFitIntoTact');
                }
            } else {
                $span.find('.tactNumberCont').html('&nbsp;');
            }

            $chordListCont.append($span);
        });
    };

    var setNoteFocus = function(note, chordIndex)
    {
        var chord = $chordListCont.children()[chordIndex];
        if (chord) {
            chord.scrollIntoView(false);
        }

        //$(chord).addClass('focused');

        var $note = $(chord).find('.noteCanvas[data-tune="' + note.tune + '"][data-channel="' + note.channel + '"]');
        $note.addClass('sounding');

        return _ => { /*$(chord).removeClass('focused'); */$note.removeClass('sounding'); };
    };

    var drawSystemHorizontalLines = function(ctx)
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
        ctx.strokeStyle = '#0000FF';
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
        /** @TODO: this is likely deprecated. Make some SVG and scale-repeat it instead. */
        var partLinesBgContext = document.getCSSCanvasContext('2d', 'partLinesBgCanvas', 640, R * Y_STEPS_PER_SYSTEM);
        drawSystemHorizontalLines(partLinesBgContext);

        var violinKeyBgContext = document.getCSSCanvasContext('2d', 'violinKeyBgCanvas', DX * 3, R * Y_STEPS_PER_SYSTEM);
        
        /** @TODO: move this logic to ShapeProvider maybe */
        var drawViolinKey = _ => Ns.ShapeProvider(violinKeyBgContext, R, 0, 17).drawViolinKey($('#imgViolinKey')[0]);
        if ($('#imgViolinKey')[0].complete) {
            drawViolinKey();
        } else {
            $('#imgViolinKey')[0].onload = drawViolinKey;
        }
        
        var drawBassKey = _ => Ns.ShapeProvider(violinKeyBgContext, R, 0, 25).drawBassKey($('#imgBassKey')[0]);
        if ($('#imgBassKey')[0].complete) {
            drawBassKey();
        } else {
            $('#imgBassKey')[0].onload = drawBassKey;
        }

        var styles = {
            '': {
                'background-image': '-webkit-canvas(partLinesBgCanvas), ' +
                                    '-webkit-canvas(violinKeyBgCanvas)',
                'background-repeat': 'repeat, ' +
                                    'repeat-y',
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
    };
};

