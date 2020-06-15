
const GetTurnInput = (initialTile, possibleTurns) => new Promise((resolve, reject) => {
    const cleanup = () => {
        window.removeEventListener('keydown', listener);
        tileCleanups.forEach(cleanup => cleanup());
    };

    const tryDelta = ({dx, dy}) => {
        const newPos = {
            x: initialTile.col + dx + dy,
            y: initialTile.row + dy,
        };
        const newTile = possibleTurns.find(tile => {
            return tile.col === newPos.x
                && tile.row === newPos.y;
        });
        if (newTile) {
            resolve(newTile);
            return true;
        } else {
            return false; // ignore input if player tries to go on a tile that does not exist
        }
    };

    const listener = (evt) => {
        let removeListener = true;
        if (evt.key === 'ArrowDown') {
            removeListener = tryDelta({dx: 0, dy: 1});
        } else if (evt.key === 'ArrowUp') {
            removeListener = tryDelta({dx: 0, dy: -1});
        } else if (evt.key === 'ArrowLeft') {
            removeListener = tryDelta({dx: -1, dy: 0});
        } else if (evt.key === 'ArrowRight') {
            removeListener = tryDelta({dx: 1, dy: 0});
        } else if (evt.key === 'Escape') {
            reject(new Error('Player cancelled his turn'));
        } else {
            removeListener = false;
        }
        if (removeListener) {
            cleanup();
            evt.preventDefault();
            return false;
        } else {
            return true;
        }
    };
    const tileCleanups = possibleTurns.map(tile => {
        const mouseListener = e => {
            resolve(tile);
            cleanup();
        };

        tile.svgEl.addEventListener('click', mouseListener);
        return () => tile.svgEl.addEventListener('click', mouseListener);
    });
    window.addEventListener('keydown', listener);
});

export default GetTurnInput;