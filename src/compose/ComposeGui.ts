
import {SheetMusicPainter} from "./Painter";
import PianoLayout from "../views/PianoLayout";
import {PresetList} from "../views/PresetList";
import {Switch} from "../synths/Switch";
import {Tls} from "../utils/Tls";
import {Dom} from "../utils/Dom";
import {ServApi} from "../utils/ServApi";

let $$ = (selector: string, el?: HTMLElement) =>
    <HTMLElement[]>Array.from((el || document).querySelectorAll(selector));

/**
 * provides mapping to dom elements
 */
export let ComposeGui = function(cont: HTMLDivElement)
{
    let painter = SheetMusicPainter('sheetMusicDiv', $$('#visualConfigDiv', cont)[0]);
    painter.setEnabled(true);

    let sheetMusicCont = $$('#sheetMusicDiv', cont)[0];
    $(sheetMusicCont).attr('tabindex', 1);

    $(sheetMusicCont).focus();

    $$('input,select').forEach(el => {
        let wasCb = el.onchange;
        el.onchange = (e) => {
            wasCb && wasCb(e);
            sheetMusicCont.focus();
        };
    });
    $$('body')[0].addEventListener('focus', () => sheetMusicCont.focus());

    let piano = PianoLayout(<HTMLCanvasElement>$$('#pianoCanvas', cont)[0]);
    let channelListControl = PresetList(<HTMLDivElement>$$('#presetListBlock', cont)[0]);

    let inputChannelDropdown = <HTMLSelectElement>$$('.inputChannelDropdown', cont)[0];

    let makeChannelOption = (i: number) =>
        $('<option/>').val(i).html('' + i).attr('data-channel', i);

    $(inputChannelDropdown).append(Tls.range(0,16).map(makeChannelOption))
        .change(() => $(inputChannelDropdown).attr('data-channel', $(inputChannelDropdown).find(':selected').attr('data-channel')));

    let pseudoPianoImg = <HTMLInputElement>$$('.pseudoPianoImg', cont)[0];
    let enablePseudoPianoInputFlag = <HTMLInputElement>$$('.enablePseudoPianoInputFlag', cont)[0];
    enablePseudoPianoInputFlag.onchange = e => pseudoPianoImg.style.display = enablePseudoPianoInputFlag.checked ? 'inline-block' : 'none';
    enablePseudoPianoInputFlag.onchange(<any>{});

    ServApi.get_my_song_links = mySongs =>
        Dom.wrap(Dom.get(cont).ul('.my-song-links')[0], {
            innerHTML: '',
            children: mySongs.map(song => Dom.mk.li({
                children: [Dom.mk.a({
                    innerHTML: song.name,
                    href: '#songUrl=' + song.url,
                })],
            })),
        });

    return {
        painter: painter,
        piano: piano,
        channelListControl: channelListControl,
        synthSwitch: Switch(
            <HTMLSelectElement>$$('#synthDropdown', cont)[0],
            <HTMLDivElement>$$('#synthControl', cont)[0],
            channelListControl
        ),
        enableMidiInputFlag: <HTMLInputElement>$$('.enableMidiInputFlag')[0],
        enablePlayOnKeyDownFlag: <HTMLInputElement>$$('.enablePlayOnKeyDownFlag')[0],
        enablePseudoPianoInputFlag: enablePseudoPianoInputFlag,
        enableVisualizedPlaybackFlag: <HTMLInputElement>$$('.enableVisualizedPlaybackFlag')[0],
        inputChannelDropdown: inputChannelDropdown,
        configCont: $$('#playbackConfigDiv', cont)[0],
        sheetMusictCont: sheetMusicCont,
    };
};