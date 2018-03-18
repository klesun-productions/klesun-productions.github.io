
import {Tls} from "../../src/utils/Tls";
import {ParseMal} from "./ParseMal";
import {ServApi, user_anime_score_t} from "../../src/utils/ServApi";
import {Grab} from "../../src/utils/Grab";
import {S, IPromise, IOpts} from "../../src/utils/S";

/** combine opt-s */
let optAll = function<T>(options: IOpts<T>[]): IOpts<T[]> {
    if (options.every(o => o.has())) {
        return S.opt(options.map(o => o.def(null)));
    } else {
        return S.opt(null);
    }
};

/** combine promises */
let promiseAll = function<T>(promises: IPromise<T>[]): IPromise<T[]> {
    return S.promise<T[]>(delayedReturn => {
        let returnIfDone = () => {
            optAll(promises.map(p => p.now())).get
                = values => delayedReturn(values)
        };
        S.list(promises).forEach = p => p.then = returnIfDone;
    });
};

/**
 * unites functions that fetch MAL pages and store them to DB
 * path to a parser matches path to the page it parses... approxumately
 */
export let GrabMal = function(guiCont: HTMLElement) {
    /**
     * supposed to be called once - when all pages with anime search where retrieved
     * @see https://myanimelist.net/anime.php
     */
    let animeSearch = function() {

        Grab({
            jobs: S.range(0, 250).map(i => {
                let rubbishQuery = 'q=&type=0&score=0&status=0&p=0&r=0&sm=0&sd=0&sy=1990&em=0&ed=0&ey=0&c[0]=a&c[1]=b&c[2]=c&c[3]=d&c[4]=e&c[5]=f&c[6]=g&gx=1&o=2&w=2&';
                let url = 'https://myanimelist.net/anime.php?' + rubbishQuery + 'show=' + (i * 50);
                return {
                    url: url,
                    parser: (html: string) => ParseMal(html).anime.search(),
                };
            }),
            chunkHandler: chunk => {
                let rows = S.list(chunk).flatMap(a => a);
                return ServApi.add_animes({rows: rows});
            },
            guiCont: guiCont,
        }).then = (result: string) =>
            console.log('Fetched all animes', result);
    };

    /**
     * fetches pages describing last 2500 users that added this anime to their list
     * need this to acquire approximate list of currently active users
     */
    let animeStats = () => ServApi.get_animes = (animes) => {
        let maxPages = 100; // MAL limitation
        let usersPerPage = 75;

        Grab({
            jobs: S.list(animes).flatMap(anime => {
                let pages = Math.min(anime.mbrCnt / usersPerPage, maxPages) | 0;
                return S.range(0, pages).map(page => 1 && {
                    url: 'https://myanimelist.net/anime/'
                        + anime.malId + '/' + anime.snakeCaseTitle
                        + '/stats?show=' + (page * usersPerPage),
                    parser: (content: string) => S.opt(content)
                        .map(html => ParseMal(html).anime.stats())
                        .map(p => p.recentUsers)
                        .wth(rows => rows.forEach(u => u.malId = anime.malId)),
                });
            }),
            chunkHandler: chunk => ServApi.add_recent_users({
                rows: S.list(chunk).flatMap(v => v),
            }),
            guiCont: guiCont,
        }).then = (result: string) =>
            console.log('Fetched all user profiles', result);
    };

    let animeList = () =>
        ServApi.get_anime_lists_to_fetch = logins =>
        Grab({
            jobs: S.list(logins).flatMap(
                login => [true, false].map(
                asc => 1 && {
                    url: 'https://myanimelist.net/animelist/' + login + '?'
                        + 'status=2&' // "completed"
                        + 'order=' + (asc ? '-' : '') + '4', // by score,
                    parser: (content: string) => S.opt(content)
                        .map(html => ParseMal(html).anime.list())
                        .map(p => 1 && {
                            login: login,
                            parsedPage: p,
                        }),
                })),
            chunkHandler: chunk => promiseAll([
                ServApi.add_user_animes({
                    rows: S.list(chunk).flatMap(
                        e => e.parsedPage.rows.map(
                            pRow => 1 && {
                                login: e.login,
                                malId: +pRow['anime_id'],
                                score: +pRow['score'],
                                epsSeen: +pRow['num_watched_episodes'],
                            })),
                }),
                ServApi.add_user_anime_lists(chunk.map(e => 1 && {
                    login: e.login,
                    isFetched: !e.parsedPage.isAccessDenied
                    && !e.parsedPage.isUnparsable,
                    isInaccessible: e.parsedPage.isAccessDenied,
                    isUnparsable: e.parsedPage.isUnparsable,
                })),
            ]),
            guiCont: guiCont,
        }).then = (result: string) =>
        console.log('Fetched all user anime lists', result);

    let profile = () =>
        ServApi.get_anime_lists_to_fetch = (logins) =>
        Grab({
            jobs: logins.map(login => 1 && {
                url: 'https://myanimelist.net/profile/' + login,
                parser: (content: string) => ParseMal(content).profile(),
            }),
            chunkHandler: chunk => promiseAll([
                ServApi.add_mal_db_rows('userProfile', chunk.map(p => p.profile)),
                ServApi.add_mal_db_rows('userCalc', chunk.map(p => p.calc))
            ]),
            guiCont: guiCont,
            maxWorkers: 24,
        }).then = (result: string) =>
        console.log('Fetched all user profiles', result);

    /**
     * well, actually, i gonna use this
     * to collect user id-s with logins
     */
    let comments = () =>
        ServApi.get_last_fetched_user_id = (lastFetchedUserId) =>
        ServApi.get_user_profiles = (profiles) => {
            let knownIds = new Set(profiles.map(p => p.user_id).filter(id => id !== null));
            Grab({
                jobs: S.range(lastFetchedUserId + 1, 6000000)
                    .filter(id => id % 2 === 1) // they are all odd on some point
                    .filter(id => !knownIds.has(id))
                    .map(userId => 1 && {
                        url: 'https://myanimelist.net/comments.php?id=' + userId,
                        parser: (content:string) => {
                            return S.opt({
                                userId: userId,
                                doesExist: !/404 Not Found/.test(content),
                                login: S.opt(content.match(/([A-Za-z\-_0-9]+)'s Profile/)).map(m => m[1]).def(null),
                                commentCount: S.opt(content.match(/(\d+) Comments/)).map(m => +m[1]).def(null),
                            });
                        },
                    }),
                chunkHandler: chunk => ServApi.add_mal_db_rows('userCommentList', chunk),
                guiCont: guiCont,
            });
        };

    // '8cad612394caeb8f2e2841f354a83883c047230f'
    let getCsrfToken = () =>
        Tls.http('https://myanimelist.net/')
            .map(html => ParseMal(html).index());

    let includesAjaxNoAuthT6 = () => {
        let whenGotCsrfToken = getCsrfToken();
        let whenGotUndatedScores = S.promise<user_anime_score_t[]>(r => ServApi.get_undated_scores = r);

        whenGotCsrfToken.then = mbCsrfToken => mbCsrfToken
            .err(() => console.error('Failed to obtain MAL CSRF token'))
            .els = csrfToken =>
        whenGotUndatedScores.then = scores =>
        Grab({
            jobs: scores.map(scoreRec => 1 && {
                url: 'https://myanimelist.net/includes/ajax-no-auth.inc.php?t=6',
                retriever: (url: string) =>
                    Tls.httpForm(url, 'POST', {
                        color: 1,
                        id: scoreRec.animeId,
                        memId: scoreRec.userId,
                        type: 'anime',
                        csrf_token: csrfToken,
                    }),
                parser: (content: string) =>
                    S.opt(content)
                        .saf(json => <{html: string}>JSON.parse(json))
                        .map(data => data.html.match(/Last Updated:\s+(\d{2}-\d{2}-\d{2})/))
                        .map(m => m[1])
                        .map(rawDate => new Date(rawDate + ' Z').toISOString())
                        .map(dt => {
                            scoreRec.lastUpdatedDt = dt;
                            return scoreRec;
                        }),
            }),
            chunkHandler: chunk => ServApi.add_mal_db_rows('userAnimeScore', chunk),
            guiCont: guiCont,
            maxWorkers: 12,
            chunkSize: 1000,
        }).then = (result: string) =>
            console.log('Fetched all user score dates', result);
    };


    return {
        profile: profile,
        comments: comments,
        anime: {
            list: animeList,
            stats: animeStats,
            search: animeSearch,
        },
        includes: {
            ajaxNoAuthT6: includesAjaxNoAuthT6,
        },
    };
};