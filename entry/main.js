
// require.js ordered me to put the inline javascript code here

// TODO: i should transform all these .js files to
// .ts and remove from explicit import one day
var wanted = [
    "/util//Tools.js",
    "/util//Player.js",
    "/util//PlaybackControl.js",
    "/util//Playback.js",
    "/util//Compose.js",
    "/util//PianoLayoutPanel.js",
];

wanted = ['/util/typescript/MainPage.js', '/libs/jquery-2.1.4.js', '/libs/FileSaver.js', '/libs/SMFreader.js'].concat(wanted);

requirejs(wanted, (MainPage) =>
{
    var mainPage = MainPage.default($('#mainCont')[0]);

    mainPage.initIchigosMidiList();
    // mainPage.initMyMusicList();
    $('#startDemoButton').click(mainPage.playDemo);
    $('#playRandomButton').click(mainPage.playRandom);

    onGoogleSignIn = u => mainPage.handleGoogleSignIn(u, $('.userInfoCont'));
});

