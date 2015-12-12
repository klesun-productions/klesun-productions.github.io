
// requires Util.TableGenerator.js !
// requires Util.PianoLayoutPanel.js !
// requires Util.Player.js !

var MainPage = function($pianoCanvas, $playbackControlCont) {

    var performExternal = function(scriptName, callback) {

        xmlhttp = new XMLHttpRequest();
        var isDone = (_) => xmlhttp.readyState == XMLHttpRequest.DONE;
        var isOk = (_) => xmlhttp.status == 200;
        var getResponse = (_) => JSON.parse(xmlhttp.responseText);
        var getErrorMessage = (_) => 'Failed to get ajax with script ' + script + ' status: ' + xmlhttp.status;

        xmlhttp.onreadystatechange = (_) => isDone()
            ? (isOk() ? callback(getResponse()) : alert(getErrorMessage()))
            : -100;

        xmlhttp.open("GET", "/htbin/" + scriptName, true);
        xmlhttp.send();
    };

    var RealSynthAdapter = function(dropdownEl, controlEl)
    {
        var synths = {
            oscillator: Util.Synths.Oscillator(),
            mudcube: Util.Synths.Mudcube(),
            midiDevice: Util.Synths.MidiDevice()
        };

        var changeSynth = function() {
            synths[$(dropdownEl).val()].init($(controlEl));
        };

        $(dropdownEl).empty();
        var addOption = s => $(dropdownEl).append($('<option></option>').val(s).html(s));
        Object.keys(synths).forEach(addOption);
        $(dropdownEl).val('oscillator').change(_ => changeSynth()).trigger('change');

        return {
            handleNoteOn: n => synths[$(dropdownEl).val()].playNote(n.tune, n.channel),
            consumeConfig: (config, callback) => synths[$(dropdownEl).val()].consumeConfig(config, callback)
        };
    };
    var synth = RealSynthAdapter($('#synthDropdown')[0], $('#synthControl')[0]);

    var player = Util.Player($playbackControlCont);
    player.addNoteHandler(Util.PianoLayoutPanel($pianoCanvas));
    player.addNoteHandler(synth);
    player.addConfigConsumer(synth);

    var playDemo = function () {
        var mineList = Globals.shmidusicList;
        var index = Math.floor(Math.random() * mineList.length);
        console.log('Playing: ' + mineList[index].fileName);
        player.playShmidusic(mineList[index].sheetMusic, mineList[index].fileName);
    };

    var playRandom = (_) => alert("Please, wait till midi names load from ajax!");

    var init = function () {

        var initIchigosMidiList = function () {

            var playButtonFormatter = function (cell, row) {
                var link = 'get_standard_midi_file.py?params_json_utf8_base64=' + btoa(JSON.stringify({file_name: row.rawFileName}));
                return $('<input type="button" value="Play!"/>')
                    .click((_) => performExternal(link, answer => player.playStandardMidiFile(answer, row.rawFileName)));
            };

			var callback = function (rowList) {
				var colModel = [
					{'name': 'fileName', 'caption': 'File Name'},
					//{'name': 'length', 'caption': 'Length'},
					{'name': 'score', 'caption': '*'},
					{'name': 'playButton', 'caption': 'Play', formatter: playButtonFormatter}
				];

				var caption = 'From <a href="http://ichigos.com">ichigos.com</a>';
				
				var table = Util.TableGenerator().generateTable(colModel, rowList, caption, 10, 25);
				$('.random-midi-list-cont').append(table); // defined in main_page.html

                playRandom = function (finishedFileName) {

                    finishedFileName = finishedFileName || '';

                    var index = Math.floor(Math.random() * rowList.length);
                    console.log('Playing: ' + rowList[index].fileName);

                    var link = 'get_standard_midi_file.py?params_json_utf8_base64=' + btoa(JSON.stringify({file_name: rowList[index].rawFileName, finished_file_name: finishedFileName}));
                    performExternal(link, answer => player.playStandardMidiFile(answer, rowList[index].fileName, (_) => playRandom(rowList[index].rawFileName)));
                };
			};
		
			performExternal('get_ichigos_midi_names.py', callback)
        };

        var initMyMusicList = function () {

            var playButtonFormatter = function (cell, row) {
                return $('<input type="button" value="Play!"/>')
                        .click((_) => player.playShmidusic(row['sheetMusic'], row['fileName']));
            };

            /** @TODO: fetch it with a separate request */
            rowList = Globals.shmidusicList;
            rowList.sort((a,b) => a.fileName.localeCompare(b.fileName)); // sorting lexicographically

            var colModel = [
                {'name': 'fileName', 'caption': 'File Name', formatter: s => s.split('_').join(' ')},
                {'name': 'playButton', 'caption': 'Play', formatter: playButtonFormatter}
            ];

            var caption = 'My music';

            var table = Util.TableGenerator().generateTable(colModel, rowList, caption);
            $('.something-left-cont').append(table); // defined in main_page.html
        };

        initIchigosMidiList();
        initMyMusicList();
    };

    return {
        init: init, // TODO: split to initShmidusicList() and initIchigosMidiList()
        playDemo: playDemo,
        playRandom: (_) => playRandom(),
    };
};
