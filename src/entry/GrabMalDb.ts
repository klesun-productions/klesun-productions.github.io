
/// <reference path="../references.ts" />

import {ServApi, anime_t, recent_user_t, user_anime_t, user_anime_list_t, user_profile_t} from "../utils/ServApi";
import {Dom} from "../utils/Dom";
import {Tls} from "../utils/Tls";
import {S} from "../utils/S";
import {Grab} from "../utils/Grab";
import {ParseMal} from "../mal/ParseMal";
import {GrabMal} from "../mal/GrabMal";

declare let postBridgeFrame: Window;
let verySecurePassword: string = null;
(<any>window).postBridgeFrame = null;

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
    grab.profile();
};
