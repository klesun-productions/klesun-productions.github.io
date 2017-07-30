
/// <reference path="../../src/references.ts" />

import {Dom} from "../../src/utils/Dom";
import {Tls} from "../../src/utils/Tls";
import {FrameBridge} from "../../src/utils/FrameBridge";
import {GrabTraffic} from "../../src/utils/GrabTraffic";
import {S} from "../../src/utils/S";

export let main = function(mainCont: HTMLElement)
{
    let T2 = function<T>(tuple: T[]): [T, T] {
        let [a,b] = tuple;
        return [a,b];
    };

    type search_profile_t = 'ddr3Pc' | null;

    let traffic = GrabTraffic(() => 1, FrameBridge.getPage);

    let skipAd = function(pageDom: HTMLElement, searchProfile: search_profile_t) {
        let skip = false;
        if (pageDom.innerHTML.match(/veikal/i) ||
            pageDom.innerHTML.match(/avotu iela 76/i) // "ZCena" shop that floods the site
        ) {
            skip = true;
        }
        if (searchProfile === 'ddr3Pc') {
            if (pageDom.innerHTML.match(/ddr2/i) ||
                pageDom.innerHTML.match(/divi kodoli/i) ||
            0) {
                skip = true;
            }
        }
        return skip;
    };

    let skipRow = function(tr: HTMLElement, searchProfile: search_profile_t) {
        let skip = false;
        skip = skip || !tr.innerText.match(/riga|рига|rīga/i);
        if (searchProfile === 'ddr3Pc') {
            // there are tons of such ads since nobody needs these old pc-s
            if (tr.innerText.match(/dual|duo|двухядерн|core\s*2/i)) {
                skip = true;
            }
        }
        return skip;
    };

    let processRow = function(tr: HTMLElement, searchProfile: search_profile_t) {
        if (!skipRow(tr, searchProfile)) {
            if (searchProfile === 'ddr3Pc') {
                tr.innerHTML = tr.innerHTML
                    .replace(/i5/gi, '<b style="color: red">i5</b>')
                    .replace(/i7/gi, '<b style="color: red">i7</b>')
                    .replace(/quad/gi, '<b style="color: red">QUAD</b>')
                    ;
            }
            let tbody = Dom.get(mainCont).any('.ad-rows-holder tbody')[0];
            tbody.appendChild(tr);
            let adUrl = 'https://www.ss.lv/' + Dom.get(tr).a()[0].getAttribute('href');
            traffic.http(adUrl).then = adPage => {
                if (skipAd(adPage, 'ddr3Pc')) {
                    tr.remove();
                } else {
                    // remove main image since it takes too much space and is duplicated below anyways
                    S.list(Dom.get(adPage).any('#msg_div_preload')).forEach = dom => dom.remove;

                    let bigRow = Dom.mk.tr({
                        children: [Dom.mk.td({
                            children: [Dom.wrap(adPage)],
                            colSpan: 100,
                        })]
                    });
                    tbody.insertBefore(bigRow.s, tr);
                    S.list(Dom.get(tr).input('[type="checkbox"]')).forEach = flag =>
                        flag.onchange = e => bigRow.s.style.display = e.target.checked ? 'none' : 'block';
                }
            };
        }
    };

    let loadAds = function(searchUrl: string) {
        let doNext = (page: number) => {
            let pageUrl = searchUrl + '/page' + page + '.html';
            FrameBridge.getPage(pageUrl).then = (pageDom) => {
                Dom.get(pageDom).any('#head_line ~ tr')
                    .forEach(tr => processRow(tr, 'ddr3Pc'));
                let nextPage = page + 1;
                if (pageDom.innerHTML.indexOf('/page' + nextPage + '.html') > -1) {
                    doNext(nextPage);
                }
            };
        };
        doNext(1);
    };

    let esc = encodeURIComponent;
    let unesc = decodeURIComponent;
    let hashParams = location.hash
        ? new Map(location.hash.substr(1)
            .split('&')
            .map(p => T2(p.split('=').map(unesc))))
        : new Map();

    let revalidateHashQuery = function() {
        loadAds(hashParams.get('searchUrl'));
    };

    let inputSearchUrl = function(e: Event) {
        e.preventDefault();

        let searchUrl = Dom.get(mainCont).input('.search-url')[0].value;
        hashParams.set('searchUrl', searchUrl);
        location.hash = [...hashParams].map(t => t.map(esc).join('=')).join('&');
        revalidateHashQuery();

        return false;
    };

    window.onhashchange = revalidateHashQuery;
    Dom.get(mainCont).form('.search-params')[0].onsubmit = inputSearchUrl;
};
