/// <reference path="../../src/references.ts" />

import {ServApi, anime_t, recent_user_t, user_anime_t, user_anime_list_t, user_profile_t} from "../../src/utils/ServApi";
import {Dom} from "../../src/utils/Dom";
import {Tls} from "../../src/utils/Tls";
import {S} from "../../src/utils/S";
import {Grab} from "../../src/utils/Grab";
import {ParseMal} from "./ParseMal";
import {GrabMal} from "./GrabMal";

declare let postBridgeFrame: Window;
let verySecurePassword: string = null;
(<any>window).postBridgeFrame = null;

let collectKeyPaths = function(value: any, parentKeys: string[] = []) {
    let result: string[][] = [];
    if (typeof value === 'object' &&
        Object.keys(value)
    ) {
        for (let key of Object.keys(value)) {
            parentKeys.push(key);
            result = result.concat(collectKeyPaths(value[key], parentKeys));
            parentKeys.pop();
        }
    } else {
        result.push(parentKeys.slice(0));
    }
    return result;
};

let toT2 = <T>(elmts: T[]) => S.tuple(elmts[0], elmts[1]);

/**
 * initializes admin page to spawn workers to collect
 * data from myanimelist.net and store it to DB
 *
 * in order to work, this script requires CORS to be enabled:
 * $ google-chrome --disable-web-security --user-data-dir
 */
export let GrabMalDb = function(mainCont: HTMLElement)
{
    let grab = GrabMal(mainCont);

    let grabKeyPaths = collectKeyPaths(grab);
    Dom.wrap(Dom.get(mainCont).any('.grabber-links-cont')[0], {
        innerHTML: '',
        children: [Dom.mk.a({
            innerHTML: 'none<br/>',
            href: '#',
        })].concat(grabKeyPaths.map(keys => Dom.mk.a({
            innerHTML: keys.join('.') + '<br/>',
            href: '#grabber-keys=' + keys.join('.'),
        }))),
    });

    window.onhashchange = () => window.location.reload();

    let hashText: string = location.hash.slice(1);
    let dict = new Map(hashText.split('&')
        .map(equ => toT2(equ.split('='))));

    S.opt(dict.get('grabber-keys'))
        .wth(path => S.opt(Dom.get(mainCont)
            .a('[href="#grabber-keys=' + path + '"]')[0])
            .get = dom => dom.classList.add('current')
        )
        .map(ks => ks.split('.'))
        .get = keys => {
            let value: any = grab;
            for (let key of keys) {
                value = value[key];
            }
            value();
        };

    /** @debug */
    // console.log(collectKeyPaths(grab));

    // grab.profile();
};
