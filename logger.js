'use strict';

const os = require('os');
const winston = require('winston');
const winstonPapertrail = require('winston-papertrail');
const util = require('util');
const config = require('./config');

const Papertrail = winstonPapertrail.Papertrail;
const consoleTransport = new winston.transports.Console({
    level: 'info',
    timestamp: () => {
        return new Date().toString();
    },
    colorize: true,
});
const transports = [consoleTransport];
const thisLogger = {
    consoleTransport: consoleTransport,
};

if (config.papertrailActive) {
    const papertrailTransport = new Papertrail({
        host: config.papertrailHost,
        port: config.papertrailPort,
        colorize: true,
        program: os.hostname(),
    });
    transports.push(papertrailTransport);
    thisLogger.papertrailTransport = papertrailTransport;
}

thisLogger.logger = new winston.Logger({
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3,
    },
    transports: transports,
});

module.exports = thisLogger;
