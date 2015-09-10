
// requires Util.TableGenerator.js !
// requires Util.PianoLayoutPanel.js !
// requires Util.Playback.js !

var MainPage = function($pianoCanvas) {

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

            var caption = 'My music';

            var table = Util.TableGenerator().generateTable(colModel, rowList, caption);
            $('.something-left-cont').append(table); // defined in main_page.html
        };

        initIchigosMidiList();
        initMyMusicList();
    };

    var playDemo = function () {
        var mineList = Globals.shmidusicList;
        var index = Math.floor(Math.random() * mineList.length);
        console.log('Playing: ' + mineList[index].fileName);
        playback.play(mineList[index].sheetMusic);
    };

    return {
        init: init, // TODO: split to initShmidusicList() and initIchigosMidiList()
        playDemo: playDemo
    };
};
