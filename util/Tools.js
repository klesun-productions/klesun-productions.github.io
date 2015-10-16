
var Util = Util || {};

Util.range = (l, r) => Array.apply(null, Array(r - l)).map((_, i) => l + i);
