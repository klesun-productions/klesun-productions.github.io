
import * as url from 'url';
import * as fsSync from 'fs';
import GenerateBoard from "../GenerateBoard.js";
import * as http from "http";
import {
    BUFF_SKIP_TURN,
    NO_RES_DEAD_SPACE,
    NO_RES_EMPTY, PLAYER_CODE_NAMES,
    PLAYER_DARK,
    PLAYER_GREY,
    PLAYER_LIGHT,
    RES_GOLD,
    RES_OIL,
    RES_WHEAT
} from "../Constants";
import FightSession from "../FightSession";

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
type Resource = typeof RES_WHEAT | typeof RES_OIL | typeof RES_GOLD;
type TileModifier = Resource | typeof NO_RES_DEAD_SPACE | typeof NO_RES_EMPTY;
type PlayerBuff = typeof BUFF_SKIP_TURN;

interface BoardState {
    uuid: BoardUuid,
    totalRows: number,
    totalTurns: number,

    turnsLeft: number,
    turnPlayersLeft: PlayerCodeName[],
    playerToPosition: Record<PlayerCodeName, {col: number, row: number}>,
    playerToBuffs: Record<PlayerCodeName, PlayerBuff[]>,
    tiles: {
        col: number,
        row: number,
        modifier: TileModifier,
        owner: PlayerCodeName,
    }[],
}

interface MakeTurnParams {
    uuid: BoardUuid,
    codeName: PlayerCodeName,
    col: number,
    row: number,
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

let uuidToBoard: Record<BoardUuid, BoardState> = {};

const setupBoard = () => {
    const board = GenerateBoard();
    uuidToBoard[board.uuid] = board;
    return board;
};

const readPost = (rq: http.IncomingMessage) => new Promise<string>((ok, err) => {
    if (rq.method === 'POST') {
        let body = '';
        rq.on('data', (data) => body += data);
        rq.on('error', exc => err(exc));
        rq.on('end', () => ok(body));
    } else {
        ok('');
    }
});

const getFight = async (rq: http.IncomingMessage) => {
    const postStr = await readPost(rq);
    if (!postStr) {
        const msg = 'POST body missing, must be a JSON string';
        return Rej.BadRequest(msg);
    }
    const {uuid, ...actionParams} = JSON.parse(postStr);
    const boardState = uuidToBoard[uuid];
    if (!boardState) {
        return Rej.NotFound('Board ' + uuid + ' not found');
    }
    const fight = FightSession({boardState, Rej});

    return {fight, actionParams};
};

const makeTurn = async (rq: http.IncomingMessage) => {
    const {fight, actionParams} = await getFight(rq);
    return fight.makeTurn(actionParams);
};

const skipTurn = async (rq: http.IncomingMessage) => {
    const {fight, actionParams} = await getFight(rq);
    return fight.skipTurn(actionParams);
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
            if (firstBoard.turnsLeft <= 0) {
                delete uuidToBoard[firstBoard.uuid];
            } else {
                return firstBoard;
            }
        }
        return setupBoard();
    },
    '/api/setupBoard': setupBoard,
    '/api/getBoardList': async (rq) => ({boards: uuidToBoard}),
    '/api/makeTurn': makeTurn,
    '/api/skipTurn': skipTurn,
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
