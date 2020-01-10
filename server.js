const http = require('http');
const url = require('url');
const fs = require('fs').promises;

const handleRq = async (rq, rs) => {
    const parsedUrl = url.parse(rq.url);
    let path = parsedUrl.path;

	const redirect = url => {
		rs.writeHead(302, {
			'Location': url,
		});
		rs.end();
	};

	path = {
		'/favicon.ico': '/imgs/klesun-productions_32x32.ico',
	}[path] || path;

	if (path === '/') {
		return redirect('/entry/main/');
	} else if (path.startsWith('/entry/') 
			|| path.startsWith('/src/') 
			|| path.startsWith('/libs/')
			|| path.startsWith('/out/')
			|| path.startsWith('/imgs/')
	) {
		path = decodeURIComponent(path);
        let absPath = __dirname + path;
        if (absPath.endsWith('/')) {
            absPath += 'index.html';
        } else if ((await fs.lstat(absPath)).isDirectory()) {
			return redirect(path + '/');
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
    } else {
        throw new Error('No API routes matched ' + parsedUrl.path);
    }
};

const main = async () => {
    const httpServer = http.createServer((rq, rs) => {
        handleRq(rq, rs).catch(exc => {
            rs.statusCode = exc.httpStatusCode || 500;
            rs.end(JSON.stringify({error: exc + '', stack: exc.stack}));
            console.error('HTTP request failed', exc);
        });
    });
    const PORT = 80;
    httpServer.listen(PORT, '0.0.0.0', () => {
        console.log('listening on *:' + PORT + ' - for standard http request handling');
   	});
};

main().catch(exc => {
    console.log('Failed to start server', exc);
    process.exit(1);
});
