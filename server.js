const Rej = require('klesun-node-tools/src/Rej.js');
const http = require('http');
const https = require('https');
const url = require('url');
const path = require('path');
const fsSync = require('fs');
const fs = require('fs').promises;
const httpProxy = require('http-proxy');
const {PythonShell} = require('python-shell');

const readPost = (rq) => new Promise((ok, err) => {
    if (rq.method === 'POST') {
        let body = '';
        rq.on('data', (data) => body += data);
        rq.on('error', exc => err(exc));
        rq.on('end', () => ok(body));
    } else {
        ok('');
    }
});

const isStaticFile = pathname => {
    return pathname.startsWith('/entry/')
        || pathname.startsWith('/src/')
        || pathname.startsWith('/libs/')
        || pathname.startsWith('/out/')
        || pathname.startsWith('/imgs/')
        || pathname.startsWith('/unv/hosted/')
        || pathname.startsWith('/unv/imagesFromWeb/')
        || pathname.startsWith('/tests/')
        || pathname.startsWith('/Dropbox/web/')
        || pathname.startsWith('/node_modules/')
        || pathname.startsWith('/unv/gits/riddle-needle/Assets/Audio/midjs/')
        || pathname === '/favicon.ico'
        || pathname === '/robots.txt';
};

const redirect = (rs, url) => {
    rs.writeHead(302, {
        'Location': url,
    });
    rs.end();
};

const serveStaticFile = async (pathname, rs) => {
    pathname = decodeURIComponent(pathname);
    let absPath = __dirname + pathname;
    if (absPath.endsWith('/')) {
        absPath += 'index.html';
    }
    if (pathname.startsWith('/entry/dev_data/')) {
        return redirect(rs, 'https://klesun-misc.github.io/dev_data/' + pathname.slice('/entry/dev_data/'.length));
    }
    if (!fsSync.existsSync(absPath)) {
        return Rej.NotFound('File ' + pathname + ' does not exist');
    }
    if ((await fs.lstat(absPath)).isDirectory()) {
        return redirect(rs, pathname + '/');
    }
    const bytes = await fs.readFile(absPath);
    if (absPath.endsWith('.html')) {
        rs.setHeader('Content-Type', 'text/html');
    } else if (absPath.endsWith('.css')) {
        rs.setHeader('Content-Type', 'text/css');
    } else if (absPath.endsWith('.js')) {
        rs.setHeader('Content-Type', 'text/javascript');
    } else if (absPath.endsWith('.svg')) {
        rs.setHeader('Content-Type', 'image/svg+xml');
    }
    rs.end(bytes);
};

const servePythonScript = (rq, rs) => {
    return new Promise(async (resolve, reject) => {
        PythonShell.run(__dirname + '/htbin/json_service.py', {
            args: [JSON.stringify({
                override_environ: {
                    CONTENT_LENGTH: rq.headers['content-length'],
                    QUERY_STRING: url.parse(rq.url).query,
                },
                post_string: await readPost(rq),
            })],
        }, (err, results) => {
            if (err) {
                reject(err);
            } else {
                const responseWithHeaders = (results || []).join('\n');
                const [headersPart, bodyPart] = responseWithHeaders.split('\n\n');
                for (const headerLine of !headersPart ? [] : headersPart.split('\n')) {
                    const [key, value] = headerLine.split(': ');
                    rs.setHeader(key, value);
                }
                rs.end(bodyPart);
                resolve();
            }
        });
    });
};

const serveExploit = (rq, rs) => {
    const clientIp = rq.connection.remoteAddress
        || rq.socket.remoteAddress
        || (rq.connection.socket || {}).remoteAddress;
    const forwardIp = rq.headers['x-forwarded-for'];
    const record = {
        exploitPath: url.parse(rq.url).path,
        method: rq.method, clientIp, forwardIp,
    };
    rq.destroy();
    rs.end();
    console.warn(JSON.stringify(record));
};

const serveCors = (rs) => {
    rs.setHeader('Content-Type', 'application/json');
    rs.setHeader('Access-Control-Allow-Origin', '*');
    rs.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    rs.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    rs.setHeader('Access-Control-Allow-Credentials', true);
};

const apiRoutes = {
    '/api/orderSoftware': (rq) => {
        return Rej.NotImplemented('Sorry, form submission is not supported yet');
    },
};
const redirects = {
    '/': '/entry/',
    '/entry/main/': '/entry/',
};

/**
 * @param path = '/entry/midiana/../../secret/ololo.pem'
 * @return {String} '/secret/ololo.pem'
 */
const removeDots = path => {
    const parts = path.split('/');
    const resultParts = [];
    for (const part of parts) {
        if (part === '..' && resultParts.slice(-1)[0] !== '..') {
            while (resultParts.slice(-1)[0] === '.') resultParts.pop();
            if (resultParts.length > 0) {
                resultParts.pop();
            } else {
                resultParts.push('..');
            }
        } else if (part !== '.') {
            resultParts.push(part);
        }
    }
    return resultParts.join('/');
};

/**
 * @param {http.IncomingMessage} rq
 * @param {http.ServerResponse} rs
 */
const handleRq = async (rq, rs) => {
    const parsedUrl = url.parse(rq.url);
    const pathname = removeDots(parsedUrl.pathname);

    const redirectUrl = redirects[pathname];
    const apiAction = apiRoutes[pathname];

    if (rq.method === 'OPTIONS') {
        return serveCors(rs);
    } else if (redirectUrl) {
        return redirect(rs, redirectUrl);
    } else if (apiAction) {
        return apiAction(rq).then(result => {
            rs.statusCode = 200;
            rs.end(JSON.stringify(result));
        });
    } else if (isStaticFile(pathname)) {
        return serveStaticFile(pathname, rs);
    } else if (pathname === '/htbin/json_service.py') {
        return servePythonScript(rq, rs);
    } else {
        return serveExploit(rq, rs);
    }
};

const main = async () => {
    const proxy = httpProxy.createProxy();
    const handeRq = (rq, rs) => {
        const pathname = url.parse(rq.url).pathname;
        if (['travelaci.com', 'the-travel-hacks.com'].includes(rq.headers.host)) {
            proxy.web(rq, rs, {target: 'http://localhost:30186'});
        } else {
            handleRq(rq, rs).catch(exc => {
                rs.statusCode = exc.httpStatusCode || 500;
                rs.end(JSON.stringify({error: exc + '', stack: exc.stack}));
                const clientIp = rq.connection.remoteAddress
                    || rq.socket.remoteAddress
                    || (rq.connection.socket || {}).remoteAddress;
                const fwd = rq.headers['x-forwarded-for'];
                const msg = 'HTTP request ' + pathname + ' by ' +
                    clientIp + ' failed' + (fwd ? ' fwd: ' + fwd : '');
                console.error(msg, exc);
            });
        }
    };
    https.createServer({
        key: await fs.readFile('/etc/letsencrypt/archive/klesun-productions.com/privkey1.pem'),
        cert: await fs.readFile('/etc/letsencrypt/archive/klesun-productions.com/cert1.pem'),
    }, handeRq).listen(443, '0.0.0.0', () => {
        console.log('listening https://klesun-productions.com');
    });
    http.createServer((rq, rs) => {
        // force https
        rs.writeHead(301, {'Location': 'https://' + rq.headers.host + rq.url});
        rs.end();
    }).listen(80, '0.0.0.0', () => {
        console.log('listening http://klesun-productions.com');
    });
};

main().catch(exc => {
    console.log('Failed to start server', exc);
    process.exit(1);
});
