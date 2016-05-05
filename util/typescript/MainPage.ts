
/// <reference path="references.ts" />

// initialises the website main page - the js performed the moment page is loaded

import {Fluid} from "./synths/Fluid";
import {Oscillator} from "./synths/Oscillator";
import {IShNote} from "./DataStructures";
import Shmidusicator from "./player/Shmidusicator";
import {IGeneralStructure} from "./DataStructures";
import {IMidJsSong} from "./DataStructures";
import {IShmidusicStructure} from "./DataStructures";
import {SheetMusicPainter} from "./compose/Painter";
import UnfairRandom from "./UnfairRandom";
import {ISmfFile} from "./DataStructures";
import {ISMFreaded} from "./DataStructures";
import {TableGenerator} from "./TableGenerator";
import {ColModel} from "./TableGenerator";
import {Kl} from "./Tools";
import {MidiDevice} from "./synths/MidiDevice";
import {Structurator} from "./player/Structurator";
import {PresetList} from "./Views";
type dict<Tx> = {[k: string]: Tx};

declare var Util: any;

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
        instrumentInfoBlock = <HTMLDivElement>$(mainCont).find('#instrumentInfoBlock')[0],
        drawSheetMusicFlag = <HTMLInputElement>$(mainCont).find('#drawSheetMusicFlag')[0],
        playMidiFromDiskBtn = $(mainCont).find('input[type="button"].playMidiFromDiskBtn')[0],
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

    const presetListControl = PresetList(instrumentInfoBlock);
    const sheetMusicPainter = SheetMusicPainter('mainSongContainer', sheetMusicConfigCont);
    const pianoLayout = Util.PianoLayoutPanel($pianoCanvas);

    const audioCtx = new AudioContext();

    const SynthAdapter = function(dropdownEl: HTMLSelectElement, controlEl: HTMLDivElement)
    {
        var synths: dict<ISynth> = {
            oscillator: Oscillator(audioCtx),
            midiDevice: MidiDevice(),
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
                presetListControl.repaint(config);
                synths[$(dropdownEl).val()].consumeConfig(config)
            }
        };
    };
    const synth = SynthAdapter(
        <HTMLSelectElement>$(mainCont).find('#synthDropdown')[0],
        <HTMLDivElement>$(mainCont).find('#synthControl')[0]);

    const player = Util.Player($playbackControlCont);
    player.addNoteHandler({handleNoteOn: function(noteJs: IShNote, chordIndex: number)
    {
        if (presetListControl.enabledChannels().has(noteJs.channel)) {
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

    const playSMF = (smf: ISMFreaded) =>
        player.playSheetMusic(Structurator(smf), {}, () => {}, 0);

    const playMidiFromServer = (relPath: string) =>
        Kl.fetchMidi('/midiCollection/' + relPath, playSMF);

    const playStandardMidiFile = function(fileName: string, finishedFileName?: string)
    {
        /** @debug */
        console.log('gonna play', fileName);
        playMidiFromServer(fileName);

        //finishedFileName = finishedFileName || '';
        //
        //var params = {file_name: fileName, finished_file_name: finishedFileName};
        //var method_name = 'get_standard_midi_file';
        //
        //console.log('Fetching...');
        //
        //performExternal(method_name, params, function(song: IMidJsSong)
        //{
        //    console.log('Playing: ' + fileName, song);
        //
        //    var whenFinished = () => playRandom({fileName: fileName});
        //
        //    player.playStandardMidiFile(song, {fileName: fileName}, whenFinished);
        //    sheetMusicPainter.draw(Shmidusicator.fromMidJs(song));
        //})
    };

    const initIchigosMidiList = function ()
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

            var colModel: ColModel<ISmfFile> = [
                {'name': 'fileName', 'caption': 'File Name', formatter: p => (p + '').split('/').pop()},
                //{'name': 'length', 'caption': 'Length'},
                {'name': 'score', 'caption': '*', formatter: null},
                {'name': 'playButton', 'caption': 'Play', formatter: playButtonFormatter}
            ];

            var caption = 'From <a href="http://ichigos.com">ichigos.com</a>';

            var table = TableGenerator().generateTable(colModel, rowList, caption, 10, 25);
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

    const playShmidusicFile = function(file: {sheetMusic: IShmidusicStructure, fileName: string})
    {
        var song = file['sheetMusic'],
            name = file['fileName'];

        console.log('Playing shmidusic: ' + name);

        player.playShmidusic(song, name);
        sheetMusicPainter.draw(song);
    };

    const playDemo = function () {
        var mineList: any = [];
        var index = Math.floor(Math.random() * mineList.length);
        playShmidusicFile(mineList[index]);
    };

    const initMyMusicList = function ()
    {
        var playButtonFormatter = function (cell: string, row: any) {
            return $('<input type="button" value="Play!"/>')
                .click((_) => playShmidusicFile(row));
        };

        /** @TODO: fetch it with a separate request */
        var rowList: any[] = [];
        rowList.sort((a,b) => a.fileName.localeCompare(b.fileName)); // sorting lexicographically

        var colModel: ColModel<any> = [
            {'name': 'fileName', 'caption': 'File Name', formatter: s => (s + '').split('_').join(' ')},
            {'name': 'playButton', 'caption': 'Play', formatter: playButtonFormatter}
        ];

        var caption = 'My music';

        var table = TableGenerator().generateTable(colModel, rowList, caption);
        $(mainCont).find('.myMusicCont').append(table); // defined in index.html
    };

    const handleGoogleSignIn = function(googleUser: any, $infoCont: JQuery)
    {
        $infoCont.find('.g-signin2').css('display', 'none');

        var profile = googleUser.getBasicProfile();

        $infoCont.find('.logInStatusHolder').html('Logged-In as ' + profile.getEmail().split('@')[0]);
        $infoCont.find('.userImage').attr('src', profile.getImageUrl());

        googleLogInIdToken = googleUser.getAuthResponse().id_token;

        /** @TODO: token expires in about two hours - need to rerequest it */
    };

    drawSheetMusicFlag.onclick = () =>
        sheetMusicPainter.setEnabled(drawSheetMusicFlag.checked);

    playMidiFromDiskBtn.onclick = () => Kl.openMidi(playSMF);

    return {
        initIchigosMidiList: initIchigosMidiList,
        // initMyMusicList: initMyMusicList,
        playDemo: playDemo,
        playRandom: () => playRandom({}),
        handleGoogleSignIn: handleGoogleSignIn,
    };
};