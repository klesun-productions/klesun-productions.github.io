
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

    set get_recipe_book(cb: (book: {[word: string]: number}) => void) {
        ajax('get_recipe_book', 'GET', {}, cb);
    },

    submit_starve_game_score: (params: {playerName: string, guessedWords: string[]}) =>
        ajax('submit_starve_game_score', 'POST', {params: params, verySecurePassword: null}, (resp) => {}),

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
};

interface article_opinion_t {
    wiki_id: number,
    food_relevance_score: number,
    food_relevance_message: string,
    definition_noun: string,
    title: string,
};

interface high_score_t {
    playerName: string,
    score: number,
    guessedWords: string, // separated by coma
};