
/// <reference path="../references.ts" />

import {ServApi, user_profile_t, user_anime_t, user_calc_t} from "../utils/ServApi";
import {Dom} from "../utils/Dom";
import {S} from "../utils/S";
import {Chart} from "../utils/Chart";
import {Tls} from "../utils/Tls";

declare let $: any;

let profiles = S.promise(r => ServApi.get_user_profiles = r)
    .map((profiles: user_profile_t[]) => {
        return new Map(profiles.map(p =>
            S.tuple(p.login, p)));
    });

let userCalcs = S.promise(r => ServApi.get_user_calcs = r)
    .map((profiles: user_calc_t[]) => {
        return new Map(profiles.map(p =>
            S.tuple(p.login, p)));
    });

/**
 * draws graph of score dependence from user age on MAL
 */
let drawGraph = function(tuples: [number, user_profile_t][], canvas: HTMLCanvasElement)
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
            pairs: tuples
                .filter(tuple => {
                    let [score, profile] = tuple;
                    return profile.gender === gender;
                })
                .map(tuple => {
                    let [score, profile] = tuple;
                    let x = new Date(profile.joinedRaw).getTime() / 1000;
                    return {x: x, y: score};
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
    userScores: user_anime_t[],
    loginToProfile: Map<string, user_profile_t>
) {
    userCalcs.then = calcs => {
        userScores.sort((a,b) => {
            let attitudeA = S.opt(calcs.get(a.login)).map(c => c.averageScore).map(avg => Math.abs(a.score - avg));
            let attitudeB = S.opt(calcs.get(b.login)).map(c => c.averageScore).map(avg => Math.abs(b.score - avg));
            return attitudeA.uni(
                (a) => attitudeB.uni(
                    (b) => a - b,
                    () => +1
                ),
                () => -1
            );
        });
        // Tls.shuffle(userScores);
        let listed = userScores.slice(-200).reverse();
        let i = 0;
        Dom.wrap(tbody, {
            innerHTML: '',
            children: listed.map(userScore => {
                let profile = S.opt(loginToProfile.get(userScore.login));
                let calc = userCalcs.now().map(calcs => calcs.get(userScore.login));
                let personalAvg = calc.map(calc => +calc.averageScore);
                return Dom.mk.tr({
                    children: [
                        Dom.mk.td({innerHTML: '' + ++i}),
                        Dom.mk.td({innerHTML: profile.map(p => '' + p.user_id).def('')}),
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
    };
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

    Dom.get(mainCont).form('.analyze-request')[0].onsubmit = (e) => {
        e.preventDefault();

        let title = animeInput.value;
        let malId = titleToId.get(title);

        if (malId) {
            ServApi.get_anime_users(malId).then = usrs =>
            profiles.then = loginToProfile => {
                let guys: number[] = [];
                let gals: number[] = [];
                let rest: number[] = [];
                let userScores = usrs.filter(u => u.score > 0);
                for (let userScore of userScores) {
                    let profile = loginToProfile.get(userScore.login);
                    if (!profile || !profile.gender) {
                        rest.push(userScore.score);
                    } else if (profile.gender === 'Male') {
                        guys.push(userScore.score);
                    } else if (profile.gender === 'Female') {
                        gals.push(userScore.score);
                    }
                }

                listRandomUsers(Dom.get(mainCont).any('tbody.scoring-users')[0], userScores, loginToProfile);
                drawGraph(
                    usrs.filter(u => loginToProfile.has(u.login))
                        .map(u => S.tuple(u.score, loginToProfile.get(u.login))),
                    Dom.get(mainCont).canvas('.chart')[0]
                );

                let genderedScores = guys.length + gals.length;
                let percent = function(n: number, total: number) {
                    let factor = (n / total);
                    let textPart = n + ' (' + factor.toFixed(2) + ')';
                    return factor > 0.5 ? '<b>' + textPart + '</b>' : textPart;
                };

                Dom.get(mainCont).any('.result')[0].innerHTML = [
                    'Title: ' + title,
                    'Average Score, Guys : ' + ' (' + avg(guys) + ') ' + percent(guys.length, genderedScores),
                    'Average Score, Gals : ' + ' (' + avg(gals) + ') ' + percent(gals.length, genderedScores),
                    'Average Score, Anons: ' + ' (' + avg(rest) + ') ' + rest.length,
                    'Not scored: ' + percent(usrs.length - userScores.length, userScores.length),
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
