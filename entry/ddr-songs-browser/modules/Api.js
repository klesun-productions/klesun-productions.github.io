
export class BadStatusError extends Error {
    /** @param {Response} response */
    constructor(response) {
        super(response.statusText);
        this.response = response;
    }
}

/** @param {Response} rs */
const parseResponse = rs => rs.status !== 200
    ? Promise.reject(new BadStatusError(rs))
    : rs.json();

/**
 * @param {string} url
 * @param {Record<string, string | string[]>} params
 */
const makeGetUrl = (url, params = null) => {
    const entries = !params ? [] : Object.entries(params)
        .flatMap(
            ([k,v]) => !Array.isArray(v)
                ? [[k, v]]
                : v.map(subV => [k, subV])
        );
    const queryPart = !params ? '' :
        '?' + new URLSearchParams(entries);
    return url + queryPart;
};

/**
 * net::ERR_INSUFFICIENT_RESOURCES
 * tishe edesh dalshe budesh
 */
const QueueingFetch = (maxWorkers = 10) => {
    let requestsQueue = [];
    let activeRequests = 0;
    const tryTakeNext = () => {
        if (activeRequests < maxWorkers) {
            const next = requestsQueue.shift();
            if (next) {
                ++activeRequests;
                fetch(...next.fetchArgs)
                    .then(next.resolve)
                    .catch(next.reject)
                    .finally(() => {
                        --activeRequests;
                        tryTakeNext();
                    });
            }
        }
    };
    return (...fetchArgs) => {
        return new Promise((resolve, reject) => {
            requestsQueue.push({fetchArgs, resolve, reject});
            tryTakeNext();
        });
    };
};

const Api = ({
    baseUrl = '/ddr-songs-browser',
} = {}) => {
    const fetch = QueueingFetch(20);

    const toParseError = (route) => (error) => {
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            // details intentionally excluded by browser for security reasons
            // See https://stackoverflow.com/questions/28556398/how-to-catch-neterr-connection-refused
            error.message = !navigator.onLine
                ? 'no internet connection'
                : 'server incommunicable: ' + baseUrl;
        }
        error.message = 'Cannot ' + route + ', ' + error.message;
        throw error;
    };

    /**
     * @param {string} route
     * @param {Record<string, string | string[]>} params
     */
    const get = (route, params = null) => {
        const url = makeGetUrl(baseUrl + route, params);
        return fetch(url)
            .catch(toParseError(route))
            .then(parseResponse);
    };

    /**
     * @param {string} route
     * @param {JSONValue} params
     */
    const post = (route, params) => {
        return fetch(baseUrl + route, {
            method: 'POST',
            body: JSON.stringify(params),
        }).catch(toParseError(route))
            .then(parseResponse);
    };

    return {
    };
};

export default Api;