/// <reference path="references.ts" />

import {Tls} from "./utils/Tls";
type NodeT = (string | HTMLElement | JQuery);

export type ColModel<Trow> = Array<{
    name: string,
    caption: string,
    formatter?: {(c: string | number, r: Trow): NodeT}
}>

export function TableGenerator()
{
    var generateTitleRow = <Trow>(title: NodeT) =>
        $('<tr class="table-generator-title-tr"></tr>')
            .append($('<td colspan="100" style="background-color:#DDDDEE;"></td>')
                .append(title))[0];

    /** @argument colModel has same format as colModel of JqGrid
     * @argument title - optional, any $.append()-able value (string/dom)
     * @return <table/> $(DOM)-objet */
    var generateTable = function<Trow extends {[k: string]: any}>(
        colModel: ColModel<Trow>,
        rowList: Trow[],
        title?: NodeT,
        chunkSize?: number,
        breakDuration?: number)
    {
        var table = $('<table cellspacing="1"></table>');

        title && table.append(generateTitleRow(title));
        table.append(generateCaptionRow(colModel));

        chunkSize = chunkSize || 1000000; // browser would die anyways with such row ammount
        breakDuration = breakDuration || 100;

        /** @TODO: add some sign that we finished loading */
        Tls.forChunk(rowList, breakDuration, chunkSize, row => table.append(generateRow(colModel, row)));

        return table;
    };

    /** @argument colModel - [{"caption": str}, ...] */
    function generateCaptionRow<Trow>(colModel: ColModel<Trow>): HTMLTableHeaderCellElement
    {
        var $row = $('<tr class="captionRow"></tr>');
        colModel.forEach(m => $row.append('<td><b>' + m.caption + '</b></td>'));

        return <HTMLTableHeaderCellElement>$('<thead></thead>').append($row)[0];
    }

    function generateRow<Trow extends {[k: string]: any}>(colModel: ColModel<Trow>, row: Trow): HTMLTableRowElement
    {
        var rowDom = $('<tr></tr>');
        colModel.forEach(col => {
            var fieldName = col.name;
            var formatter = col.formatter
                ? col.formatter
                : function (cell: string) { return cell; };

            var $td = $('<td></td>');
            $td.append(formatter(row[fieldName], row));
            rowDom.append($td);
        });

        return <HTMLTableRowElement>rowDom[0];
    }

    return {
        generateTable: generateTable,
    };
};
