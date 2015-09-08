
// requires Util.TableGenerator.js !
// requires Util.PianoLayoutPanel.js !
// requires Util.Playback.js !

var performExternal = function(scriptName, callback) {
	xmlhttp = new XMLHttpRequest();
	var isDone = () => xmlhttp.readyState == XMLHttpRequest.DONE;
	var isOk = () => xmlhttp.status == 200;
	var getResponse = () => {console.log('zhopa', xmlhttp); return JSON.parse(xmlhttp.responseText);}
	var getErrorMessage = () => 'Failed to get ajax with script ' + script + ' status: ' + xmlhttp.status;
	
	xmlhttp.onreadystatechange = () => isDone() 
			? (isOk() ? callback(getResponse()) : alert(getErrorMessage())) 
			: -100;

    xmlhttp.open("GET", "/htbin/" + scriptName, true);
    xmlhttp.send();
};

var MainPage = function($pianoCanvas) {

    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    var pianoLayoutPanel = Util.PianoLayoutPanel($pianoCanvas);
    var playback = Util.Playback(pianoLayoutPanel, audioCtx);

    var init = function () {

        var playButtonFormatter = function (cell, row) {
            return $('<input type="button" value="Play!"/>')
                    .click(() => playback.play(row['sheetMusic']));
        };

        var initIchigosMidiList = function () {

			var callback = function (rowList) {
				var colModel = [
					{'name': 'fileName', 'caption': 'File Name'},
					{'name': 'length', 'caption': 'Length'},
					{'name': 'score', 'caption': 'My Score'},
					{'name': 'playButton', 'caption': 'Play', formatter: () => $('<input type="button" value="Play!"/>')
						.click(() => alert('Midi File Playback Not Implemented Yet!'))}
				];

				var caption = 'Some random midi files from my collection provided by <a href="http://ichigos.com">ichigos.com</a>';

				var table = Util.TableGenerator().generateTable(colModel, rowList, caption);
				$('.random-midi-list-cont').append(table); // defined in main_page.html
			};
		
			performExternal('get_ichigos_midi_names.py', callback)
        };

        var initMyMusicList = function () {

            rowList = Globals.shmidusicList;

            var colModel = [
                {'name': 'fileName', 'caption': 'File Name', formatter: function(s) { return s.split('_').join(' '); }},
                {'name': 'playButton', 'caption': 'Play', formatter: playButtonFormatter}
            ];

            /** @debug */
            console.log(rowList)

            var caption = 'My shmidusic';

            var table = Util.TableGenerator().generateTable(colModel, rowList, caption);
            $('.something-left-cont').append(table); // defined in main_page.html
        };

        initIchigosMidiList();
        initMyMusicList();
    };

    var playDemo = function () {
        playback.play(Globals.shmidusicList.filter(s => s.fileName === 'opus89_4uvstva_yuzefi.mid.js')[0].sheetMusic);
    };

    var tuneToFrequency = function(tune) {

        var shift = tune - 69; // 69 - LA, 440 hz
        var la = 440.0;
        return la * Math.pow(2, shift / 12.0);
    };

    // TODO: not sure that it's good for performance setting it's volume to 0 when we need pause playing...
    var playTuneOnOscillator = function(tune, gainNode) {

        var oscillator = audioCtx.createOscillator();

        // ["sine", "square", "saw", "triangle", "custom"]
        oscillator.type = "square";
        oscillator.connect(gainNode);
        oscillator.frequency.value = tuneToFrequency(tune);
        oscillator.start(0);

        return oscillator;
    };

    var initOscillatorControl = function($parentEl) {

        var openedNotes = [
            {tune: 66, channel: 1},
            {tune: 69, channel: 2},
            {tune: 73, channel: 3},
            {tune: 76, channel: 4}
        ];

        pianoLayoutPanel.repaint(openedNotes);

        var initChannel = function (channel) {

            // TODO: move sound part to Playback class

            var gainNode = audioCtx.createGain();
            gainNode.connect(audioCtx.destination);
            gainNode.gain.value = 0;

            var startTune = openedNotes.find(n => n.channel === channel).tune;
            var oscillator = playTuneOnOscillator(startTune, gainNode);

            var $tuneInput = $('<input type="number" value="' + startTune + '" style="width: 40px"/>');
            $tuneInput.change(() => {
                oscillator.frequency.value = tuneToFrequency($tuneInput.val());
                openedNotes.find(n => n.channel === channel).tune = $tuneInput.val();
                pianoLayoutPanel.repaint(openedNotes);
            });

            var $volumeRange = $('<input type="range" min="0" max="100" value="0"/>');
            $volumeRange[0].oninput = () => gainNode.gain.value = $volumeRange.val() / 100;

            $parentEl.append($('<div></div>').append($tuneInput).append($volumeRange));
        };

        [1,2,3,4].forEach(initChannel);
    };

    return {
        init: init, // TODO: split to initShmidusicList() and initIchigosMidiList()
        playDemo: playDemo,
        initOscillatorControl: initOscillatorControl,
    };
};
