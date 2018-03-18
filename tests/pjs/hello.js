console.log('Hello, world!');
var fs = require('fs');
var webpage = require('webpage');

var getAnimes = function() {
    var stream = fs.open('../../out/animes.json', 'r');
    var jsText = stream.read();
    stream.close();
    return JSON.parse(jsText);
};

var scheduledJobs = [];
// jobs/second
// 2 jobs: 0.51 at start
// 4 jobs: 1.00 at start; 0.82 after 30 minutes
// 6 jobs:
//   0.90 jobs/second after half-hour
//   0.81 jobs/second after an hour
var maxJobs = 4;
var jobsInProgress = 0;

var fetchPage = function(url) {
    var result = {then: function(content) {}};
    var page = webpage.create();
    page.open(url, function(status) {
        console.log('Status: ' + status + ' ' + url);
        if (status === 'success') {
            // var content = page.evaluate(function() {
            //     return document.documentElement.outerHTML;
            // });
            result.then(page.content);
            page.close();
        }
    });
    return result;
};

var toStoreFile = function(path) {
    return function(content) {
        var stream = fs.open(path, 'w');
        stream.write(content);
        stream.close();
    };
};

var animes = getAnimes();
for (var i = 0; i < animes.length; ++i) {
    var anime = animes[i];
    if (anime.malId < 113) {
        // hack to start where it ended on during launch
        continue;
    }
    var maxPages = 100; // MAL limitation
    var usersPerPage = 75;

    var pages = Math.min(anime.mbrCnt / usersPerPage, maxPages);
    for (var page = 0; page < pages; ++page) {
        var url = 'https://myanimelist.net/anime/'
            + anime.malId + '/'
            + anime.snakeCaseTitle
            + '/stats?show=' + (page * usersPerPage);

        var path = 'out/myanimelist.net_user_history_mal_id_' + anime.malId + '_page_' + page + '.html';
        scheduledJobs.push({
            url: url,
            cb: toStoreFile(path),
        });
    }
}

var toProcessFetched = function(jobCallback, startMillis) {
    return function(content) {
        console.log('processing fetched after ' + ((Date.now() - startMillis) / 1000) + ' seconds');
        jobCallback(content);
        --jobsInProgress
    }
};

var startMillis = Date.now();
var jobsScheduled = scheduledJobs.length;

setInterval(function() {
    var free = maxJobs - jobsInProgress;
    var jobsChunk = scheduledJobs.splice(0, free);
    for (var i = 0; i < jobsChunk.length; ++i) {
        var job = jobsChunk[i];
        /** @debug */
        console.log('');
        console.log('doing job ' + job.url);
        ++jobsInProgress;
        fetchPage(job.url).then = toProcessFetched(job.cb, Date.now());
        console.log('jobs left: ' + scheduledJobs.length);

        var jobsProcessed = jobsScheduled - scheduledJobs.length;
        var secondElapsed = (Date.now() - startMillis) / 1000;
        console.log('speed (jobs/second): ' + jobsProcessed / secondElapsed);
    }
    if (scheduledJobs.length === 0) {
        phantom.exit();
    }
}, 100);