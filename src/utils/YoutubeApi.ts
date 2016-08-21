
import {Tls} from "./Tls";
import {ytlink_t} from "../MainPage";

// TODO: replace implementation with official OAuth 2.0
// if it is not related with too much of annal occupation

/**
 * parses html
 */
export var YoutubeApi = function()
{
    let $$ = (el: any) => 1 && {
        q: (s: string): HTMLElement[] => <HTMLElement[]>Array.from(el.querySelectorAll(s))
    };

    let oReq = new XMLHttpRequest();
    // oReq.responseType = 'text/html';
    // oReq.onload = () => whenLoaded(oReq.response);
    // oReq.send(null);

    let getCleanName = function(songPath: string)
    {
        var [_, _, score, cleanName, comment] =
            /^\.?\/?(random)?(0_[A-Za-z0-9]+_)?(.+).mid$/
                .exec(songPath);
        cleanName = cleanName.replace(/[\-\/_\d]/g, ' ');
        cleanName = cleanName.replace(/\((.*)?\)/g, '');

        cleanName += ' ost';

        return cleanName;
    };

    let xmlToLinks = (page: Document): ytlink_t[] =>
        $$(page).q('#results ol.item-section > li > .yt-lockup-video').map((div) => 1 && {
            'youtubeId': $$(div).q('.yt-lockup-title a')[0].getAttribute('href').substr('/watch?v='.length),
            'videoName': $$(div).q('.yt-lockup-title a')[0].innerHTML,
            'viewCount': +$$(div).q('.yt-lockup-meta-info li')[1].innerHTML.replace(/[^\d]/g, ''),
        });

    let getVideoUrlsByApproxName = function(name: string, cb: (urls: ytlink_t[]) => void)
    {
        let searchUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(getCleanName(name));

        let oReq = new XMLHttpRequest();
        oReq.open("GET", searchUrl, true);
        oReq.send();
        oReq.onload = () => {
            var links = xmlToLinks(new DOMParser().parseFromString(oReq.response, 'text/html'));
            cb(links);
        };
    };

    return {
        getVideoUrlsByApproxName: getVideoUrlsByApproxName,
    };
};