const Xml = require('klesun-node-tools/src/Utils/Xml.js');
const Config = require('../Config.js');
const SqlUtil = require('klesun-node-tools/src/Utils/SqlUtil.js');
const Rej = require('klesun-node-tools/src/Rej.js');
const sqlite = require('sqlite');
const {onDemand} = require('klesun-node-tools/src/Lang.js');
const nodemailer = require("nodemailer");

const getConn = onDemand(() => {
    const path = __dirname + '/../../Dropbox/web/orders_data.db';
    return sqlite.open(path);
});

const notifyMeViaEmail = async (data) => {
    const cfg = await Config.get();
    const transporter = nodemailer.createTransport({
        service: 'gmail', auth: cfg.gmailAuth,
    });
    return transporter.sendMail({
        from: '"' + data.ordererEmail + '" <app@klesun-productions.com>',
        to: 'dogzy123@gmail.com, arturklesun@gmail.com',
        subject: 'A new software order from ' + data.ordererEmail,
        text: data.freeFormDescription,
        html: Xml('div', {}, [
            Xml('pre', {}, data.freeFormDescription),
            Xml('pre', {}, JSON.stringify(data)),
        ]).toString(),
    });

};

const SoftwareOrders = ({
    TABLE = 'SoftwareOrders',
} = {}) => {
    return {
        insert: async ({data}) => {
            if (!data.ordererEmail) {
                return Rej.BadRequest('`ordererEmail` is mandatory');
            }
            notifyMeViaEmail(data);
            const {sql, placedValues} = SqlUtil.makeInsertQuery({
                table: TABLE,
                insertType: 'insertNew',
                rows: [{
                    dt: new Date().toISOString(),
                    dataJson: JSON.stringify(data),
                }],
            });
            const dbConn = await getConn();
            const stmt = await dbConn.prepare(sql);
            return stmt.run(placedValues);
        },
    };
};

module.exports = SoftwareOrders;
