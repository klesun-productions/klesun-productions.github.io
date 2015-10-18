
var Util = Util || {};

Util.range = (l, r) => Array.apply(null, Array(r - l)).map((_, i) => l + i);

/** @TODO: use worker instead to ensure timing of inactive tabs */
Util.setTimeout = (cb, d) => setTimeout(cb, d);