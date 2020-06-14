
import {Svg} from './src/Dom.js';
import MapGenerator from "./src/MapGenerator.js";
import TileMapDisplay from "./src/TileMapDisplay.js";

const gui = {
    tileMapHolder: document.querySelector('.tile-map-holder'),
    turnsLeftHolder: document.querySelector('.turns-left-holder'),
    playerList: document.querySelector('.player-list'),
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

const TILE_WIDTH = 60;
const TILE_HEIGHT = Math.sqrt(3) * TILE_WIDTH / 2;
const RESOURCES = ['WHEAT', 'OIL', 'GOLD'];
const PLAYER_CODE_NAMES = ['DARK', 'GREY', 'LIGHT'];
const HOT_SEAT = true;

const getBoardConfiguration = async () => {
    if (HOT_SEAT) {
        return MapGenerator();
    } else {
        return fetch('/api/get-board-config').then(rs => rs.json());
    }
};

const collectPlayerResources = (matrix) => {
    const playerToResourceToSum = {};
    for (const codeName of PLAYER_CODE_NAMES) {
        // players start with 1, because otherwise they would need
        // to collect _each_ resource to at least _nominate_ for winning
        // and I like the idea of rare resource sources quantity being random
        playerToResourceToSum[codeName] = {};
        for (const resource of RESOURCES) {
            playerToResourceToSum[codeName][resource] = 1;
        }
    }
    for (const row of Object.values(matrix)) {
        for (const tile of Object.values(row)) {
            const player = tile.svgEl.getAttribute('data-owner');
            const resource = tile.svgEl.getAttribute('data-resource');
            if (player && RESOURCES.includes(resource)) {
                playerToResourceToSum[player][resource] += 1;
            }
        }
    }
    return playerToResourceToSum;
};

const calcScore = (resourceToSum) => {
    let multiplication = 1;
    for (const resource of RESOURCES) {
        multiplication *= resourceToSum[resource];
    }
    return multiplication;
};

const updateStatsTable = (pendingPlayer, playerResources) => {
    for (const tr of gui.playerList.children) {
        const trOwner = tr.getAttribute('data-owner');
        const turnPending = trOwner === pendingPlayer.codeName;
        tr.classList.toggle('turn-pending', turnPending);
        const resourceToSum = playerResources[trOwner];
        for (const td of tr.querySelectorAll('[data-resource]')) {
            const resource = td.getAttribute('data-resource');
            td.textContent = resourceToSum[resource];
        }
        tr.querySelector('.score-holder').textContent = calcScore(resourceToSum);
    }
};

(async () => {
    const boardConfig = await getBoardConfiguration();

    const main = async () => {
        const matrix = TileMapDisplay(boardConfig, gui.tileMapHolder);

        const getTile = ({x, y}) => {
            return (matrix[y] || {})[x] || null;
        };

        const playerToBuffs = {};
        for (const codeName of PLAYER_CODE_NAMES) {
            playerToBuffs[codeName] = new Set();
        }

        const processTurn = async (player) => {
            const initialTile = getTile(player);
            const isEven = initialTile.col % 2 === 0;
            // glow possible turns
            const possibleTurns = [
                {x: initialTile.col + 1, y: initialTile.row},
                {x: initialTile.col - 1, y: initialTile.row},
                isEven
                    ? {x: initialTile.col + 1, y: initialTile.row + 1}
                    : {x: initialTile.col - 1, y: initialTile.row - 1},
            ].map(getTile).filter( (tile) => {
                return tile
                    && tile.svgEl.getAttribute('data-resource') !== 'DEAD_SPACE'
                    && !tile.svgEl.getAttribute('data-stander');
            } );
            possibleTurns.forEach( (tile) => tile.svgEl.setAttribute('data-possible-turn', player.codeName) );
            while (true) {
                const input = await getInput().catch(exc => null);
                if (!input) {
                    break; // player skipped turn with Esc button
                }
                const {dx, dy} = input;
                const newPos = {
                    x: initialTile.col + dx + dy,
                    y: initialTile.row + dy,
                };
                const newTile = possibleTurns
                    .filter(tile => tile.col === newPos.x && tile.row === newPos.y)[0];
                if (!newTile) {
                    // ignore input if player tries to go on a tile that does not exist
                    continue;
                }
                initialTile.svgEl.removeAttribute('data-stander');

                const prevOwner = newTile.svgEl.getAttribute('data-owner');
                if (prevOwner && prevOwner !== player.codeName) {
                    playerToBuffs[player.codeName].add('SKIP_TURN');
                }
                newTile.svgEl.setAttribute('data-owner', player.codeName);
                newTile.svgEl.setAttribute('data-stander', player.codeName);
                player.x = newPos.x;
                player.y = newPos.y;

                break;
            }
            // remove possible turns from last player
            possibleTurns.forEach( (tile) => tile.svgEl.removeAttribute('data-possible-turn') );
        };

        const players = PLAYER_CODE_NAMES.map((codeName, i) => ({
            x: boardConfig.playerStartPositions[i].col,
            y: boardConfig.playerStartPositions[i].row,
            codeName: codeName,
        }));

        for (const player of players) {
            const tile = matrix[player.y][player.x];
            tile.svgEl.removeAttribute('data-resource');
            tile.svgEl.setAttribute('data-owner', player.codeName);
            tile.svgEl.setAttribute('data-stander', player.codeName);
        }

        for (let turnsLeft = boardConfig.totalTurns; turnsLeft > 0; --turnsLeft) {
            gui.turnsLeftHolder.textContent = turnsLeft;
            for (const player of players) {
                if (playerToBuffs[player.codeName].has('SKIP_TURN')) {
                    playerToBuffs[player.codeName].delete('SKIP_TURN');
                    continue;
                }
                const playerResources = collectPlayerResources(matrix);
                updateStatsTable(player, playerResources);
                await processTurn(player);
            }
        }

        const playerResources = collectPlayerResources(matrix);
        const bestScore = Object.values(playerResources)
            .map(calcScore).sort((a,b) => b - a)[0];
        const winners = PLAYER_CODE_NAMES.filter(p => calcScore(playerResources[p]) === bestScore);
        alert('The winner is ' + winners.join(' and '));
    };

    return main();
})();