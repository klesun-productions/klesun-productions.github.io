/// <reference path="../references.ts" />

import {IShChannel, IChannel} from "../DataStructures";
import {Kl} from "../Tools";
import {TableGenerator} from "../TableGenerator";

// this module contains some object definitions
// that do communication between UX and code

type cons_conf_t = {(presByChan: {[ch: number]: IShChannel}): void};

export function PresetList(cont: HTMLDivElement): IPresetList
{
    var enabledChannels = new Set(Kl.range(0,16));
    var presetChanged: cons_conf_t = (_) => () => {};

    var makePresetDropdown = function(chan: number): HTMLSelectElement
    {
        var select = document.createElement('select');

        var presetNames = +chan !== 9
            ? Kl.instrumentNames
            : Kl.range(0,128).map(_ => 'Drums');

        presetNames.forEach((d,i) =>
            $(select).append($('<option></option>')
                .val(i).html(i + ': ' + d)));


        $(select).attr('readonly', 'readonly');

        select.onchange = () => presetChanged({[chan]: {preset: $(select).val()}});

        return select;
    };

    var generateTable = function()
    {
        $(cont).empty();

        var colorize = (channel: number) => $('<div></div>')
            .append(channel + '')
            .css('font-weight', 'bold')
            .css('color', 'rgba(' + Kl.channelColors[channel].join(',') + ',1)');

        const makeMuteFlag = (channel: number) => $('<input type="checkbox" checked="checked"/>')
            .click((e: any) => {
                if (e.target.checked) {
                    enabledChannels.add(channel);

                    $('body style.mutedChannelDeleteMe[data-channel="' + channel + '"]').remove();
                } else {
                    enabledChannels.delete(channel);

                    // dirty, but so nice and simple...
                    $('<style class="mutedChannelDeleteMe" data-channel="' + channel + '" type="text/css"> ' +
                        'canvas.noteCanvas[data-channel="' + channel + '"] { opacity: 0.30;} ' +
                    '</style>').appendTo('body');
                }
            });

        var colModel = [
            {name: 'channelCode', caption: '*', formatter: makeMuteFlag},
            {name: 'channelCode', caption: 'Ch', formatter: colorize},
            {name: 'presetCode', caption: 'Preset'},
        ];

        var rows = Kl.range(0, 16).map((i) => 1 && {
            channelCode: i,
            presetCode: makePresetDropdown(i),
        });

        var $table = TableGenerator().generateTable(colModel, rows);

        $(cont).append($table);
    };

    const update = (instrByChannel: {[c: number]: IShChannel}) =>
    {
        enabledChannels = new Set(Kl.range(0,16));
        $('body style.mutedChannelDeleteMe').remove();
        $(cont).find('tr input[type="checkbox"]').prop('checked', true + '');

        $(cont).find('tr select').toArray()
            .forEach((sel,ch) => $(sel).val(instrByChannel[ch].preset));
    };

    const collectData = function(): IChannel[]
    {
        return $(cont).find('table tbody tr').toArray().map((tr,i) => 1 && {
            instrument: $(tr).find('select').val(),
            channelNumber: i,
        });
    };

    const hangPresetChangeHandler = (cb: cons_conf_t) =>
    {
        presetChanged = cb;
        $(cont).find('select').removeAttr('readonly');
    };

    generateTable();

    return {
        update: update,
        enabledChannels: () => enabledChannels,
        hangPresetChangeHandler: hangPresetChangeHandler,
        collectData: collectData,
    };
};

export interface IPresetList {
    update: (instrByChannel: {[c: number]: IShChannel}) => void,
    enabledChannels: () => Set<number>,
    hangPresetChangeHandler: (cb: cons_conf_t) => void,
    collectData: () => IChannel[],
};