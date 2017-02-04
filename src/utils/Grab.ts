/// <reference path="../references.ts" />

import {IOpts, IPromise, S} from "./S";
import {Tls} from "./Tls";
import {GrabGui} from "../gui/GrabGui";
import {Dom} from "./Dom";

interface params_t<Trow> {
    jobs: Array<{
        url: string,
        parser: (content: string) => IOpts<Trow>,
    }>,
    chunkHandler: (chunk: Trow[]) => IPromise<any>,
    guiCont: HTMLElement,

    chunkSize?: number,
    maxWorkers?: number,
}

/**
 * a tool where i moved common part from similar tasks
 *
 * you pass here jobs that contain url-s
 * and handlers and chunk size, and then this
 * tool spawns workers to grab data from url-s,
 * parses it and sends to your server
 */
export let Grab =
    <Trow>(params: params_t<Trow>) =>
    S.promise(delayedReturn =>
{
    let gui = GrabGui(params.guiCont);
    let scheduledJobs = params.jobs;
    let chunkSize = params.chunkSize || 200;

    let unflushedRows: Trow[] = [];

    let jobsInProgress = 0;
    let startedSeconds = 0;
    let jobsStarted = 0;

    gui.maxWorkersChanged = v => {
        startedSeconds = window.performance.now() / 1000;
        jobsStarted = 0;
    };

    let proxyPostFrame = S.opt((<any>window).proxyPostFrame);
    let isProxy = () => proxyPostFrame.map(f => true).def(false);

    let processJobsIntervalId = setInterval(function() {
        let free = gui.maxWorkers - jobsInProgress;
        for (let job of scheduledJobs.splice(0, free)) {
            if (jobsStarted > 20000) {
                // Chrome eats out 1GiB in each tab
                S.opt((<any>window).proxyPostFrame).get = w => w.close();
                window.location.reload();
            }
            if (++jobsStarted % 50 === 0) {
                let seconds = (window.performance.now() / 1000) - startedSeconds;
                let speed = (jobsStarted / seconds);

                console.log('url', job.url);
                gui.statusText = 'processing ' + jobsStarted + '-th job.\n'
                    + 'Doing ' + speed + ' jobs/second';
            }
            ++jobsInProgress;
            Tls.http(job.url).then = resp => {
                --jobsInProgress;
                if (/^Too Many Requests$/.test(resp.trim())) {
                    console.error('MAL whimmed on too many requests. Rescheduling job ' + job.url);
                    scheduledJobs.push(job);
                } else {
                    job.parser(resp)
                        .err(() =>  console.error('Failed to parse response', {
                            url: job.url,
                            response: resp,
                        }))
                        .els = row => unflushedRows.push(row);
                }
            };
        }
    }, 100);

    let chunkProcessedJobsId = setInterval(() => {
        if (unflushedRows.length >= chunkSize || scheduledJobs.length === 0) {
            let chunk = unflushedRows.splice(0, chunkSize);
            console.log('flushing grabbed data chunk to server', chunk);
            params.chunkHandler(chunk).then = (resp) =>
                console.log('Flushed job chunk', resp);
        }
        if (scheduledJobs.length === 0) {
            window.clearInterval(chunkProcessedJobsId);
            window.clearInterval(processJobsIntervalId);
            delayedReturn('Finished all jobs');
        }
    }, 1000);

    Tls.timeout(5).then = () => {
        if (isProxy()) {
            // this happen in proxy context, that means:
            // 1. requests are slower ~4 times, so we can shot more
            // 2. i don't care about MAL intimidations
            gui.maxWorkers = 8;

            Tls.timeout(5 * 60).then = function () {
                proxyPostFrame.get = w => w.close();
                window.location.reload();
            };
        }
    };

    S.opt(params.maxWorkers).get = v => gui.maxWorkers = v;
});
