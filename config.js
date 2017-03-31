'use strict';

const config = {
    port: process.env.PORT || 7500,
    visionKey: process.env.VISION_KEY || 'AIzaSyAztJSA0EHlCKwCr8jqpG4QWsqecoJz7Dg',
    wolframalphaToken: process.env.WOLFRAMALPHA_TOKEN || 'XQUJKG-VVXQ4W789A',
    lineToken: process.env.LINE_TOKEN || 'o8SpOFYdxTUvzMGewqaQoMB5i0XOaZKc7+CKHxg3x9bXb1G2xpNW2WsmKFUEIzi3YVQVdpNbREb8sqZZIACbOTZsawtBITCKvlP/cFwnuTcHnbVhpIrvco+k7ZfwtK9zuqsT7XRaWF4XpLxKu5SsAQdB04t89/1O/w1cDnyilFU=',
    imageProxyUrl: process.env.IMAGE_PROXY_URL || 'https://lit-journey-87706.herokuapp.com',
    papertrailHost: 'logs5.papertrailapp.com',
    papertrailPort: 52498,
    papertrailActive: true,
};

module.exports = config;
