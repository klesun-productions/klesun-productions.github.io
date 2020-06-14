import {PLAYER_DARK, PLAYER_GREY, PLAYER_LIGHT, RES_GOLD, RES_OIL, RES_WHEAT} from "./Constants.js";

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

const MapGenerator = ({
    totalRows = 16,
} = {}) => {
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
                resource = 'EMPTY';
                owner = stander.codeName;
            } else {
                resource = generateResource();
                owner = null;
            }
            tiles.push({row, col, resource, owner});
        }
    }
    let totalCells = tiles.filter(t => t !== 'DEAD_SPACE').length;
    return {
        totalRows: totalRows,
        totalTurns: Math.floor(totalCells / 3) - 1,
        playerStartPositions: playerStartPositions,
        tiles: tiles,
    };
};

export default MapGenerator;