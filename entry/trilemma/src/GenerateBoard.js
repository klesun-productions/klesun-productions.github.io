import {
    NO_RES_DEAD_SPACE,
    NO_RES_EMPTY,
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

const generateResource = () => {
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
    const playerStartPositions = [
        // TODO: calc positions dynamically based on board size
        {col:  9, row: 10, codeName: PLAYER_DARK},
        {col: 11, row: 10, codeName: PLAYER_GREY},
        {col: 11, row: 11, codeName: PLAYER_LIGHT},
    ];
    const tiles = [];
    for (let row = 0; row < totalRows; ++row) {
        for (let col = 0; col < row * 2 + 1; ++col) {
            const stander = playerStartPositions
                .find(pos => pos.row === row && pos.col === col);
            let resource, owner;
            if (stander) {
                resource = NO_RES_EMPTY;
                owner = stander.codeName;
            } else {
                resource = generateResource();
                owner = null;
            }
            tiles.push({row, col, resource, owner});
        }
    }
    const totalCells = tiles.filter(t => t !== NO_RES_DEAD_SPACE).length;
    return {
        uuid: uuid,
        totalRows: totalRows,
        totalTurns: Math.floor(totalCells / 3) - 1,
        playerStartPositions: playerStartPositions,
        tiles: tiles,
    };
};

export default GenerateBoard;