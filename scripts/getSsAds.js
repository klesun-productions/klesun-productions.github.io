let ajax = function (funcName, restMethod, params, whenLoaded) {
    var oReq = new XMLHttpRequest();
    var url = 'http://159.148.74.13//htbin/json_service.py?f=' + funcName;
    oReq.open(restMethod, url, true);
    oReq.responseType = 'json';
    oReq.setRequestHeader('Content-Type', 'application/json;UTF-8');
    oReq.onload = () => (whenLoaded || console.log)(oReq.response);

    oReq.send(restMethod === 'POST' ? JSON.stringify(params) : null);
};

$$ = (s, parent) => [...(parent || document).querySelectorAll(s)];

/**
 * runs through https://ss.lv pages and collects
 * ad links with images and brief info
 */
let getSsAdList = function () {
    let collectRow = (trDom) => 1 && {
        imgUrl: $$('td.msga2 img', trDom)[0].src,
        title: $$('td.msg2', trDom)[0].textContent,
        optionalCells: $$('td.msga2-o', trDom).map(el => el.textContent),
    };

    let combineRowWithHeaders = function (row, headers) {
        let optionalProps = {};
        for (i in row.optionalCells) {
            optionalProps[headers[i]] = row.optionalCells[i];
        }
        row.optionalCells = optionalProps;
        return row;
    };

    let headers = $$('tr#head_line td a').map(a => a.innerHTML);
    headers.shift(); // first is date column, it is not visible, just sorting by it is allowed

    let rows = $$('form#filter_frm table[align="center"] tr:not(#head_line)')
        .filter(tr => tr.style.display !== 'none')
        .map(collectRow)
        .map(row => combineRowWithHeaders(row, headers));

    return rows;
};

let password = null;
let getPassword = () => (password || (password = prompt('Password?')));

ajax('store_random_page_data', 'POST', {
    params: {
        file_name: 'ss.lv_ads_list',
        page_data: {
            timestamp: new Date().toISOString(),
            pageUrl: window.location.href,
            adList: getSsAdList(),jm
        },
    },
    verySecurePassword: getPassword(),
});
