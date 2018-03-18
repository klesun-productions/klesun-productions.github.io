
/**
 * time for another module resolution util!
 * damn requirejs implicitly loads module seconds time if
 * index.html is located not in the root of the project:
 * @see https://github.com/requirejs/requirejs/issues/1395
 *
 * i tried to look in their code to add a simple fix, but it
 * was too complex for such a trivial task... well i believe
 * it is trivial, that's why i'm writing this util to support relative urls.
 */

// trying to preserve same format as require.js
// require(['./index.js'], (index) => index.main($$('main')[0]));

(function(){

    /** @param {string} n - url @return {then: Callback<string resp>} */
    let http = (n,e,t,o)=>{e=e||"GET";t=t||{};var r={then:n=>{}};o=o||(n=>{});var s=encodeURIComponent;n+=e.toUpperCase()==="GET"?"?"+Object.keys(t).map(n=>s(n)+"="+s(t[n])).join("&"):"";var p=new XMLHttpRequest;p.open(e,n,true);p.responseType="text";p.onload=(()=>r.then(p.response));p.onprogress=(()=>o(p.response));p.send(JSON.stringify(t));return r};
    let opt = function(n,t=false){let u=()=>t||n!==null&&n!==undefined;let o;return o={map:t=>u()?opt(t(n)):opt(null),flt:t=>u()&&t(n)?opt(n):opt(null),saf:t=>{if(u()){try{return opt(t(n))}catch(n){console.error("Opt mapping threw an exception",n)}}return opt(null)},def:t=>u()?n:t,has:u,set get(t){if(u()){t(n)}},wth:t=>{if(u())t(n);return o},uni:(t,o)=>u()?t(n):o(),err:t=>{if(u()){return{set els(t){t(n)}}}else{t();return{set els(n){}}}}}};
    let promise = function(n){let o=false;let t;let f=[];n(n=>{o=true;t=n;f.forEach(n=>n(t))});let i={set then(n){if(o){n(t)}else{f.push(n)}},map:n=>promise(o=>i.then=(t=>o(n(t)))),now:()=>opt(t,o)};return i};
    let optAll = (s)=>s.every(o => o.has())?opt(s.map(o => o.def(null))):opt(null);
    let promiseAll = (p)=>promise(d=>{let i=()=>optAll(p.map(p => p.now())).get=v=>d(v);p.forEach(p => p.then = i);});

    // global variable that should be set
    // before evaluating fetched script
    let currentUrl = window.location.pathname;

    // modules by url
    let cachedModules = {};

    // callback arrays by url
    let awaiting = {};

    /** @return IPromise<module> */
    let resolveRealModule = (moduleUrl) => promise(done => {
        if (cachedModules[moduleUrl]) {
            done(cachedModules[moduleUrl]);
        } else if (awaiting[moduleUrl]) {
            awaiting[moduleUrl].push(done);
        } else {
            awaiting[moduleUrl] = [];
            awaiting[moduleUrl].push(done);
            http(moduleUrl).then = code => {
                currentUrl = moduleUrl;
                let resolvingDeps = eval(code);
                resolvingDeps.then = (moduleResult) => {
                    cachedModules[moduleUrl] = moduleResult;
                    awaiting[moduleUrl].forEach(done => done(moduleResult));
                    delete awaiting[moduleUrl];
                };
            };
        }
    });

    let addPathToUrl = function (path, url) {
        let result;
        if (!path.startsWith('./') && !path.startsWith('../')) {
            // apparently, typescript compiler makrs paths from root this way
            // src/utils/Dom, weird, but ok
            result = '/' + path;
        } else {
            let urlParts = url.split('/');
            let pathParts = path.split('/');

            if (urlParts.slice(-1)[0] !== '') {
                // does not end with a slash - script, not directory
                urlParts.pop();
            }

            // getting rid of trailing slashes if any
            while (pathParts[0] === '') pathParts.shift();
            while (urlParts.slice(-1)[0] === '') urlParts.pop();

            while (pathParts.length > 0 && urlParts.length > 0) {
                if (pathParts[0] === '.') {
                    pathParts.shift();
                } else if (pathParts[0] === '..') {
                    pathParts.shift();
                    urlParts.pop();
                } else {
                    break;
                }
            }
            result = urlParts.join('/') + '/' + pathParts.join('/');
        }
        result = result.endsWith('.js') ? result : result + '.js';

        return result;
    };

    let resolveRjsModule = function(relPath, currentUrl) {
        if (relPath === 'require') {
            return promise(done => setTimeout(done(window.require), 0));
        } else if (relPath === 'exports') {
            return promise(done => done({}));
        } else {
            let moduleUrl = addPathToUrl(relPath, currentUrl);
            return resolveRealModule(moduleUrl);
        }
    };

    // TODO: detect circular references. Currently it just hangs waiting forever.
    // requirejs would make one of references undefined in main body btw

    window.require = window.requirejs = window.define =
        (paths, callback) => promise((done) => {
            let url = currentUrl;
            return promiseAll(paths.map(p => resolveRjsModule(p, currentUrl)))
                .then = (required) => {
                    let expIdx = paths.indexOf('exports');
                    let exports = expIdx > -1 ? required[expIdx] : {};
                    callback(...required);
                    done(exports);
                };
        });
}());
