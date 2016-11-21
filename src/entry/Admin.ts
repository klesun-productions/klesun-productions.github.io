
import {ServApi} from "../utils/ServApi";
import {YoutubeApi} from "../utils/YoutubeApi";
import {Tls} from "../utils/Tls";
import {ParseSoundFontFile, TransformSf2Parse, flattenSamples} from "../synths/soundfont/ParseSf2";

var Gui = function(mainControl: HTMLDivElement)
{
    var $$ = (selector: string, el?: HTMLElement) =>
        <HTMLElement[]>Array.from((el || document).querySelectorAll(selector));

    return {
        btns: {
            updateLinks: $$('#updateLinks', mainControl)[0],
            decodeSoundFont: $$('#decodeSoundFont', mainControl)[0],
            testDecodeSoundFont: $$('#testDecodeSoundFont', mainControl)[0],
            collectLikedSongs: $$('#collectLikedSongs', mainControl)[0],
        },
    };
};

/**
 * initializes the admin.html page controls
 */
export let Admin = function(mainControl: HTMLDivElement)
{
    var gui = Gui(mainControl);

    gui.btns.collectLikedSongs.onclick = () =>
        ServApi.collectLikedSongs(console.log);

    gui.btns.testDecodeSoundFont.onclick = () =>
        Tls.fetchJson('/out/sf2parsed/zunpet/sf2parser.out.json', sf2parse =>
            console.log(flattenSamples(TransformSf2Parse(<any>sf2parse))));

    gui.btns.decodeSoundFont.onclick = () =>
        Tls.fetchBinaryFile('/unversioned/soundfonts/fluid.sf2', byteBuffer => {
            var [soundFont, audioDataSamples] = ParseSoundFontFile(byteBuffer);
            console.log('Decoded Soundfont: ', soundFont);
            Tls.list(audioDataSamples).sequence = (d, i) =>
                ServApi.save_sample_wav({
                    sfname: 'fluid',
                    sampleNumber: i,
                    sampleName: d[1].sampleName,
                    sampleRate: d[1].sampleRate,
                    samplingValues: d[0],
                });
        });

    gui.btns.updateLinks.onclick = () =>
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
