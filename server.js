const Rej = require('klesun-node-tools/src/Rej.js');
const http = require('http');
const https = require('https');
const url = require('url');
const fsSync = require('fs');
const fs = require('fs').promises;
const httpProxy = require('http-proxy');
const {PythonShell} = require('python-shell');

const readPost = (rq) => new Promise((ok, err) => {
	if (rq.method === 'POST') {
		let body = '';
		rq.on('data', (data) => body += data);
		rq.on('error', exc => err(exc));
		rq.on('end', () => ok(body));
	} else {
		ok('');
	}
});

/**
 * @param {http.IncomingMessage} rq
 * @param {http.ServerResponse} rs
 */
const handleRq = async (rq, rs) => {
    const parsedUrl = url.parse(rq.url);
    let pathname = parsedUrl.pathname;

	const redirect = url => {
		rs.writeHead(302, {
			'Location': url,
		});
		rs.end();
	};

	if (pathname === '/') {
		return redirect('/entry/');
	} else if (pathname.startsWith('/entry/')
			|| pathname.startsWith('/src/')
			|| pathname.startsWith('/libs/')
			|| pathname.startsWith('/out/')
			|| pathname.startsWith('/imgs/')
			|| pathname.startsWith('/unv/hosted/')
			|| pathname.startsWith('/unv/imagesFromWeb/')
			|| pathname.startsWith('/tests/')
			|| pathname.startsWith('/Dropbox/web/')
			|| pathname.startsWith('/node_modules/')
			|| pathname === '/favicon.ico'
	) {
		pathname = decodeURIComponent(pathname);
		let absPath = __dirname + pathname;
		if (absPath.endsWith('/')) {
			absPath += 'index.html';
		}
		if (!fsSync.existsSync(absPath)) {
			return Rej.NotFound('File ' + pathname + ' does not exist');
		}
		if ((await fs.lstat(absPath)).isDirectory()) {
			return redirect(pathname + '/');
		}
		const bytes = await fs.readFile(absPath);
		if (absPath.endsWith('.html')) {
			rs.setHeader('Content-Type', 'text/html');
		} else if (absPath.endsWith('.css')) {
			rs.setHeader('Content-Type', 'text/css');
		} else if (absPath.endsWith('.js')) {
			rs.setHeader('Content-Type', 'text/javascript');
		} else if (absPath.endsWith('.svg')) {
			rs.setHeader('Content-Type', 'image/svg+xml');
		}
		rs.end(bytes);
	} else if (pathname === '/htbin/json_service.py') {
		return new Promise(async (resolve, reject) => {
			PythonShell.run(__dirname + '/htbin/json_service.py', {
				args: [JSON.stringify({
					override_environ: {
						CONTENT_LENGTH: rq.headers['content-length'],
						QUERY_STRING: parsedUrl.query,
					},
					post_string: await readPost(rq),
				})],
			}, (err, results) => {
				if (err) {
					reject(err);
				} else {
					const responseWithHeaders = (results || []).join('\n');
					const [headersPart, bodyPart] = responseWithHeaders.split('\n\n');
					for (const headerLine of !headersPart ? [] : headersPart.split('\n')) {
						const [key, value] = headerLine.split(': ');
						rs.setHeader(key, value);
					}
					rs.end(bodyPart);
					resolve();
				}
			});
		});
    } else {
        throw new Error('No API routes matched ' + parsedUrl.path);
    }
};

const main = async () => {
	const proxy = httpProxy.createProxy();
	const handeRq = (rq, rs) => {
		const pathname = url.parse(rq.url).pathname;
		if (['travelaci.com', 'the-travel-hacks.com'].includes(rq.headers.host)) {
			proxy.web(rq, rs, {target: 'http://localhost:30186'});
		// } else if (pathname === '/htbin/json_service.py') {
		// 	proxy.web(rq, rs, {target: 'http://localhost:54749'});
		} else {
			handleRq(rq, rs).catch(exc => {
				rs.statusCode = exc.httpStatusCode || 500;
				rs.end(JSON.stringify({error: exc + '', stack: exc.stack}));
				console.error('HTTP request failed', exc);
			});
		}
	};
    http.createServer(handeRq).listen(80, '0.0.0.0', () => {
		console.log('listening http://klesun-productions.com');
	});
    https.createServer({
		key: await fs.readFile('/etc/letsencrypt/archive/klesun-productions.com/privkey1.pem'),
		cert: await fs.readFile('/etc/letsencrypt/archive/klesun-productions.com/cert1.pem'),
	}, handeRq).listen(443, '0.0.0.0', () => {
		console.log('listening https://klesun-productions.com');
	});
};

main().catch(exc => {
    console.log('Failed to start server', exc);
    process.exit(1);
});
