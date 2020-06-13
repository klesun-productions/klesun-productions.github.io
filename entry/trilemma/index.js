
import {Svg} from './src/Dom.js';

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

const getInput = () => new Promise((ok,err) => {
    const listener = (evt) => {
        let removeListener = true;
        if (evt.key === 'ArrowDown') {
            ok({dx: 0, dy: 1});
        } else if (evt.key === 'ArrowUp') {
            ok({dx: 0, dy: -1});
        } else if (evt.key === 'ArrowLeft') {
            ok({dx: -1, dy: 0});
        } else if (evt.key === 'ArrowRight') {
            ok({dx: 1, dy: 0});
        } else if (evt.key === 'Escape') {
            err(new Error('Player cancelled his turn'));
        } else {
            removeListener = false;
        }
        if (removeListener) {
            window.removeEventListener('keydown', listener);
            evt.preventDefault();
            return false;
        } else {
            return true;
        }
    };
    window.addEventListener('keydown', listener);
});

(async () => {
    const gui = {
        tileMapHolder: document.querySelector('.tile-map-holder'),
        turnsLeftHolder: document.querySelector('.turns-left-holder'),
        playerList: document.querySelector('.player-list'),
    };

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
        let totalCells = 0;
        const matrix = [];

        gui.tileMapHolder.style.width = BOARD_WIDTH_PX + 'px';
        gui.tileMapHolder.style.height = BOARD_HEIGHT_PX + 'px';

        for (let i = 0; i < LEVELS; ++i) {
            for (let j = 0; j < i * 2 + 1; ++j) {
                const x = j * TILE_WIDTH / 2 - i * TILE_WIDTH / 2;
                const y = i * TILE_HEIGHT;
                const isEven = j % 2 === 0;
                const svgEl = makeTile(BOARD_WIDTH_PX / 2 + x, y, isEven);
                const resource = generateResource();
                svgEl.setAttribute('data-resource', resource);
                if (resource !== 'DEAD_SPACE') {
                    ++totalCells;
                }

                gui.tileMapHolder.appendChild(svgEl);

                matrix[i] = matrix[i] || {};
                matrix[i][j] = {
                    svgEl: svgEl,
                };
            }
        }

        return {totalCells, matrix};
    };

    const main = async () => {
        const {totalCells, matrix} = initMatrix();

        const getTile = ({x, y}) => {
            return (matrix[y] || {})[x] || null;
        };

        const processTurn = async (player) => {
            const isEven = player.x % 2 === 0;
            while (true) {
                const input = await getInput().catch(exc => {
                    alert('Input Rejected - ' + exc);
                    return null;
                });
                if (!input) {
                    return;
                }
                const {dx, dy} = input;
                if (dy < 0 && isEven || dy > 0 && !isEven) {
                    // when tip of current til is facing down, user can't
                    // go down, and when it's facing up he can't go up
                    continue;
                }
                const newPos = {
                    x: player.x + dx + dy,
                    y: player.y + dy,
                };
                const newTile = getTile(newPos);
                if (!newTile || newTile.svgEl.getAttribute('data-resource') === 'DEAD_SPACE') {
                    // ignore input if player tries to go on a tile that does not exist
                    continue;
                }
                // TODO: check that other players are not standing on this tile
                getTile(player).svgEl.removeAttribute('data-stander');
                newTile.svgEl.setAttribute('data-owner', player.codeName);
                newTile.svgEl.setAttribute('data-stander', player.codeName);
                player.x = newPos.x;
                player.y = newPos.y;

                break;
            }
        };

        const updateStatsTable = (pendingPlayer) => {
            const playerToResourceToSum = {};
            for (const row of Object.values(matrix)) {
                for (const tile of Object.values(row)) {
                    const player = tile.svgEl.getAttribute('data-owner');
                    const resource = tile.svgEl.getAttribute('data-resource');
                    playerToResourceToSum[player] = playerToResourceToSum[player] || {};
                    playerToResourceToSum[player][resource] = playerToResourceToSum[player][resource] || 0;
                    playerToResourceToSum[player][resource] += 1;
                }
            }
            for (const tr of gui.playerList.children) {
                const trOwner = tr.getAttribute('data-owner');
                const turnPending = trOwner === pendingPlayer.codeName;
                tr.classList.toggle('turn-pending', turnPending);
                let multiplication = 1;
                for (const td of tr.querySelectorAll('[data-resource]')) {
                    const resource = td.getAttribute('data-resource');
                    let sum = (playerToResourceToSum[trOwner] || {})[resource] || 0;
                    sum += 1; // players start with 1, because otherwise they would need
                              // to collect _each_ resource to at least _nominate_ for winning
                              // and I like the idea of rare resource sources quantity being random
                    multiplication *= sum;
                    td.textContent = sum;
                }
                tr.querySelector('.score-holder').textContent = multiplication;
            }
        };

        const players = [
            // TODO: calc positions dynamically based on board size
            {x: 8, y: 8, codeName: 'DARK'},
            {x: 10, y: 9, codeName: 'GREY'},
            {x: 8, y: 9, codeName: 'LIGHT'},
        ];

        for (const player of players) {
            const tile = matrix[player.y][player.x];
            tile.svgEl.removeAttribute('data-resource');
            tile.svgEl.setAttribute('data-owner', player.codeName);
            tile.svgEl.setAttribute('data-stander', player.codeName);
        }

        for (let turnsLeft = Math.floor(totalCells / 3) - 1; turnsLeft > 0; --turnsLeft) {
            gui.turnsLeftHolder.textContent = turnsLeft;
            for (const player of players) {
                updateStatsTable(player);
                await processTurn(player);
            }
        }
    };

    return main();
})();