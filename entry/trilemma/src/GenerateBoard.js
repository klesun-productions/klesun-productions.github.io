import {
    NO_RES_DEAD_SPACE,
    NO_RES_EMPTY, PLAYER_CODE_NAMES,
    PLAYER_DARK,
    PLAYER_GREY,
    PLAYER_LIGHT,
    RES_GOLD,
    RES_OIL,
    RES_WHEAT
} from "./Constants.js";

/** @see https://stackoverflow.com/a/2117523/2750743 */
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const generateTileModifier = () => {
    const roll = Math.random();
    if (roll < 0.02) {
        return RES_GOLD;
    } else if (roll < 0.08) {
        return RES_OIL;
    } else if (roll < 0.26) {
        return RES_WHEAT;
    } else if (roll < 0.35) {
        return 'DEAD_SPACE';
    } else {
        return 'EMPTY';
    }
};

/** @return {Board} */
const GenerateBoard = ({
    totalRows = 16,
} = {}) => {
    const uuid = uuidv4();
    const playerToPosition = {
        // TODO: calc positions dynamically based on board size
        [PLAYER_DARK]: {col: 9, row: 10},
        [PLAYER_GREY]: {col: 11, row: 10},
        [PLAYER_LIGHT]: {col: 11, row: 11},
    };
    const playerToBuffs = {};
    for (const codeName of PLAYER_CODE_NAMES) {
        playerToBuffs[codeName] = [];
    }
    const tiles = [];
    for (let row = 0; row < totalRows; ++row) {
        for (let col = 0; col < row * 2 + 1; ++col) {
            const stander = Object.keys(playerToPosition)
                .find(k => {
                    return playerToPosition[k].row === row
                        && playerToPosition[k].col === col;
                });
            let modifier, owner;
            if (stander) {
                modifier = NO_RES_EMPTY;
                owner = stander;
            } else {
                modifier = generateTileModifier();
                owner = null;
            }
            tiles.push({row, col, modifier, owner});
        }
    }
    const totalCells = tiles.filter(t => t !== NO_RES_DEAD_SPACE).length;
    const totalTurns = Math.floor(totalCells / 3) - 1;
    return {
        uuid: uuid,
        totalRows: totalRows,
        totalTurns: totalTurns,

        turnsLeft: totalTurns,
        turnPlayersLeft: [...PLAYER_CODE_NAMES],
        playerToBuffs: playerToBuffs,
        playerToPosition: playerToPosition,
        tiles: tiles,
    };
};

export default GenerateBoard;