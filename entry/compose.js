
// require.js ordered me to put the inline javascript code here

var wanted = ['/src/compose/Compose.js',
    '/libs/jquery-2.1.4.js', '/libs/FileSaver.js', '/libs/SMFreader.js', '/libs/jsmidgen.js'];

requirejs(wanted, function(Compose)
{
    Compose.Compose(document.getElementById('composeCont'));
});

