// import { setCORS } from "google-translate-api-browser";
// // setting up cors-anywhere server address
// const translate = setCORS("http://cors-anywhere.herokuapp.com/");

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var sM_1 = __importDefault(require("google-translate-api-browser/dist/sM"));
var GoogleTranslateTk = __importDefault(require("./GoogleTranslateTk.js"));

import translate, { setCORS } from "google-translate-api-browser";
setCORS("http://cors-anywhere.herokuapp.com/");

window.translate = translate;
window.hujtoken =
    function token(text) {
        return new Promise(function (resolve) {
            resolve({ name: "tk", value: sM_1.default(text) });
        });
    };
window.hujtoken_webapp = (text, TKK) => GoogleTranslateTk.default(text, TKK);
