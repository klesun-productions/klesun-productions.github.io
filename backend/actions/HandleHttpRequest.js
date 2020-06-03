const SoftwareOrders = require('../repositories/SoftwareOrders.js');

const Rej = require('klesun-node-tools/src/Rej.js');
const http = require('http');
const url = require('url');
const fsSync = require('fs');
const fs = require('fs').promises;
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

const serveStaticFile = async (pathname, rs, rootPath) => {
    pathname = decodeURIComponent(pathname);
    let absPath = rootPath + pathname;
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
    if (absPath.endsWith('.html')) {
        rs.setHeader('Content-Type', 'text/html');
    } else if (absPath.endsWith('.css')) {
        rs.setHeader('Content-Type', 'text/css');
    } else if (absPath.endsWith('.js')) {
        rs.setHeader('Content-Type', 'text/javascript');
    } else if (absPath.endsWith('.ts')) {
        rs.setHeader('Content-Type', 'text/typescript');
    } else if (absPath.endsWith('.svg')) {
        rs.setHeader('Content-Type', 'image/svg+xml');
    }
    fsSync.createReadStream(absPath).pipe(rs);
    //rs.end(bytes);
};

/**
 * legacy from the times when server was served by python, not nodejs, still cool
 * that we can integrate python so easily, not sure I even want to rewrite that...
 */
const servePythonScript = (rq, rs) => {
    return new Promise(async (resolve, reject) => {
        PythonShell.run(__dirname + '/../../htbin/json_service.py', {
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
                rs.setHeader('Content-Type', 'application/json');
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

const setCorsHeaders = rs => {
    rs.setHeader('Access-Control-Allow-Origin', '*');
    rs.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    rs.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    rs.setHeader('Access-Control-Allow-Credentials', true);
};

const apiRoutes = {
    '/api/orderSoftware': async (rq) => {
        const postStr = await readPost(rq);
        if (!postStr) {
            const msg = 'POST body missing, must be a JSON string';
            return Rej.BadRequest(msg);
        }
        const postData = JSON.parse(postStr);
        const sqlResult = await SoftwareOrders().insert({data: postData});
        // should probably send an email notification...
        return {status: 'success', sqlResult};
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

const testFileStreamAbort = async (rq, rs) => {
    rs.setHeader('Content-Type', 'text/csv');
    rs.write('ololo,loh,pidr\n');
    await new Promise(ok => setTimeout(ok, 1000));
    rs.write('guzno,shluha,dzhigurda\n');
    await new Promise(ok => setTimeout(ok, 1000));
    rs.write('guzno2,shluha,dzhigurda\n');
    await new Promise(ok => setTimeout(ok, 1000));
    rs.write('guzno3,shluha,dzhigurda\n');
    await new Promise(ok => setTimeout(ok, 1000));
    rs.write('guzno4,shluha,dzhigurda\n');
    await new Promise(ok => setTimeout(ok, 1000));
    rs.end();
};

/**
 * @param {http.IncomingMessage} rq
 * @param {http.ServerResponse} rs
 */
const HandleHttpRequest = async ({rq, rs, rootPath}) => {
    const parsedUrl = url.parse(rq.url);
    const pathname = removeDots(parsedUrl.pathname);

    const redirectUrl = redirects[pathname];
    const apiAction = apiRoutes[pathname];

    setCorsHeaders(rs);

    if (rq.method === 'OPTIONS') {
        rs.write('CORS ok');
        rs.end();
    } else if (redirectUrl) {
        return redirect(rs, redirectUrl);
    } else if (apiAction) {
        return apiAction(rq).then(result => {
            rs.setHeader('Content-Type', 'application/json');
            rs.statusCode = 200;
            rs.end(JSON.stringify(result));
        });
    } else if (isStaticFile(pathname)) {
        return serveStaticFile(pathname, rs, rootPath);
    } else if (pathname === '/htbin/json_service.py') {
        return servePythonScript(rq, rs);
    } else if (pathname === '/testFileStreamAbort.csv') {
        return testFileStreamAbort(rq, rs);
    } else {
        return serveExploit(rq, rs);
    }
};

module.exports = HandleHttpRequest;
