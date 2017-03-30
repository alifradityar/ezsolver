'use strict';

const config = {
    port: process.env.PORT || 7500,
    wolframalphaToken: process.env.WOLFRAMALPHA_TOKEN || "XQUJKG-VVXQ4W789A",
    lineToken: process.env.LINE_TOKEN || 'ASDF',
    papertrailHost: 'logs5.papertrailapp.com',
    papertrailPort: 52498,
    papertrailActive: true,
};

module.exports = config;
