
var Util = Util || {};

// This class destiny is to read shmidusic json structure and send events to MIDI.js and PianoLayoutPanel

/** @param piano - PianoLayoutPanel instance */
Util.Playback = function (piano, $controlCont) {

    var Control = function ($cont)
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

    var control = Control($controlCont);

    var toFloat = fractionString => eval(fractionString);
    var toMillis = (length, tempo) => 1000 * length * 60 / (tempo / 4);  // because 1 / 4 = 1000 ms when tempo is 60

    var synths = {
        oscillator: Util.Synths.Oscillator(),
        mudcube: Util.Synths.Mudcube(),
        midiDevice: Util.Synths.MidiDevice(),
    };

    var synth = 'notSet';

    var playNote = function(noteJs, tempo) {
        synths[synth].playNote(noteJs, tempo);

        var length = toFloat(noteJs.length) / (noteJs.isTriplet ? 3 : 1);
        piano.highlight(noteJs);
        setTimeout((_) => piano.unhighlight(noteJs), toMillis(length, tempo));
    };

    var playingThreads = [];
    var stop = (_) => playingThreads.forEach(t => (t.interrupted = true));

    // must be called from outside on page load!
    var changeSynth = function(synthName) {
        if (synthName in synths) {
            stop();
            synth = synthName;
            synths[synth].init(control.$syntControl);

        } else {
            alert('No Such Synth!');
        }
    };

    // TODO: rename to playSheetMusic()
    var playGeneralFormat = function (sheetMusic, fileName, whenFinished, startIndex) {
		
		whenFinished = whenFinished || ((_) => {});
        startIndex = +startIndex || 0;

        stop();

        var playAtIndex = ((chordIndex) => playGeneralFormat(sheetMusic, fileName, whenFinished, chordIndex));

        control.setFields(sheetMusic, playAtIndex).setFileName(fileName).setChordIndex(startIndex);

        synths[synth].consumeConfig(sheetMusic.config.instrumentDict, function() {

            var thread = {interrupted: false};
            playingThreads.push(thread);

            var startMillis = window.performance.now() - sheetMusic.chordList[startIndex].timeMillis;

            var playNext = function(idx) {
                if (idx < sheetMusic.chordList.length && !thread.interrupted) {

                    var c = sheetMusic.chordList[idx];
                    c['noteList'].forEach(n => playNote(n, sheetMusic.config.tempo));

                    if (idx + 1 < sheetMusic.chordList.length) {
                        //var chordDuration = sheetMusic.chordList[idx + 1].timeMillis - c.timeMillis;
                        var chordDuration = sheetMusic.chordList[idx + 1].timeMillis - (window.performance.now() - startMillis);

                        if (chordDuration > 0) {
                            Util.setTimeout((_) => playNext(idx + 1), chordDuration);
                        } else {
                            playNext(idx + 1);
                        }

                    } else {

                        setTimeout(whenFinished, 5000); // hope last chord finishes in 5 seconds
                    }

                    // piano image lags if do it every time
                    if (idx % 20 === 0) {
                        control
                            .setChordIndex(idx)
                            .setSeconds(c.timeMillis / 1000.0);
                    }
                } else {
                    var index = playingThreads.indexOf(thread);
                    playingThreads.splice(index, 1);
                }
            };

            playNext(startIndex);
        });
    };

    /** @param shmidusicJson - json in shmidusic project format */
    var playShmidusic = function (shmidusicJson, fileName, whenFinished) {

        whenFinished = whenFinished || ((_) => {});
        fileName = fileName || 'noNameFile';

		shmidusicJson['staffList'].forEach(function(staff) {

            var instrumentDict = {};

            (staff.staffConfig.channelList || [])
                .filter(e => e.channelNumber < 16)
                .forEach((e) => (instrumentDict[e.channelNumber] = e.instrument));

            Util.range(0, 16).forEach(i => (instrumentDict[i] |= 0));

            // flat map hujap
            // tactList not needed for logic, but it increases readability of file A LOT
            var chordList = ('tactList' in staff)
                ? [].concat.apply([], staff['tactList'].map(t => t['chordList']))
                : staff['chordList'];

            if (!staff.millisecondTimeCalculated) {

                var timeMillis = 0;

                chordList.forEach(function(c) {
                    /** @legacy */
                    c.noteList.forEach(function(n) {
                        n.length += '/' + (n.isTriplet ? 3 : 1);
                        delete n.isTriplet;
                    });

                    c.timeMillis = timeMillis;
                    var chordLength = Math.min.apply(null, c.noteList.map(n => toFloat(n.length)));
                    timeMillis += toMillis(chordLength, staff.staffConfig.tempo);
                });

                staff.millisecondTimeCalculated = true;
            }

            playGeneralFormat({
                chordList: chordList,
                config: {
                    tempo: staff.staffConfig.tempo,
                    instrumentDict: instrumentDict
                }
            }, fileName, whenFinished);
        });
    };

    var playStandardMidiFile = function (smf, fileName, whenFinished) {

        stop();
        var thread = {interrupted: false};
        playingThreads.push(thread);

        whenFinished = whenFinished || ((_) => {});

        /** @TODO: handle _all_ tempo events, not just first. Should be easy once speed change by user is implemented */
        var tempoEntry = smf.tempoEventList.filter(t => t.time == 0)[0] ||
            smf.tempoEventList[0] || {tempo: 120};
        var division = smf.division * 4;

        var chordList = [];
        var curTime = -100;
        var curChord = [-100, -100];

        smf.noteList.forEach(function(note) {
            note.length = note.duration / division;
            if (note.time == curTime) {
                curChord.noteList.push(note);
            } else {
                curTime = note.time;
                curChord = {noteList: [note], timeMillis: toMillis(curTime / division, tempoEntry.tempo)};
                chordList.push(curChord);
            }
        });
        chordList.push(curChord);

        control.setNoteCount(smf.noteList.length);

        playGeneralFormat({
            chordList: chordList,
            config: {
                tempo: tempoEntry.tempo,
                instrumentDict: smf.instrumentDict
            }
        }, fileName, whenFinished);

        control.setNoteCount(smf.noteList.length);
    };

    return {
        playShmidusic: playShmidusic,
        playStandardMidiFile: playStandardMidiFile,
        changeSynth: changeSynth
    };
};
