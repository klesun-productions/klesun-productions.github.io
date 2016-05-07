
// require.js ordered me to put the inline javascript code here

var wanted = ['/src/MainPage.js', '/libs/jquery-2.1.4.js', '/libs/FileSaver.js', '/libs/SMFreader.js'];

requirejs(wanted, (MainPage) =>
{
    var mainPage = MainPage.default($('#mainCont')[0]);

    mainPage.initIchigosMidiList();
    // mainPage.initMyMusicList();
    $('#startDemoButton').click(mainPage.playDemo);
    $('#playRandomButton').click(mainPage.playRandom);

    onGoogleSignIn = u => mainPage.handleGoogleSignIn(u, $('.userInfoCont'));
});

