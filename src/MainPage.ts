/// <reference path="references.ts" />

// initialises the website main page - the js performed the moment page is loaded

import {IShmidusicStructure, IGeneralStructure} from "./DataStructures";
import {SheetMusicPainter} from "./compose/Painter";
import UnfairRandom from "./UnfairRandom";
import {ISmfFile} from "./DataStructures";
import {TableGenerator} from "./TableGenerator";
import {ColModel} from "./TableGenerator";
import {Kl} from "./Tools";
import PianoLayout from "./views/PianoLayout";
import {Player} from "./player/Player";
import {Switch} from "./synths/Switch";
import {PresetList} from "./views/PresetList";
type dict<Tx> = {[k: string]: Tx};

type cb = () => void;

/** @param mainCont - div dom with children
 * structure defined in index.html */
export default function MainPage(mainCont: HTMLDivElement)
{ 
    const
        pianoCanvas = <HTMLCanvasElement>$(mainCont).find('.pianoLayoutCanvas')[0],
        $playbackControlCont = $(mainCont).find('.playbackControlCont'),
        sheetMusicConfigCont = $(mainCont).find('#sheetMusicConfigDiv')[0],
        sheetMusicCont = $(mainCont).find('.sheetMusicCont')[0],
        violinKeyImage = $(mainCont).find('.violinKeyImage')[0],
        bassKeyImage = $(mainCont).find('.bassKeyImage')[0],
        instrumentInfoBlock = <HTMLDivElement>$(mainCont).find('#instrumentInfoBlock')[0],
        drawSheetMusicFlag = <HTMLInputElement>$(mainCont).find('#drawSheetMusicFlag')[0],
        playMidiFromDiskBtn = $(mainCont).find('input[type="button"].playMidiFromDiskBtn')[0],
        midiFileCounter = <HTMLAnchorElement>$(mainCont).find('#midiFileCounter')[0],
        O_O = 'O_O'
        ;

    var googleLogInIdToken: string = null;

    const addToken = (p: dict<any>) => googleLogInIdToken === null
        ? p : $.extend({}, p, {googleLogInIdToken: googleLogInIdToken});

    // TODO: make it "get" since it is just the single "getSongNames()" method, which could be cached and stuff
    const performExternal = (methodName: string, params: dict<any>, callback: {(data: {[k: string]: any}): void}) => $.ajax({
        url: '/htbin/json_service.py' + '?f=' + methodName, // GET params just for cosmetics
        type: "post",
        data: JSON.stringify(addToken({methodName: methodName, params: params})),
        dataType: "json",
        contentType: 'application/json;UTF-8',
        success: callback
    });
    
    const sheetMusicPainter = SheetMusicPainter('mainSongContainer', sheetMusicConfigCont);
    
    const synth = Switch(
        <HTMLSelectElement>$(mainCont).find('#synthDropdown')[0],
        <HTMLDivElement>$(mainCont).find('#synthControl')[0],
        PresetList(instrumentInfoBlock),
        PianoLayout(pianoCanvas)
    );

    const player = Player($playbackControlCont);
    player.addNoteHandler(synth);

    var playRandom = (_: any) => alert("Please, wait till midi names load from ajax!");

    const playSMF = (song: IGeneralStructure) =>
    {
        synth.consumeConfig(song.config.channels);
        synth.analyse(song.chordList);
        player.playSheetMusic(song, {}, () => {}, 0);
    };

    const playStandardMidiFile = function(fileName: string)
    {
        /** @debug */
        console.log(' ');
        console.log('gonna play', fileName);

        Kl.fetchMidi('/midiCollection/' + fileName, (song: IGeneralStructure) =>
        {
            synth.consumeConfig(song.config.channels);
            synth.analyse(song.chordList);
            player.playSheetMusic(song, {fileName: fileName},
                () => playRandom({fileName: fileName}));
        });
    };

    const makeFileName = function(path: string, row: {rawFileName: string}): HTMLAnchorElement
    {
        var result = document.createElement('a');
        result.setAttribute('href', 'http://shmidusic.lv/midiCollection/' + row.rawFileName);
        result.innerHTML = (path + '').replace(/[_\/]/g, ' ');

        return result;
    };

    const initIchigosMidiList = function ()
    {
        var playButtonFormatter = function(cell: string, row: ISmfFile)
        {
            return $('<input type="button" class="playBtn" value=">"/>')
                .click((_) => playStandardMidiFile(row.rawFileName));
        };

        /** @debug */
        console.log('gonna fetrch info');

        var callback = function(rowList: ISmfFile[])
        {
            $(midiFileCounter).html(rowList.length + '');

            var colModel: ColModel<ISmfFile> = [
                {'name': 'fileName', 'caption': 'File Name', formatter: makeFileName},
                //{'name': 'length', 'caption': 'Length'},
                {'name': 'score', 'caption': '*', formatter: null},
                {'name': 'playButton', 'caption': 'Play', formatter: playButtonFormatter}
            ];

            var caption = 'Mostly from <a href="http://ichigos.com">ichigos.com</a>';

            var table = TableGenerator().generateTable(colModel, rowList, caption, 50, 50);
            $('.random-midi-list-cont').append(table); // defined in index.html

            var random = UnfairRandom(rowList);

            playRandom = function(finishedFileInfo)
            {
                finishedFileInfo = finishedFileInfo || {fileName: ''};

                playStandardMidiFile(random.getAny().rawFileName);
            };
        };

        performExternal('get_ichigos_midi_names', {}, callback)
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
        playRandom: () => playRandom({}),
        handleGoogleSignIn: handleGoogleSignIn,
    };
};