
import {Svg} from './src/Dom.js';

const generateResource = () => {
    const roll = Math.random();
    if (roll < 0.04) {
        return 'GOLD';
    } else if (roll < 0.12) {
        return 'OIL';
    } else if (roll < 0.24) {
        return 'WHEAT';
    } else {
        // empty tile
        return null;
    }
};

(async () => {
    const tileMapHolder = document.querySelector('.tile-map-holder');
    const LEVELS = 14;
    const TILE_WIDTH = 60;
    const TILE_HEIGHT = Math.sqrt(3) * TILE_WIDTH / 2;
    const BOARD_WIDTH_PX = LEVELS * TILE_WIDTH;
    const BOARD_HEIGHT_PX = LEVELS * TILE_HEIGHT;

    const makeTile = (x, y, isEven) => {
        if (!isEven) {
            y += TILE_HEIGHT / 3;
        } else {
            y += TILE_HEIGHT * 2 / 3;
        }
        const makePoly = (attrs) => Svg('polygon', {
            'transform-origin': x + 'px ' + y + '0px',
            points: [
                {dx: -TILE_WIDTH / 2, dy: TILE_HEIGHT / 3},
                {dx: +TILE_WIDTH / 2, dy: TILE_HEIGHT / 3},
                {dx: 0, dy: -TILE_HEIGHT * 2/3},
            ].map(
                ({dx,dy}) => [
                    x + dx,
                    y + dy * (isEven ? 1 : -1),
                ].map(n => n.toFixed(3)).join(',')
            ).join(' '),
            ...attrs,
        });
        return Svg('svg', {}, [
            makePoly({class: 'base-tile'}),
            makePoly({class: 'effects-overlay'}),
        ]);
    };

    const initMatrix = () => {
        const matrix = [];

        tileMapHolder.style.width = BOARD_WIDTH_PX + 'px';
        tileMapHolder.style.height = BOARD_HEIGHT_PX + 'px';

        for (let i = 0; i < LEVELS; ++i) {
            for (let j = 0; j < i * 2 + 1; ++j) {
                const x = j * TILE_WIDTH / 2 - i * TILE_WIDTH / 2;
                const y = i * TILE_HEIGHT;
                const isEven = j % 2 === 0;
                const svgEl = makeTile(BOARD_WIDTH_PX / 2 + x, y, isEven);
                const resource = generateResource();
                if (resource) {
                    svgEl.setAttribute('data-resource', resource);
                }

                tileMapHolder.appendChild(svgEl);

                matrix[i] = matrix[i] || {};
                matrix[i][j] = {
                    svgEl: svgEl,
                };
            }
        }

        return matrix;
    };

    const main = () => {
        const tileMatrix = initMatrix();

        const players = [
            // TODO: calc positions dynamically based on board size
            {x: 8, y: 8, codeName: 'DARK'},
            {x: 8, y: 9, codeName: 'LIGHT'},
            {x: 10, y: 9, codeName: 'GREY'},
        ];

        for (const player of players) {
            const tile = tileMatrix[player.y][player.x];
            tile.svgEl.removeAttribute('data-resource');
            tile.svgEl.setAttribute('data-owner', player.codeName);
            tile.svgEl.setAttribute('data-stander', player.codeName);
        }
    };

    return main();
})();