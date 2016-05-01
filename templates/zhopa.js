
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
    "/util//TableGenerator.js",
    "/util/synths/MidiDevice.js",
    "/util/synths/ISynth.js",
    //"/util/typescript/UnfairRandom.js",
    //"/util/typescript/Tools.js",
    //"/util/typescript/SoundFontAdapter.js",
    //"/util/typescript/Shmidusicator.js",
    //"/util/typescript/Reflect.js",
    //"/util/typescript/references.js",
    //"/util/typescript/Maybe.js",
    //"/util/typescript/DataStructures.js",
    //"/util/typescript/synths/Oscillator.js",
    //"/util/typescript/synths/ISynth.js",
    //"/util/typescript/synths/Fluid.js",
    //"/util/typescript/sheet_music/Painter.js",
    //"/util/typescript/sheet_music/Control.js",
    //"/util/typescript/compose/Handler.js",
    "/util/flowOut/Linker.js",
    "/util/flowOut/GoogleTranslateAdapter.js",
    "/util/flowOut/Transeeker.js",
];

wanted = ['/util/typescript/MainPage.js', '/libs/jquery-2.1.4.js', '/libs/FileSaver.js', '/libs/SMFreader.js',
    '/util/typescript/Tools.js'].concat(wanted);

requirejs(wanted, (MainPage) =>
{
    var mainPage = MainPage.default($('#mainCont')[0]);

    mainPage.initIchigosMidiList();
    // mainPage.initMyMusicList();
    $('#startDemoButton').click(mainPage.playDemo);
    $('#playRandomButton').click(mainPage.playRandom);

    onGoogleSignIn = u => mainPage.handleGoogleSignIn(u, $('.userInfoCont'));
});

