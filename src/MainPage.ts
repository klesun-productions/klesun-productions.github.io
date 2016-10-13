/// <reference path="references.ts" />

// initialises the website main page - the js performed the moment page is loaded

import {IShmidusicStructure, IGeneralStructure} from "./DataStructures";
import {SheetMusicPainter} from "./compose/Painter";
import UnfairRandom from "./UnfairRandom";
import {ISmfFile} from "./DataStructures";
import {TableGenerator} from "./TableGenerator";
import {ColModel} from "./TableGenerator";
import {Tls} from "./utils/Tls";
import PianoLayout from "./views/PianoLayout";
import {Player} from "./player/Player";
import {Switch} from "./synths/Switch";
import {PresetList} from "./views/PresetList";
import PlaybackControl from "./views/PlaybackControl";
import {ServApi} from "./utils/ServApi";

export interface ytlink_t {
    youtubeId: string,
    viewCount: number,
    videoName: string,
};

let $$ = (selector: string, el?: HTMLElement) =>
    <HTMLElement[]>Array.from((el || document).querySelectorAll(selector));

/** @param mainCont - div dom with children
 * structure defined in index.html */
export let MainPage = function (mainCont: HTMLDivElement)
{
    let pianoCanvas = <HTMLCanvasElement>$$('.pianoLayoutCanvas', mainCont)[0],
        $playbackControlCont = $(mainCont).find('.playbackControlCont'), // TODO: get rid of $
        sheetMusicConfigCont = $$('#sheetMusicConfigDiv', mainCont)[0],
        sheetMusicCont = $$('.sheetMusicCont', mainCont)[0],
        violinKeyImage = $$('.violinKeyImage', mainCont)[0],
        bassKeyImage = $$('.bassKeyImage', mainCont)[0],
        instrumentInfoBlock = <HTMLDivElement>$$('#instrumentInfoBlock', mainCont)[0],
        drawSheetMusicFlag = <HTMLInputElement>$$('#drawSheetMusicFlag', mainCont)[0],
        playRandomBtn = $$('.playRandomBtn', mainCont)[0],
        playMidiFromDiskBtn = $$('.playMidiFromDiskBtn', mainCont)[0],
        midiFileCounter = <HTMLAnchorElement>$$('#midiFileCounter', mainCont)[0],
        youtubeEmbededVideosCont = <HTMLDivElement>$$('#youtubeEmbededVideosCont', mainCont)[0],
        preCompiledOggControl = <HTMLAudioElement>$$('#preCompiledOggControl', mainCont)[0],
        O_O = 'O_O'
        ;
    
    const sheetMusicPainter = SheetMusicPainter('mainSongContainer', sheetMusicConfigCont);

    const piano = PianoLayout(pianoCanvas);
    const synth = Switch(
        <HTMLSelectElement>$(mainCont).find('#synthDropdown')[0],
        <HTMLDivElement>$(mainCont).find('#synthControl')[0],
        PresetList(instrumentInfoBlock)
    );
    piano.onClick((semitone) => synth.playNote(semitone, 0, 127, -1));

    const control = PlaybackControl($playbackControlCont);
    const player = Player(control);
    player.anotherNoteHandler = synth.playNote;
    player.anotherNoteHandler = (sem, cha) => piano.highlight(sem, cha);

    var playRandom = () => alert("Please, wait till midi names load from ajax!");
    let linksBySongName: {[fileName: string]: ytlink_t[]} = {};
    // time-outing cuz i suspect it slows down initialization
    setTimeout(() => ServApi.getYoutubeLinks((links) => linksBySongName = links), 500);

    const playSMF = (song: IGeneralStructure) =>
    {
        synth.consumeConfig(song.config.channels);
        synth.analyse(song.chordList);

        player.playSheetMusic(song, () => {}, 0);
    };

    const songDirUrl = '/Dropbox/web/midiCollection/';
    const preCompiledOggRoot = '/out/convertedOgg/';

    let embedYoutubeVideos = function(urls: ytlink_t[])
    {
        let badWords = ['acapella', 'piano', 'cover', 'synthesia', 'remix'];

        youtubeEmbededVideosCont.innerHTML = '';
        urls
            // .sort((a,b) => b.viewCount - a.viewCount)
            .forEach(record => {
                youtubeEmbededVideosCont.appendChild($('<div style="float: left"></div>')
                    .append($('<div></div>')
                        .append(record.viewCount + ''))
                    .append($('<button>Embed!</button>').click(function() {
                        $(this).replaceWith($('<iframe></iframe>')
                            .attr('width', 320)
                            .attr('height', 240)
                            .attr('src', 'https://www.youtube.com/embed/' + record.youtubeId + '?autoplay=1')
                            // likely optional
                            .attr('frameborder', '0')
                            .attr('allowfullscreen', 'allowfullscreen'));
                    }))[0]);
            });
    };

    const playStandardMidiFile = function(fileInfo: ISmfFile)
    {
        /** @debug */
        console.log(' ');
        console.log('gonna play', fileInfo.fileName);

        player.stop();
        setTimeout(() => Tls.fetchMidi(songDirUrl + '/' + fileInfo.fileName, (song: IGeneralStructure) =>
        {
            synth.consumeConfig(song.config.channels);
            synth.analyse(song.chordList);
            control.setFields(song);
            control.setFileInfo(fileInfo);

            player.playSheetMusic(song, () => playRandom());
        })); // timeout for youtube embeded videos to load so it did not lag

        embedYoutubeVideos(linksBySongName[fileInfo.fileName] || []);
        (<any>$$('source', preCompiledOggControl)[0]).src = preCompiledOggRoot + '/' + fileInfo.fileName + '.ogg';
        // to trigger audio reload. HTMLMediaElement.load() is not an option, it does synchronous http request
        let par = preCompiledOggControl.parentElement;
        par.innerHTML = par.innerHTML;
        preCompiledOggControl = <HTMLAudioElement>$$('audio', par)[0];
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

        ServApi.get_ichigos_midi_names((rowList: ISmfFile[]) => {
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
        });
    };

    drawSheetMusicFlag.onclick = () =>
        sheetMusicPainter.setEnabled(drawSheetMusicFlag.checked);

    playMidiFromDiskBtn.onclick = () => Tls.openMidi(playSMF);
    playRandomBtn.onclick = () => playRandom();

    initIchigosMidiList();
};