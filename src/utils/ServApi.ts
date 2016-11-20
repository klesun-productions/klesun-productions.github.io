
import {ISmfFile} from "../DataStructures";
import {Tls} from "./Tls";
import {ytlink_t} from "../MainPage";

var verySecurePassword = '';

let awaitingPassword: Array<(password: string) => void> = [];

let askForPassword = function(cb: (pwd: string) => void)
{
    if (verySecurePassword) {
        cb(verySecurePassword);
    } else {
        awaitingPassword.push(cb);
        if (awaitingPassword.length < 2) {
            Tls.promptAssync('Password?', (pwd) => {
                verySecurePassword = pwd;
                awaitingPassword.splice(0).forEach(c => c(pwd));
            });
        }
    }
};

let ajax = function(funcName: string, restMethod: 'POST' | 'GET', params: {[k: string]: any}, whenLoaded: (js: any) => void)
{
    var oReq = new XMLHttpRequest();
    oReq.open(restMethod, '/htbin/json_service.py?f=' + funcName, true);
    oReq.responseType = 'json';
    oReq.setRequestHeader('Content-Type', 'application/json;UTF-8');
    oReq.onload = () => {
        var [result, error] = oReq.response;
        if (!error) {
            whenLoaded(result);
        } else {
            Tls.showError('failed to ajax [' + funcName + ']: ' + error);
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
};
