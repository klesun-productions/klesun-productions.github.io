
import {ServApi} from "../utils/ServApi";
import {YoutubeApi} from "../utils/YoutubeApi";

var $$ = (el: any) => typeof el === 'string'
    ? (<any>Array).from(document.querySelectorAll(el))
    : {q: (s: string): HTMLElement => (<any>Array).from(el.querySelectorAll(s))};

/**
 * initializes the admin.html page controls
 */
export let Admin = function(mainControl: HTMLDivElement)
{
    let updateLinksBtn = $$(mainControl).q('#updateLinks')[0],
        O=0;

    updateLinksBtn.onclick = () =>
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
