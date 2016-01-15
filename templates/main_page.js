
// requires Util.TableGenerator.js !
// requires Util.PianoLayoutPanel.js !
// requires Util.Player.js !

var MainPage = function($pianoCanvas, $playbackControlCont)
{
    var googleLogInIdToken = null;

    var addToken = p => googleLogInIdToken === null ? p : $.extend({}, p, {googleLogInIdToken: googleLogInIdToken});
    var performExternal = (methodName, params, callback) => $.ajax({
        url: '/htbin/json_service.py' + '?f=' + methodName, // GET params just for cosmetics
        type: "post",
        data: JSON.stringify(addToken({methodName: methodName, params: params})),
        dataType: "json",
        contentType: 'application/json;UTF-8',
        success: callback
    });

    var SynthAdapter = function(dropdownEl, controlEl)
    {
        var synths = {
            oscillator: Util.Synths.Oscillator(),
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
    var synth = SynthAdapter($('#synthDropdown')[0], $('#synthControl')[0]);

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

    var playRandom = _ => alert("Please, wait till midi names load from ajax!");

    var initIchigosMidiList = function ()
    {
        var playButtonFormatter = function(cell, row)
        {
            var params = {file_name: row.rawFileName};
            var method_name = 'get_standard_midi_file';
            return $('<input type="button" value="Play!"/>')
                .click((_) => performExternal(method_name, params, answer => player.playStandardMidiFile(answer, row)));
        };

        var callback = function(rowList) {
            var colModel = [
                {'name': 'fileName', 'caption': 'File Name'},
                //{'name': 'length', 'caption': 'Length'},
                {'name': 'score', 'caption': '*'},
                {'name': 'playButton', 'caption': 'Play', formatter: playButtonFormatter}
            ];

            var caption = 'From <a href="http://ichigos.com">ichigos.com</a>';

            var table = Util.TableGenerator().generateTable(colModel, rowList, caption, 10, 25);
            $('.random-midi-list-cont').append(table); // defined in main_page.html

            playRandom = function(finishedFileInfo)
            {
                finishedFileInfo = finishedFileInfo || '';

                var index = Math.floor(Math.random() * rowList.length);
                console.log('Playing: ' + rowList[index].fileName);

                var params = {file_name: rowList[index].rawFileName, finished_file_name: finishedFileInfo.fileName};
                var method_name = 'get_standard_midi_file';
                performExternal(method_name, params,
                    (answer) => player.playStandardMidiFile(answer, rowList[index],
                    (_) => playRandom(rowList[index]))
                );
            };
        };

        performExternal('get_ichigos_midi_names', {}, callback)
    };

    var initMyMusicList = function () {

        var playButtonFormatter = function (cell, row) {
            return $('<input type="button" value="Play!"/>')
                    .click((_) => player.playShmidusic(row['sheetMusic'], row['fileName']));
        };

        /** @TODO: fetch it with a separate request */
        var rowList = Globals.shmidusicList;
        rowList.sort((a,b) => a.fileName.localeCompare(b.fileName)); // sorting lexicographically

        var colModel = [
            {'name': 'fileName', 'caption': 'File Name', formatter: s => s.split('_').join(' ')},
            {'name': 'playButton', 'caption': 'Play', formatter: playButtonFormatter}
        ];

        var caption = 'My music';

        var table = Util.TableGenerator().generateTable(colModel, rowList, caption);
        $('.something-left-cont').append(table); // defined in main_page.html
    };

    var handleGoogleSignIn = function(googleUser, $infoCont)
    {
        $infoCont.find('.g-signin2').css('display', 'none');

        var profile = googleUser.getBasicProfile();

        $infoCont.find('.logInStatusHolder').html('Logged-In as ' + profile.getEmail().split('@')[0]);
        $infoCont.find('.userImage').attr('src', profile.getImageUrl());

        googleLogInIdToken = googleUser.getAuthResponse().id_token;
        
        /** @TODO: token expires in about two hours - need to rerequest it */
    };

    return {
        initIchigosMidiList: initIchigosMidiList,
        initMyMusicList: initMyMusicList,
        playDemo: playDemo,
        playRandom: (_) => playRandom(),
        handleGoogleSignIn: handleGoogleSignIn,
    };
};
