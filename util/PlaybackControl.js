
var Util = Util || {};

// This class generates jquery dom with current song info
// and some controlls, particularly - timeline slider

Util.PlaybackControl = function ($cont)
{
    var $general = $('<div class="general"></div>');

    var fileNameHolder = $('<span></span>').html('?');
    var chordIndexHolder = $('<span></span>').html('?');
    var chordCountHolder = $('<span></span>').html('?');
    var noteCountHolder = $('<span></span>').html('?');
    var tempoHolder = $('<span></span>').html('?');
    var secondsHolder = $('<span></span>').html('?');
    var secondsTotalHolder = $('<span></span>').html('?');

    var $timeSlider = $('<input type="range" min="0" max="0" step=1/>')
        .addClass("smallSlider")
        .on("input change", (_) => console.log('Time Slider changed! ' + $timeSlider.val()));

    $general.append($('<div></div>').append("File Name: ").append(fileNameHolder));

    var spanFillers = [
            s => s.append("Chord: ").append(chordIndexHolder).append('/').append(chordCountHolder),
            s => s.append("Note Count: ").append(noteCountHolder),
            s => s.append("Tempo: ").append(tempoHolder),
            s => s.append("Seconds: ").append(secondsHolder).append('/').append(secondsTotalHolder),
            s => s.append("Time: ").append($timeSlider),
    ];
    spanFillers.forEach(l => $general.append(l($('<div class="inlineBlock"></div>'))));

    $cont.append($general.append('<br clear="all"/>'));

    var $syntControl = $('<div class="syntControl"></div>').append('<div>huj</div>');
    $cont.append($syntControl);

    var setFields = function(sheetMusic, playAtIndex) {
        tempoHolder.html(Math.floor(sheetMusic.config.tempo));

        var secondsTotal = sheetMusic.chordList.slice(-1)[0].timeMillis / 1000.0;
        secondsTotalHolder.html(Math.floor(secondsTotal * 100) / 100);

        self.setNoteCount('?');
        var chordCount = sheetMusic.chordList.length;
        chordCountHolder.html(chordCount);

        /** @TODO: stop sounding of opened notes - MUSTIMPLEMENT */
        $timeSlider.attr('max', chordCount - 1).off( )
            .on('input change', (_) => playAtIndex($timeSlider.val()));
    };

    var self = {
        setFileName: n => fileNameHolder.html(n),
        setNoteCount: n => noteCountHolder.html(n),
        setFields: setFields,
        setChordIndex: function(n) {
            chordIndexHolder.html(n);
            $timeSlider.val(n);
        },
        setSeconds: n => secondsHolder.html('>' + Math.floor(n * 100) / 100),
    };
    Object.keys(self).forEach(function(key) {
        var property = self[key];
        self[key] = (v,v2) => { property(v,v2); return self; };
    });

    $.extend(self, {
        $syntControl: $syntControl,
    });

    return self;
};