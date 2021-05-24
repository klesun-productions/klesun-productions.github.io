const HandleHttpRequest = require('./backend/actions/HandleHttpRequest.js');
const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs').promises;
const httpProxy = require('http-proxy');
const fsSync = require('fs');

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
    const proxy = httpProxy.createProxy();
    const handleRq = (rq, rs) => {
        if (checkObviousExploit(rq, rs)) {
            // burn in hell, fag!
        } else if (['trilemma.online', 'trilema.online'].includes(rq.headers.host)) {
            proxy.web(rq, rs, {target: 'http://localhost:23183'}, exc => {
				console.error('ololo trilemma proxy error', exc);
			});
        } else if (['kunkka-torrent.online', 'trutracker.club'].includes(rq.headers.host)) {
            proxy.web(rq, rs, {target: 'http://localhost:36865'}, exc => {
				console.error('ololo kunkka-torrent proxy error', exc);
			});
        } else if (['sirual.site'].includes(rq.headers.host)) {
            const pathname = url.parse(rq.url).pathname;
            const port = pathname.startsWith('/api/') || pathname === '/api' ? 8000 : 42175;
            proxy.web(rq, rs, {target: 'http://localhost:' + port}, exc => {
				console.error('ololo lauris proxy error', exc);
			});
        } else if (['tronscam.io'].includes(rq.headers.host)) {
			let absPath = __dirname + '/entry/tronscam.html';
			rs.setHeader('Content-Type', 'text/html');
			fsSync.createReadStream(absPath).pipe(rs);
        } else {
            // klesun-productions.com
            const rootPath = __dirname;
            HandleHttpRequest({rq, rs, rootPath}).catch(exc => {
                const pathname = url.parse(rq.url).pathname;
                rs.statusCode = exc.httpStatusCode || exc.statusCode || 500;
                rs.statusMessage = ((exc || {}).message || exc + '' || '(empty error)').slice(0, 300);
                rs.end(JSON.stringify({error: exc + '', stack: exc.stack}));
                const clientIp = rq.connection.remoteAddress
                    || rq.socket.remoteAddress
                    || (rq.connection.socket || {}).remoteAddress;
                const fwd = rq.headers['x-forwarded-for'];
                const msg = 'HTTP request ' + pathname + ' by ' +
                    clientIp + ' failed' + (fwd ? ' fwd: ' + fwd : '');
                if (![204, 400].includes(rs.statusCode)) {
                    console.error(msg, exc);
                }
            });
        }
    };
    https.createServer({
        //key: await fs.readFile('/etc/letsencrypt/archive/klesun-productions.com/privkey3.pem'),
        //cert: await fs.readFile('/etc/letsencrypt/archive/klesun-productions.com/cert3.pem'),
        key: await fs.readFile('/etc/letsencrypt/live/klesun-productions.com-0001/privkey.pem'),
        //cert: await fs.readFile('/etc/letsencrypt/live/klesun-productions.com/cert.pem'),
        cert: await fs.readFile('/etc/letsencrypt/live/klesun-productions.com-0001/fullchain.pem'),
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
