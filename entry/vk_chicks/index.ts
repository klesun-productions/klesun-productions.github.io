
import {Dom} from "../../src/utils/Dom";
import {Tls} from "../../src/utils/Tls";
import {FrameBridge} from "../../src/utils/FrameBridge";
import {S} from "../../src/utils/S";
import {GrabTraffic} from "../../src/utils/GrabTraffic";
import {GrabVkChicks, searched_chick_t} from "./utils/GrabVkChicks";
import {ClientUtil} from "../../src/utils/ClientUtil";
import {parsed_profile_t, ParseProfile} from "./utils/ParseProfile";

export let main = function(mainCont: HTMLElement)
{
    let gui = {
        grabVkChicksBtn: Dom.get(mainCont).button('.grab-vk-chicks')[0],
        grabPersonPagesBtn: Dom.get(mainCont).button('.grab-person-pages')[0],
        parsePersonPagesBtn: Dom.get(mainCont).button('.parse-person-pages')[0],
        maxWorkersInp: Dom.get(mainCont).input('.max-workers')[0],
        chickListHolder: Dom.get(mainCont).any('.chick-list-holder')[0],
        skipBeforeInput: Dom.get(mainCont).input('.skip-before')[0],
    };

    let vkChicks = Tls.http('./out/vk_chicks_flat.json')
        .map(jsonText => S.list(<valid_json_t[]>JSON.parse(jsonText)))
        .map(jsonData => jsonData.map(raw => searched_chick_t.cast(raw)));
 
    let loginToParsed = Tls.http('./out/parsed_profiles_filtered.json')
        .map(jsonText => <{[k:string]: parsed_profile_t}>JSON.parse(jsonText));

    // draw grid with some of their photos
    vkChicks.then
    = (vkChicks) => loginToParsed.then
    = (loginToParsed) => vkChicks
        .flt(c => {
            let parsed = S.opt(loginToParsed[c.login]);
            let married = parsed
                .map(c => c.profileInfoShort['Семейное положение:'])
                // 'в активном поиске', "не замужем"
                .flt(fam => !!fam.match(/^(есть друг|замужем|помолвлена|влюблена|в гражданском браке)/i))
                .has();
            return parsed.has() && !married;
        })
        // .srt((c) => Math.random())
        .slice(0, 4000)
        .chunk(20)
        .sequence = (chunk, i) =>
            S.promise(delayedReturn => {
                S.list(chunk).forEach = chick =>
                    gui.chickListHolder.appendChild(Dom.mk.span({
                        style: {display: 'inline-block'},
                        children: [
                            Dom.mk.a({
                                href: 'out/person_pages/' + chick.login + '.html',
                                // href: 'http://vk.com/' + chick.login,
                                children: [
                                    Dom.mk.img({src: chick.imgUrl, title: chick.fullName}),
                                ],
                            }),
                            Dom.mk.button({
                                innerHTML: 'PRS',
                                onclick: () => Tls.http('out/person_pages/' + chick.login + '.html').then = (html) => {
                                    let page = new DOMParser().parseFromString(html, 'text/html').documentElement;
                                    let parsed = ParseProfile(page);
                                    /** @debug */
                                    console.log('Parsed profile page', parsed);
                                },
                            }),
                        ],
                    }).s);
                Tls.timeout(0.5).then = () => delayedReturn(null);
            });

    let getMaxWorkers = () => +gui.maxWorkersInp.value;

    let vkChicksServiceUrl = 'json_service.py';
    let vkChicksApi = {
        store_person_page: function(login: string, page: HTMLElement) {
            let pageHtml = '<base href="https://vk.com"/><meta charset="utf-8"/>' + page.outerHTML;
            return ClientUtil.contribute(vkChicksServiceUrl, 'store_person_page', {
                login: login, page: pageHtml,
            });
        },
    };

    let grabPersonPages = function(vkChicks: searched_chick_t[]) {
        let traffic = GrabTraffic(getMaxWorkers, FrameBridge.getPage);
        S.list(vkChicks)
            .forEach = chick => traffic.http('https://vk.com/' + chick.login)
                .then = page => {
                    console.log('Got page', page);
                    let isError = page.innerHTML.indexOf('Вы попытались загрузить более одной однотипной страницы в секунду') > -1;
                    if (isError) {
                        traffic.sleep(66.666);
                    } else {
                        vkChicksApi.store_person_page(chick.login.match(/^\/?(.*)/)[1], page);
                        traffic.sleep(1.000);
                    }
                };

        traffic.onIdle = (peoplePacks) => {
            console.log('Done grabbing chicks', peoplePacks);
        };
    };

    let parsePersonPages = function(vkChicks: searched_chick_t[]) {
        let traffic = GrabTraffic(getMaxWorkers, Tls.http);
        S.list(vkChicks)
            .slice(0, 1000)
            .forEach = (chick, i) => traffic.http('out/person_pages/' + chick.login + '.html')
                .map(html => new DOMParser().parseFromString(html, 'text/html').documentElement)
                .map(ParseProfile)
                .then = page => {
                    console.log('Parsed page ' + i + ' ' + page.fullName, page);
                };
        traffic.onIdle = (peoplePacks) => {
            console.log('Done parsing profile pages', peoplePacks);
        };
    };

    let after = (login: string) => {
        let occurred = false;
        return (chick: searched_chick_t) => {
            if (!login) {
                return true;
            } else if (chick.login === login) {
                occurred = true;
                return false;
            } else {
                return occurred;
            }
        };
    };

    gui.grabVkChicksBtn.onclick = () => GrabVkChicks(getMaxWorkers);
    vkChicks.then = vkChicks =>
        gui.grabPersonPagesBtn.onclick = () =>
        grabPersonPages(vkChicks.s.filter(after(gui.skipBeforeInput.value)));

    vkChicks.then = vkChicks =>
        gui.parsePersonPagesBtn.onclick = () =>
        parsePersonPages(vkChicks.s);
};
