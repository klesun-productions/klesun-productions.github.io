
/** @param {[{
 *     url: 'https://vk.com/search?c[bday]=30&c[bmonth]=12&c[byear]=1996&c[city]=1925340&c[country]=12&c[section]=people&c[sex]=1',
 *     result: [searched_chick_t]
 * }]} packs */
export let FlattenVkChicks = (packs) => {
    let flatChicks = [];
    for (let pack of packs) {
        let {url, result} = pack;
        let params = new Map(url.split('?')[1].split('&').map(i => i.split('=')));
        let y = params.get('c[byear]');
        let m = params.get('c[bmonth]');
        let d = params.get('c[bday]');
        for (let chick of result) {
            flatChicks.push({...chick,
                searchDob: y + '-' + ('00' + m).slice(-2) + '-' + ('00' + d).slice(-2),
            });
        }
    }
    return flatChicks;
};