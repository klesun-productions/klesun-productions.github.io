
import {ISmfFile} from "../DataStructures";
import {ytlink_t} from "../MainPage";
import {Dom} from "./Dom";
import {S, IOpts, IPromise} from "./S";

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

let ajax = function(funcName: string, restMethod: 'POST' | 'GET', params: {[k: string]: any}, whenLoaded?: (js: any) => void)
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
            let oReq = new XMLHttpRequest();
            let url = '/htbin/json_service.py?f=' + funcName;
            let esc = encodeURIComponent;
            for (let k of restMethod === 'GET' ? Object.keys(params) : []) {
                url += '&' + esc(k) + '=' + esc(params[k]);
            }
            oReq.open(restMethod, url, true);
            oReq.responseType = 'json';
            oReq.setRequestHeader('Content-Type', 'application/json;UTF-8');
            oReq.onload = () => {
                if (oReq.response === null) {
                    console.error('server error, see network log of ' + funcName, oReq);
                    return;
                }
                var [result, error] = oReq.response;
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
            oReq.send(restMethod === 'POST' ? JSON.stringify(params) : null);
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

    get_anime_users: (malId: number): IPromise<Array<{
        score: number,
        userProfile: user_profile_t,
    }>> =>
        ajax('get_anime_users', 'GET', {malId: malId}),

    add_user_anime_lists: (rows: user_anime_list_t[]) =>
        contribute('add_mal_db_rows', {table: 'animeList', rows: rows}),

    add_mal_db_rows: (table: string, rows: {[k: string]: string | number}[]) =>
        contribute('add_mal_db_rows', {table: table, rows: rows}),

    set get_animes(cb: (animes: anime_t[]) => void) {
        ajax('get_animes', 'GET', {}, cb);
    },

    set get_mal_logins(cb: (logins: string[]) => void) {
        ajax('get_mal_logins', 'GET', {}, cb);
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
    mbrCnt: number,
    epsCnt?: number,
    score: number,
    format: string,
    briefing: string,
    imgUrl: string,
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
    login?: string, // supposed to be assigned manually
    joinedRaw: string,
    lastOnlineRaw: string,
    // following are optional
    gender?: string,
    birthdayRaw?: string,
    location?: string,
    imgUrl?: string,
    aboutUser?: string,
    // hack for shape to dict conversion
    [k: string]: string
}