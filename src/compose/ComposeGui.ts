
import {SheetMusicPainter} from "./Painter";
import PianoLayout from "../views/PianoLayout";
import {PresetList} from "../views/PresetList";
import {Switch} from "../synths/Switch";
import {Tls} from "../utils/Tls";

let $$ = (selector: string, el?: HTMLElement) =>
    <HTMLElement[]>Array.from((el || document).querySelectorAll(selector));

/**
 * provides mapping to dom elements
 */
export var ComposeGui = function(cont: HTMLDivElement)
{
    var painter = SheetMusicPainter('sheetMusicDiv', $$('#visualConfigDiv', cont)[0]);
    painter.setEnabled(true);

    var sheetMusicCont = $$('#sheetMusicDiv', cont)[0];
    $(sheetMusicCont).attr('tabindex', 1);

    $(sheetMusicCont).focus();

    $$('input,select').forEach(el => {
        var wasCb = el.onchange;
        el.onchange = (e) => {
            wasCb && wasCb(e);
            sheetMusicCont.focus();
        };
    });
    $$('body')[0].addEventListener('focus', () => sheetMusicCont.focus());

    var piano = PianoLayout(<HTMLCanvasElement>$$('#pianoCanvas', cont)[0]);
    var channelListControl = PresetList(<HTMLDivElement>$$('#presetListBlock', cont)[0]);

    var inputChannelDropdown = <HTMLSelectElement>$$('.inputChannelDropdown', cont)[0];

    var makeChannelOption = (i: number) =>
        $('<option/>').val(i).html('' + i).attr('data-channel', i);

    $(inputChannelDropdown).append(Tls.range(0,16).map(makeChannelOption))
        .change(() => $(inputChannelDropdown).attr('data-channel', $(inputChannelDropdown).find(':selected').attr('data-channel')));

    var pseudoPianoImg = <HTMLInputElement>$$('.pseudoPianoImg', cont)[0];
    var enablePseudoPianoInputFlag = <HTMLInputElement>$$('.enablePseudoPianoInputFlag', cont)[0];
    enablePseudoPianoInputFlag.onchange = e => pseudoPianoImg.style.display = enablePseudoPianoInputFlag.checked ? 'inline-block' : 'none';
    enablePseudoPianoInputFlag.onchange(<any>{});

    return {
        painter: painter,
        piano: piano,
        channelListControl: channelListControl,
        synthSwitch: Switch(
            <HTMLSelectElement>$$('#synthDropdown', cont)[0],
            <HTMLDivElement>$$('#synthControl', cont)[0],
            channelListControl,
            piano
        ),
        enableMidiInputFlag: <HTMLInputElement>$$('.enableMidiInputFlag')[0],
        enablePlayOnKeyDownFlag: <HTMLInputElement>$$('.enablePlayOnKeyDownFlag')[0],
        enablePseudoPianoInputFlag: enablePseudoPianoInputFlag,
        inputChannelDropdown: inputChannelDropdown,
        configCont: $$('#playbackConfigDiv', cont)[0],
        sheetMusictCont: sheetMusicCont,
    };
};