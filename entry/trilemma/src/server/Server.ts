
import * as http from 'http';
import HandleHttpRequest  from './HandleHttpRequest';

const handleRq = ({rq, rs, rootPath}) => {
    HandleHttpRequest({rq, rs, rootPath}).catch(exc => {
        rs.statusCode = exc.httpStatusCode || 500;
        rs.statusMessage = ((exc || {}).message || exc + '' || '(empty error)').slice(0, 300);
        rs.end(JSON.stringify({error: exc + '', stack: exc.stack}));
        const msg = 'Trilemma HTTP request ' + rq.url + ' ' + ' failed';
        console.error(msg, exc);
    });
};

const Server = async (rootPath) => {
    http.createServer((rq, rs) => handleRq({rq, rs, rootPath})).listen(23183, '0.0.0.0', () => {
        console.log('listening trilemma requests at https://klesun-productions.com:23183');
    });
};

export default Server;