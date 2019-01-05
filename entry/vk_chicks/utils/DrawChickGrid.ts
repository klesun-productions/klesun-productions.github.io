import {IPromise, S} from "../../../src/utils/S";
import {searched_chick_t} from "./GrabVkChicks";
import {Tls} from "../../../src/utils/Tls";
import {parsed_profile_t} from "./ParseProfile";
import {ParseRelDt} from "./ParseRelDt";
import {Dom} from "../../../src/utils/Dom";


export let DrawChickGrid = (chickListHolder: HTMLElement, whenSearchRows: IPromise<searched_chick_t[]>) => {
    let whenPersons = Tls.http('./out/parsed_profiles_filtered.json')
        .map(jsonText => <{[k:string]: parsed_profile_t}>JSON.parse(jsonText))
        .map(profiles => {
            // fix wrongly calculated year
            for (let [login, p] of Object.entries(profiles)) {
                p.lastOnlineDt = ParseRelDt(p.fetchedDt, p.lastOnline);
            }
            return profiles;
        });

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

    // draw grid with some of their photos
    whenSearchRows.then
    = (searchRows) => whenPersons.then
    = (loginToParsed) => S.list(searchRows)
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
                S.list(chunk).forEach = chick =>
                    chickListHolder.appendChild(Dom.mk.span({
                        className: 'chick-cell',
                        children: [
                            Dom.mk.a({
                                href: 'out/person_pages/' + chick.login + '.html',
                                // href: 'http://vk.com/' + chick.login,
                                children: [
                                    Dom.mk.img({src: chick.imgUrl, title: chick.fullName}),
                                ],
                            }),
                            Dom.mk.span({
                                children: S.opt(loginToParsed[chick.login]).map(profile => [
                                    //Dom.mk.div({
                                    //    innerHTML: formatLastOnline(profile.lastOnlineDt),
                                    //}),
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
                                        innerHTML: chick.searchDob,
                                    }),
                                    Dom.mk.div({
                                        innerHTML: (profile.posts || [])
                                            .slice(-1)
                                            .map(m => m.dt)[0],
                                    }),
                                ]).def([]),
                            }),
                        ],
                    }).s);
                Tls.timeout(0.5).then = () => delayedReturn(null);
            });
};