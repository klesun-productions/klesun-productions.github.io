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
import PlaybackControl from "./views/PlaybackControl";
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
        playRandomBtn = $(mainCont).find('.playRandomBtn')[0],
        playMidiFromDiskBtn = $(mainCont).find('.playMidiFromDiskBtn')[0],
        midiFileCounter = <HTMLAnchorElement>$(mainCont).find('#midiFileCounter')[0],
        O_O = 'O_O'
        ;

    var googleLogInIdToken: string = null;

    const addToken = (p: dict<any>) => googleLogInIdToken === null
        ? p : $.extend({}, p, {googleLogInIdToken: googleLogInIdToken});

    // TODO: make it "get" since it is just the single "getSongNames()" method, which could be cached and stuff
    const performExternal = (methodName: string, params: dict<any>, callback: (tuple: [any, string]) => void) => $.ajax({
        url: '/htbin/json_service.py' + '?f=' + methodName, // GET params just for cosmetics
        cache: true,
        success: callback
    });
    
    const sheetMusicPainter = SheetMusicPainter('mainSongContainer', sheetMusicConfigCont);
    
    const synth = Switch(
        <HTMLSelectElement>$(mainCont).find('#synthDropdown')[0],
        <HTMLDivElement>$(mainCont).find('#synthControl')[0],
        PresetList(instrumentInfoBlock),
        PianoLayout(pianoCanvas)
    );

    const control = PlaybackControl($playbackControlCont);
    const player = Player(control);
    player.addNoteHandler(synth);

    var playRandom = () => alert("Please, wait till midi names load from ajax!");

    const playSMF = (song: IGeneralStructure) =>
    {
        synth.consumeConfig(song.config.channels);
        synth.analyse(song.chordList);

        player.playSheetMusic(song, () => {}, 0);
    };

    const songDirUrl = '/Dropbox/web/midiCollection/';

    const playStandardMidiFile = function(fileInfo: ISmfFile)
    {
        /** @debug */
        console.log(' ');
        console.log('gonna play', fileInfo.fileName);

        Kl.fetchMidi(songDirUrl + '/' + fileInfo.fileName, (song: IGeneralStructure) =>
        {
            synth.consumeConfig(song.config.channels);
            synth.analyse(song.chordList);
            control.setFields(song);
            control.setFileInfo(fileInfo);

            player.playSheetMusic(song, () => playRandom());
        });
    };

    const makeFileName = function(path: string, row: {rawFileName: string}): HTMLAnchorElement
    {
        var result = document.createElement('a');
        result.setAttribute('href', songDirUrl + '/' + row.rawFileName);
        result.innerHTML = (path + '').replace(/[_\/]/g, ' ');

        return result;
    };

    const initIchigosMidiList = function ()
    {
        var playButtonFormatter = function(cell: string, row: ISmfFile)
        {
            return $('<input type="button" class="playBtn" value=">"/>')
                .click((_) => playStandardMidiFile(row));
        };

        /** @debug */
        console.log('gonna fetrch info');

        var callback = function(tuple: [ISmfFile[], string])
        {
            var [rowList, error] = tuple;
            if (error) {
                alert('Failed to retrieve song names' + error);
                return;
            }
            
            $(midiFileCounter).html(rowList.length + '');

            var colModel: ColModel<ISmfFile> = [
                {'name': 'fileName', 'caption': 'File Name', formatter: makeFileName},
                //{'name': 'length', 'caption': 'Length'},
                {'name': 'rating', 'caption': '*', formatter: null},
                {'name': 'playButton', 'caption': 'Play', formatter: playButtonFormatter}
            ];

            var caption = 'Mostly from <a href="http://ichigos.com">ichigos.com</a>';

            var table = TableGenerator().generateTable(colModel, rowList, caption, 500, 200);
            $('.random-midi-list-cont').append(table); // defined in index.html

            var random = UnfairRandom(rowList);

            playRandom = () => playStandardMidiFile(random.getAny());
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
    playRandomBtn.onclick = () => playRandom();

    return {
        initIchigosMidiList: initIchigosMidiList,
        // initMyMusicList: initMyMusicList, 
        handleGoogleSignIn: handleGoogleSignIn,
    };
};