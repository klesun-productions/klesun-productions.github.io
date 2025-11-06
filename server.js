const HandleHttpRequest = require('./backend/actions/HandleHttpRequest.js');
const http = require('http');
const https = require('https');
const http2 = require('http2');
const url = require('url');
const fs = require('fs').promises;
const httpProxy = require('http-proxy');

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

const main = async () => {
    const agent = new http.Agent();
    const proxy = httpProxy.createProxy({ xfwd: true, agent: agent });
    const handleRq = (rq, rs) => {
        if (checkObviousExploit(rq, rs)) {
            // burn in hell, fag!
            return;
        }
        const host = rq.headers[':authority'] || rq.headers['host'];
        if (['trilem.me', 'trilemme.klesun.net'].includes(host)) {
            proxy.web(rq, rs, {target: 'http://localhost:23183'}, exc => {
				console.error('ololo trilemma proxy error', exc);
			});
        } else if (['kunkka-torrent.online', 'trutracker.club', 'kunkka-tor.rent', 'torr.rent', 'torrent.klesun.net', 'nyaa.lv'].includes(host)) {
            proxy.web(rq, rs, {target: 'http://localhost:36865'}, exc => {
                console.error('ololo kunkka-torrent proxy error', exc);
            });
        } else if (['reibai.info', 'api.reibai.info'].includes(host)) {
            proxy.web(rq, rs, {target: 'http://localhost:36418'}, exc => {
                console.error('ololo reibai.info proxy error', exc);
            });
        } else {
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
            key: await fs.readFile('/etc/letsencrypt/live/torrent.klesun.net/privkey.pem'),
            cert: await fs.readFile('/etc/letsencrypt/live/torrent.klesun.net/fullchain.pem'),
        }, handleRq).listen(443, '0.0.0.0', () => {
            console.log('listening https://klesun-productions.com');
        });
        server.keepAliveTimeout = 3 * 60 * 1000; // 3 minutes, for fast browsing
        http.createServer((rq, rs) => {
            // force https
            const host = rq.headers.host === 'trilema.online' ? 'trilemma.online' : rq.headers.host;
            rs.writeHead(301, {'Location': 'https://' + host + rq.url});
            rs.end();
        }).listen(80, '0.0.0.0', () => {
            console.log('listening http://klesun-productions.com');
        });
    }
};

main().catch(exc => {
    console.log('Failed to start server', exc);
    process.exit(1);
});
