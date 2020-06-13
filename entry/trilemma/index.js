
import {Svg} from './src/Dom.js';

(async () => {
    const tileMapHolder = document.querySelector('.tile-map-holder');
    const LEVELS = 8;
    const TILE_WIDTH = 96;
    const TILE_HEIGHT = Math.sqrt(3) * TILE_WIDTH / 2;
    const BOARD_WIDTH_PX = LEVELS * TILE_WIDTH;
    const BOARD_HEIGHT_PX = LEVELS * TILE_HEIGHT;
    tileMapHolder.style.width = BOARD_WIDTH_PX + 'px';
    tileMapHolder.style.height = BOARD_HEIGHT_PX + 'px';

    const makeTile = (x, y, scale = 1) => {
        return Svg('polygon', {
            points: [
                {dx: -TILE_WIDTH / 2, dy: TILE_HEIGHT / 2},
                {dx: +TILE_WIDTH / 2, dy: TILE_HEIGHT / 2},
                {dx: 0, dy: -TILE_HEIGHT / 2},
            ]   .map(({dx,dy}) => [x + dx * scale, y + dy * scale].join(','))
                .join(' '),
        });
    };

    const initMatrix = () => {
        const matrix = [];

        for (let i = 0; i < LEVELS; ++i) {
            for (let j = 0; j < i * 2 + 1; ++j) {
                const x = j * TILE_WIDTH / 2 - i * TILE_WIDTH / 2;
                const y = i * TILE_HEIGHT;
                const isEven = j % 2 === 0;
                const scale = isEven ? 1 : -1;
                const svgEl = makeTile(BOARD_WIDTH_PX / 2 + x, TILE_HEIGHT / 2 + y, scale);
                const resource = ['WHEAT', 'OIL', 'GOLD'][Math.floor(Math.random() * 3)];
                svgEl.setAttribute('data-resource', resource);

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
            {x: 5, y: 5, codeName: 'DARK'},
            {x: 5, y: 6, codeName: 'LIGHT'},
            {x: 7, y: 6, codeName: 'GREY'},
        ];

        for (const player of players) {
            const tile = tileMatrix[player.y][player.x];
            tile.svgEl.setAttribute('data-owner', player.codeName);
            tile.svgEl.setAttribute('data-stander', player.codeName);
        }
    };

    return main();
})();