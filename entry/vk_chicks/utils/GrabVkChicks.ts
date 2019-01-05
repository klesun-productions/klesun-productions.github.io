
import {Dom} from "../../../src/utils/Dom";
import {IOpts, S} from "../../../src/utils/S";
import {GrabTraffic} from "../../../src/utils/GrabTraffic";
import {FrameBridge} from "../../../src/utils/FrameBridge";
import {SafeAccess} from "../../../src/utils/SafeAccess";

let dateRange = function(from: string, to: string) {
    let dts = [];
    let dt = new Date(from);
    while (dt.toISOString() <= new Date(to).toISOString()) {
        dts.push(dt.toISOString());
        dt.setDate(dt.getDate() + 1);
    }
    return dts;
};

let safe = <Tout>(f: (...arg: any[]) => Tout) => (...args: any[]) => {
    try {
        return f(...args);
    } catch (err) {
        console.error('Exception during execution of ' + f, err);
        return null;
    }
};

export let GrabVkChicks = function(getMaxWorkers: () => number) {
    let parsePersonRow = (dom: HTMLElement) => 1 && {
        login: Dom.get(dom).a('.info > .labeled.name *')[0].getAttribute('href'),
        fullName: Dom.get(dom).a('.info > .labeled.name *')[0].innerText,
        imgUrl: S.opt(Dom.get(dom).img('img.search_item_img')[0])
            .map(img => img.getAttribute('src'))
            .def(null),
        miscFacts: Dom.get(dom).any('.info > .labeled:not(.name)')
            .map(dom => dom.innerText),
        dob: <string>null,
    };

    let makeUrl = (dob: Date) => 'https://vk.com/search?' + Object.entries({
        'c[bday]': dob.getUTCDate(),
        'c[bmonth]': dob.getUTCMonth() + 1,
        'c[byear]': dob.getUTCFullYear(),
        'c[city]': '1925340', // Riga
        'c[country]': '12', // the one Riga is located in
        'c[section]': 'people',
        'c[sex]': '1', // female apparently
    }).map(p => p.join('=')).join('&');

    let traffic = GrabTraffic(
        () => +getMaxWorkers(),
        url => FrameBridge.getPage(url)
            .map(page => Dom.get(page)
                .any('.people_row.search_row')
                .map(safe(parsePersonRow)))
    );

    let emptyUrlsInARow: string[] = [];

    let processUrl = (url: string) => traffic.http(url)
        .then = parsedPeople => {
            console.log('new pack of people came - ' + url, parsedPeople);
            if (parsedPeople.length === 0) {
                emptyUrlsInARow.push(url);
            } else {
                emptyUrlsInARow = [];
            }
            if (emptyUrlsInARow.length >= 5) {
                console.log('got 5 empty responses in a row - sleeping 66.6 seconds');
                traffic.sleep(66.6);
                emptyUrlsInARow.splice(0).forEach(processUrl);
            }
        };

    let dobs = dateRange(
        '1990-01-01', // 27 years
        '1997-01-01' // 20 years
    ).reverse();
    S.list(dobs)
        .map(dt => new Date(dt))
        .map(makeUrl)
        .forEach = url => processUrl(url);

    traffic.onIdle = (peoplePacks) => {
        console.log('Done greabbing chicks', peoplePacks);
    };
};

export class searched_chick_t {
    login: string;
    fullName: string;
    imgUrl: string;
    dob?: string;
    miscFacts: string[];
    searchDob?: string;

    static cast = function(raw: valid_json_t): searched_chick_t {
        // TODO: this likely can be automated using reflection since we no more work with an interface
        // actually, there is a type operator in typescript that allows creating type from function result
        let [typed, error] = SafeAccess(raw, a => 1 && {
            login: a.sub('login', a => a.isString()),
            fullName: a.sub('fullName', a => a.isString()),
            imgUrl: a.sub('imgUrl', a => a.isString()),
            dob: a.sub('dob', a => a.isNullString()),
            miscFacts: a.sub('miscFacts', a => a.isList(a => a.isString())),
            searchDob: a.sub('searchDob', a => a.isNullString()),
        });
        if (!error) {
            return typed;
        } else {
            throw new Error('Failed to cast data to a chick - ' + error);
        }
    };
}
