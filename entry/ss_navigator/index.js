/// <reference path="../../src/references.ts" />
define(["require", "exports", "../../src/utils/Dom", "../../src/utils/FrameBridge", "../../src/utils/GrabTraffic"], function (require, exports, Dom_1, FrameBridge_1, GrabTraffic_1) {
    "use strict";
    exports.main = function (mainCont) {
        let T2 = function (tuple) {
            let [a, b] = tuple;
            return [a, b];
        };
        let traffic = GrabTraffic_1.GrabTraffic(() => 1, FrameBridge_1.FrameBridge.getPage);
        let skipAd = function (pageDom, searchProfile) {
            let skip = false;
            if (pageDom.innerHTML.match(/veikal/i)) {
                skip = true;
            }
            return skip;
        };
        let skipRow = function (tr, searchProfile) {
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
        let processRow = function (tr, searchProfile) {
            if (!skipRow(tr, searchProfile)) {
                if (searchProfile === 'ddr3Pc') {
                    tr.innerHTML = tr.innerHTML
                        .replace(/i5/gi, '<b style="color: red">i5</b>')
                        .replace(/i7/gi, '<b style="color: red">i7</b>')
                        .replace(/quad/gi, '<b style="color: red">QUAD</b>');
                }
                let tbody = Dom_1.Dom.get(mainCont).any('.ad-rows-holder tbody')[0];
                tbody.appendChild(tr);
                let adUrl = 'https://www.ss.lv/' + Dom_1.Dom.get(tr).a()[0].getAttribute('href');
                traffic.http(adUrl).then = adPage => {
                    if (skipAd(adPage, 'ddr3Pc')) {
                        tr.remove();
                    }
                    else {
                        let bigRow = Dom_1.Dom.mk.tr({
                            children: [Dom_1.Dom.mk.td({
                                    children: [Dom_1.Dom.wrap(adPage)],
                                    colSpan: 100,
                                })]
                        });
                        tbody.insertBefore(bigRow.s, tr);
                    }
                };
            }
        };
        let loadAds = function (searchUrl) {
            let doNext = (page) => {
                let pageUrl = searchUrl + '/page' + page + '.html';
                FrameBridge_1.FrameBridge.getPage(pageUrl).then = (pageDom) => {
                    Dom_1.Dom.get(pageDom).any('#head_line ~ tr')
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
        let revalidateHashQuery = function () {
            loadAds(hashParams.get('searchUrl'));
        };
        let inputSearchUrl = function (e) {
            e.preventDefault();
            let searchUrl = Dom_1.Dom.get(mainCont).input('.search-url')[0].value;
            hashParams.set('searchUrl', searchUrl);
            location.hash = [...hashParams].map(t => t.map(esc).join('=')).join('&');
            revalidateHashQuery();
            return false;
        };
        window.onhashchange = revalidateHashQuery;
        Dom_1.Dom.get(mainCont).form('.search-params')[0].onsubmit = inputSearchUrl;
    };
});
//# sourceMappingURL=index.js.map