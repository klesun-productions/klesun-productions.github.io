
import {ServApi} from "../utils/ServApi";
import {YoutubeApi} from "../utils/YoutubeApi";
import {Tls} from "../utils/Tls";
import {ParseSoundFontFile} from "../synths/soundfont/ParseSf2";

var Gui = function(mainControl: HTMLDivElement)
{
    var $$ = (selector: string, el?: HTMLElement) =>
        <HTMLElement[]>Array.from((el || document).querySelectorAll(selector));

    return {
        updateLinksBtn: $$('#updateLinks', mainControl)[0],
        decodeSoundFontBtn: $$('#decodeSoundFont', mainControl)[0],
        collectLikedSongsBtn: $$('#collectLikedSongs', mainControl)[0],
    };
};

/**
 * initializes the admin.html page controls
 */
export let Admin = function(mainControl: HTMLDivElement)
{
    var gui = Gui(mainControl);

    gui.collectLikedSongsBtn.onclick = () =>
        ServApi.collectLikedSongs(console.log);

    gui.decodeSoundFontBtn.onclick = () =>
        Tls.fetchBinaryFile('/unversioned/soundfonts/zunpet.sf2', byteBuffer =>
            console.log(ParseSoundFontFile(byteBuffer)));

    gui.updateLinksBtn.onclick = () =>
        ServApi.get_ichigos_midi_names((songs) =>
        ServApi.getYoutubeLinks((linksBySongName) =>
    {
        let ytb = YoutubeApi();

        let fetchNext = (i: number) =>
        {
            if (i < songs.length) {
                let songName = songs[i].fileName;
                if (songName in linksBySongName) {
                    fetchNext(i + 1);
                } else {
                    let retry = (tryN: number) => ytb.getVideoUrlsByApproxName(songName, urls => {
                        console.log(songName, urls);
                        if (urls.length === 0) {
                            console.log('pizda nam', songName);
                            if (tryN > 0) {
                                retry(tryN - 1);
                            } else {
                                fetchNext(i + 1);
                            }
                        } else {
                            ServApi.linkYoutubeLinks(songName, urls, id => {
                                console.log('ok', id, songName);
                                fetchNext(i + 1);
                            });
                        }
                    });
                    retry(5);
                }
            }
        };

        fetchNext(0);
    }));
};
