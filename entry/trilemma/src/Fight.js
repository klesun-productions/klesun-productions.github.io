import {BUFF_SKIP_TURN, NO_RES_DEAD_SPACE, PLAYER_CODE_NAMES} from "./Constants.js";

const FallbackRej = {
    NotFound: msg => Promise.reject(msg + ' - NotFound'),
    Locked: msg => Promise.reject(msg + ' - Locked'),
    TooEarly: msg => Promise.reject(msg + ' - TooEarly'),
};

/** @param {boardState} boardState */
const Fight = ({boardState, Rej = FallbackRej}) => {

    const getTile = ({col, row}) => {
        // TODO: optimize - store as matrix!
        return boardState.tiles.find(t => t.col == col && t.row == row);
    };

    const getPossibleTurns = (codeName) => {
        const oldPos = boardState.playerToPosition[codeName];
        if (!oldPos) {
            return [];
        }
        const isEven = oldPos.col % 2 === 0;
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

    return {
        getPossibleTurns: getPossibleTurns,
        /** @param {MakeTurnParams} params */
        makeTurn: (params) => {
            const {codeName, ...newPos} = params;
            const possibleTurns = getPossibleTurns(codeName);
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
                for (const codeName of PLAYER_CODE_NAMES) {
                    const buffIdx = boardState.playerToBuffs[codeName].indexOf(BUFF_SKIP_TURN);
                    if (buffIdx > -1) {
                        boardState.playerToBuffs[codeName].splice(buffIdx, 1);
                    } else {
                        boardState.turnPlayersLeft.push(codeName);
                    }
                }
            }

            return Promise.resolve(boardState);
        },
    };
};

export default Fight;