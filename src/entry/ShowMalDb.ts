
/// <reference path="../references.ts" />

import {ServApi} from "../utils/ServApi";
import {Dom} from "../utils/Dom";
import {S} from "../utils/S";

declare let $: any;

/**
 * mapper between page and code
 * provides access to my borrowed MAL database dump
 */
export let ShowMalDb = (mainCont: HTMLElement) =>
    ServApi.get_animes = animes =>
{
    let titleToId = new Map(animes.map(a => S.tuple(a.title, a.malId)));

    let select = Dom.get(mainCont).any('.analyzedAnime')[0];
    Dom.wrap(select, {
        children: [
            Dom.mk.option({
                disabled: true,
                selected: true,
            }),
        ].concat(animes.map(a => Dom.mk.option({
            // value: a.malId + '',
            innerHTML: a.title,
        }))),
    });

    let animeInput = Dom.get(mainCont).input('form.analyze-request input[type="text')[0];
    animeInput.removeAttribute('disabled');
    animeInput.value = '';

    let avg = (arr: number[]) => (arr.reduce((sum, el) => sum + el, 0) / arr.length).toFixed(4);

    Dom.get(mainCont).form('.analyze-request')[0].onsubmit = (e) => {
        e.preventDefault();

        let title = animeInput.value;
        let malId = titleToId.get(title);

        if (malId) {
            ServApi.get_anime_users(malId).then = users => {
                console.log(users);

                let guys: number[] = [];
                let gals: number[] = [];
                let rest: number[] = [];
                for (let user of users) {
                    if (user.userProfile.gender === 'Male') {
                        guys.push(user.score);
                    } else if (user.userProfile.gender === 'Female') {
                        gals.push(user.score);
                    } else {
                        rest.push(user.score);
                    }
                }

                Dom.get(mainCont).any('.result')[0].innerHTML = [
                    'Title: ' + title,
                    'Average Score, Guys : ' + ' (' + avg(guys) + ') ' + guys.length,
                    'Average Score, Gals : ' + ' (' + avg(gals) + ') ' + gals.length,
                    'Average Score, Anons: ' + ' (' + avg(rest) + ') ' + rest.length,
                ].join('<br/>');
            };
            Dom.get(mainCont).any('.result')[0].innerHTML = 'Please wait for DB query...';
        } else {
            alert('No such anime in database: ' + title);
        }

        // don't know why, but preventDefault(); does not work
        return false;
    };
};
