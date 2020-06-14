
import * as url from 'url';
import * as fsSync from 'fs';
import GenerateBoard from "../GenerateBoard.js";
import * as http from "http";
import {PLAYER_DARK, PLAYER_GREY, PLAYER_LIGHT} from "../Constants";

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

type BoardUuid = string;
type PlayerCodeName = typeof PLAYER_DARK | typeof PLAYER_GREY | typeof PLAYER_LIGHT;

interface Board {
    uuid: BoardUuid,
    totalRows: number,
    totalTurns: number,
    playerStartPositions: {col: number, row: number, codeName: PlayerCodeName}[],
    tiles: any[],
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

let uuidToBoard: Record<BoardUuid, Board> = {};

const setupBoard = () => {
    const board = GenerateBoard();
    uuidToBoard[board.uuid] = board;
    return board;
};

const apiRoutes: Record<string, (rq: http.IncomingMessage) => Promise<SerialData> | SerialData> = {
    '/api/getBoardState': (rq) => {
        const urlObj = new URL('https://zhopa.com' + rq.url).searchParams;
        const uuid = urlObj.get('uuid');
        if (uuid) {
            if (uuidToBoard[uuid]) {
                return uuidToBoard[uuid];
            } else {
                return Rej.NotFound('Board ' + uuid + ' not found');
            }
        }
        const firstBoard = Object.values(uuidToBoard)[0];
        if (firstBoard) {
            return firstBoard;
        } else {
            return setupBoard();
        }
    },
    '/api/setupBoard': async (rq) => {
        return setupBoard();
    },
    '/api/getBoardList': async (rq) => ({boards: uuidToBoard}),
    '/api/makeTurn': async (rq) => Rej.NotImplemented('Not implemented yet: /api/makeTurn'),
};

const HandleHttpRequest = async ({rq, rs, rootPath}: HandleHttpParams) => {
    const parsedUrl = url.parse(<string>rq.url);
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
