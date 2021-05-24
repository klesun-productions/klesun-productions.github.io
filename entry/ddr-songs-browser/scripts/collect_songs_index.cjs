const JsExport = require("../modules/utils/JsExport.js");

const fs = require('fs').promises;
const path = require('path');
const SMParse = require('SMParse/SMParse/res/js/parser.js');
const crypto = require('crypto');
const DDR_PACKS_PATH = __dirname + '/../data/packs';

const collectSongIndex = async ({ packName, subdir, songName, i }) => {
    const songAbsPath = path.resolve(DDR_PACKS_PATH, packName, subdir, songName);
    let fileNames;
    try {
        fileNames = await fs.readdir(songAbsPath);
    } catch (error) {
        if ((error + '').includes('ENOENT: no such file or directory, scandir')) {
            return { format: 'MALFORMED_FILE_NAME_ENCODING', songName };
        } else {
            throw error;
        }
    }
    const smFileNames = fileNames.filter(n => n.match(/\.sm$/i));
    if (smFileNames.length === 0) {
        return { format: 'MISSING_SM_FILE', songName, fileNames };
    }
    if (smFileNames.length > 1) {
        console.warn('ololo multiple sm files in ' + songAbsPath);
    }
    const smFileName = smFileNames[0];
    const smPath = songAbsPath + '/' + smFileName;

    const smStat = await fs.stat(smPath);
    if (smStat.size > 512 * 1024) {
        // got one case where guy accidentally named .mp3 file with .sm extension
        return { format: 'TOO_LARGE_SM_FILE', songName, smFileName };
    }
    const smDataStr = await fs.readFile(smPath, 'utf8');

    let parsed;
    try {
        parsed = new SMParse(smDataStr);
    } catch (error) {
        return { format: 'MALFORMED_SM_FILE', songName, smFileName };
    }
    const { raw, charts } = parsed;
    const { BGCHANGES, BPMS, STOPS, DESCRIPTION, DIFFICULTY, METER, NOTEDATA, NOTES, RADARVALUES, STEPSTYPE, ...headers } = raw;
    for (const [k, v] of Object.entries(headers)) {
        if (!v || Array.isArray(v) && (v.length === 0 || v.length === 1 && v[0] === '')) {
            delete headers[k];
        }
    }
    let totalBars = 0;
    charts.forEach(chart => {
        totalBars = Math.max(totalBars, chart.notes.length);
        chart.totalSteps = chart.notes
            .flatMap(([bar, rows]) => rows)
            .flatMap(bits => bits)
            // not totally sure, no idea how does
            // it express blue arrows and holds
            .filter(bit => bit !== '0')
            .length;
        for (const [k, v] of Object.entries(chart)) {
            if (!v) {
                delete chart[k];
            }
        }
        if (chart.type === 'dance-single') {
            delete chart.type; // 99% of charts
        }
        delete chart.notes;
        delete chart.radar;
    });

    return {
        songName: songName,
        headers: headers,
        smFileName: smFileName,
        smMd5: crypto.createHash('md5').update(smDataStr).digest("hex"),
        smModifiedAt: smStat.mtime,
        // songFileName: ,
        // songMd5: ,
        // songModifiedAt: ,
        restFileNames: fileNames.filter(fileName => {
            return fileName !== smFileName
                && fileName !== 'Thumbs.db';
        }),
        totalBars: totalBars,
        charts: charts,
    };
};

const collectSubdirIndex = async (packName, subdir) => {
    const subdirPath = DDR_PACKS_PATH + '/' + packName + '/' + subdir;

    const mixedContent = await fs.readdir(subdirPath, {withFileTypes: true});
    const subdirStat = await fs.stat(subdirPath);

    const songNames = mixedContent
        .filter(f => f.isDirectory())
        .map(f => f.name);
    const imgFileName = mixedContent
        .filter(f => !f.isDirectory())
        .map(f => f.name)
        .find(n => n.match(/\.(png|je?pg|bmp|gif)$/i)) || null;

    const songs = await Promise.all(
        songNames.map((songName, i) => collectSongIndex({
            packName, subdir, songName, i
        }))
    );
    const subdirModifiedAt = subdirStat.mtime;

    return { packName, subdir, subdirModifiedAt, imgFileName, songs };
};

const collectPackIndex = async (packName) => {
    const packPath = DDR_PACKS_PATH + '/' + packName;
    const rootFiles = await fs.readdir(packPath, {withFileTypes: true});
    const subdirs = rootFiles
        .filter(f => f.isDirectory())
        .map(f => f.name)
        .filter(n => n !== 'Additional Content (Courses etc)');
    if (subdirs.length === 0) {
        return { format: 'EMPTY_DIRECTORY', packName };
    }
    const allOptions = await Promise.all(
        subdirs.map(subdir => collectSubdirIndex(packName, subdir))
    );
    const options = allOptions
        .filter(option => option.songs
            .some(song => song.format !== 'MISSING_SM_FILE'));
    if (options.length > 1) {
        console.warn('ololo, no exact match for:\n' + decodeURIComponent(packName) + ', taking first:\n' + options[0].subdir);
    }
    return options[0];
};

const main = async () => {
    const packNames = await fs.readdir(DDR_PACKS_PATH);
    console.log('[');
    let doneSkipping = true;
    let i = 0;
    for (const packName of packNames) {
        console.error('Processing pack #' + i++ + ' - ' + packName);
        doneSkipping = doneSkipping || packName === 'ZXZ%20Pack.zip';
        if (!doneSkipping) {
            continue;
        }
        const packIndex = await collectPackIndex(packName);
        console.log(JsExport(packIndex, '', 110) + ',');
    }
    console.log('null]');
};

main().catch(error => {
    console.error('Main script failed', error);
    process.exit(1);
});