
/// <reference path="../references.ts" />

import {ISmfFile} from "../DataStructures";
import {ytlink_t} from "../MainPage";
import {Dom} from "./Dom";
import {S, IOpts, IPromise} from "./S";
import {Tls} from "./Tls";
import {SafeAccess, valid_json_t, primitive_t} from "./SafeAccess";

var askedPassword: string = null;
let awaitingPassword: Array<(password: string) => void> = [];

let getProxyPostFrame = (): IOpts<Window> =>
    S.opt((<any>window).proxyPostFrame);
let getPreEnteredPassword = () =>
    S.opt(<string>(<any>window).preEnteredPassword);

let lastId = 0;
let makeId = () => ++lastId;
let idToHandler: Map<number, (js: any) => void> = new Map();
// TODO: move this logic to a general singletone
window.onmessage = function(event) {
    let data = event.data;
    if (data.eventType === 'backwardPostResponse') {
        if (idToHandler.has(data.reference)) {
            idToHandler.get(data.reference)(data.response);
        } else {
            console.error();
        }
    } else {
        console.log('received unknown message event type', event.data);
    }
};

// TODO: set it to false when user presses "cancel" to prevent inconsistent state of UX
let askingForPassword = false;

let askForPassword = function(cb: (pwd: string) => void)
{
    let pwd = getPreEnteredPassword().def(askedPassword);
    if (pwd) {
        cb(pwd);
    } else {
        if (askingForPassword === false) {
            askingForPassword = true;
            Dom.showPasswordDialog((pwd) => {
                askingForPassword = false;
                askedPassword = pwd;
                awaitingPassword.splice(0).forEach(c => c(pwd));
            });
        }
        awaitingPassword.push(cb);
    }
};

let ajax = function(funcName: string, restMethod: 'POST' | 'GET', params: valid_json_t, whenLoaded?: (js: any) => void)
{
    let result = S.promise(delayedReturn => {
        let ajaxFromFrame = function(frame: Window)
        {
            let reference = makeId();
            frame.postMessage({
                eventType: 'forwardPostRequest',
                url: '/htbin/json_service.py?f=' + funcName,
                reference: reference,
                params: params,
            }, '*');
            idToHandler.set(reference, delayedReturn);
        };

        let ajaxFromHere = function()
        {
            let http = new XMLHttpRequest();
            let url = '/htbin/json_service.py?f=' + funcName;
            let esc = encodeURIComponent;
            for (let k of restMethod === 'GET' ? Object.keys(params) : []) {
                url += '&' + esc(k) + '=' + esc((<any>params)[k]); // TODO: separate function for GET
            }
            http.open(restMethod, url, true);
            http.responseType = 'json';
            http.setRequestHeader('Content-Type', 'application/json;UTF-8');
            http.onload = () => {
                if (http.response === null) {
                    console.error('server error, see network log of ' + funcName, http);
                    return;
                }
                var [result, error] = http.response;
                if (!error) {
                    delayedReturn(result);
                } else {
                    console.log('failed to ajax [' + funcName + ']: ' + error);
                    if (error === 'wrongPassword') {
                        console.error('wrongPassword while calling ' + funcName);
                        askedPassword = null;
                    }
                }
            };
            http.send(restMethod === 'POST' ? JSON.stringify(params) : null);
        };

        getProxyPostFrame()
            .map(v => restMethod === 'POST' ? v : null)
            .err(ajaxFromHere)
            .els = ajaxFromFrame;
    });
    if (whenLoaded) {
        result.then = whenLoaded;
    }
    return result;
};

type chunk_type_t = 'interruptingError' | 'info' | 'data';
type error_type_t = 'wrongPassword' | 'uncaughtException' | 'notExistingFunction';

interface unify_t <T>{
    data: (content: {
        chunkItems: valid_json_t[]
    }) => T,
    interruptingError: (content: {
        errorType:error_type_t,
        message: string,
    }) => T,
    info: ((content: {
        message: string,
    }) => T)
}

let typeCheckChunk = function<T>(validJson: valid_json_t, unify: unify_t<T>): T {
    let [typedChunk, error] = SafeAccess(validJson, a => 1 && {
        chunkType: a.sub('chunkType', a => <chunk_type_t>a.isString()),
        content: a.sub('content', a => a.isValidJson()),
    });
    if (error) {
        throw new Error('Chunk structure does not match expected protocol: ' + error);
    } else if (typedChunk.chunkType === 'data') {
        return unify.data(<any>typedChunk.content);
    } else if (typedChunk.chunkType === 'interruptingError') {
        return unify.interruptingError(<any>typedChunk.content);
    } else if (typedChunk.chunkType === 'info') {
        return unify.info(<any>typedChunk.content);
    } else {
        throw new Error('Unknown chunk type: ' + typedChunk.chunkType);
    }
};

interface IChunked<T> {
    chunk: (handler: (c: T[]) => void) => IChunked<T>,
    then: (c: T[]) => void,
}

let parseChunks = <T>(lines: string[]): T[] =>
    S.list(lines.map(l => JSON.parse(l)))
        .flatMap(chunk => typeCheckChunk(chunk, {
            data: c => c.chunkItems,
            info: c => [],
            interruptingError: c => {
                console.error('Error in chunked response: ' + c.errorType, c.message);
                return [];
            },
        }));

let retrieveChunked = function<T>(funcName: string, params: {[k: string]: primitive_t}): IChunked<T> {
    let url = '/htbin/chunked_service.py?f=' + funcName;
    let esc = encodeURIComponent;
    for (let k of Object.keys(params)) {
        url += '&' + esc(k) + '=' + esc((<any>params)[k]);
    }

    let http = new XMLHttpRequest();
    http.open('GET', url, true);
    http.responseType = 'text';
    http.send();

    // TODO: optimize so it did not become slower with each iteration

    let self = {
        chunk: function(handler: (c: T[]) => void) {
            var lastLineCount = 0;

            http.onprogress = () => {
                let partial = <string>http.response;
                let lines = partial.split('\n');
                // either empty line or part of incomplete line
                let last = lines.pop();
                let newLines = lines.slice(lastLineCount);
                lastLineCount = lines.length;
                let items = parseChunks<T>(newLines);
                handler(items);
            };
            return self;
        },
        set then (handler: (c: T[]) => void) {
            http.onload = () =>
                handler(parseChunks<T>((<string>http.response)
                    .split('\n')
                    .slice(0, -1)
                ));
        },
    };
    return self;

};

let contribute = (functionName: string, params: {}) => {
    return S.promise(
        delayedReturn => askForPassword(
        pwd => ajax(functionName, 'POST', {
            params: params,
            verySecurePassword: pwd,
        },
        r => delayedReturn(r)))
    );
};

let csvToObjects = function(csv: string) {
    let result: {[k: string]: string | number | boolean}[] = [];
    let tuples = Tls.csvToTuples(csv);
    let headers = tuples.shift();
    for (let i = 0; i < tuples.length; ++i) {
        result[i] = {};
        for (let j = 0; j < headers.length; ++j) {
            result[i][headers[j]] = tuples[i][j];
        }
    }
    return result;
};

/**
 * provides shortcuts to calls provided
 * by /htbin/json_service.py on server side
 */
export let ServApi = {
    get_ichigos_midi_names: (cb: (songs: ISmfFile[]) => void) =>
        ajax('get_ichigos_midi_names', 'GET', {}).then = cb,

    rateSong: (isGood: boolean, fileName: string, cb: (rating: string) => void) =>
        contribute('add_song_rating', {isGood: isGood, fileName: fileName}).then = cb,

    undoRating: (fileName: string, cb: (rating: string) => void) =>
        contribute('undo_song_rating', {fileName: fileName}).then = cb,

    linkYoutubeLinks: (fileName: string, links: ytlink_t[], cb: (id: number) => void) =>
        contribute('link_youtube_links', {fileName: fileName, links: links}).then = cb,

    getYoutubeLinks: (cb: (links: {[fileName: string]: ytlink_t[]}) => void) =>
        ajax('get_youtube_links', 'GET', {}).then = cb,

    collectLikedSongs: (cb: (response: any) => void) =>
        contribute('collect_liked_songs', {}).then = cb,

    save_sample_wav: (params: {
        sfname: string,
        sampleNumber: number,
        sampleName: string,
        sampleRate: number,
        samplingValues: Int16Array,
    }) => contribute('save_sample_wav', params),

    set get_assorted_food_articles(cb: (artciles: article_row_t[]) => void) {
        ajax('get_assorted_food_articles', 'GET', {}).then = cb;
    },

    set_food_article_opinion: (params: article_opinion_t) =>
        contribute('set_food_article_opinion', params),

    add_animes: (params: {rows: anime_t[]}) =>
        contribute('add_animes', params),

    add_recent_users: (params: {rows: recent_user_t[]}) =>
        contribute('add_recent_users', params),

    add_user_animes: (params: {rows: user_anime_t[]}) =>
        contribute('add_user_animes', params),

    get_anime_users: (malId: number): IChunked<user_anime_extended_t> =>
        retrieveChunked('get_anime_users', {malId: malId}),

    add_user_anime_lists: (rows: user_anime_list_t[]) =>
        contribute('add_mal_db_rows', {table: 'animeList', rows: rows}),

    add_mal_db_rows: (table: string, rows: {[k: string]: string | number | boolean}[]) =>
        contribute('add_mal_db_rows', {table: table, rows: rows}),

    set get_animes(cb: (animes: anime_t[]) => void) {
        ajax('get_animes', 'GET', {}, cb);
    },

    set get_mal_logins(cb: (logins: string[]) => void) {
        ajax('get_mal_logins', 'GET', {}, cb);
    },

    set get_anime_lists_to_fetch(cb: (logins: string[]) => void) {
        ajax('get_anime_lists_to_fetch', 'GET', {}, cb);
    },

    set get_profiles_to_fetch(cb: (logins: string[]) => void) {
        ajax('get_profiles_to_fetch', 'GET', {}, cb);
    },

    set get_user_profiles(cb: (profiles: user_profile_t[]) => void) {
        // ajax('get_user_profiles', 'GET', {}, cb);
        Tls.http('/out/userProfile.csv')
            .map(csv => <user_profile_t[]>csvToObjects(csv))
            .then = cb;
    },

    set get_user_calcs(cb: (profiles: user_calc_t[]) => void) {
        Tls.http('/out/userCalc.csv')
            .map(csv => <user_calc_t[]>csvToObjects(csv))
            .then = cb;
    },

    set get_last_fetched_user_id(cb: (id: number) => void) {
        ajax('get_last_fetched_user_id', 'GET', {}, cb);
    },

    set get_recipe_book(cb: (book: {[word: string]: number}) => void) {
        ajax('get_recipe_book', 'GET', {}, cb);
    },

    submit_starve_game_score: (params: {playerName: string, guessedWords: string[]}) =>
        ajax('submit_starve_game_score', 'POST', {params: params, verySecurePassword: null}, (resp) => {}),
    store_random_page_data: (params: {file_name: string, page_data: any,}) =>
        contribute('store_random_page_data', params),

    set get_starve_game_high_scores(cb: (highScore: high_score_t[]) => void) {
        ajax('get_starve_game_high_scores', 'GET', {}, cb);
    },
    set get_food_article_opinions(cb: (articleOpinions: article_opinion_t[]) => void) {
        ajax('get_food_article_opinions', 'GET', {}, cb);
    },
    set get_wiki_article_redirects(cb: (mainWordBySynonim: {[k: string]: string}) => void) {
        ajax('get_wiki_article_redirects', 'GET', {}, cb);
    },
};

export interface article_row_t {
    wiki_id: number,
    wiki_title: string,
    aticle_type: string,
    food_weight: number,
    definition_noun: string,
}

interface article_opinion_t {
    wiki_id: number,
    food_relevance_score: number,
    food_relevance_message: string,
    definition_noun: string,
    title: string,
}

interface high_score_t {
    playerName: string,
    score: number,
    guessedWords: string, // separated by coma
}

export interface anime_t {
    malId: number,
    snakeCaseTitle: string,
    title: string,
    epsCnt?: number,
    score: number,
    format: string,
    briefing: string,
    imgUrl: string,
    startDate: string,
    endDate: string,
    mbrCnt: number,
    ageRestrictionRaw: string,
}

export interface recent_user_t {
    malId?: number,
    login: string,
    score: number,
    status: string,
    epsSeen: number,
    recency: string,
    imgUrl: string,
}
export interface user_anime_t {
    login: string,
    malId: number,
    score: number,
    epsSeen: number,
}

export interface user_anime_list_t {
    login: string,
    isFetched: boolean,
    isInaccessible: boolean,
    isUnparsable: boolean,
}

export interface user_profile_t {
    login: string,
    joinedRaw: string,
    lastOnlineRaw: string,
    // following are optional
    gender?: string,
    birthdayRaw?: string,
    location?: string,
    imgUrl?: string,
    aboutUser?: string,
    user_id?: number,

    [k: string]: string | number
}
export interface user_calc_t {
    login: string,
    animesWatched: number,
    averageScore: number,

    [k: string]: string | number
}

/** would be achieved after JOIN-ing the three tables in SQL */
export interface user_anime_extended_t /* extends user_anime_t, user_profile_t, user_calc_t */ {
    /* userAnime */
    login: string,
    score: number,

    /* userProfile */
    userId: number,
    joinedRaw: string,
    gender: string | null,

    /* userCalc */
    averageScore: number
    animesWatched: number,
}