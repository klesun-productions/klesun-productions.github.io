const SoftwareOrders = require('../repositories/SoftwareOrders.js');

const Rej = require('klesun-node-tools/src/Rej.js');
const http = require('http');
const url = require('url');
const fsSync = require('fs');
const fs = require('fs').promises;
const {PythonShell} = require('python-shell');
const {getMimeByExt, removeDots, setCorsHeaders} = require('klesun-node-tools/src/Utils/HttpUtil.js');

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
    const ext = absPath.replace(/^.*\./, '');
    let mime = getMimeByExt(ext);
    if (pathname === '/entry/ddr-songs-browser/data/indexed_packs.json.gz') {
        rs.setHeader('content-encoding', 'gzip');
        mime = 'application/json';
    }
    if (mime) {
        rs.setHeader('Content-Type', mime);
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

const testPostbacks = [];

const DDR_PACKS_PATH = __dirname + '/../../entry/ddr-songs-browser/data/packs';

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
    /** note, names are URL-encoded */
    '/ddr-songs-browser/api/getPackNames': rq => fs.readdir(DDR_PACKS_PATH),
    '/ddr-songs-browser/api/getPackDetails': async rq => {
        const packName = url.parse(rq.url, true).query['packName'];
        if (!packName || packName.includes('/')) {
            return Rej.BadRequest('GET packName missing or invalid');
        }
        const packPath = DDR_PACKS_PATH + '/' + packName;
        const rootFiles = await fs.readdir(packPath, {withFileTypes: true});
        const subdirs = rootFiles
            .filter(f => f.isDirectory())
            .map(f => f.name)
            .filter(n => n !== 'Additional Content (Courses etc)');
        if (subdirs.length === 0) {
            return Rej.NoContent('Pack ' + packName + ' directory is empty');
        }
        const decodedPackName = decodeURIComponent(packName.replace(/\.zip(?:\.\d+)?$/, ''));
        const exactMatch = subdirs
            .find(s => s.startsWith(decodedPackName) || decodedPackName.startsWith(s));
        const subdir = exactMatch || subdirs[0];
        if (!exactMatch && subdirs.length > 1) {
            console.warn('ololo, no exact match for:\n' + decodeURIComponent(packName) + ', taking first:\n' + subdir);
        }
        const mixedContent = await fs.readdir(packPath + '/' + subdir, {withFileTypes: true});

        return {
            subdir: subdir,
            imgFileName: mixedContent
                .filter(f => !f.isDirectory())
                .map(f => f.name)
                .find(n => n.match(/\.(png|je?pg|bmp|gif)$/i)),
            songNames: mixedContent
                .filter(f => f.isDirectory())
                .map(f => f.name),
        };
    },
    '/ddr-songs-browser/api/getSongFiles': async rq => {
        const queryParams = url.parse(rq.url, true).query;
        const {packName, subdir, songName} = queryParams;
        if (!packName || packName.includes('/')) {
            return Rej.BadRequest('GET packName missing or invalid');
        }
        if (!subdir || subdir.includes('/')) {
            return Rej.BadRequest('GET subdir missing or invalid');
        }
        if (!songName) {
            return Rej.BadRequest('GET songName missing');
        }
        return fs.readdir(DDR_PACKS_PATH + '/' + packName + '/' + subdir + '/' + songName);
    },
};
const redirects = {
    '/': '/entry/',
    '/entry/main/': '/entry/',
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

const izumrudnijHuj = async (rq, rs) => {
    const post = await readPost(rq);
    console.log('ololo /izumrudnij-huj\n', post);
    rs.setHeader('Content-Type', 'text/plain');
    rs.end('Thanks you, parsiql, you are doing great job!\n');
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
    } else if (pathname === '/izumrudnij-huj') {
        return izumrudnijHuj(rq, rs);
    } else {
        return serveProbableExploit(rq, rs);
    }
};

module.exports = HandleHttpRequest;
