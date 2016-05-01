
/// <reference path="references.ts" />

// initialises the website main page - the js performed the moment page is loaded

import {Fluid} from "./synths/Fluid";
import {Oscillator} from "./synths/Oscillator";
import {IShNote} from "./DataStructures";
import Shmidusicator from "./Shmidusicator";
import {IGeneralStructure} from "./DataStructures";
import {ISmfStructure} from "./DataStructures";
import {IShmidusicStructure} from "./DataStructures";
import {SheetMusicPainter} from "./compose/Painter";
import UnfairRandom from "./UnfairRandom";
import {ISmfFile} from "./DataStructures";
type dict<Tx> = {[k: string]: Tx};

/** @param mainCont - div dom with children
 * structure defined in index.html */
export default function MainPage(mainCont: HTMLDivElement)
{
    const
        $pianoCanvas = $(mainCont).find('.pianoLayoutCanvas'),
        $playbackControlCont = $(mainCont).find('.playbackControlCont'),
        sheetMusicConfigCont = $(mainCont).find('#sheetMusicConfigDiv')[0],
        sheetMusicCont = $(mainCont).find('.sheetMusicCont')[0],
        violinKeyImage = $(mainCont).find('.violinKeyImage')[0],
        bassKeyImage = $(mainCont).find('.bassKeyImage')[0],
        instrumentInfoBlock = $(mainCont).find('#instrumentInfoBlock')[0],
        drawSheetMusicFlag = <HTMLInputElement>$(mainCont).find('#drawSheetMusicFlag')[0],
        O_O = 'O_O'
        ;

    var googleLogInIdToken: string = null;

    const addToken = (p: dict<any>) => googleLogInIdToken === null
        ? p : $.extend({}, p, {googleLogInIdToken: googleLogInIdToken});

    const performExternal = (methodName: string, params: dict<any>, callback: {(data: {[k: string]: any}): void}) => $.ajax({
        url: '/htbin/json_service.py' + '?f=' + methodName, // GET params just for cosmetics
        type: "post",
        data: JSON.stringify(addToken({methodName: methodName, params: params})),
        dataType: "json",
        contentType: 'application/json;UTF-8',
        success: callback
    });

    var enabledChannels = new Set(Kl.range(0,16));

    const repaintInstrumentInfo = (instrByChannel: {[c: number]: number}) =>
    {
        $(instrumentInfoBlock).empty();
        enabledChannels = new Set(Kl.range(0,16));

        var colorize = (channel: number) => $('<div></div>')
            .append(channel + '')
            .css('font-weight', 'bold')
            .css('color', 'rgba(' + Kl.channelColors[channel].join(',') + ',1)');

        const makeMuteFlag = (channel: number) => $('<input type="checkbox" checked="checked"/>')
            .click((e: any) => (e.target.checked
                    ? enabledChannels.add(channel)
                    : enabledChannels.delete(channel)
            ));

        var colModel = [
            {name: 'channelCode', caption: '*', formatter: makeMuteFlag},
            {name: 'channelCode', caption: 'Chan', formatter: colorize},
            {name: 'presetCode', caption: 'Pres'},
            {name: 'description', caption: 'Description'},
        ];

        var rows = Kl.range(0, 16).map(function(i)
        {
            if (i in instrByChannel) {
                const instrCode = instrByChannel[i];
                return {
                    channelCode: i,
                    presetCode: instrCode,
                    description: Kl.instrumentNames[instrCode],
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

    var audioCtx = new AudioContext();

    var SynthAdapter = function(dropdownEl: HTMLSelectElement, controlEl: HTMLDivElement)
    {
        var synths: dict<ISynth> = {
            oscillator: Oscillator(audioCtx),
            midiDevice: Util.Synths.MidiDevice(),
            FluidSynth3: Fluid(audioCtx, 'http://shmidusic.lv/out/sf2parsed/fluid/'),
            Arachno: Fluid(audioCtx, 'http://shmidusic.lv/out/sf2parsed/arachno/'),
            GeneralUser: Fluid(audioCtx, 'http://shmidusic.lv/out/sf2parsed/generaluser/'),
        };

        var changeSynth = function() {
            synths[$(dropdownEl).val()].init($(controlEl));
        };

        $(dropdownEl).empty();
        Object.keys(synths).forEach(s => $(dropdownEl)
            .append($('<option></option>').val(s).html(s)));

        $(dropdownEl).val('FluidSynth3').change(_ => changeSynth()).trigger('change');

        return {
            handleNoteOn: (n: IShNote, i: number) => synths[$(dropdownEl).val()].playNote(n.tune, n.channel),
            consumeConfig: function(config: {[c: number]: number})
            {
                repaintInstrumentInfo(config);
                synths[$(dropdownEl).val()].consumeConfig(config)
            }
        };
    };
    var synth = SynthAdapter(
        <HTMLSelectElement>$(mainCont).find('#synthDropdown')[0],
        <HTMLDivElement>$(mainCont).find('#synthControl')[0]);

    var sheetMusicPainter = SheetMusicPainter('mainSongContainer', sheetMusicConfigCont);
    var pianoLayout = Util.PianoLayoutPanel($pianoCanvas);

    var player = Util.Player($playbackControlCont);
    player.addNoteHandler({handleNoteOn: function(noteJs: IShNote, chordIndex: number)
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

    var playRandom = (_: any) => alert("Please, wait till midi names load from ajax!");

    var playStandardMidiFile = function(fileName: string, finishedFileName?: string)
    {
        finishedFileName = finishedFileName || '';

        var params = {file_name: fileName, finished_file_name: finishedFileName};
        var method_name = 'get_standard_midi_file';

        console.log('Fetching...');

        performExternal(method_name, params, function(song: ISmfStructure)
        {
            console.log('Playing: ' + fileName, song);

            var whenFinished = () => playRandom({fileName: fileName});

            player.playStandardMidiFile(song, {fileName: fileName}, whenFinished);
            sheetMusicPainter.draw(Shmidusicator.fromMidi(song));
        })
    };

    type ColModel = Array<{
        name: string,
        caption: string,
        formatter?: {(c: string, r: ISmfFile): (string | JQuery)}
    }>

    var initIchigosMidiList = function ()
    {
        var playButtonFormatter = function(cell: string, row: ISmfFile)
        {
            return $('<input type="button" value="Play!"/>')
                .click((_) => playStandardMidiFile(row.rawFileName));
        };

        /** @debug */
        console.log('gonna fetrch info');

        var callback = function(rowList: [ISmfFile])
        {
            /** @debug */
            console.log('fetched info');

            var colModel: ColModel = [
                {'name': 'fileName', 'caption': 'File Name', formatter: p => p.split('/').pop()},
                //{'name': 'length', 'caption': 'Length'},
                {'name': 'score', 'caption': '*', formatter: null},
                {'name': 'playButton', 'caption': 'Play', formatter: playButtonFormatter}
            ];

            var caption = 'From <a href="http://ichigos.com">ichigos.com</a>';

            var table = Util.TableGenerator().generateTable(colModel, rowList, caption, 10, 25);
            $('.random-midi-list-cont').append(table); // defined in index.html

            var random = UnfairRandom(rowList);

            playRandom = function(finishedFileInfo)
            {
                finishedFileInfo = finishedFileInfo || {fileName: ''};

                playStandardMidiFile(random.getAny().rawFileName, finishedFileInfo.fileName);
            };
        };

        performExternal('get_ichigos_midi_names', {}, callback)
    };

    var playShmidusicFile = function(file: {sheetMusic: IShmidusicStructure, fileName: string})
    {
        var song = file['sheetMusic'],
            name = file['fileName'];

        console.log('Playing shmidusic: ' + name);

        player.playShmidusic(song, name);
        sheetMusicPainter.draw(song);
    };

    var playDemo = function () {
        var mineList: any = [];
        var index = Math.floor(Math.random() * mineList.length);
        playShmidusicFile(mineList[index]);
    };

    var initMyMusicList = function ()
    {
        var playButtonFormatter = function (cell: string, row: any) {
            return $('<input type="button" value="Play!"/>')
                .click((_) => playShmidusicFile(row));
        };

        /** @TODO: fetch it with a separate request */
        var rowList: any[] = [];
        rowList.sort((a,b) => a.fileName.localeCompare(b.fileName)); // sorting lexicographically

        var colModel: ColModel = [
            {'name': 'fileName', 'caption': 'File Name', formatter: s => s.split('_').join(' ')},
            {'name': 'playButton', 'caption': 'Play', formatter: playButtonFormatter}
        ];

        var caption = 'My music';

        var table = Util.TableGenerator().generateTable(colModel, rowList, caption);
        $(mainCont).find('.myMusicCont').append(table); // defined in index.html
    };

    var handleGoogleSignIn = function(googleUser: any, $infoCont: JQuery)
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
        // initMyMusicList: initMyMusicList,
        playDemo: playDemo,
        playRandom: () => playRandom({}),
        handleGoogleSignIn: handleGoogleSignIn,
    };
};