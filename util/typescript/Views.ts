
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

    var makePresetDropdown = function(chan: number, initialPreset: number): HTMLSelectElement
    {
        var select = document.createElement('select');

        Kl.instrumentNames.forEach((d,i) =>
            $(select).append($('<option></option>')
                .val(i).html(i + ': ' + d)));

        $(select).val(initialPreset)
            .attr('readonly', 'readonly');

        select.onchange = () => presetChanged({[chan]: $(select).val()});

        return select;
    };

    var repaintInstrumentInfo = (instrByChannel: {[c: number]: number}) =>
    {
        $(instrumentInfoBlock).empty();
        enabledChannels = new Set(Kl.range(0,16));

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

        var rows = Kl.range(0, 16).map(function(i)
        {
            var instrCode = i in instrByChannel
                ? instrByChannel[i]
                : -1;

            return {
                channelCode: i,
                presetCode: makePresetDropdown(i, instrCode),
                /** @TODO: color */
            };
        });

        var $table = TableGenerator().generateTable(colModel, rows);

        $(instrumentInfoBlock).append($table);
    };

    var hangPresetChangeHandler = (cb: cons_conf_t) =>
    {
        presetChanged = cb;
        $(instrumentInfoBlock).find('select').removeAttr('readonly');
    };

    return {
        repaint: repaintInstrumentInfo,
        enabledChannels: () => enabledChannels,
        hangPresetChangeHandler: hangPresetChangeHandler,
    };
};