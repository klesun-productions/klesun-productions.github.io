const HandleHttpRequest = require('./backend/actions/HandleHttpRequest.js');
const http = require('http');
const https = require('https');
const http2 = require('http2');
const url = require('url');
const fs = require('fs').promises;
const httpProxy = require('http-proxy');
const http2Proxy = require('http2-proxy');

const checkObviousExploit = (rq, rs) => {
    const pathname = url.parse(rq.url).pathname;
    if (pathname.endsWith('.php') || pathname.endsWith('.aspx')) {
        const clientIp = rq.connection.remoteAddress
            || rq.socket.remoteAddress
            || (rq.connection.socket || {}).remoteAddress;
        const forwardIp = rq.headers['x-forwarded-for'];
        console.warn('Exploit attempt: ' + pathname + ' from ' + clientIp + (forwardIp ? ' for ' + forwardIp : ''));
        rq.destroy();
        rs.end();
        return true;
    } else {
        return false;
    }
};

function stringifyErrorShallow(error) {
    if (!error) {
        return "(empty error)";
    } else if (error && typeof error === "object"
            && "message" in error
            && typeof error.message === "string"
    ) {
        return String(error.message);
    } else if (typeof error === "string") {
        return error;
    } else if (error + "" !== "[object Object]") {
        return error + "";
    } else {
        return "Unknown format error: " + JSON.stringify(error);
    }
}

/**
 * many libraries throw objects that do not extend Error, this function attempts
 * to extract the message from any kind of error object using popular conventions
 * like having `toString()` implementation or `message` property
 * @return {string}
 */
function stringifyError(error) {
    if (error instanceof AggregateError) {
        return error.errors.map(stringifyErrorShallow).join("\n");
    } else {
        return stringifyErrorShallow(error);
    }
}

const main = async () => {
    const agent = new http.Agent();
    //const proxy = httpProxy.createProxy({ xfwd: true, agent: agent });
    const handleRq = (rq, rs) => {
        if (checkObviousExploit(rq, rs)) {
            // burn in hell, fag!
            return;
        }
        const host = rq.headers[':authority'] || rq.headers['host'];
        if (['trilem.me', 'trilemme.klesun.net'].includes(host)) {
            http2Proxy.web(rq, rs, { port: 23183 }).catch(exc => {
                console.error('ololo trilemma proxy error', exc);
                rs.statusCode = 500;
                // rs.statusMessage = stringifyError(exc).replace(/\W/g, " ").slice(0, 100);
                rs.write(stringifyError(exc));
                rs.end();
            });
        } else if (['kunkka-torrent.online', 'trutracker.club', 'kunkka-tor.rent', 'torr.rent', 'torrent.klesun.net', 'nyaa.lv'].includes(host)) {
            http2Proxy.web(rq, rs, { port: 36865, useHttp1: true, timeout: 200 * 1000 }).catch(exc => {
                console.error('ololo kunkka-torrent proxy error at ' + rq.url, exc);
                rs.statusCode = 500;
                // rs.statusMessage = stringifyError(exc).replace(/\W/g, " ").slice(0, 100);
                rs.write(stringifyError(exc));
                rs.end();
            });
        } else if (['reibai.info', 'api.reibai.info'].includes(host)) {
            http2Proxy.web(rq, rs, { port: 36418 }).catch(exc => {
                console.error('ololo reibai.info proxy error', exc);
                rs.statusCode = 500;
                // rs.statusMessage = stringifyError(exc).replace(/\W/g, " ").slice(0, 100);
                rs.write(stringifyError(exc));
                rs.end();
            });
        } else {
            console.log("ololo unrecognized domain: " + rq.headers.host);
            // klesun-productions.com
            const rootPath = __dirname;
            /** @param {http.ServerResponse} rs */
            HandleHttpRequest({rq, rs, rootPath}).catch(exc => {
                const pathname = url.parse(rq.url).pathname;
                rs.statusCode = exc.httpStatusCode || exc.statusCode || 500;
                rs.statusMessage = ((exc || {}).message || exc + '' || '(empty error)')
                    // sanitize, as statusMessage seems to not allow special characters
                    .slice(0, 300).replace(/[^ -~]/g, '?');
                rs.write(JSON.stringify({error: exc + '', stack: exc.stack}));
                const clientIp = rq.connection.remoteAddress
                    || rq.socket.remoteAddress
                    || (rq.connection.socket || {}).remoteAddress;
                const fwd = rq.headers['x-forwarded-for'];
                const msg = 'HTTP request ' + pathname + ' by ' +
                    clientIp + ' failed' + (fwd ? ' fwd: ' + fwd : '');
                if (![204, 400].includes(rs.statusCode)) {
                    console.error(msg, exc);
                }
            }).finally(() => rs.end());
        }
    };
    if (process.argv.includes("--no-ssl")) {
        const server = http.createServer(handleRq).listen(38153, '0.0.0.0', () => {
            console.log('listening http://localhost:38153');
        });
        server.keepAliveTimeout = 3 * 60 * 1000; // 3 minutes, for fast browsing
    } else {
        const server = http2.createSecureServer({
            allowHTTP1: true,
            key: await fs.readFile('/etc/letsencrypt/live/torrent.klesun.net/privkey.pem'),
            cert: await fs.readFile('/etc/letsencrypt/live/torrent.klesun.net/fullchain.pem'),
        }, handleRq).listen(443, '0.0.0.0', () => {
            console.log('listening api.klesun.net at localhost:443');
        });
        server.keepAliveTimeout = 3 * 60 * 1000; // 3 minutes, for fast browsing
        http.createServer((rq, rs) => {
            // force https
            const host = rq.headers.host === 'trilema.online' ? 'trilemma.online' : rq.headers.host;
            rs.writeHead(301, {'Location': 'https://' + host + rq.url});
            rs.end();
        }).listen(80, '0.0.0.0', () => {
            console.log('listening api.klesun.net at localhost:80');
        });
    }
};

main().catch(exc => {
    console.log('Failed to start server', exc);
    process.exit(1);
});
