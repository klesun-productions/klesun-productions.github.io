
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
    var $tempoFactorInput = $cont.find('.tempoFactorInput');
    var $secondsTotalHolder = $cont.find('.secondsTotal.holder');
    var $timeSlider = $cont.find('.timeSlider');
    var $staffCont = $cont.find('.staffCont');
	var tempoHolder = $cont.find('.tempoInput');
    /** @TODO: CSS in CSS ! */
    var $staffMaskDiv = $cont.find('.staffMaskDiv').css('width', 0).css('height', 21).css('background-color', 'rgba(0,127,0,0.5)')
        .css('position', 'relative').css('left', '10px').css('top', '-21px').css('margin-bottom', '-20px');

	var setFields = function(sheetMusic)
	{
		var secondsTotal = Util.toMillis(sheetMusic.chordList.slice(-1)[0].timeFraction, sheetMusic.config.tempo) / 1000;
		var chordCount = sheetMusic.chordList.length;
		
		tempoHolder.val(Math.floor(sheetMusic.config.tempo));
		$cont.find('.tempoOrigin.holder').html(Math.floor(sheetMusic.config.tempoOrigin));
		$cont.find('.noteCount.holder').html(Util.if(sheetMusic.misc.noteCount, c => c !== -100, '?'));
		$cont.find('.chordCount.holder').html(chordCount);
		
        $secondsTotalHolder.html(Math.floor(secondsTotal * 100) / 100);
		$timeSlider.attr('max', chordCount - 1);
		Util.StaffPanel(sheetMusic).putInto($staffCont);
	};
	
	var setPlayback = function(playback)
	{
		var updateState = function()
		{
			$cont.find('.chordIndex.holder').html(playback.getChordIndex());
			$timeSlider.val(playback.getChordIndex());

            var seconds = Math.floor(playback.getTime() / 10) / 100;
            $cont.find('.seconds.holder').html(seconds);
            var secondsTotal = $secondsTotalHolder.html();
            $staffMaskDiv.css('width', (700 * seconds / secondsTotal) + 'px');
		};
        updateState();

		var triggerId = setInterval(updateState, 1000);
        playback.setPauseHandler(function() {
            window.clearInterval(triggerId);
            playback.setResumeHandler(_ => (triggerId = setInterval(updateState, 1000)));
        });
		
		$timeSlider.off().on('input change', function() {
			playback.slideTo(+$timeSlider.val());
			updateState();
		});
		var lastFactor = $tempoFactorInput.val();
		$tempoFactorInput.off().change(function() {
			var total = $secondsTotalHolder.html() * lastFactor / $tempoFactorInput.val();
			$secondsTotalHolder.html(total);
			playback.setTempoFactor(lastFactor = $tempoFactorInput.val());
			updateState();
		});
        tempoHolder.off().change(function()
        {
            tempoHolder.val(Math.max(tempoHolder.val(), tempoHolder[0].min));
            playback.setTempo(+tempoHolder.val());
			updateState();
        });
	};

    var self = {
		setPlayback: setPlayback,
        setFileInfo: function(info) {
            $cont.find('.fileName.holder').html(info.fileName);
            $cont.find('.score.holder').html(info.score || '_');
        },
		setFields: setFields,
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