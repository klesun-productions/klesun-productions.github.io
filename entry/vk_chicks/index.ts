
import {Dom} from "../../src/utils/Dom";
import {Tls} from "../../src/utils/Tls";
import {FrameBridge} from "../../src/utils/FrameBridge";
import {S} from "../../src/utils/S";
import {GrabTraffic} from "../../src/utils/GrabTraffic";
import {GrabVkChicks, searched_chick_t} from "./utils/GrabVkChicks";
import {ClientUtil} from "../../src/utils/ClientUtil";

export let main = function(mainCont: HTMLElement)
{
    let gui = {
        grabVkChicksBtn: Dom.get(mainCont).button('.grab-vk-chicks')[0],
        grabPersonPagesBtn: Dom.get(mainCont).button('.grab-person-pages')[0],
        maxWorkersInp: Dom.get(mainCont).input('.max-workers')[0],
        chickListHolder: Dom.get(mainCont).any('.chick-list-holder')[0],
    };

    let vkChicks = Tls.http('/out/vk_chicks_flat.json')
        .map(jsonText => S.list(<valid_json_t[]>JSON.parse(jsonText)))
        .map(jsonData => jsonData.unw(searched_chick_t.cast));

    // draw grid with some of their photos
    vkChicks.then = (vkChicks) => vkChicks
        .srt((c) => Math.random())
        .slice(0, 200)
        .chunk(20)
        .sequence = (chunk, i) =>
            S.promise(delayedReturn => {
                S.list(chunk).forEach = chick =>
                    gui.chickListHolder.appendChild(Dom.mk.span({
                        style: {display: 'inline-block'},
                        children: [].concat(!chick.login.match(/^\/?id\d+$/) ? [
                            Dom.mk.span({
                                innerHTML: chick.login,
                                style: {
                                    'writing-mode': 'vertical-lr',
                                    transform: 'rotate(180.00deg)',
                                },
                            }),
                        ] : []).concat([
                            Dom.mk.a({
                                href: 'http://vk.com/' + chick.login,
                                children: [
                                    Dom.mk.img({src: chick.imgUrl, title: chick.fullName}),
                                ],
                            }),
                        ]),
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
        let emptyUrlsInARow: string[] = [];

        S.list(vkChicks)
            .slice(500, 50000)
            .forEach = chick => traffic.http('https://vk.com/' + chick.login)
                .then = page => {
                    console.log('Got page', page);
                    vkChicksApi.store_person_page(chick.login.match(/^\/?(.*)/)[1], page);
                };

        traffic.onIdle = (peoplePacks) => {
            console.log('Done grabbing chicks', peoplePacks);
        };
    };

    gui.grabVkChicksBtn.onclick = () => GrabVkChicks(getMaxWorkers);
    vkChicks.then = vkChicks =>
        gui.grabPersonPagesBtn.onclick = () =>
        grabPersonPages(vkChicks.s);
};