/// <reference path="references.ts" />

// this module contains some object definitions
// that do communication between UX and code

import {Kl} from "./Tools";
import {TableGenerator} from "./TableGenerator";

type cons_conf_t = {(presByChan: {[ch: number]: number}): void};

export function PresetList(instrumentInfoBlock: HTMLDivElement)
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

        select.onchange = () => presetChanged({[chan]: $(select).val()});

        return select;
    };

    var generateTable = function()
    {
        $(instrumentInfoBlock).empty();

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
            {name: 'channelCode', caption: 'Ch', formatter: colorize},
            {name: 'presetCode', caption: 'Preset'},
        ];

        var rows = Kl.range(0, 16).map((i) => 1 && {
            channelCode: i,
            presetCode: makePresetDropdown(i),
        });

        var $table = TableGenerator().generateTable(colModel, rows);

        $(instrumentInfoBlock).append($table);
    };

    var update = (instrByChannel: {[c: number]: number}) =>
    {
        enabledChannels = new Set(Kl.range(0,16));
        $(instrumentInfoBlock).find('tr select').toArray()
            .forEach((sel,ch) => $(sel).val(instrByChannel[ch]));
    };

    var hangPresetChangeHandler = (cb: cons_conf_t) =>
    {
        presetChanged = cb;
        $(instrumentInfoBlock).find('select').removeAttr('readonly');
    };

    generateTable();

    return {
        update: update,
        enabledChannels: () => enabledChannels,
        hangPresetChangeHandler: hangPresetChangeHandler,
    };
};