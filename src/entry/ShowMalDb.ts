
/// <reference path="../references.ts" />

import {ServApi, user_profile_t, user_anime_t, user_calc_t, user_anime_extended_t} from "../utils/ServApi";
import {Dom} from "../utils/Dom";
import {S} from "../utils/S";
import {Chart} from "../utils/Chart";
import {Tls} from "../utils/Tls";

declare let $: any;

/**
 * draws graph of score dependence from user age on MAL
 */
let drawGraph = function(scores: user_anime_extended_t[], canvas: HTMLCanvasElement)
{
    canvas.getContext('2d').clearRect(0,0,9999,9999);
    let colors = [
        S.t4(0,0,255,0.5),
        S.t4(0,255,0,0.5),
        S.t4(255,0,0,0.5),
    ];
    let i = 0;
    for (let gender of [null, 'Female', 'Male']) {
        Chart({
            canvas: canvas,
            maxY: 10,
            minY: 0,
            pairs: scores
                .filter(score => score.gender === gender)
                .map(score => {
                    let x = new Date(score.joinedRaw).getTime() / 1000;
                    return {x: x, y: score.score};
                })
                .sort((a,b) => a.x - b.x),
            color: colors[i++],
        });
    }
};

/** negative - red, positive - green */
let signColor = function(value: number) {
    let fixed = value.toFixed(3);
    if (value > 0.5) {
        return '<span style="color: #00aa00">' + fixed + '</span>';
    } else if (value < -0.5) {
        return '<span style="color: #bb0000">' + fixed + '</span>';
    } else {
        return '<span style="color: #888888">' + fixed + '</span>';
    }
};

let listRandomUsers = function(
    tbody: HTMLElement,
    userScores: user_anime_extended_t[]
) {
    userScores.sort((a,b) =>
        Math.abs(a.score - a.averageScore) -
        Math.abs(b.score - b.averageScore)
    );

    console.log(new Date().toISOString(), 'sorted users by attitude');

    // Tls.shuffle(userScores);
    let listed = userScores.slice(-200).reverse();

    console.log(new Date().toISOString(), 'sliced 200 rows');

    let i = 0;
    Dom.wrap(tbody, {
        innerHTML: '',
        children: listed.map(userScore => {
            let profile = S.opt(userScore);
            let calc = S.opt(userScore);
            let personalAvg = calc.map(calc => +calc.averageScore);
            return Dom.mk.tr({
                children: [
                    Dom.mk.td({innerHTML: '' + ++i}),
                    Dom.mk.td({innerHTML: profile.map(p => '' + p.userId).def('')}),
                    Dom.mk.td({
                        children: [
                            Dom.mk.a({
                                innerHTML: userScore.login,
                                href: 'https://myanimelist.net/animelist/' + userScore.login + '?status=2&order=4&order2=0',
                            })
                        ],
                    }),
                    Dom.mk.td({innerHTML: profile.map(p => '' + p.gender).def('')}),
                    Dom.mk.td({
                        style: {
                            width: '100px',
                        },
                        innerHTML: profile
                            .map(p => new Date(p.joinedRaw).toISOString().slice(0, 10))
                            .def(''),
                    }),
                    Dom.mk.td({innerHTML: '' + userScore.score}),
                    Dom.mk.td({
                        innerHTML: personalAvg
                            .map(avg => signColor(userScore.score - avg))
                            .def('pending'),
                    }),
                    Dom.mk.td({
                        innerHTML: personalAvg
                            .map(avg => avg.toFixed(3))
                            .def('pending'),
                    }),
                    Dom.mk.td({innerHTML: calc.map(c => '' + c.animesWatched).def('pending')}),
                ],
            })
        }),
    });

    console.log(new Date().toISOString(), 'generated dom');
};

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

    let showFetchedScores = (usrs: user_anime_extended_t[]) => {
        let guys: number[] = [];
        let gals: number[] = [];
        let rest: number[] = [];

        let userScores = usrs.filter(u => u.score > 0);

        for (let userScore of userScores) {
            if (!userScore.gender) {
                rest.push(userScore.score);
            } else if (userScore.gender === 'Male') {
                guys.push(userScore.score);
            } else if (userScore.gender === 'Female') {
                gals.push(userScore.score);
            }
        }

        let genderedScores = guys.length + gals.length;
        let percent = function(n: number, total: number) {
            let factor = (n / total);
            let textPart = n + ' (' + factor.toFixed(2) + ')';
            return factor > 0.5 ? '<b>' + textPart + '</b>' : textPart;
        };

        Dom.get(mainCont).any('.result')[0].innerHTML = [
            'Average Score, Guys : ' + ' (' + avg(guys) + ') ' + percent(guys.length, genderedScores),
            'Average Score, Gals : ' + ' (' + avg(gals) + ') ' + percent(gals.length, genderedScores),
            'Average Score, Anons: ' + ' (' + avg(rest) + ') ' + rest.length,
            'Not scored: ' + percent(usrs.length - userScores.length, userScores.length),
        ].join('<br/>');

        listRandomUsers(Dom.get(mainCont).any('tbody.scoring-users')[0], userScores);

        /** @debug */
        console.log(new Date().toISOString(), 'Gonna draw chart');

        drawGraph(usrs, Dom.get(mainCont).canvas('.absolute-chart')[0]);

        /** @debug */
        console.log(new Date().toISOString(), 'Drew chart');
    };

    Dom.get(mainCont).form('.analyze-request')[0].onsubmit = (e) => {
        e.preventDefault();

        let title = animeInput.value;
        let malId = titleToId.get(title);

        if (malId) {
            S.opt(Dom.get(mainCont).any('.holder.title')[0])
                .get = dom => dom.innerHTML = title;
            S.opt(Dom.get(mainCont).any('.holder.retrieval-status')[0])
                .get = dom => dom.innerHTML = 'Fetching Scores...';

            let fetchedScores: user_anime_extended_t[] = [];
            ServApi.get_anime_users(malId)
                .chunk(chunk => {
                    fetchedScores.push(...chunk);
                    S.opt(Dom.get(mainCont).any('.holder.scores-retrieved')[0])
                        .get = dom => dom.innerHTML = '' + fetchedScores.length;

                    if (fetchedScores.length === 2000 ||
                        fetchedScores.length === 10000 ||
                        fetchedScores.length === 50000
                    ) {
                        showFetchedScores(fetchedScores);
                    }
                })
                .then = all => {
                    S.opt(Dom.get(mainCont).any('.holder.retrieval-status')[0])
                        .get = dom => dom.innerHTML = 'All Scores Retrieved';

                    showFetchedScores(all);
                };

            Dom.get(mainCont).any('.result')[0].innerHTML = 'Please wait for DB query...';
        } else {
            alert('No such anime in database: ' + title);
        }

        // don't know why, but preventDefault(); does not work
        return false;
    };
};
