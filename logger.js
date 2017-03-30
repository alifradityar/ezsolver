'use strict';

const os = require('os');
const winston = require('winston');
const winstonPapertrail = require('winston-papertrail');
const util = require('util');

const Papertrail = winstonPapertrail.Papertrail;
const papertrailHostActive = typeof process.env.PAPERTRAIL_HOST !== 'undefined';
const papertrailPortActive = typeof process.env.PAPERTRAIL_PORT !== 'undefined';
const papertrailActive = papertrailHostActive && papertrailPortActive;
const consoleTransport = new winston.transports.Console({
    level: 'info',
    timestamp: () => {
        return new Date().toString();
    },
    colorize: true,
});
const transports = [consoleTransport];
const ssiLogger = {
    consoleTransport: consoleTransport,
};

if (papertrailActive) {
    const papertrailTransport = new Papertrail({
        host: process.env.PAPERTRAIL_HOST,
        port: process.env.PAPERTRAIL_PORT,
        colorize: true,
        program: os.hostname(),
    });
    transports.push(papertrailTransport);
    ssiLogger.papertrailTransport = papertrailTransport;
}

ssiLogger.logger = new winston.Logger({
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3,
    },
    transports: transports,
});

module.exports = ssiLogger;
