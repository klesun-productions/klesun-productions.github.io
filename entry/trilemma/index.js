
import GenerateBoard from "./src/GenerateBoard.js";
import TileMapDisplay from "./src/TileMapDisplay.js";
import {BUFF_SKIP_TURN, NO_RES_DEAD_SPACE, PLAYER_CODE_NAMES, RESOURCES} from "./src/Constants.js";
import GetTurnInput from "./src/client/GetTurnInput.js";
import Api from "./src/client/Api.js";

const gui = {
    tileMapHolder: document.querySelector('.tile-map-holder'),
    turnsLeftHolder: document.querySelector('.turns-left-holder'),
    playerList: document.querySelector('.player-list'),
};

const HOT_SEAT = true;

const audios = [
    new Audio('./tile_move.aac'),
    new Audio('./tile_move2.aac'),
    new Audio('./tile_move3.aac')
];

const api = Api();

const getBoardState = async () => {
    if (HOT_SEAT) {
        return {...GenerateBoard(), hotSeat: true};
    } else {
        return fetch('./api/getBoardState')
            .then(rs => rs.status !== 200
                ? Promise.reject(rs.statusText)
                : rs.json())
            .then(config => ({...config, hotSeat: false}))
            .catch(exc => {
                alert('Failed to fetch data from server. Falling back to hot-seat board. ' + exc);
                return {...GenerateBoard(), hotSeat: true};
            });
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

const drawTable = () => {
    const tableBody = document.querySelector('.player-list');
    const rows = [];

    for (let player of PLAYER_CODE_NAMES) {
        const cols = [];
        const row = document.createElement('tr');
        row.setAttribute('data-owner', player);
        row.classList.add('turn-pending');

        const nameCol = document.createElement('td');
        nameCol.classList.add('player-name-holder');
        nameCol.innerHTML = player;
        cols.push(nameCol);

        for (let res of RESOURCES) {
            const resCol = document.createElement('td');
            const actionCol = document.createElement('td');

            resCol.setAttribute('data-resource', res);
            resCol.innerHTML = "1";
            actionCol.innerHTML = res === RESOURCES[RESOURCES.length - 1] ? "=" : "x";
            cols.push(resCol, actionCol);
        }

        const scoreCol = document.createElement('td');
        scoreCol.classList.add('score-holder');
        scoreCol.innerHTML = "1";
        cols.push(scoreCol);

        cols.forEach( col => row.appendChild(col) );
        rows.push(row);
    }

    const _redraw = (codeName, playerResources) => {
        for (const tr of rows) {
            const trOwner = tr.getAttribute('data-owner');
            const turnPending = trOwner === codeName;
            tr.classList.toggle('turn-pending', turnPending);
            const resourceToSum = playerResources[trOwner];
            const totalScore = calcScore(resourceToSum);
            for (const td of tr.querySelectorAll('[data-resource]')) {
                const resource = td.getAttribute('data-resource');
                td.textContent = resourceToSum[resource];
            }
            tr.querySelector('.score-holder').textContent = totalScore.toString();
        }

        tableBody.innerHTML = "";
        rows
            .sort( (a, b) => {
                const getScore = el => +el.querySelector('.score-holder').textContent;
                return getScore(b) - getScore(a);
            } )
            .forEach( row => tableBody.appendChild(row) );
    };

    return {
        redraw: _redraw,
    };
};

let soundEnabled = true;

(async () => {
    let boardState = await getBoardState();

    const table = drawTable();
    const main = async () => {
        const matrix = TileMapDisplay(boardState, gui.tileMapHolder);

        const enabledSvg = document.getElementById('sound-svg-enabled');
        const disabledSvg = document.getElementById('sound-svg-disabled');

        enabledSvg.onclick = e => {
            enabledSvg.style.display = "none";
            disabledSvg.style.display = "block";
            soundEnabled = false;
        };

        disabledSvg.onclick = e => {
            disabledSvg.style.display = "none";
            enabledSvg.style.display = "block";
            soundEnabled = true;
        };

        const getTile = ({col, row}) => {
            return (matrix[row] || {})[col] || null;
        };

        const makeTurn = async (codeName, newTile) => {
            if (!boardState.hotSeat) {
                /** @type {MakeTurnParams} */
                const params = {
                    uuid: boardState.uuid,
                    codeName: codeName,
                    col: newTile.col,
                    row: newTile.row,
                };
                return api.makeTurn(params);
            } else {
                const prevOwner = newTile.svgEl.getAttribute('data-owner');
                if (prevOwner && prevOwner !== codeName) {
                    boardState.playerToBuffs[codeName].push(BUFF_SKIP_TURN);
                }
                const pos = boardState.playerToPosition[codeName];
                pos.col = newTile.col;
                pos.row = newTile.row;
                return boardState;
            }
        };

        const processTurn = async (codeName) => {
            const audioIndex = Math.floor(Math.random() * 3);
            const svgEl = gui.tileMapHolder.querySelector(`[data-stander=${codeName}]`);
            const col = +svgEl.getAttribute('data-col');
            const row = +svgEl.getAttribute('data-row');

            const isEven = col % 2 === 0;
            // glow possible turns
            const possibleTurns = [
                {col: col + 1, row: row},
                {col: col - 1, row: row},
                isEven
                    ? {col: col + 1, row: row + 1}
                    : {col: col - 1, row: row - 1},
            ].map(getTile).filter( (tile) => {
                return tile
                    && tile.svgEl.getAttribute('data-resource') !== NO_RES_DEAD_SPACE
                    && !tile.svgEl.getAttribute('data-stander');
            } );
            possibleTurns.forEach( (tile) => {
                tile.svgEl.setAttribute('data-possible-turn', codeName);
            } );
            while (true) {
                const newTile = await GetTurnInput({col, row}, possibleTurns).catch(exc => null);
                if (!newTile) {
                    // ignore input if player tries to go on a tile that does not exist
                    continue;
                }
                const newState = await makeTurn(codeName, newTile).catch(exc => {
                    alert('Failed to make this turn - ' + exc);
                    return null;
                });
                if (!newState) {
                    continue;
                }
                svgEl.removeAttribute('data-stander');
                boardState = newState;

                const effectivePos = boardState.playerToPosition[codeName];
                const effectiveTile = getTile(effectivePos);
                effectiveTile.svgEl.setAttribute('data-owner', codeName);
                effectiveTile.svgEl.setAttribute('data-stander', codeName);

                if (soundEnabled) {
                    const tileMoveSound = audios[audioIndex];
                    tileMoveSound.currentTime = 0;
                    tileMoveSound.volume = (audioIndex === 0 ? 1 : 0.75) * 0.05;
                    await tileMoveSound.play();
                }

                break;
            }
            // remove possible turns from last player
            possibleTurns.forEach( (tile) => tile.svgEl.removeAttribute('data-possible-turn') );
        };

        for (const [codeName, {col, row}] of Object.entries(boardState.playerToPosition)) {
            const tile = getTile({col, row});
            tile.svgEl.setAttribute('data-stander', codeName);
        }


        for (let turnsLeft = boardState.totalTurns; turnsLeft > 0; --turnsLeft) {
            gui.turnsLeftHolder.textContent = turnsLeft;
            for (const codeName of PLAYER_CODE_NAMES) {
                // TODO: on server as well!
                const buffIdx = boardState.playerToBuffs[codeName].indexOf(BUFF_SKIP_TURN);
                if (buffIdx > -1) {
                    boardState.playerToBuffs[codeName].splice(buffIdx, 1);
                    continue;
                }
                const playerResources = collectPlayerResources(matrix);
                table.redraw(codeName, playerResources);
                await processTurn(codeName);
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