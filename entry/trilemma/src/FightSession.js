import {BUFF_SKIP_TURN, NO_RES_DEAD_SPACE, PLAYER_CODE_NAMES} from "./Constants.js";

const FallbackRej = {
    NotFound: msg => Promise.reject(msg + ' - NotFound'),
    Locked: msg => Promise.reject(msg + ' - Locked'),
    TooEarly: msg => Promise.reject(msg + ' - TooEarly'),
};

/**
 * actual game logic is located here
 *
 * @param {boardState} boardState
 */
const FightSession = ({boardState, Rej = FallbackRej}) => {

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

    const checkOnPlayerTurnEnd = () => {
        if (boardState.turnPlayersLeft.length === 0 &&
            boardState.turnsLeft > 0
        ) {
            --boardState.turnsLeft;
            for (const codeName of PLAYER_CODE_NAMES) {
                const buffIdx = boardState.playerToBuffs[codeName].indexOf(BUFF_SKIP_TURN);
                if (buffIdx > -1) {
                    boardState.playerToBuffs[codeName].splice(buffIdx, 1);
                } else if (getPossibleTurns(codeName).length > 0) {
                    boardState.turnPlayersLeft.push(codeName);
                }
            }
        }
    };

    return {
        getPossibleTurns: getPossibleTurns,
        skipTurn: ({codeName}) => {
            const turnPlayerIdx = boardState.turnPlayersLeft.indexOf(codeName);
            if (turnPlayerIdx < 0) {
                const msg = 'It is not your turn yet, ' + codeName +
                    ', please wait for other players: ' + boardState.turnPlayersLeft.join(', ');
                return Rej.TooEarly(msg);
            }

            boardState.turnPlayersLeft.splice(turnPlayerIdx, 1);
            checkOnPlayerTurnEnd();

            return Promise.resolve(boardState);
        },
        /** @param {MakeTurnParams} params */
        makeTurn: (params) => {
            const {codeName, ...newPos} = params;
            const turnPlayerIdx = boardState.turnPlayersLeft.indexOf(codeName);
            if (turnPlayerIdx < 0) {
                const msg = 'It is not your turn yet, ' + codeName +
                    ', please wait for other players: ' + boardState.turnPlayersLeft.join(', ');
                return Rej.TooEarly(msg);
            }
            const possibleTurns = getPossibleTurns(codeName);
            const newTile = possibleTurns.find(tile => {
                return tile.col === newPos.col
                    && tile.row === newPos.row;
            });
            if (!newTile) {
                return Rej.Locked('Chosen tile is not in the list of available options');
            }

            if (newTile.owner && newTile.owner !== codeName) {
                boardState.playerToBuffs[codeName].push(BUFF_SKIP_TURN);
            }
            newTile.owner = codeName;
            boardState.playerToPosition[codeName].row = newTile.row;
            boardState.playerToPosition[codeName].col = newTile.col;

            boardState.turnPlayersLeft.splice(turnPlayerIdx, 1);
            checkOnPlayerTurnEnd();

            return Promise.resolve(boardState);
        },
    };
};

export default FightSession;