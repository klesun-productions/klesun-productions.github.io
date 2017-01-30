
/// <reference path="../references.ts" />

import {ServApi, anime_t, recent_user_t, user_anime_t, user_anime_list_t, user_profile_t} from "../utils/ServApi";
import {Dom} from "../utils/Dom";
import {Tls} from "../utils/Tls";
import {S} from "../utils/S";
import {Grab} from "../utils/Grab";

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
        let maxPages = 100; // MAL limitation
        let usersPerPage = 75;

        Grab({
            jobs: S.list(animes).flatMap(anime => {
                let pages = Math.min(anime.mbrCnt / usersPerPage, maxPages);
                return S.range(0, pages).map(page => 1 && {
                    url: 'https://myanimelist.net/anime/'
                        + anime.malId + '/' + anime.snakeCaseTitle
                        + '/stats?show=' + (page * usersPerPage),
                    parser: (content: string) => S.opt(parseUsersHistoryPage(content))
                        .map(p => p.recentUsers)
                        .wth(rows => rows.forEach(u => u.malId = anime.malId)),
                });
            }),
            chunkHandler: chunk => ServApi.add_recent_users({
                rows: S.list(chunk).flatMap(v => v),
            }),
            guiCont: mainCont,
        }).then = (result: string) =>
            console.log('Fetched all user profiles', result);
    };

    let parseAnimeUrl = function(url: string) {
        let matches = url.match(/anime\/(\d+)\/(.+)$/);
        if (matches !== null) {
            let [_, malId, snakeCaseName] = matches;
            return {
                malId: malId,
                snakeCaseName: snakeCaseName,
            };
        } else {
            return null;
        }
    };

    let parseListHeaders = function(tr: HTMLElement) {
        let headers = $$('td', tr).map(td => td.innerText.trim());

        let textStarts = new Set(['Anime Title', 'Score', 'Progress']);

        for (let i = 0; i < headers.length; ++i) {
            for (let start of textStarts) {
                if (headers[i].startsWith(start)) {
                    headers[i] = start;
                    textStarts.delete(start);
                    break;
                }
            }
        }

        if (textStarts.size === 0) {
            return headers;
        } else {
            return null;
        }
    };

    let parseListRow = function(tr: HTMLElement, headers: string[]) {
        let tds = $$('td', tr);
        if (tds.length === headers.length) {
            let cells: Map<string, HTMLElement> = new Map();
            for (let i = 0; i < headers.length; ++i) {
                cells.set(headers[i], tds[i]);
            }
            let parsedUrl = $$('a', cells.get('Anime Title'))
                .map(a => parseAnimeUrl(a.getAttribute('href')))
                .filter(p => p !== null)[0];
            if (parsedUrl) {
                return {
                    anime_id: parsedUrl.malId,
                    score: cells.get('Score').innerText.trim(),
                    num_watched_episodes: cells.get('Progress').innerText.trim(),
                };
            } else {
                return null;
            }
        } else {
            return null;
        }
    };

    let parseUserAnimesPage = function(content: string) {
        let pageDom = new DOMParser().parseFromString(content, 'text/html').documentElement;

        let errorDom = $$('.badresult', pageDom)[0];
        let accessDeniedMsg = 'Access to this list has been restricted by the owner.';
        let proxyErrorRegex = /^The requested resource could not be loaded because the server returned an error:/;
        let table = $$('table[data-items]', pageDom)[0];
        let rows: {[k: string]: string}[] = [];
        let isAccessDenied = false;
        let isUnparsable = false;

        if (errorDom && errorDom.innerText.trim() === accessDeniedMsg ||
            proxyErrorRegex.test(content)
        ) {
            isAccessDenied = true;
        } else if (table) {
            let jsonText = table.getAttribute('data-items');
            rows = JSON.parse(jsonText);
        } else {
            // old/custom format
            let headers = null;
            for (let tr of $$('tr', pageDom)) {
                if (headers === null) {
                    headers = parseListHeaders(tr);
                } else {
                    let row = parseListRow(tr, headers);
                    if (row !== null) {
                        rows.push(row);
                    } else {
                        break;
                    }
                }
            }
            isUnparsable = rows.length === 0;
        }

        return {
            isAccessDenied: isAccessDenied,
            isUnparsable: isUnparsable,
            rows: rows,
        };
    };

    let fetchAnimeLists = () =>
        ServApi.get_mal_logins = logins =>
        Grab({
            jobs: S.list(logins).flatMap(
                login => [true, false].map(
                asc => 1 && {
                    url: 'https://myanimelist.net/animelist/' + login + '?'
                        + 'status=2&' // "completed"
                        + 'order=' + (asc ? '-' : '') + '4', // by score,
                    parser: (content: string) => S.opt(content)
                        .map(parseUserAnimesPage)
                        .map(p => 1 && {
                            login: login,
                            parsedPage: p,
                        }),
                })),
            chunkHandler: chunk => S.promise(delayedReturn => {
                let userAnimesResp: string = null;
                let listStatusResp: string = null;

                let returnIfDone = () =>
                    userAnimesResp &&
                    listStatusResp &&
                    delayedReturn([userAnimesResp, listStatusResp]);

                ServApi.add_user_animes({
                    rows: S.list(chunk).flatMap(
                        e => e.parsedPage.rows.map(
                        pRow => 1 && {
                            login: e.login,
                            malId: +pRow['anime_id'],
                            score: +pRow['score'],
                            epsSeen: +pRow['num_watched_episodes'],
                        })),
                }).then = (resp: string) => {
                    userAnimesResp = resp || 'empty response';
                    returnIfDone();
                };

                ServApi.add_user_anime_lists(chunk.map(e => 1 && {
                    login: e.login,
                    isFetched: !e.parsedPage.isAccessDenied
                            && !e.parsedPage.isUnparsable,
                    isInaccessible: e.parsedPage.isAccessDenied,
                    isUnparsable: e.parsedPage.isUnparsable,
                })).then = (resp: string) => {
                    listStatusResp = resp || 'empty response';
                    returnIfDone();
                };
            }),
            guiCont: mainCont,
        }).then = (result: string) =>
        console.log('Fetched all user anime lists', result);

    let parseProfilePage = function(content: string): user_profile_t | null {
        let pageDom = new DOMParser().parseFromString(content, 'text/html').documentElement;
        let imgUrl = S.opt($$('.user-image img', pageDom)[0])
            .map(img => (<any>img).src).def(null);
        let aboutUser = $$('.profile-about-user', pageDom)
            .map(dom => dom.innerText.trim()).join('\n');

        let userStats = new Map($$('.user-status li', pageDom).map(function(li) {
            let [title, value] = $$('span', li);
            if (title && value) {
                return tuple(title.innerText.trim(), value.innerText.trim());
            } else {
                return null;
            }
        }).filter(a => a !== null));

        let result = {
            joinedRaw: userStats.get('Joined'),
            lastOnlineRaw: userStats.get('Last Online'),
            // following are optional
            gender: userStats.get('Gender') || null,
            birthdayRaw: userStats.get('Birthday') || null,
            location: userStats.get('Location') || null,
            imgUrl: imgUrl,
            aboutUser: aboutUser,
        };
        if (!result.lastOnlineRaw || !result.joinedRaw) {
            return null;
        } else {
            return result;
        }
    };

    let fetchProfileInfo = () =>
        ServApi.get_mal_logins = (logins) =>
        Grab({
            jobs: logins.map(login => 1 && {
                url: 'https://myanimelist.net/profile/' + login,
                parser: (content: string) => S.opt(content)
                    .map(parseProfilePage)
                    .wth(p => p.login = login),
            }),
            chunkHandler: chunk => ServApi.add_mal_db_rows('userProfile', chunk),
            guiCont: mainCont,
        }).then = (result: string) =>
        console.log('Fetched all user profiles', result);

    fetchProfileInfo();
};
