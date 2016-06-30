/// <reference path="../references.ts" />

import {IGeneralStructure, ISmfFile} from "../DataStructures";
import {Kl} from "../Tools";
import {IPlayback} from "../player/Playback";

// This class generates jquery dom with current song info
// and some controlls, particularly - timeline slider

/** @param length - float: quarter will be 0.25, semibreve will be 1.0*/
var toMillis = (length: number, tempo: number) => 1000 * length * 60 / (tempo / 4);  // because 1 / 4 = 1000 ms when tempo is 60

var verySecurePassword = '';

export default function PlaybackControl($cont: JQuery): IPlaybackControl
{
    const $$ = (s: string): HTMLElement[] => <any>Array.from(document.querySelectorAll(s));

    var $tempoFactorInput = $cont.find('.tempoFactorInput'),
        $secondsTotalHolder = $cont.find('.secondsTotal.holder'),
        $timeSlider = $cont.find('.timeSlider'),
        tempoHolder = $cont.find('.tempoInput'),
        $playBtn = $cont.find('.playBtn'),
        $pauseBtn = $cont.find('.pauseBtn'),
        ratingHolder = $$('.rating.holder')[0],
        rateGoodBtn = $$('button.rateGood')[0],
        rateBadBtn = $$('button.rateBad')[0],
        rateUndoBtn = $$('button.rateUndo')[0],
        O_O = 0-0;

    var setFields = function(sheetMusic: IGeneralStructure)
    {
        var secondsTotal = toMillis(sheetMusic.chordList.slice(-1)[0].timeFraction, sheetMusic.config.tempo) / 1000;
        var chordCount = sheetMusic.chordList.length;

        tempoHolder.val(Math.floor(sheetMusic.config.tempo));
        $cont.find('.tempoOrigin.holder').html(Math.floor(sheetMusic.config.tempo) + '');
        $cont.find('.noteCount.holder').html(Kl.map(sheetMusic.misc.noteCount, c => c + '') || '?');
        $cont.find('.chordCount.holder').html(chordCount + '');

        $secondsTotalHolder.html('' + Math.floor(secondsTotal / $tempoFactorInput.val() * 100) / 100);
        $timeSlider.attr('max', chordCount - 1);
    };

    var setPlayback = function(playback: IPlayback)
    {
        var updateState = function()
        {
            $cont.find('.chordIndex.holder').html(playback.getChordIndex() + '');
            $timeSlider.val(playback.getChordIndex());

            var seconds = Math.floor(playback.getTime() / 10) / 100;
            $cont.find('.seconds.holder').html(seconds + '');
            var secondsTotal = $secondsTotalHolder.html();
        };
        updateState();

        var triggerId = setInterval(updateState, 1000);
        playback.setPauseHandler(function() {
            window.clearInterval(triggerId);
            playback.setResumeHandler(() => (triggerId = setInterval(updateState, 1000)));
        });

        $timeSlider.off().on('input change', function() {
            playback.slideTo(+$timeSlider.val());
            updateState();
        });

        // TODO: the two functions below do pretty same thing - merge em!
        // P.S. yes, i hate myself too
        var lastTempo = tempoHolder.val();
        var lastFactor = $tempoFactorInput.val();
        $tempoFactorInput.off().change(function() {
            var total = +$secondsTotalHolder.html() * lastFactor / $tempoFactorInput.val();
            var tempo = playback.getTempo() / lastFactor * $tempoFactorInput.val();
            lastFactor = $tempoFactorInput.val();
            lastTempo = tempo;

            $secondsTotalHolder.html(total + '');
            tempoHolder.val(tempo);

            playback.setTempo(tempo);
            updateState();
        });
        tempoHolder.off().change(function()
        {
            var tempoHolderTyped = <HTMLInputElement>tempoHolder[0];
            tempoHolder.val(Math.max(tempoHolder.val(), +tempoHolderTyped.min));
            $secondsTotalHolder.html(+$secondsTotalHolder.html() * lastTempo / tempoHolder.val() + '');
            lastTempo = tempoHolder.val();

            playback.setTempo(+tempoHolder.val());
            updateState();
        });

        $playBtn.off().click(() => { playback.pause(); playback.resume(); });
        $pauseBtn.off().click(playback.pause);
    };

    const askForPassword = function(cb: (pwd: string) => void)
    {
        if (verySecurePassword) {
            cb(verySecurePassword);
        } else {
            Kl.promptAssync('Password?', (pwd) => cb(verySecurePassword = pwd));
        }
    };

    const contribute = function(functionName: string, params: {}, cb: (r: any) => void)
    {
        askForPassword(pwd => $.ajax('/htbin/json_service.py?f=' + functionName, {
            type: "post",
            data: JSON.stringify({
                'params': params,
                'verySecurePassword': pwd,
            }),
            dataType: "json",
            contentType: 'application/json;UTF-8',
            success: (tuple: [string, string]) => {
                var [result, error] = tuple;
                if (!error) {
                    cb(result);
                } else {
                    console.log('failed to rate:', error);
                    verySecurePassword = error !== 'wrongPassword' && verySecurePassword;
                }
            },
        }));
    };

    const rateSong = (isGood: boolean, fileName: string) =>
        contribute('add_song_rating',
            {isGood: isGood, fileName: fileName},
            r => ratingHolder.innerHTML = r);

    const undoRating = (fileName: string) =>
        contribute('undo_song_rating',
            {fileName: fileName},
            r => ratingHolder.innerHTML = r);

    const setFileInfo = function(info: ISmfFile)
    {
        $cont.find('.fileName.holder').html(info.fileName);
        $cont.find('.rating.holder').html(info.rating || '_');

        rateGoodBtn.onclick = () => rateSong(true, info.fileName);
        rateBadBtn.onclick = () => rateSong(false, info.fileName);
        rateUndoBtn.onclick = () => undoRating(info.fileName);
    };

    return {
        setPlayback: setPlayback,
        setFileInfo: setFileInfo,
        setFields: setFields,
        getTempoFactor: () => +$tempoFactorInput.val(),
    };
};

export interface IPlaybackControl
{
    setPlayback: (p: IPlayback) => void,
    setFileInfo: (i: ISmfFile) => void,
    setFields: (s: IGeneralStructure) => void,
    getTempoFactor: () => number,
}