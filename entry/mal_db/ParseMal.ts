/// <reference path="../../src/references.ts" />

import {user_profile_t, recent_user_t, anime_t, user_calc_t} from "../../src/utils/ServApi";
import {S, IOpts} from "../../src/utils/S";
import {Dom} from "../../src/utils/Dom";

/**
 * unites functions that transform MAL pages into data
 * path to a parser matches path to the page it parses... approxumately
 */
export let ParseMal = function(content: string) {
    let pageDom = new DOMParser().parseFromString(content, 'text/html').documentElement;
    let pageText = pageDom.innerText;

    let $$ = (s: string, root?: Element) => <HTMLElement[]>[...(root || pageDom).querySelectorAll(s)];

    let parseNumber = function(text: string): number {
        text = text.replace(',', '').replace(' ', '').trim();
        return text === '-' ? null : +text;
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

    let parseDate = function(malDate: string) {
        if (malDate.trim() === '-') {
            return null;
        }
        malDate = malDate.replace(/\?\?/g, '01');
        return new Date(malDate.trim() + ' Z').toISOString();
    };

    let animeSearch = function(): IOpts<anime_t[]> {
        return S.opt($$('.js-block-list tr')
            .slice(1)
            .map(tr => {
                let [img, title, format, epsCnt, avgScore, startDate, endDate, mbrCnt, ageRestriction] = $$('td', tr);
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
                    startDate: parseDate(startDate.innerText),
                    endDate: parseDate(endDate.innerText),
                    mbrCnt: parseNumber(mbrCnt.innerText),
                    ageRestrictionRaw: ageRestriction.innerText.trim(),
                };
            }));
    };

    let profile = function(): IOpts<{profile: user_profile_t, calc: user_calc_t}> {
        let imgUrl = S.opt($$('.user-image img')[0])
            .map(img => (<any>img).src).def(null);
        let aboutUser = $$('.profile-about-user')
            .map(dom => dom.innerText.trim()).join('\n');

        let userStats = new Map($$('.user-status li').map(function(li) {
            let [title, value] = $$('span', li);
            if (title && value) {
                return S.tuple(title.innerText.trim(), value.innerText.trim());
            } else {
                return null;
            }
        }).filter(a => a !== null));

        return S.opt(content.match(/([a-zA-Z-_0-9]+)'s Profile/)).map(m => m[1]).map(
            login => {
                let result = {
                    profile: {
                        login: login,
                        joinedRaw: userStats.get('Joined'),
                        lastOnlineRaw: userStats.get('Last Online'),
                        // following are optional
                        gender: userStats.get('Gender') || null,
                        birthdayRaw: userStats.get('Birthday') || null,
                        location: userStats.get('Location') || null,
                        imgUrl: imgUrl,
                        aboutUser: aboutUser,
                    },
                    calc: {
                        login: login,
                        animesWatched: S.opt($$('.anime.completed.circle')[0])
                            .map(circle => circle.parentElement)
                            .map(cont => cont.innerText.match(/Completed\s*(\d+)/))
                            .map(matches => +matches[1])
                            .def(null),
                        averageScore: S.opt(pageText.match(/Mean Score:\s*(\d*\.\d+)/)).map(m => +m[1]).def(null),
                    },
                };
                if (result.calc.animesWatched === null) {
                    /** @debug */
                    console.error('failed to parse animes watched ' + login, result, S.opt($$('.anime.completed.circle')[0])
                        .map(circle => circle.parentElement)
                        .map(cont => cont.innerText.match(/Completed\s*(\d+)/))
                        .map(matches => +matches[1])
                        .def(null)
                    );
                }
                return result;
            }
        );
    };

    let animeList = function() {
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

        let errorDom = $$('.badresult')[0];
        let accessDeniedMsg = 'Access to this list has been restricted by the owner.';
        let proxyErrorRegex = /^The requested resource could not be loaded because the server returned an error:/;
        let table = $$('table[data-items]')[0];
        let firstTableTitle: string = null;
        let firstTableRows: {[k: string]: string}[] = null;
        let followingTables: {title: string, rows: {[k: string]: string}[]}[] = [];
        let isAccessDenied = false;
        let isUnparsable = false;

        if (errorDom && errorDom.innerText.trim() === accessDeniedMsg ||
            proxyErrorRegex.test(content)
        ) {
            isAccessDenied = true;
        } else if (table) {
            let jsonText = table.getAttribute('data-items');
            firstTableRows = <{[k: string]: string}[]>JSON.parse(jsonText);
        } else {
            // old/custom format
            let headers = null;
            let rows = [];
            let tableTitle = null;
            for (let tr of $$('tr')) {
                if (headers === null) {
                    headers = parseListHeaders(tr);
                    if (headers === null) {
                        tableTitle = tr.innerText.trim();
                    }
                } else {
                    let row = parseListRow(tr, headers);
                    if (row !== null) {
                        rows.push(row);
                    } else if (rows.length > 0) {
                        if (firstTableRows === null) {
                            firstTableTitle = tableTitle;
                            firstTableRows = rows;
                        } else {
                            // multiple tables on page: Watching/Completed/Dropped/etc..
                            followingTables.push({
                                title: tableTitle,
                                rows: rows,
                            })
                        }
                        rows = [];
                        headers = null;
                    }
                }
            }
            isUnparsable = firstTableRows.length === 0;
        }
        return {
            isAccessDenied: isAccessDenied,
            isUnparsable: isUnparsable,
            tableTitle: firstTableTitle,
            rows: firstTableRows || [],
            followingTables: followingTables,
        };
    };

    let animeStats = function() {
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

        let summaryLines = $$('.js-scrollfix-bottom-rel > .spaceit_pad')
            .map(dom => dom.innerText);

        let scoreToVotesPairs = $$('.js-scrollfix-bottom-rel > table:not(.table-recently-updated) small')
            .map((dom, i) => S.tuple(10 - i, dom.innerText.match(/^\s*\((\d+) +votes\)\s*$/)[1]));

        let recentUsers = $$('.table-recently-updated tr')
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

    // for now i parse only security token, since rest is of no use
    let index = function() {
        return S.opt($$('meta[name="csrf_token"]')[0])
            .map(dom => dom.getAttribute('content'));
    };

    return {
        index: index,
        profile: profile,
        anime: {
            list: animeList,
            search: animeSearch,
            stats: animeStats,
        },
    };
};
