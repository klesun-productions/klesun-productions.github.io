
// requires TableGenerator.js !
// requires PianoLayoutPanel.js !

var MainPage = function($pianoCanvas) {

    var pianoLayoutPanel = Util.PianoLayoutPanel($pianoCanvas);
    var playback = Util.Playback(pianoLayoutPanel);

    var init = function () {

        var play = function () {
            playback.play();
        };

        var playButtonFormatter = function (cell, row) {
            return $('<input type="button" value="Play!"/>')
                    .click(() => playback.play(row['sheetMusic']));
        };

        var initIchigosMidiList = function () {

            rowList = Globals.midiFileList

            var colModel = [
                {'name': 'fileName', 'caption': 'File Name'},
                {'name': 'length', 'caption': 'Length'},
                {'name': 'score', 'caption': 'My Score'},
                {'name': 'playButton', 'caption': 'Play', formatter: () => $('<input type="button" value="Play!"/>').click(() => alert('Midi File Playback Not Implemented Yet!'))}
            ];

            var caption = 'Some random midi files from my collection provided by <a href="http://ichigos.com">ichigos.com</a>';

            var table = Util.TableGenerator().generateTable(colModel, rowList, caption);
            $('.random-midi-list-cont').append(table); // defined in main_page.html
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

    return {
        init: init // TODO: split to initShmidusicList() and initIchigosMidiList()
    };
};