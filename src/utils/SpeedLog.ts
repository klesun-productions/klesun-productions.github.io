
import {Cls} from "../Cls";
import {S} from "./S";

declare var window: any;

let time = () => window.performance.now();

let Chunk = function()
{
    let startedAt = time();
    let logs = new Map();
    let lastAt = startedAt;
    let total = () => lastAt - startedAt;

    let self = {
        logAmount: function(keyword: string, amount: number) {
            logs.set(keyword, amount);
        },
        log: function(keyword: string) {
            let now = time();
            logs.set(keyword, now - lastAt);
            lastAt = now;
            self.total = total();
        },
        startedAt: startedAt,
        logs: logs,
        total: total(),
    };
    return self;
};

let Analysis = function(chunks = [Chunk()])
{
    let rotated = new Map([['deleteMe', [-100]]]);
    rotated.clear();
    rotated = chunks.reduce((sum,el) => {
        for (let [k,v] of el.logs) {
            if (!sum.has(k)) {
                sum.set(k, []);
            }
            sum.get(k).push(v);
        }
        return sum;
    }, rotated);

    let avg = S.D(rotated).mapv(times => times.reduce((a,b) => a + b) / times.length);
    let srt = S.D(rotated).mapv(times => times.sort((a,b) => a - b));
    return {
        min: srt.mapv(times => times[0]).obj(),
        avg: avg.obj(),
        max: srt.mapv(times => times.slice(-1)[0]).obj(),
        srt: srt.obj(),
    };
};

let chunksByKeyword = new Map([['deleteMe', [Chunk()]]]);
chunksByKeyword.clear();

/** use this to measure how much time what parts of code take */
export let SpeedLog = Cls['SpeedLog'] = {
    startChunk: function(keyword: string) {
        if (!chunksByKeyword.has(keyword)) {
            chunksByKeyword.set(keyword, []);
        }
        let chunk = Chunk();
        chunksByKeyword.get(keyword).push(chunk);
        return chunk;
    },
    chunks: chunksByKeyword,
    analyze: () => S.D(chunksByKeyword).mapv(Analysis),
};