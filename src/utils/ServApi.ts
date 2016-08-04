
import {ISmfFile} from "../DataStructures";
import {Tls} from "./Tls";

var verySecurePassword = '';

let askForPassword = function(cb: (pwd: string) => void)
{
    if (verySecurePassword) {
        cb(verySecurePassword);
    } else {
        Tls.promptAssync('Password?', (pwd) => cb(verySecurePassword = pwd));
    }
};

let ajax = function(funcName: string, restMethod: 'POST' | 'GET', params: {[k: string]: any}, whenLoaded: { (js: any): void })
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
            Tls.showError('failed to rate: ' + error);
            verySecurePassword = error !== 'wrongPassword' && verySecurePassword;
        }
    };
    oReq.send(restMethod === 'POST' ? JSON.stringify(params) : null);
};

let contribute = (functionName: string, params: {}, cb: (r: any) => void) =>
    askForPassword(pwd => ajax(functionName, 'POST', {
        'params': params,
        'verySecurePassword': pwd,
    }, cb));

/**
 * provides shortcuts to calls provided
 * by /htbin/json_service.py on server side
 */
export let ServApi = {
    get_ichigos_midi_names: (cb: (songs: ISmfFile[]) => void) =>
        ajax('get_ichigos_midi_names', 'GET', {}, cb),

    rateSong: (isGood: boolean, fileName: string, cb: (rating: string) => void) =>
        contribute('add_song_rating', {isGood: isGood, fileName: fileName}, cb),

    undoRating: (fileName: string, cb: (rating: string) => void) =>
        contribute('undo_song_rating', {fileName: fileName}, cb),
};
