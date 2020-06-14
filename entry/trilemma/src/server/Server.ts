
import * as http from 'http';
import HandleHttpRequest, {HandleHttpParams} from './HandleHttpRequest';

const handleRq = ({rq, rs, rootPath}: HandleHttpParams) => {
    HandleHttpRequest({rq, rs, rootPath}).catch(exc => {
        rs.statusCode = exc.httpStatusCode || 500;
        rs.statusMessage = ((exc || {}).message || exc + '' || '(empty error)').slice(0, 300);
        rs.end(JSON.stringify({error: exc + '', stack: exc.stack}));
        const msg = 'Trilemma HTTP request ' + rq.url + ' ' + ' failed';
        console.error(msg, exc);
    });
};

/** @param rootPath - file system path matching the root of the website hosting this request */
const Server = async (rootPath: string) => {
    http.createServer((rq, rs) => handleRq({rq, rs, rootPath})).listen(23183, '0.0.0.0', () => {
        console.log('listening trilemma requests on :23183');
    });
};

export default Server;