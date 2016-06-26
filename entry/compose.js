
// require.js ordered me to put the inline javascript code here

var wanted = ['/src/compose/Painter.js', '/src/compose/Handler.js',
    '/libs/jquery-2.1.4.js', '/libs/FileSaver.js', '/libs/SMFreader.js', '/libs/jsmidgen.js'];

requirejs(wanted, function(Painter, Handler)
{
    var painter = Painter.SheetMusicPainter('sheetMusicDiv', $('#visualConfigDiv')[0]);
    painter.setEnabled(true);

    var handler = Handler.default(painter, $('#playbackConfigDiv')[0]);

    var sheetMusicCont = $('#sheetMusicDiv')[0];
    $(sheetMusicCont).attr('tabindex', 1);
    handler.hangKeyboardHandlers(sheetMusicCont);
    handler.hangGlobalKeyboardHandlers();

    $(sheetMusicCont).focus();
});

