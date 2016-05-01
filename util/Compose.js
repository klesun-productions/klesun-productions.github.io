
var Util = Util || {};

// writes pseudo-graphic sheet music on a textarea
// unused

Util.Compose = function(parentEl)
{
    var noteList = [];
    var $canvas = $('<textarea readonly wrap="off"></textarea>')
        .css('width', '100%')
        .css('box-sizing', 'border-box')
        .css('height', '500px');

    var isEbony = t => [1,3,6,8,10].indexOf(t % 12) > -1;
    var tuneToIvoryIndex = function(t)
    {
        var octave = Math.floor(t / 12);
        t %= 12;
        return [0,2,4,5,7,9,11].indexOf(!isEbony(t) ? t : t - 1) + octave * 7;
    };

    var repaint = function()
    {
        var pseudoGraphic = '';

        var topIvory = 46; // sol

        // 0 - upper sol on violing ke, 23 - downer sol on bass key
        for (var y = 0; y < 23; ++y) {

            var strike = y % 2 !== 0 && y !== 11;

            for (var x = 0; x < noteList.length; ++x) {
                if (tuneToIvoryIndex(noteList[x]) === topIvory - y) {
                    var space = strike ? '-' : ' ';
                    var prefix = space + (isEbony(noteList[x]) ? 'b' : space);
                    pseudoGraphic += prefix + '4';
                } else if (!strike) {
                    // 11 - the doh between violin and bass keys
                    pseudoGraphic += '   ';
                } else {
                    pseudoGraphic += '---';
                }
            }

            pseudoGraphic += "\n";
        }

        $canvas.val(pseudoGraphic);
    };

    var play = function()
    {


        var stop = _ => {};
        return stop;
    };

    var handleNoteOn = function(tune)
    {
        console.log(noteList);
        noteList.push(tune);

        repaint();

        var handleNoteOff = _ => {};
        return handleNoteOff;
    };

    $(parentEl).empty().append($canvas);
    repaint();

    return {
        handleNoteOn: handleNoteOn
    };
};