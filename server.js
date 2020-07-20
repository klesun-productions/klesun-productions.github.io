const HandleHttpRequest = require('./backend/actions/HandleHttpRequest.js');
const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs').promises;
const httpProxy = require('http-proxy');

const main = async () => {
    const proxy = httpProxy.createProxy();
    const handleRq = (rq, rs) => {
        const pathname = url.parse(rq.url).pathname;
        if (['travelaci.com', 'the-travel-hacks.com'].includes(rq.headers.host)) {
            proxy.web(rq, rs, {target: 'http://localhost:30186'});
        } else if (['trilemma.online', 'trilema.online'].includes(rq.headers.host)) {
            proxy.web(rq, rs, {target: 'http://localhost:23183'}, exc => {
				console.error('ololo proxy error', exc);
			});
        } else {
            const rootPath = __dirname;
            HandleHttpRequest({rq, rs, rootPath}).catch(exc => {
                rs.statusCode = exc.httpStatusCode || 500;
                rs.statusMessage = ((exc || {}).message || exc + '' || '(empty error)').slice(0, 300);
                rs.end(JSON.stringify({error: exc + '', stack: exc.stack}));
                const clientIp = rq.connection.remoteAddress
                    || rq.socket.remoteAddress
                    || (rq.connection.socket || {}).remoteAddress;
                const fwd = rq.headers['x-forwarded-for'];
                const msg = 'HTTP request ' + pathname + ' by ' +
                    clientIp + ' failed' + (fwd ? ' fwd: ' + fwd : '');
                console.error(msg, exc);
            });
        }
    };
    https.createServer({
        //key: await fs.readFile('/etc/letsencrypt/archive/klesun-productions.com/privkey3.pem'),
        //cert: await fs.readFile('/etc/letsencrypt/archive/klesun-productions.com/cert3.pem'),
        key: await fs.readFile('/etc/letsencrypt/live/klesun-productions.com/privkey.pem'),
        cert: await fs.readFile('/etc/letsencrypt/live/klesun-productions.com/cert.pem'),
    }, handleRq).listen(443, '0.0.0.0', () => {
        console.log('listening https://klesun-productions.com');
    });
    http.createServer((rq, rs) => {
        // force https
        const host = rq.headers.host === 'trilema.online' ? 'trilemma.online' : rq.headers.host;
        rs.writeHead(301, {'Location': 'https://' + host + rq.url});
        rs.end();
    }).listen(80, '0.0.0.0', () => {
        console.log('listening http://klesun-productions.com');
    });
};

main().catch(exc => {
    console.log('Failed to start server', exc);
    process.exit(1);
});
