
var Ns = Ns || {};

// this interface represents something that can be placed
// on the stage and affect/be affected by environment

var notImplemented = function () {
	var msg = 'Element does not implement!';
	console.trace();
	alert(msg);
	throw new Error(msg);
};

Ns.IElement = {
	live: notImplemented,
	getShape: notImplemented,
};