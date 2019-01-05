
import {Dom} from "../../src/utils/Dom";
import {Tls} from "../../src/utils/Tls";
import {FrameBridge} from "../../src/utils/FrameBridge";
import {S} from "../../src/utils/S";
import {GrabTraffic} from "../../src/utils/GrabTraffic";
import {GrabVkChicks, searched_chick_t} from "./utils/GrabVkChicks";
import {ClientUtil} from "../../src/utils/ClientUtil";
import {parsed_profile_t, ParseProfile} from "./utils/ParseProfile";
import {ParseRelDt} from "./utils/ParseRelDt";
import {DrawChickGrid} from "./utils/DrawChickGrid";

export let main = function(mainCont: HTMLElement)
{
    let gui = {
        grabVkChicksBtn: Dom.get(mainCont).button('.grab-vk-chicks')[0],
        grabPersonPagesBtn: Dom.get(mainCont).button('.grab-person-pages')[0],
        parsePersonPagesBtn: Dom.get(mainCont).button('.parse-person-pages')[0],
        maxWorkersInp: Dom.get(mainCont).input('.max-workers')[0],
        chickListHolder: Dom.get(mainCont).any('.chick-list-holder')[0],
        skipBeforeInput: Dom.get(mainCont).input('.skip-before')[0],
        progressHolder: Dom.get(mainCont).any('.progress-holder')[0],
    };

    let whenSearchRows = Tls.http('./out/vk_chicks_flat.json')
        .map(jsonText => <valid_json_t[]>JSON.parse(jsonText))
        .map(jsonData => jsonData.map(raw => searched_chick_t.cast(raw)));

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

    // parse Apache directory listing
    let getPersonFiles = () => Tls.http('./out/person_pages')
        .map(html => new DOMParser().parseFromString(html, 'text/html').documentElement)
        .map(doc => Dom.get(doc).any('tbody tr').flatMap(tr => {
            let tds = Dom.get(tr).any('td');
            if (tds.length >= 4) {
                let [iconTd, fileLinkTd, dtTd, sizeTd] = tds;
                return [{
                    fileName: fileLinkTd.textContent.trim(),
                    dt: dtTd.textContent.trim() + ':00',
                    size: sizeTd.textContent.trim(),
                }];
            } else {
                return [];
            }
        }))
        .map(files => new Map(files.map(f => S.T2(f.fileName, f))));

    let parsePersonPages = (vkChicks: searched_chick_t[]) => getPersonFiles().then = files => {
        let traffic = GrabTraffic(getMaxWorkers, url => Tls.http(url)
            .map(html => new DOMParser().parseFromString(html, 'text/html').documentElement)
            .map(ParseProfile));
        S.list(vkChicks)
            .forEach = (chick, i) => traffic.http('out/person_pages/' + chick.login + '.html')
                .then = page => {
                    let file = files.get(chick.login.slice(1) + '.html');
                    page.fetchedDt = file ? file.dt : null;
                    page.login = chick.login;
                    page.dob = chick.searchDob;
                    page.lastOnlineDt = ParseRelDt(file.dt, page.lastOnline);
                    gui.progressHolder.innerHTML = i + '';

                    if (i % 50 === 0) {
                        console.log('Parsed page #' + i + ' ' + chick.login + ' ' + page.fullName, page);
                    }
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
    whenSearchRows.then = vkChicks =>
        gui.grabPersonPagesBtn.onclick = () =>
        grabPersonPages(vkChicks.filter(after(gui.skipBeforeInput.value)));

    whenSearchRows.then = vkChicks =>
        gui.parsePersonPagesBtn.onclick = () =>
        parsePersonPages(vkChicks);

    DrawChickGrid(gui.chickListHolder, whenSearchRows);
};
