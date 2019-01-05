import {IPromise, S} from "../../../src/utils/S";
import {searched_chick_t} from "./GrabVkChicks";
import {Tls} from "../../../src/utils/Tls";
import {parsed_profile_t} from "./ParseProfile";
import {ParseRelDt} from "./ParseRelDt";
import {Dom} from "../../../src/utils/Dom";


export let DrawChickGrid = (
    chickListHolder: HTMLElement,
    whenSearchRows: IPromise<searched_chick_t[]>
) => {
    let whenPersons = Tls.http('./out/parsed_profiles_filtered.json')
        .map(jsonText => <{[k:string]: parsed_profile_t}>JSON.parse(jsonText))
        .map(profiles => {
            // fix wrongly calculated year
            for (let [login, p] of Object.entries(profiles)) {
                p.lastOnlineDt = ParseRelDt(p.fetchedDt, p.lastOnline);
            }
            return profiles;
        });

    let whenSingles = Tls.http('./out/singles.json')
        .map(jsonText => <valid_json_t[]>JSON.parse(jsonText))
        .map(jsonData => jsonData.map(raw => searched_chick_t.cast(raw)))
        .map(rows => new Set(rows.map(r => r.login)));

    let whenLookers = Tls.http('./out/lookers.json')
        .map(jsonText => <valid_json_t[]>JSON.parse(jsonText))
        .map(jsonData => jsonData.map(raw => searched_chick_t.cast(raw)))
        .map(rows => new Set(rows.map(r => r.login)));

    let normDt = (dt: string) => !dt || dt.endsWith('Z') ? dt : dt.replace(' ', 'T') + 'Z';

    let formatLastOnline = (dt: string | null) => {
        if (!dt) {
            return '';
        } else {
            let millis = new Date().getTime() - new Date(normDt(dt)).getTime();
            let days = Math.floor(millis / 24 / 3600 / 1000);
            return days + ' days';
        }
    };

    let makeCell = (chick: searched_chick_t, profile: parsed_profile_t, status: string) => {
        return Dom.mk.span({
            className: 'chick-cell' + (status ? ' single' : ''),
            children: [
                Dom.mk.a({
                    href: 'https://vk.com' + chick.login,
                    children: [
                        Dom.mk.img({src: chick.imgUrl, title: chick.fullName}),
                    ],
                }),
                Dom.mk.span({
                    children: [
                        //Dom.mk.div({
                        //    innerHTML: formatLastOnline(profile.lastOnlineDt),
                        //}),
                        Dom.mk.div({
                            style: {'font-weight': 'bold', 'color': '#ff1eff'},
                            innerHTML: S.opt(profile.profileInfoShort)
                                .map(info => info['Семейное положение:']).def(''),
                        }),
                        Dom.mk.div({
                            innerHTML: (profile.lastOnline || '').replace(/^заходила /, ''),
                        }),
                        Dom.mk.div({
                            innerHTML: profile.fetchedDt,
                        }),
                        Dom.mk.div({
                            innerHTML: (profile.modules || [])
                                .filter(m => m.type === 'profile_friends')
                                .map(m => m.count + ' friends')[0],
                        }),
                        Dom.mk.div({
                            innerHTML: S.opt(profile.counters)
                                .map(c => c['подписчиков'])
                                .map(n => n + ' subs').def(''),
                        }),
                        Dom.mk.div({
                            innerHTML: chick.searchDob,
                        }),
                        Dom.mk.div({
                            innerHTML: (profile.posts || [])
                                .slice(-1)
                                .map(m => m.dt)[0],
                        }),
                    ].filter(a => a !== null),
                }),
            ],
        }).s;
    };

    // draw grid with some of their photos
    whenSearchRows.then
    = (searchRows) => whenPersons.then
    = (loginToParsed) => whenSingles.then
    = (singles) => whenLookers.then
    = (lookers) => {
        chickListHolder.innerHTML = '';
        S.list(searchRows)
            .flt(c => S.opt(loginToParsed[c.login])
                .flt(profile => {
                    let married = S.opt(profile.profileInfoShort)
                        .map(info => info['Семейное положение:'])
                        // 'в активном поиске', "не замужем"
                        .flt(fam => !!fam.match(/^(есть друг|замужем|помолвлена|влюблена|в гражданском браке)/i))
                        .has();
                    return !married;
                })
                .flt(profile => !!profile.lastOnlineDt) // was here within last 3 months
                .flt(profile => c.searchDob >= '1992')
                .has())
            .srt(c => S.opt(loginToParsed[c.login])
                .map(profile => profile.lastOnlineDt)
                .map(normDt).def(null))
            .rvr()
            // .srt((c) => Math.random())
            .slice(0, 4000)
            .chunk(20)
            .sequence = (chunk, i) =>
            S.promise(delayedReturn => {
                S.list(chunk).forEach = chick => {
                    let person = loginToParsed[chick.login];
                    let status = lookers.has(chick.login) ? 'looking'
                        : singles.has(chick.login) ? 'single' : null;
                    // TODO: make configurable
                    if (status) {
                        let cell = makeCell(chick, person, status);
                        chickListHolder.appendChild(cell);
                    }
                };
                Tls.timeout(0.2).then = () => delayedReturn(null);
            });
    };
};