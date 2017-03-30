'use strict';

const config = {
    port: process.env.PORT || 7500,
    wolframalphaToken: process.env.WOLFRAMALPHA_TOKEN || 'XQUJKG-VVXQ4W789A',
    lineToken: process.env.LINE_TOKEN || 'U7ff1ca3dc98b470780e5df64baad7fd5',
    papertrailHost: 'logs5.papertrailapp.com',
    papertrailPort: 52498,
    papertrailActive: true,
};

module.exports = config;
