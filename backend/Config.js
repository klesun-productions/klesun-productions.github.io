
const fs = require('fs').promises;
const {onDemand} = require('klesun-node-tools/src/Lang.js');
const JSON5 = require('json5');

/** @var get = async () => require('config.dev.json5') */
const get = onDemand(async () => {
    const configStr = process.env.NODE_ENV === 'development'
        ? await fs.readFile(__dirname + '/../env/config.dev.json5')
        : await fs.readFile(__dirname + '/../env/config.json5');
    return JSON5.parse(configStr);
});

exports.get = get;
