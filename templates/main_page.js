
// requires Util.TableGenerator.js !
// requires Util.PianoLayoutPanel.js !
// requires Util.Player.js !

/** @param mainCont - div dom with children
 * structure defined in main_page.html */
var MainPage = function(mainCont)
{
    const
        $pianoCanvas = $(mainCont).find('.pianoLayoutCanvas'),
        $playbackControlCont = $(mainCont).find('.playbackControlCont'),
        sheetMusicCont = $(mainCont).find('.sheetMusicCont')[0],
        violinKeyImage = $(mainCont).find('.violinKeyImage')[0],
        bassKeyImage = $(mainCont).find('.bassKeyImage')[0],
        instrumentInfoBlock = $(mainCont).find('#instrumentInfoBlock')[0],
        drawSheetMusicFlag = $(mainCont).find('#drawSheetMusicFlag')[0],
        O_O = 'O_O'
        ;

    var googleLogInIdToken = null;

    const addToken = p => googleLogInIdToken === null ? p : $.extend({}, p, {googleLogInIdToken: googleLogInIdToken});
    const performExternal = (methodName, params, callback) => $.ajax({
        url: '/htbin/json_service.py' + '?f=' + methodName, // GET params just for cosmetics
        type: "post",
        data: JSON.stringify(addToken({methodName: methodName, params: params})),
        dataType: "json",
        contentType: 'application/json;UTF-8',
        success: callback
    });

    const enabledChannels = new Set(Ns.range(0,16));

    /** @TODO: add mute button */
    const repaintInstrumentInfo = function(instrByChannel)
    {
        $(instrumentInfoBlock).empty();

        var colorize = (channel) => $('<div></div>')
            .append(channel)
            .css('font-weight', 'bold')
            .css('color', 'rgba(' + Ns.channelColors[channel].join(',') + ',1)');

        const makeMuteFlag = (channel) => $('<input type="checkbox" checked="checked"/>')
            .click((e) => (e.target.checked
                ? enabledChannels.add(channel)
                : enabledChannels.delete(channel)
            ));

        var colModel = [
            {name: 'channelCode', caption: '*', formatter: makeMuteFlag},
            {name: 'channelCode', caption: 'Chan', formatter: colorize},
            {name: 'presetCode', caption: 'Pres'},
            {name: 'description', caption: 'Description'},
        ];

        var rows = Ns.range(0, 16).map(function(i)
        {
            if (i in instrByChannel) {
                const instrCode = instrByChannel[i];
                return {
                    channelCode: i,
                    presetCode: instrCode,
                    description: Ns.instrumentNames[instrCode],
                    /** @TODO: color */
                };
            } else {
                return {
                    channelCode: i,
                    presetCode: -1,
                    description: $('<div></div>')
                        .append('Channel Not Used')
                        .addClass('notUsed'),
                };
            }
        });

        var $table = Util.TableGenerator().generateTable(colModel, rows);

        $(instrumentInfoBlock).append($table);
    };

    var SynthAdapter = function(dropdownEl, controlEl)
    {
        var synths = {
            oscillator: Ns.Synths.Oscillator(),
            midiDevice: Util.Synths.MidiDevice(),
            FluidSynth3: Ns.Synths.WavCacher(),
            FluidSynth3_new: Ns.Synths.Fluid(),
            // pitchShifter: Ns.Synths.PitchShifter(),
        };

        var changeSynth = function() {
            synths[$(dropdownEl).val()].init($(controlEl));
        };

        $(dropdownEl).empty();
        var addOption = s => $(dropdownEl).append($('<option></option>').val(s).html(s));
        Object.keys(synths).forEach(addOption);
        $(dropdownEl).val('FluidSynth3_new').change(_ => changeSynth()).trigger('change');

        return {
            handleNoteOn: n => synths[$(dropdownEl).val()].playNote(n.tune, n.channel),
            consumeConfig: function(config, callback)
            {
                repaintInstrumentInfo(config);
                synths[$(dropdownEl).val()].consumeConfig(config, callback)
            }
        };
    };
    var synth = SynthAdapter(
        $(mainCont).find('#synthDropdown')[0],
        $(mainCont).find('#synthControl')[0]);

    var sheetMusicPainter = Ns.SheetMusicPainter('mainSongContainer');
    var pianoLayout = Util.PianoLayoutPanel($pianoCanvas);

    var player = Util.Player($playbackControlCont);
    player.addNoteHandler({handleNoteOn: function(noteJs, chordIndex)
    {
        if (enabledChannels.has(noteJs.channel)) {
            var noteOffs = [
                pianoLayout.handleNoteOn(noteJs, chordIndex),
                synth.handleNoteOn(noteJs, chordIndex),
                sheetMusicPainter.handleNoteOn(noteJs, chordIndex),
            ];

            return () => noteOffs.forEach(off => off());
        } else {
            return () => {};
        }
    }});
    player.addConfigConsumer(synth);

    var playRandom = _ => alert("Please, wait till midi names load from ajax!");

    var playStandardMidiFile = function(fileName, finishedFileName)
    {
        finishedFileName = finishedFileName || '';

        var params = {file_name: fileName, finished_file_name: finishedFileName};
        var method_name = 'get_standard_midi_file';

        console.log('Fetching...');

        performExternal(method_name, params, function(song)
        {
            console.log('Playing: ' + fileName, song);

            var whenFinished = (_) => playRandom({fileName: fileName});

            player.playStandardMidiFile(song, {fileName: fileName}, whenFinished);
            sheetMusicPainter.draw(Shmidusicator.fromMidi(song), true);
        })
    };

    var initIchigosMidiList = function ()
    {
        var playButtonFormatter = function(cell, row)
        {
            return $('<input type="button" value="Play!"/>')
                .click((_) => playStandardMidiFile(row.rawFileName));
        };

        /** @debug */
        console.log('gonna fetrch info');

        var callback = function(rowList)
        {
            /** @debug */
            console.log('fetched info');

            var colModel = [
                {'name': 'fileName', 'caption': 'File Name', formatter: p => p.split('/').pop()},
                //{'name': 'length', 'caption': 'Length'},
                {'name': 'score', 'caption': '*'},
                {'name': 'playButton', 'caption': 'Play', formatter: playButtonFormatter}
            ];

            var caption = 'From <a href="http://ichigos.com">ichigos.com</a>';

            var table = Util.TableGenerator().generateTable(colModel, rowList, caption, 10, 25);
            $('.random-midi-list-cont').append(table); // defined in main_page.html

            var random = Ns.UnfairRandom(rowList);

            playRandom = function(finishedFileInfo)
            {
                finishedFileInfo = finishedFileInfo || {fileName: ''};

                playStandardMidiFile(random.getAny().rawFileName, finishedFileInfo.fileName);
            };
        };

        performExternal('get_ichigos_midi_names', {}, callback)
    };

    var playShmidusicFile = function(file)
    {
        var song = file['sheetMusic'],
            name = file['fileName'];

        console.log('Playing shmidusic: ' + name);

        player.playShmidusic(song, name);
        sheetMusicPainter.draw(song);
    };

    var playDemo = function () {
        var mineList = Globals.shmidusicList;
        var index = Math.floor(Math.random() * mineList.length);
        playShmidusicFile(mineList[index]);
    };

    var initMyMusicList = function ()
    {
        var playButtonFormatter = function (cell, row) {
            return $('<input type="button" value="Play!"/>')
                    .click((_) => playShmidusicFile(row));
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
        $(mainCont).find('.myMusicCont').append(table); // defined in main_page.html
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

    drawSheetMusicFlag.onclick = () => sheetMusicPainter.setEnabled(drawSheetMusicFlag.checked);

    return {
        initIchigosMidiList: initIchigosMidiList,
        initMyMusicList: initMyMusicList,
        playDemo: playDemo,
        playRandom: (_) => playRandom(),
        handleGoogleSignIn: handleGoogleSignIn,
    };
};
