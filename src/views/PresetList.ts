/// <reference path="../references.ts" />

import {IShChannel, IChannel} from "../DataStructures";
import {Tls} from "../utils/Tls";
import {TableGenerator} from "../TableGenerator";

// this module contains some object definitions
// that do communication between UX and code

// i believe the decryption is "consume config type"
type cons_conf_t = {(presByChan: {[ch: number]: IShChannel}): void};

export function PresetList(cont: HTMLDivElement): IPresetList
{
    var enabledChannels = new Set(Tls.range(0,16));
    var onChanges: cons_conf_t[] = [];

    var makePresetDropdown = function(chan: number): HTMLSelectElement
    {
        var select = document.createElement('select');

        var presetNames = +chan !== 9
            ? Tls.instrumentNames
            : Tls.range(0,128).map(_ => 'Drums');

        presetNames.forEach((d,i) =>
            $(select).append($('<option></option>')
                .val(i).html(('00' + i).slice(-3) + ': ' + d)));


        $(select).attr('readonly', 'readonly');

        select.onchange = () => onChanges.forEach(cb => cb({[chan]: {preset: $(select).val()}}));

        return select;
    };

    var generateTable = function()
    {
        $(cont).empty();

        var colorize = (channel: number) => $('<div></div>')
            .append(channel + '')
            .attr('data-channel', channel)
            .css('font-weight', 'bold');

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

        var rows = Tls.range(0, 16).map((i) => 1 && {
            channelCode: i,
            presetCode: makePresetDropdown(i),
        });

        var $table = TableGenerator().generateTable(colModel, rows);

        $(cont).addClass('channelColors').append($table);
    };

    const update = (instrByChannel: {[c: number]: IShChannel}) =>
    {
        enabledChannels = new Set(Tls.range(0,16));
        $('body style.mutedChannelDeleteMe').remove();
        $(cont).find('tr input[type="checkbox"]').prop('checked', true + '');

        Tls.fori(instrByChannel, (i, ch) =>
            $(cont).find('tr select').eq(i).val(ch.preset));
    };

    const collectData = function(): IChannel[]
    {
        return $(cont).find('table tbody tr').toArray().map((tr,i) => 1 && {
            instrument: $(tr).find('select').val(),
            channelNumber: i,
        });
    };

    const onChange = (cb: cons_conf_t) =>
    {
        onChanges.push(cb);
        $(cont).find('select').removeAttr('readonly');
    };

    generateTable();

    return {
        update: update,
        enabledChannels: () => enabledChannels,
        onChange: onChange,
        collectData: collectData,
    };
};

export interface IPresetList {
    update: (instrByChannel: {[c: number]: IShChannel}) => void,
    enabledChannels: () => Set<number>,
    onChange: (cb: cons_conf_t) => void,
    collectData: () => IChannel[],
};