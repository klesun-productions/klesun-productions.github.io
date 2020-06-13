
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

    for (let i = 0; i < LEVELS; ++i) {
        for (let j = 0; j < i * 2 + 1; ++j) {
            const x = j * TILE_WIDTH / 2 - i * TILE_WIDTH / 2;
            const y = i * TILE_HEIGHT;
            const scale = j % 2 ? -1 : 1;
            //const scale = 1;
            const poly = makeTile(BOARD_WIDTH_PX / 2 + x, TILE_HEIGHT / 2 + y, scale);
            tileMapHolder.appendChild(poly);
        }
    }
})();