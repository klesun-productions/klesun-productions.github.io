
import * as url from 'url';
import * as fsSync from 'fs';
import GenerateBoard from "../GenerateBoard.js";
import * as http from "http";

const fs = fsSync.promises;

const Rej = require('klesun-node-tools/src/Rej.js');
const {getMimeByExt, removeDots, setCorsHeaders} = require('klesun-node-tools/src/Utils/HttpUtil.js');

type Primitive = number | string | boolean;
type SerialData = Primitive | {[k: string]: SerialData} | {[k: number]: SerialData};

export interface HandleHttpParams {
    rq: http.IncomingMessage,
    rs: http.ServerResponse,
    rootPath: string,
}

const redirect = (rs: http.ServerResponse, url: string) => {
    rs.writeHead(302, {
        'Location': url,
    });
    rs.end();
};

const serveStaticFile = async (pathname: string, rs: http.ServerResponse, rootPath: string) => {
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

let boards: {}[] = [];

const apiRoutes: Record<string, (rq: http.IncomingMessage) => Promise<SerialData> | SerialData> = {
    '/api/getBoardState': (rq) => {
        if (boards.length === 0) {
            boards.push(GenerateBoard());
        }
        // eventually should identify them somehow to
        // allow multiple matches simultaneously...
        return boards[0];
    },
    '/api/setupBoard': async (rq) => {
        boards.shift(); // if any
        const board = GenerateBoard();
        boards.unshift(board);
        return board;
    },
    '/api/getBoardList': async (rq) => ({boards}),
    '/api/makeTurn': async (rq) => Rej.NotImplemented('Not implemented yet: /api/makeTurn'),
};

const HandleHttpRequest = async ({rq, rs, rootPath}: HandleHttpParams) => {
    if (!rq.url) {
        const msg = 'Missing rq.url - action only valid for request obtained from http.Server';
        return Rej.BadRequest(msg);
    }
    const parsedUrl = url.parse(rq.url);
    const pathname: string = removeDots(parsedUrl.pathname);

    const apiAction = apiRoutes[pathname];

    setCorsHeaders(rs);

    if (rq.method === 'OPTIONS') {
        rs.write('CORS ok');
        rs.end();
    } else if (apiAction) {
        return Promise.resolve(rq)
            .then(apiAction)
            .then(result => {
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
