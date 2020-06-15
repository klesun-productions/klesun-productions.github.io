
const get = (route, params) => {
    return fetch(route + '?' + new URLSearchParams(params))
        .then(rs => rs.status !== 200
            ? Promise.reject(rs.statusText)
            : rs.json());
};

const post = (route, params) => {
    return fetch(route, {
        method: 'POST',
        body: JSON.stringify(params),
    }).then(rs => rs.status !== 200
        ? Promise.reject(rs.statusText)
        : rs.json());
};

const Api = () => {
    return {
        getBoardState: ({uuid = ''}) => get('/api/getBoardState', {uuid}),
        /** @param {MakeTurnParams} params */
        makeTurn: (params) => post('/api/makeTurn', params),
        skipTurn: (params) => post('/api/skipTurn', params),
    };
};

export default Api;