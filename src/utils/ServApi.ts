
import {ISmfFile} from "../DataStructures";
import {Tls} from "./Tls";
import {ytlink_t} from "../MainPage";
import {Dom} from "./Dom";

var verySecurePassword = '';

let awaitingPassword: Array<(password: string) => void> = [];
// TODO: set it to false when user presses "cancel" to prevent inconsistent state of UX
let askingForPassword = false;

let askForPassword = function(cb: (pwd: string) => void)
{
    if (verySecurePassword) {
        cb(verySecurePassword);
    } else {
        if (askingForPassword === false) {
            askingForPassword = true;
            Dom.showPasswordDialog((pwd) => {
                askingForPassword = false;
                verySecurePassword = pwd;
                awaitingPassword.splice(0).forEach(c => c(pwd));
            });
        }
        awaitingPassword.push(cb);
    }
};

let ajax = function(funcName: string, restMethod: 'POST' | 'GET', params: {[k: string]: any}, whenLoaded: (js: any) => void)
{
    var oReq = new XMLHttpRequest();
    oReq.open(restMethod, '/htbin/json_service.py?f=' + funcName, true);
    oReq.responseType = 'json';
    oReq.setRequestHeader('Content-Type', 'application/json;UTF-8');
    oReq.onload = () => {
        if (oReq.response === null) {
            console.error('server error, see network log of ' + funcName);
            return;
        }
        var [result, error] = oReq.response;
        if (!error) {
            whenLoaded(result);
        } else {
            console.log('failed to ajax [' + funcName + ']: ' + error);
            verySecurePassword = error !== 'wrongPassword' && verySecurePassword;
        }
    };
    oReq.send(restMethod === 'POST' ? JSON.stringify(params) : null);
};

let contribute = (functionName: string, params: {}) => {
    let prom = {then: (r: any) => {}};
    askForPassword(pwd => ajax(functionName, 'POST', {
        'params': params,
        'verySecurePassword': pwd,
    }, r => prom.then(r)));
    return prom;
};

/**
 * provides shortcuts to calls provided
 * by /htbin/json_service.py on server side
 */
export let ServApi = {
    get_ichigos_midi_names: (cb: (songs: ISmfFile[]) => void) =>
        ajax('get_ichigos_midi_names', 'GET', {}, cb),

    rateSong: (isGood: boolean, fileName: string, cb: (rating: string) => void) =>
        contribute('add_song_rating', {isGood: isGood, fileName: fileName}).then = cb,

    undoRating: (fileName: string, cb: (rating: string) => void) =>
        contribute('undo_song_rating', {fileName: fileName}).then = cb,

    linkYoutubeLinks: (fileName: string, links: ytlink_t[], cb: (id: number) => void) =>
        contribute('link_youtube_links', {fileName: fileName, links: links}).then = cb,

    getYoutubeLinks: (cb: (links: {[fileName: string]: ytlink_t[]}) => void) =>
        ajax('get_youtube_links', 'GET', {}, cb),

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
        ajax('get_assorted_food_articles', 'GET', {}, cb);
    },

    set_food_article_opinion: (params: article_opinion_t) =>
        contribute('set_food_article_opinion', params),

    add_animes: (params: {rows: anime_t[]}) =>
        contribute('add_animes', params),

    add_recent_users: (params: {rows: recent_user_t[]}) =>
        contribute('add_recent_users', params),

    add_user_animes: (params: {rows: user_anime_t[]}) =>
        contribute('add_user_animes', params),

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