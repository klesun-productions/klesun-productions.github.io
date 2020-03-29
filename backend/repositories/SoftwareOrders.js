const SqlUtil = require('klesun-node-tools/src/Utils/SqlUtil.js');
const Rej = require('klesun-node-tools/src/Rej.js');
const sqlite = require('sqlite');
const {onDemand} = require('klesun-node-tools/src/Lang.js');

const getConn = onDemand(() => {
    const path = __dirname + '/../../Dropbox/web/orders_data.db';
    return sqlite.open(path);
});

const SoftwareOrders = ({
    TABLE = 'SoftwareOrders',
} = {}) => {
    return {
        insert: async ({data}) => {
            return Rej.InternalServerError('olololo');
            if (!data.ordererEmail) {
                return Rej.BadRequest('`ordererEmail` is mandatory');
            }
            const {sql, placedValues} = SqlUtil.makeInsertQuery({
                table: TABLE,
                insertType: 'insertNew',
                rows: [{
                    dt: new Date().toISOString(),
                    dataJson: JSON.stringify(data),
                }],
            });
            console.log(sql);
            const dbConn = await getConn();
            const stmt = await dbConn.prepare(sql);
            return stmt.run(placedValues);
        },
    };
};

module.exports = SoftwareOrders;
