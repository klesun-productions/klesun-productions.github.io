
var Util = Util || {};

Util.TableGenerator = function()
{
	/** @argument colModel has same format as colModel of JqGrid 
	  * @argument title - optional, any $.append()-able value (string/dom)
	  * @return <table/> $(DOM)-objet */
	var generateTable = function(colModel, rowList, title, chunkSize, breakDuration)
	{
		var table = $('<table style="width:100%;" class="table" cellspacing="1"></table>');
		if (typeof title !== 'undefined')
		{
			table.append(generateTitleRow(title));
		}
		table.append(generateCaptionRow(colModel));

		chunkSize = chunkSize || 1000000; // browser would die anyways with such row ammount
		breakDuration = breakDuration || 100;

		rowList.slice(0 * chunkSize, chunkSize)
			.forEach(row => table.append(generateRow(colModel, row)));

		var range = (l, r) => { var res = []; for (var i = l; i < r; ++i) { res.push(i); } return res; };

		range(1, Math.ceil(rowList.length / chunkSize)).forEach(j => setTimeout(
			() => rowList.slice(j * chunkSize, (j + 1) * chunkSize)
					.forEach(row => table.append(generateRow(colModel, row))),
			breakDuration * j
		));

		//for (var i = 0; i < rowList.length; ++i) {
		//	table.append(generateRow(colModel, rowList[i]));
		//}

		return table;
	};
	
	var formatterProvider = new function() {

		/** @argument {string} mysqlDatetime in format '2015-03-26 05:29:03'
	        @return {string} in format '06/22/15 17:07:58' */
		var formatDatetimeToOurStandard = function(mysqlDatetime)
		{
			if (mysqlDatetime)
			{
				var dateObj = $.datepicker.parseDateTime("yy-mm-dd", "HH:mm:ss", mysqlDatetime, null, {timeFormat:"HH:mm:ss"});
				return YAHOO.util.Date.format(dateObj, {format:'%m/%d/%y %H:%M:%S'}, "en-US");
			}
			else
			{
				return 'N/A';
			}
		};
		
		return {
			formatDatetimeToOurStandard: formatDatetimeToOurStandard,
		};
	};

	function generateTitleRow(title)
	{
		var titleCont = $('<td colspan="100" style="background-color:#DDDDEE;"></td>')
				.append(title);
		return $('<tr class="table-generator-title-tr"></tr>').append(titleCont);
	}

	/** @argument colModel - [{"caption": str}, ...] */
	function generateCaptionRow(colModel)
	{
		var row = $('<tr class="captionRow"></tr>');
		for (var i = 0; i < colModel.length; ++i)
		{
			row.append('<td>' + colModel[i].caption + '</td>');
		}

		return row;
	}

	function generateRow(colModel, row)
	{
		var rowDom = $('<tr></tr>');
		for (var i = 0; i < colModel.length; ++i)
		{
			var fieldName = colModel[i].name;
			var formatter = typeof(colModel[i].formatter) === 'function'
					? colModel[i].formatter 
					: function (cell) { return cell; };
					
			var $td = $('<td></td>');
			$td.append(formatter(row[fieldName], row));
			rowDom.append($td);
		}

		return rowDom;
	}
	
	return {
		generateTable: generateTable,
		formatterProvider: formatterProvider,
	};
};
