
/// <reference path="../references.ts" />

import {ServApi, anime_t, recent_user_t, user_anime_t} from "../utils/ServApi";
import {Dom} from "../utils/Dom";
import {Tls} from "../utils/Tls";

declare let postBridgeFrame: Window;
let verySecurePassword: string = null;
(<any>window).postBridgeFrame = null;

/**
 * initializes admin page to spawn workers to collect
 * data from myanimelist.net and store it to DB
 *
 * in order to work, this script requires CORS to be enabled:
 * $ google-chrome --disable-web-security --user-data-dir
 */
export let GrabMalDb = function(mainCont: HTMLElement)
{
    let $$ = (s: string, root?: Element) => <HTMLElement[]>[...(root || document).querySelectorAll(s)];

    let lastId = 0;
    let makeId = () => ++lastId;

    let idToCb = new Map<number, (content: string) => void>();
    let scheduledJobs: Array<{url: string, cb: (content: string) => void}> = [];
    let jobsInProgress = 0;
    let jobsStarted = 0;
    let startedSeconds = 0;

    // POST cant be send directly from this window in such case
    let isProxy = false;

    let getPostBridgeFrame = function() {
        if (!postBridgeFrame) {
            let url = 'http://midiana.lv/entry/proxy_proxy.html';
            postBridgeFrame = window.open(url, '_blank', 'location=yes,height=400,width=400');
        }
        return postBridgeFrame;
    };

    window.onmessage = function(event) {
        let data = event.data;
        if (data.eventType === 'pageOpened') {
            if (idToCb.has(data.referrenceId)) {
                idToCb.get(data.referrenceId)(data.content);
            }
        } else if (data.eventType === 'backwardPostResponse') {
            console.log('server response ### ' + data.response);
            $$('#outputContainer')[0].innerHTML = 'Last flush on: ' + (new Date().toISOString());
        } else {
            console.log('received unknown message event type', event.data);
        }
    };

    let maxWorkersInput = Dom.get(mainCont).input('input#maxWorkers')[0];
    let getMaxWorkers = () => +maxWorkersInput.value;
    maxWorkersInput.oninput = () => {
        startedSeconds = window.performance.now() / 1000;
        jobsStarted = 0;
    };

    let fetchPageUsingFrame = function(url: string) {
        let result = {then: (content: string) => {}};
        let id = makeId();
        url += '#openedPageReferrenceId=' + id;
        let geom = calcGeometry((id % getMaxWorkers()) / getMaxWorkers());
        let frame = window.open(url, '_blank', 'location=yes,height=' + geom.h + ',width=' + geom.w + ',left=' + geom.x + ',top=' + geom.y);

        /** @debug */
        console.log('opened frame: ', url, frame);

        idToCb.set(id, (content) => {
            idToCb.delete(id);
            result.then(content);
            frame.close();
        });
        setTimeout(() => {
            idToCb.delete(id);
            frame.close();
        }, 15000);
        return result;
    };

    setInterval(function() {
        let free = getMaxWorkers() - jobsInProgress;
        for (let job of scheduledJobs.splice(0, free)) {
            if (++jobsStarted % 20 === 0) {
                let seconds = (window.performance.now() / 1000) - startedSeconds;
                console.info('processing ' + jobsStarted + '-th job. Doing ' + (jobsStarted / seconds) + ' jobs/second');
                console.log('url', job.url);
            }
            ++jobsInProgress;
            Tls.http(job.url).then = resp => {
                --jobsInProgress;
                if (/^Too Many Requests$/.test(resp.trim())) {
                    console.error('MAL whimmed on too many requests. Rescheduling job ' + job.url);
                    scheduledJobs.push(job);
                } else {
                    job.cb(resp);
                }
            };
        }
    }, 100);

    /**
     *  place window on screen depending on the factor
     * of it's index being close to max workers
     */
    let calcGeometry = function(factor: number) {
        let rows = 3;
        let cols = 4;
        let row = (factor * rows * cols) / rows | 0;
        let col = (factor * rows * cols) % cols;
        let result = {
            w: 300,
            h: 300,
            x: col * 300,
            y: row * 300,
        };
        return result;
    };

    let fetchRawAnimeSearchPages = function() {
        let totalPages = 250;
        let makeSearchAnimeUrl = function(page: number) {
            return 'https://myanimelist.net/anime.php?sy=1917&ey=2017&c[0]=a&c[1]=b&c[2]=c&c[3]=f&gx=0&o=7&w=1&show=' + (page * 50);
        };

        setInterval(function() {
            if (idToCb.size < getMaxWorkers() && lastId < totalPages) {
                let id = lastId;
                fetchPageUsingFrame(makeSearchAnimeUrl(lastId)).then = content => {
                    ServApi.store_random_page_data({
                        file_name: 'myanimelist.net_all_anime_search_page_' + id,
                        page_data: content,
                    });
                };
            }
        }, 1000);
    };

    let parseNumber = function(text: string): number {
        text = text.replace(',', '').replace(' ', '').trim();
        return text === '-' ? null : +text;
    };

    /** supposed to be called once - when all pages with anime search where retrieved */
    let parseAnimeSearchPages = function() {
        let parseAnimeSearchPage = function(html: string): anime_t[] {
            let pageDom = new DOMParser().parseFromString(html, 'text/html');
            return $$('.js-block-list tr', pageDom.documentElement)
                .slice(1)
                .map(tr => {
                    let [img, title, format, epsCnt, avgScore, mbrCnt] = $$('td', tr);
                    let animeUrl = Dom.get(img).a()[0].href;
                    let [_, animeId, snakeCaseTitle] = /.*\/(\d+)\/(.+)$/.exec(animeUrl);
                    return {
                        malId: +animeId,
                        snakeCaseTitle: snakeCaseTitle,
                        imgUrl: Dom.get(img).img()[0].src,
                        title: $$('a.hoverinfo_trigger', title)[0].innerText,
                        briefing: $$('div', title).slice(-1)[0].innerText,
                        format: format.innerText,
                        epsCnt: epsCnt.innerText.trim() !== '-'
                            ? +epsCnt.innerText.trim()
                            : null,
                        score: +avgScore.innerText.trim(),
                        mbrCnt: parseNumber(mbrCnt.innerText),
                    };
                });
        };

        for (let i = 1; i <= 250; ++i) {
            Tls.http('http://midiana.lv/out/random_page_data/myanimelist.net/all_anime_search/myanimelist.net_all_anime_search_page_' + i + '.json')
                .map(jsonWithTrailingComa => jsonWithTrailingComa.slice(0, -2)) // coma and line break
                .map(JSON.parse)
                .then
            = content => {
                let pageAnimes = parseAnimeSearchPage(<string>content);
                ServApi.add_animes({rows: pageAnimes});
            };
        }
    };

    let parseMbrCntGroupLines = function(lines: string[]) {
        let amountByHeaderMap = new Map<string, number>();
        for (let line of lines) {
            let matches = /^\s*(.+):\s*([\d\s\,]*)\s*$/.exec(line);
            if (matches !== null) {
                let [_, header, number] = matches;
                amountByHeaderMap.set(header.trim(), parseNumber(number));
            }
        }
        return {
            watching: amountByHeaderMap.get('Watching'),
            completed: amountByHeaderMap.get('Completed'),
            onHold: amountByHeaderMap.get('On-Hold'),
            dropped: amountByHeaderMap.get('Dropped'),
            planToWatch: amountByHeaderMap.get('Plan to Watch'),
            total: amountByHeaderMap.get('Total'),
        };
    };

    let tuple = <T1, T2>(v1: T1, v2: T2): [T1, T2] => [v1, v2];

    let parseUsersHistoryPage = function(content: string) {
        let pageDom = new DOMParser().parseFromString(content, 'text/html').documentElement;

        let summaryLines = $$('.js-scrollfix-bottom-rel > .spaceit_pad', pageDom)
            .map(dom => dom.innerText);

        let scoreToVotesPairs = $$('.js-scrollfix-bottom-rel > table:not(.table-recently-updated) small', pageDom)
            .map((dom, i) => tuple(10 - i, dom.innerText.match(/^\s*\((\d+) +votes\)\s*$/)[1]));

        let recentUsers = $$('.table-recently-updated tr', pageDom)
            .slice(1)
            .map((tr): recent_user_t => {
                let [img, score, status, epsSeen, recency] = $$('td', tr);
                let epsSeenStr = epsSeen.innerText.trim();
                return {
                    login: Dom.get(img).a()[0].href.match(/^.+\/(.+)$/)[1],
                    score: parseNumber(score.innerText),
                    status: status.innerText.trim(),
                    epsSeen: epsSeenStr ? parseNumber(epsSeenStr.match(/^(\d+|\-)\s*(\/\s*(\d+|\-|\?))?$/)[1]) : 0,
                    recency: recency.innerText.trim(),
                    imgUrl: $$('a.image-member', img)[0].style['background-image'].match(/^url\("(.+)"\)/)[1],
                };
            });

        return {
            summary: parseMbrCntGroupLines(summaryLines),
            votesByScore: new Map(scoreToVotesPairs),
            recentUsers: recentUsers,
        };
    };

    /**
     * fetches pages describing last 2500 users that added this anime to their list
     * need this to acquire approximate list of currently active users
     */
    let fetchAnimeUsersHistoryPages = () => ServApi.get_animes = (animes) => {
        /** @debug */
        console.log('fetched animes', animes);
        let maxPages = 100; // MAL limitation
        let usersPerPage = 75;

        let unflushedRows: recent_user_t[] = [];

        let makeUrl = (malId: number, snakeCaseTitle: string, page: number) =>
            'https://myanimelist.net/anime/' + malId + '/' + snakeCaseTitle + '/stats?show=' + (page * usersPerPage);

        for (let anime of animes) {
            let pages = Math.min(anime.mbrCnt / usersPerPage, maxPages);
            for (let page = 0; page < pages; ++page) {
                scheduledJobs.push({
                    url: makeUrl(anime.malId, anime.snakeCaseTitle, page),
                    cb: content => {
                        let parsed = parseUsersHistoryPage(content);
                        let rows = parsed.recentUsers.map(u => {
                            let row = u;
                            row.malId = anime.malId;
                            return row;
                        });
                        unflushedRows.push(...rows);
                    },
                });
            }
        }

        let chunkSize = 6000;
        setInterval(() => {
            if (unflushedRows.length >= chunkSize) {
                console.log('flushing to server');
                let chunk = unflushedRows.splice(0, chunkSize);
                let params = {rows: chunk};
                if (!isProxy) {
                    ServApi.add_recent_users(params).then = (resp) =>
                        console.log('flushed', resp);
                } else {
                    verySecurePassword = verySecurePassword || prompt('password?');
                    getPostBridgeFrame().postMessage({
                        eventType: 'forwardPostRequest',
                        url: '/htbin/json_service.py?f=add_recent_users',
                        params: {
                            params: params,
                            verySecurePassword: verySecurePassword,
                        },
                    }, '*');
                }
            }
        }, 1000);
    };

    let parseUserAnimesPage = function(content: string): {[k: string]: string}[] {
        let pageDom = new DOMParser().parseFromString(content, 'text/html').documentElement;
        let table = $$('table[data-items]', pageDom)[0];
        if (table) {
            let jsonText = table.getAttribute('data-items');
            return JSON.parse(jsonText);
        } else {
            // old format
            return $$('#list_surround > table tr', pageDom)
                .slice(3, -1)
                .map(tr => {
                    let [num, title, score, format, epsSeen] = $$('td', tr);
                    let animeUrl = Dom.get(title).a('.animetitle')[0].getAttribute('href');
                    return {
                        anime_id: animeUrl.match(/anime\/(\d+)\/.+$/)[1],
                        score: score.innerText.trim(),
                        epsSeen: epsSeen.innerText.trim(),
                    };
                });
        }
    };

    let fetchAnimeLists = () => ServApi.get_mal_logins = logins => {
        let unflushedRows: user_anime_t[] = [];

        let makeUrl = (login: string, asc: boolean) =>
            'https://myanimelist.net/animelist/' + login + '?'
                + 'status=2&' // "completed"
                + 'order=' + (asc ? '-' : '') + '4'; // by score

        for (let login of logins) {
            for (let asc of [false, true]) {
                scheduledJobs.push({
                    url: makeUrl(login, asc),
                    cb: content => {
                        let rows = parseUserAnimesPage(content).map(data => 1 && {
                            login: login,
                            malId: +data['anime_id'],
                            score: +data['score'],
                            epsSeen: +data['num_watched_episodes'],
                        });
                        unflushedRows.push(...rows);
                    },
                });
            }
        }

        let chunkSize = 3000;
        setInterval(() => {
            if (unflushedRows.length >= chunkSize) {
                console.log('flushing to server');
                let chunk = unflushedRows.splice(0, chunkSize);
                let params = {rows: chunk};
                ServApi.add_user_animes(params).then = (resp) =>
                    console.log('flushed', resp);
            }
        }, 1000);
    };

    fetchAnimeLists();

    verySecurePassword = prompt('password?');
};

interface event_data_t {
    eventType: 'pageOpened',
    url: string,
    referrenceId: number,
    content: string,
};
