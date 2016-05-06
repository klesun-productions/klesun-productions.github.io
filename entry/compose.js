
// require.js ordered me to put the inline javascript code here

// TODO: i should transform all these .js files to
// .ts and remove from explicit import one day
var wanted = [
    "/util//Tools.js",
    "/util//Player.js",
    "/util//PlaybackControl.js",
    "/util//Playback.js",
    "/util//Compose.js",
];

wanted = ['/util/typescript/compose/Painter.js', '/util/typescript/compose/Handler.js',
    '/libs/jquery-2.1.4.js', '/libs/FileSaver.js', '/libs/SMFreader.js'].concat(wanted);

requirejs(wanted, (Painter, Handler) =>
{
    var painter = Painter.SheetMusicPainter('sheetMusicDiv', $('#visualConfigDiv')[0]);
    painter.setEnabled(true);

    var handler = Handler.default(painter, $('#playbackConfigDiv')[0]);

    var sheetMusicCont = $('#sheetMusicDiv')[0];
    $(sheetMusicCont).attr('tabindex', 1);
    handler.hangKeyboardHandlers(sheetMusicCont);
    handler.hangGlobalKeyboardHandlers();

    $('body').click(function(e) {
        if (!['input', 'select'].includes(e.target.tagName.toLowerCase())) {
            $(sheetMusicCont).focus();
        }
    });

    $(sheetMusicCont).focus();
});

