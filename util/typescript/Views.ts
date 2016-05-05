
/// <reference path="references.ts" />

// this module contains some object definitions
// that do communication between UX and code

import {Kl} from "./Tools";
import {TableGenerator} from "./TableGenerator";

export function PresetList(instrumentInfoBlock: HTMLDivElement)
{
    var enabledChannels = new Set(Kl.range(0,16));

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
            {name: 'channelCode', caption: 'Chan', formatter: colorize},
            {name: 'presetCode', caption: 'Pres'},
            {name: 'description', caption: 'Description'},
        ];

        var rows = Kl.range(0, 16).map(function(i)
        {
            if (i in instrByChannel) {
                const instrCode = instrByChannel[i];
                return {
                    channelCode: i,
                    presetCode: instrCode,
                    description: Kl.instrumentNames[instrCode],
                    /** @TODO: color */
                };
            } else {
                return {
                    channelCode: i,
                    presetCode: -1,
                    description: $('<div></div>')
                        .append('Channel Not Used')
                        .addClass('notUsed'),
                };
            }
        });

        var $table = TableGenerator().generateTable(colModel, rows);

        $(instrumentInfoBlock).append($table);
    };

    return {
        repaint: repaintInstrumentInfo,
        enabledChannels: () => enabledChannels,
    };
};