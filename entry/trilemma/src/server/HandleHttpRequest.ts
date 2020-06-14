
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

interface Board {
    uuid: BoardUuid,
    totalRows: number,
    totalTurns: number,

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

let uuidToBoard: Record<BoardUuid, Board> = {};

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

const makeTurn = async (rq: http.IncomingMessage) => {
    const postStr = await readPost(rq);
    if (!postStr) {
        const msg = 'POST body missing, must be a JSON string';
        return Rej.BadRequest(msg);
    }
    const {uuid, codeName, ...newPos}: MakeTurnParams = JSON.parse(postStr);
    const boardState = uuidToBoard[uuid];
    if (!boardState) {
        return Rej.NotFound('Board ' + uuid + ' not found');
    }
    const getTile = ({col, row}: {col: number, row: number}) => {
        // TODO: optimize - store as matrix!
        return boardState.tiles.find(t => t.col == col && t.row == row);
    };

    const getPossibleTurns = (oldPos: {col: number, row: number}) => {
        return [
            {col: oldPos.col + 1, row: oldPos.row},
            {col: oldPos.col - 1, row: oldPos.row},
            isEven
                ? {col: oldPos.col + 1, row: oldPos.row + 1}
                : {col: oldPos.col - 1, row: oldPos.row - 1},
        ].filter(
            turnPos => !Object.values(boardState.playerToPosition)
                .some(playerPos => {
                    return playerPos.col == turnPos.col
                        && playerPos.row == turnPos.row;
                })
        ).flatMap(pos => {
            const tile = getTile(pos);
            return tile ? [tile] : [];
        }).filter(tile => {
            return tile.modifier !== NO_RES_DEAD_SPACE;
        })
    };

    // TODO: add auth token validation
    const oldPos = boardState.playerToPosition[codeName];
    if (!oldPos) {
        return Rej.NotFound('Player ' + codeName + ' not found on the board');
    }
    const isEven = oldPos.col % 2 === 0;
    const possibleTurns = getPossibleTurns(oldPos);
    const newTile = possibleTurns.find(tile => {
        return tile.col === newPos.col
            && tile.row === newPos.row;
    });
    if (!newTile) {
        return Rej.Locked('Chosen tile is not in the list of available options');
    }
    const turnPlayerIdx = boardState.turnPlayersLeft.indexOf(codeName);
    if (turnPlayerIdx < 0) {
        return Rej.TooEarly('It is not your turn yet - please wait for other players');
    }
    boardState.turnPlayersLeft.splice(turnPlayerIdx, 1);

    if (newTile.owner && newTile.owner !== codeName) {
        boardState.playerToBuffs[codeName].push(BUFF_SKIP_TURN);
    }
    newTile.owner = codeName;
    boardState.playerToPosition[codeName].row = newTile.row;
    boardState.playerToPosition[codeName].col = newTile.col;

    if (boardState.turnPlayersLeft.length === 0) {
        boardState.turnPlayersLeft.push(...<PlayerCodeName[]>PLAYER_CODE_NAMES);
    }

    return boardState;
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
    '/api/setupBoard': setupBoard,
    '/api/getBoardList': async (rq) => ({boards: uuidToBoard}),
    '/api/makeTurn': makeTurn,
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
