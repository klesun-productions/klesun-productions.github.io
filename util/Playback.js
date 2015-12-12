
var Util = Util || {};

// an instance of playback request. it will stay the same
// instance when we, say, move slider or switch tab; but
// it will be new instance if we change song. do it primarily
// to avoid passing 4 arguments to the playAt() method when we need
// only one - index

Util.Playback = function(sheetMusic, onChord, whenFinished)
{
    var playAt = function(chordIndex)
    {

    };

    return {
        playAt: playAt,
    };
};