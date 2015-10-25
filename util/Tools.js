
var Util = Util || {};

Util.range = (l, r) => Array.apply(null, Array(r - l)).map((_, i) => l + i);

/** @TODO: use worker instead to ensure timing of inactive tabs */
Util.setTimeout = (cb, d) => setTimeout(cb, d);

/** @param chunkSize - count of elements that will be foreached in one iteration
 * @param breakMillis - break duration between iterations */
Util.forEachBreak = function(list, breakMillis, chunkSize, callback)
{
    var doNext = function(index)
    {
        if (index < list.length) {
            for (var i = index; i < Math.min(list.length, index + chunkSize); ++i) {
                callback(list[i]);
            }
            setTimeout(() => doNext(index + chunkSize), breakMillis);
        }
    };

    doNext(0);
};