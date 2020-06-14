
import * as url from 'url';
import * as fsSync from 'fs';
import MapGenerator from "../MapGenerator.js";

const fs = fsSync.promises;

const Rej = require('klesun-node-tools/src/Rej.js');
const {getMimeByExt, removeDots, setCorsHeaders} = require('klesun-node-tools/src/Utils/HttpUtil.js');

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
    if (!fsSync.existsSync(absPath)) {
        return Rej.NotFound('File ' + pathname + ' does not exist');
    }
    if ((await fs.lstat(absPath)).isDirectory()) {
        return redirect(rs, pathname + '/');
    }
    const ext = absPath.replace(/^.*\./, '');
    const mime = getMimeByExt(ext);
    if (mime) {
        rs.setHeader('Content-Type', mime);
    }
    fsSync.createReadStream(absPath).pipe(rs);
    //rs.end(bytes);
};

const apiRoutes = {
    '/api/getBoardConfig': async (rq) => {
        return MapGenerator();
    },
};

/**
 * @param {http.IncomingMessage} rq
 * @param {http.ServerResponse} rs
 */
const HandleHttpRequest = async ({rq, rs, rootPath}) => {
    const parsedUrl = url.parse(rq.url);
    const pathname = removeDots(parsedUrl.pathname);

    const apiAction = apiRoutes[pathname];

    setCorsHeaders(rs);

    if (rq.method === 'OPTIONS') {
        rs.write('CORS ok');
        rs.end();
    } else if (apiAction) {
        return apiAction(rq).then(result => {
            rs.setHeader('Content-Type', 'application/json');
            rs.statusCode = 200;
            rs.end(JSON.stringify(result));
        });
    } else if (pathname.startsWith('/')) {
        return serveStaticFile(pathname, rs, rootPath);
    } else {
        return Rej.BadRequest('Invalid path: ' + pathname);
    }
};

export default HandleHttpRequest;
