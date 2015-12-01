
var Util = Util || {};

// This class generates jquery dom with current song info
// and some controlls, particularly - timeline slider

Util.StaffPanel = function(sheetMusic)
{
    var NOTE_HEIGHT = 3; // in pixels

    var canvas = $('<canvas width="700px" height="21px"></canvas>')
        .css('margin-top', '2px')[0];
    var adapter = Util.CanvasAdapter(canvas);

    var drawSystemLines = function()
    {
        adapter.fillRect(0, 0, canvas.width, canvas.height, [255,255,255]);

        // drawing ti, sol and mi
        for (var i = 0; i <= 2; ++i) {
            var y_px = NOTE_HEIGHT * (0.5 + i * 2);
            var lightGrey = [192,192,192];
            adapter.drawLine(0, y_px, canvas.width, y_px, lightGrey);
        }
    };

    /** @TODO: handle properly sharps and flats! */
    var drawNote = function(note, startFraction)
    {
        var isEbony = [1,3,6,8,10].indexOf(note.tune % 12) > -1;
        var ivoryIndex = !isEbony
            ? [0,2,4,5,7,9,11].indexOf(note.tune % 12)
            : [0,2,4,5,7,9,11].indexOf(note.tune % 12 + 1); // treating all as ebonies for now - ignoring file key signature

        if (sheetMusic.chordList.length > 0) {
            var totalLength = sheetMusic.chordList.slice(-1)[0].timeFraction;
            var length = eval(note.length) / (note.isTriplet ? 3 : 1);

            var x_px = canvas.width * startFraction / totalLength;
            /** @TODO: it was lame idea to limit only to single octave, most songs have only black channel - already
             * hard to get some info from picture. do both violin/bass keys probably, like in java. */
            var y_px = canvas.height * (6 - ivoryIndex) / 7;
            var w_px = canvas.width * length / totalLength;

            var color = Util.channelColors[note.channel];

            adapter.fillRect(x_px, y_px, w_px, NOTE_HEIGHT, color);

            /** @TODO: draw tact line if got tact size message */
        }
    };


    var repaint = function()
    {
        drawSystemLines();
        sheetMusic.chordList.forEach(function(chord)
        {
            chord.noteList.forEach(note => drawNote(note, chord.timeFraction));
        });
    };
    repaint();

    return {
        putInto: $cont => $cont.empty()
            .append($('<img src="/imgs/violin_key_10x21.png"/>'))
            .append(canvas)
    };
};

Util.PlaybackControl = function($cont)
{
    var $tempoFactorInput = $('<select></select>')
        .append($('<option value="1">x1</option>'))
        .append($('<option value="1.5">x1.5</option>'))
        .append($('<option value="2">x2</option>'))
        .append($('<option value="3">x3</option>'))
        .append($('<option value="4">x4</option>'))
        .val(1);

    var $globalControl = $('<div class="globalControl"></div>')
        .append($('<div class="inlineBlock"></div>').append('Speed: ').append($tempoFactorInput))
        .append('<br clear="all"/>');

    $cont.append($globalControl);


    var $general = $('<div class="general"></div>');

    var fileNameHolder = $('<span></span>').html('?');
    var chordIndexHolder = $('<span></span>').html('?');
    var chordCountHolder = $('<span></span>').html('?');
    var noteCountHolder = $('<span></span>').html('?');
    var tempoHolder = $('<input type="number" min="15"/>').html('');
    var tempoOriginHolder = $('<span></span>').html('?');
    var secondsHolder = $('<span></span>').html('?');
    var secondsTotalHolder = $('<span></span>').html('?');

    var $timeSlider = $('<input type="range" min="0" max="0" step=1/>')
        .addClass("timeSlider")
        .on("input change", (_) => console.log('Time Slider changed! ' + $timeSlider.val()));

    var spanFillers = [
        s => s.append("Chord: ").append(chordIndexHolder).append('/').append(chordCountHolder),
        s => s.append("Note Count: ").append(noteCountHolder),
        s => s.append("Tempo: ").append(tempoHolder).append(tempoOriginHolder),
        s => s.append("Seconds: ").append(secondsHolder).append('/').append(secondsTotalHolder),
    ];

    $general.append($('<div></div>').append("File Name: ").append(fileNameHolder));

    spanFillers.forEach(l => $general.append(l($('<div class="inlineBlock"></div>'))));
    $cont.append($general.append('<br clear="all"/>'));

    $general.append($('<div></div>').append($timeSlider));
    var $staffContCont = $('<div></div>');
    $general.append($staffContCont);
    var $staffCont = $('<div></div>');
    $staffContCont.append($staffCont);

    var $staffMaskDiv = $('<div></div>').css('width', 0).css('height', 21).css('background-color', 'rgba(0,127,0,0.5)')
        .css('position', 'relative').css('left', '10px').css('top', '-21px').css('margin-bottom', '0px');
    $staffContCont.append($staffMaskDiv);

    var setFields = function(sheetMusic, playAtIndex)
    {
        tempoHolder.val(Math.floor(sheetMusic.config.tempo));
        tempoHolder.off().change(function()
        {
            tempoHolder.val(Math.max(tempoHolder.val(), tempoHolder[0].min));
            sheetMusic.config.tempo = tempoHolder.val(); // is it okay?

            /** @TODO: this is bad, because we don't always update slider... */
            if ($timeSlider.val() - -1 < sheetMusic.chordList.length) {
                playAtIndex($timeSlider.val() - -1);
            }
        });
        $tempoFactorInput.off().change(function() {
            sheetMusic.config.tempo = sheetMusic.config.tempoOrigin * $tempoFactorInput.val();
            playAtIndex($timeSlider.val() - -1);
        });
        tempoOriginHolder.html(Math.floor(sheetMusic.config.tempoOrigin));

        var secondsTotal = Util.toMillis(sheetMusic.chordList.slice(-1)[0].timeFraction, sheetMusic.config.tempo);
        secondsTotalHolder.html(Math.floor(secondsTotal * 100) / 100);

        self.setNoteCount('?');
        var chordCount = sheetMusic.chordList.length;
        chordCountHolder.html(chordCount);

        $timeSlider.attr('max', chordCount - 1).off( )
            .on('input change', (_) => playAtIndex($timeSlider.val()));
    };

    var self = {
        setFileName: n => fileNameHolder.html(n),
        setNoteCount: n => noteCountHolder.html(n),
        setFields: setFields,
        repaintStaff: sheetMusic => Util.StaffPanel(sheetMusic).putInto($staffCont),
        setChordIndex: function(n) {
            chordIndexHolder.html(n);
            $timeSlider.val(n);
        },
        setSeconds: function(n) {
            secondsHolder.html(Math.floor(n * 100) / 100);
            var secondsTotal = secondsTotalHolder.html();
            $staffMaskDiv.css('width', (700 * n / secondsTotal) + 'px');
        }
    };
    Object.keys(self).forEach(function(key) {
        var property = self[key];
        self[key] = function(v,v2) { property(v,v2); return self; };
    });

    $.extend(self, {
        getTempoFactor: (_) => $tempoFactorInput.val(),
    });

    return self;
};