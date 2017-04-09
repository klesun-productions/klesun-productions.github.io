
import {S, IPromise} from "./S";
import {Tls} from "./Tls";

/**
 * sometimes you have hundreds or thousands of
 * http requests you need to perform to get data,
 * but if you do them all at once, either you browser
 * will have a bad time or the web site will ban you
 *
 * so, in order to retrieve data efficiently, you have to define
 * some limit like 10 or 20 alive http requests at a time
 *
 * this class does the job
 */
export let GrabTraffic = function<T>(
    getMaxJobs: () => number,
    retrievalMethod: (url: string) => IPromise<T>
) {
    let jobsInProgress = 0;
    let scheduledJobs: {url: string, then: (resp: T) => void}[] = [];

    // it would be nice if this interval was removed
    // could be handled by wrapping in singleton
    let processJobsIntervalId = setInterval(function() {
        let free = getMaxJobs() - jobsInProgress;
        for (let job of scheduledJobs.splice(0, free)) {
            ++jobsInProgress;
            retrievalMethod(job.url).then = resp => {
                --jobsInProgress;
                job.then(resp);
            };
        }
    }, 100);

    return {
        http: (url: string) => S.promise<T>(delayedReturn => {
            scheduledJobs.push({
                url: url,
                then: delayedReturn,
            });
        }),
    };
};
