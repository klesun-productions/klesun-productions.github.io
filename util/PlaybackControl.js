
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
    var $general = $cont.find('.general');
    var $tempoFactorInput = $cont.find('.tempoFactorInput');
    var $secondsTotalHolder = $cont.find('.secondsTotal.holder');
    var $timeSlider = $cont.find('.timeSlider');
    var $staffCont = $cont.find('.staffCont');
    /** @TODO: CSS in CSS ! */
    var $staffMaskDiv = $cont.find('.staffMaskDiv').css('width', 0).css('height', 21).css('background-color', 'rgba(0,127,0,0.5)')
        .css('position', 'relative').css('left', '10px').css('top', '-21px').css('margin-bottom', '-20px');

    var setFields = function(sheetMusic, playAtIndex)
    {
        var tempoHolder = $cont.find('.tempoInput');
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
        $cont.find('.tempoOrigin.holder').html(Math.floor(sheetMusic.config.tempoOrigin));

        var secondsTotal = Util.toMillis(sheetMusic.chordList.slice(-1)[0].timeFraction, sheetMusic.config.tempo) / 1000;
        $secondsTotalHolder.html(Math.floor(secondsTotal * 100) / 100);

        self.setNoteCount('?');
        var chordCount = sheetMusic.chordList.length;
        $cont.find('.chordCount.holder').html(chordCount);

        $timeSlider.attr('max', chordCount - 1).off( )
            .on('input change', (_) => playAtIndex($timeSlider.val()));
    };

    var self = {
        setFileInfo: function(info) {
            $cont.find('.fileName.holder').html(info.fileName);
            $cont.find('.score.holder').html(info.score);
        },
        setNoteCount: n => $cont.find('.noteCount.holder').html(n),
        setFields: setFields,
        repaintStaff: sheetMusic => Util.StaffPanel(sheetMusic).putInto($staffCont),
        setChordIndex: function(n) {
            $cont.find('.chordIndex.holder').html(n);
            $timeSlider.val(n);
        },
        setSeconds: function(n) {
            $cont.find('.seconds.holder').html(Math.floor(n * 100) / 100);
            var secondsTotal = $secondsTotalHolder.html();
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