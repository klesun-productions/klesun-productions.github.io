const SoftwareOrders = require('../repositories/SoftwareOrders.js');

const Rej = require('klesun-node-tools/src/Rej.js');
const http = require('http');
const url = require('url');
const fsSync = require('fs');
const fs = require('fs').promises;
const {PythonShell} = require('python-shell');
const {getMimeByExt, removeDots, setCorsHeaders} = require('klesun-node-tools/src/Utils/HttpUtil.js');
const tar = require('tar');

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
        || pathname.startsWith('/h/')
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

const serveRange = async (absPath, range, rs) => {
    const match = range.match(/^bytes=(\d+)-(\d*)/);
    if (!match) {
        throw Rej.BadRequest('Malformed "range" header: ' + range).exc;
    }
    let [_, start, rqEnd] = match.map(n => +n);
    const stats = await fs.stat(absPath);
    const total = stats.size;
    rqEnd = rqEnd || total - 1;
    // I take it that this works as a buffering size...
    const chunkSize = Math.min(rqEnd - start + 1, 512 * 1024);
    const end = start + chunkSize - 1;
    rs.writeHead(206, {
        'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
    });
    const stream = fsSync.createReadStream(absPath, {start, end})
        .on('open', () => stream.pipe(rs))
        .on('error', err => {
            console.error('Error while streaming mkv file\n' + absPath + '\n', err);
            rs.end(err);
        });
};

const serveStaticFile = async (rq, rs, rootPath) => {
    const parsedUrl = url.parse(rq.url);
    let pathname = removeDots(parsedUrl.pathname);

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
    const ext = absPath.replace(/^.*\./, '').toLowerCase();
    let mime = getMimeByExt(ext);
    if (pathname === '/entry/ddr-songs-browser/data/indexed_packs.json.gz') {
        rs.setHeader('content-encoding', 'gzip');
        mime = 'application/json';
    }
    const mediaMimes = {
        ogg: 'audio/ogg',
        mp3: 'audio/mp3',
    };
    if (ext in mediaMimes) {
        mime = mediaMimes[ext];
    }
    if (mime) {
        rs.setHeader('Content-Type', mime);
    }
    if (rq.headers.range) {
        await serveRange(absPath, rq.headers.range, rs);
    } else {
        fsSync.createReadStream(absPath).pipe(rs);
    }
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

const serveProbableExploit = (rq, rs) => {
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

const serveDdrPack = (rq, rs) => {
    const {json} = url.parse(rq.url, true).query;
    const {packName, subdir, songNames} = JSON.parse(json);
    if (!packName || packName.includes('/')) {
        return Rej.BadRequest('GET packName invalid or missing');
    }
    if (!subdir || subdir.includes('/')) {
        return Rej.BadRequest('GET subdir invalid or missing');
    }
    const packPath = __dirname + '/../../entry/ddr-songs-browser/data/packs/' + packName;
    const paths = songNames.map(songName => {
        if (!songName || songName.includes('/')) {
            throw Rej.BadRequest('GET subdir invalid or missing').exc;
        }
        return subdir + '/' + songName;
    });
    rs.setHeader('content-type', 'application/x-tar');
    // hope JSON will escape all weird stuff that could make header invalid
    rs.setHeader('content-disposition', 'attachment; filename=' + JSON.stringify(decodeURIComponent(packName.replace(/\.zip(\.\d+)?$/, '')) + '_pack_inside.tar'));
    return tar.create({
        gzip: false,
        cwd: packPath,
    }, paths).pipe(rs);
};

const testPostbacks = [];

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
    '/api/test-postback': async (rq) => {
		testPostbacks.push({dt: new Date().toISOString(), url: rq.url});
		return {status: 'success'};
	},
	'/api/list-test-postbacks': async (rq) => {
		return testPostbacks;
	},
};
const redirects = {
    '/': '/entry/',
    '/entry/main/': '/entry/',
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
        return serveStaticFile(rq, rs, rootPath);
    } else if (pathname === '/htbin/json_service.py') {
        return servePythonScript(rq, rs);
    } else if (pathname === '/ddr-songs-browser/ftp/pack.tar') {
        return serveDdrPack(rq, rs);
    } else {
        return serveProbableExploit(rq, rs);
    }
};

module.exports = HandleHttpRequest;
