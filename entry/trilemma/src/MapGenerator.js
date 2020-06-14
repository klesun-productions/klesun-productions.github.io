
const generateResource = () => {
    const roll = Math.random();
    if (roll < 0.02) {
        return 'GOLD';
    } else if (roll < 0.08) {
        return 'OIL';
    } else if (roll < 0.26) {
        return 'WHEAT';
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
        {col: 9, row: 10},
        {col: 11, row: 10},
        {col: 11, row: 11},
    ];
    const tiles = [];
    for (let row = 0; row < totalRows; ++row) {
        for (let col = 0; col < row * 2 + 1; ++col) {
            const hasStander = playerStartPositions
                .some(pos => pos.row === row && pos.col === col);
            const resource = hasStander ? 'EMPTY' : generateResource();
            tiles.push({row, col, resource});
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