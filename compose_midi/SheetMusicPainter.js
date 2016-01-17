
var Ns = Ns || {};

Ns.SheetMusicPainter = function(parentId)
{
    var R = 4; // note oval vertical radius
    var DX = R * 5; // half of chord span width
    var Y_STEPS_PER_SYSTEM = 40;
    
    var TOPPEST_TUNE = 98; // the re that would be paint at 0th pixel from top
    
    var $parentEl = $('#' + parentId);
    $parentEl.css('position', 'relative');
    
    var $chordListCont =  $('<div class="chordListCont"></div>');
    var canvas = $('<canvas class="overlayCanvas" width="1024px" height="768px"></canvas>')[0];
    
    $parentEl.append($chordListCont).append(canvas);

    var drawNote = function(note, ctx)
    {
        var isEbony = [1,3,6,8,10].indexOf(note.tune % 12) > -1;
        var ivoryIndex = !isEbony
            ? [0,2,4,5,7,9,11].indexOf(note.tune % 12)
            : [0,2,4,5,7,9,11].indexOf(note.tune % 12 + 1); // treating all as flats for now - ignoring file key signature
        var octave = Math.floor(note.tune / 12);
        
        var shift = 56 - ivoryIndex - octave * 7; // 56 - some number that divides by 7

        Ns.ShapeProvider(ctx, R, DX, shift).drawNote(note.channel, note.length);
        isEbony && Ns.ShapeProvider(ctx, R, DX - R * 4, shift).drawFlatSign();
    };

    /** @TODO: draw also violin/bass keys */
    var drawSystemHorizontalLines = function(ctx)
    {
        /** @TODO: probably can do something like background: repeat instead */

        var width = DX * 2;
        
        ctx.strokeStyle = "#C0C0C0";
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        // greyed note hight lines for way too high notes
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
            while (sumFraction >= tactSize) {
                sumFraction -= tactSize;
                finishedTact = true;
                ++tactNumber;
            }

            return finishedTact;
        };

        return {
            inject: inject,
            hasRest: _ => sumFraction > 0,
            tactNumber: _ => tactNumber
        };
    };

    var makeChordSpan = function(chord)
    {
        var $chordCanvas = $('<canvas></canvas>')
            .attr('width', DX * 2)
            .attr('height', Y_STEPS_PER_SYSTEM * R);
        
        var g = $chordCanvas[0].getContext('2d');

        drawSystemHorizontalLines(g);
        chord.noteList.forEach(n => drawNote(n, g));

        return $('<span style="position: relative;"></span>')
            .append($chordCanvas)
            .append($('<span class="tactNumberCont"></span>'));
    };

    var toFloat = fractionString => eval(fractionString);
    
    /** @param song - dict structure outputed by 
     * shmidusic program - github.com/klesun/shmidusic */
    var draw = function(song)
    {
        var staff = song.staffList[0];

        var tacter = TactMeasurer(staff.staffConfig.numerator / 8);
        for (chord of staff.chordList) {
            var chordLength = Math.min.apply(null, chord.noteList.map(n => toFloat(n.length)));
            var finishedTact = tacter.inject(chordLength);
            var $span = makeChordSpan(chord);
            if (finishedTact) {
                $span.find('.tactNumberCont').html(tacter.tactNumber());
                $span.addClass('tactFinisher');
                if (tacter.hasRest()) {
                    $span.addClass('doesNotFitIntoTact');
                }
            }

            $chordListCont.append($span);
        }
    };
    
    // sets the css corresponding to the constants
    var applyStyles = function()
    {
        var styles = {
            '*': {
                '-moz-box-sizing': 'border-box',
                '-webkit-box-sizing': 'border-box',
                'box-sizing': 'border-box',
            },
            'div.chordListCont': {
                'z-index': -1,
                position: 'absolute',
                left: '0px',
                top: '0px',
            },
            'div.chordListCont > span': {
                display: 'inline-block',
                height: ((Y_STEPS_PER_SYSTEM - 4) * R) + 'px',
                width: (DX * 2) + 'px',
                'margin-bottom': 4 * R + 'px',
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
            }
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
    };
}

