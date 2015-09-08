
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

    var pianoLayoutPanel = Util.PianoLayoutPanel($pianoCanvas);
    var playback = Util.Playback(pianoLayoutPanel);

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

    return {
        init: init, // TODO: split to initShmidusicList() and initIchigosMidiList()
        playDemo: playDemo
    };
};
