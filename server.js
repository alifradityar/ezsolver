'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const config = require('./config');
const Promise = require('bluebird');
const btoa = require('btoa');
const logger = require('./logger').logger;
const axios = require('axios');
const parseString = Promise.promisify(require('xml2js').parseString);
const vision = require('node-cloud-vision-api')
vision.init({auth: config.visionKey})

const app = express();
const jsonParser = bodyParser.json();

const apiRoutes = express.Router();

const expressLogger = (req, res, next) => {
    logger.info(`${req.method} ${req.url} with request header ${JSON.stringify(req.headers)}`);
    next();
};

const jsonErrorHandler = (error, req, res, next) => {
    if (error instanceof SyntaxError) {
        res.status(400).json({ status: 'BAD_REQUEST', code: '400', message: 'Invalid JSON' });
    } else {
        next();
    }
};

function _imageEncode (arrayBuffer) {
    let u8 = new Uint8Array(arrayBuffer)
    let b64encoded = btoa([].reduce.call(new Uint8Array(arrayBuffer),function(p,c){return p+String.fromCharCode(c)},''))
    let mimetype="image/jpeg"
    return "data:"+mimetype+";base64,"+b64encoded
}

app.use(jsonParser);
app.use(jsonErrorHandler);
app.use(expressLogger);

apiRoutes.post('/lineWebhook', (req, res) => {
    const events = req.body.events || [];
    events.map((event) => {
        logger.info(event);
        const replyToken = event.replyToken;
        const messageType = event.message.type;
        const messageId = event.message.id;
        if (messageType === 'text') {
            const messageQuery = event.message.text || 'pi';
            // Wolframalpha
            axios.get(`http://api.wolframalpha.com/v2/query?input=${messageQuery}&appid=${config.wolframalphaToken}`)
                .then((resp) => {
                    // console.log(resp.data);
                    parseString(resp.data)
                        .then((json) => {
                            // console.log(json.queryresult.pod);
                            const pods = json.queryresult.pod;
                            let replyMessage = "";
                            pods.forEach((pod) => {
                                const title = pod['$'].title;
                                const subPods = pod.subpod;
                                let replyMessagePart = title + `\n` + `=====`;
                                subPods.forEach((subPod) => {
                                    logger.info(title);
                                    logger.info(subPod.img[0]);
                                    logger.info(subPod.plaintext[0]);
                                    logger.info("====");
                                    replyMessagePart = replyMessagePart + "\n" + subPod.plaintext[0];
                                });
                                replyMessagePart + "\n";
                                if (title === 'Input' || title === 'Solution' || title === 'Decimal approximation' || title === 'Response') {
                                    if (replyMessage.length == 0) {
                                        replyMessage = replyMessage + replyMessagePart;
                                    } else {
                                        replyMessage = replyMessage + "\n" + replyMessagePart;
                                    }
                                }
                            });
                            const data = {
                                replyToken: replyToken,
                                messages:[{
                                    type: "text",
                                    text: replyMessage,
                                }],
                            };
                            logger.info(data);
                            axios.post(`https://api.line.me/v2/bot/message/reply`, data, {
                                    headers: {
                                        Authorization: `Bearer ${config.lineToken}`,
                                    },
                                }).then((resp) => {
                                    logger.info('Reply success');
                                    logger.info(resp.data);
                                }).catch((err) => {
                                    logger.error(err);
                                });;
                        });
                }).catch((err) => {
                    logger.error(err);
                });
        } else if (messageType === 'image') {
            axios.get(`https://api.line.me/v2/bot/message/${messageId}/content`, {
                    headers: {
                        Authorization: `Bearer ${config.lineToken}`,
                    },
                    responseType: 'arraybuffer',
                }).then((resp) => {
                    const base64Data = _imageEncode(resp.data);
                    const visionData = new vision.Request({
                        image: new vision.Image({
                            base64: base64Data
                        }),
                        features: [
                            new vision.Feature('DOCUMENT_TEXT_DETECTION', 1),
                        ],
                    })
                    // send single request
                    vision.annotate(visionData).then((res) => {
                        // handling response
                        logger.info(JSON.stringify(res.responses));
                        const text = res.responses[0].textAnnotations[0].description;
                        logger.info(text);
                    }, (e) => {
                        logger.error('Error: ', e)
                    })
                }).catch((err) => {
                    logger.error(err);
                });;
        } else {
            logger.warn('Unsupported type');
        }
    });
    res.status(200).json('Ok');
});

apiRoutes.get('/test', (req, res) => {
    axios.get(`https://api.line.me/v2/bot/message/5864091880972/content`, {
            headers: {
                Authorization: `Bearer ${config.lineToken}`,
            },
            responseType: 'arraybuffer',
        }).then((resp) => {
            const base64Data = _imageEncode(resp.data);
            logger.info("data:" + resp.headers["content-type"] + ";base64,");
            logger.info(base64Data);
            const visionData = new vision.Request({
                image: new vision.Image({
                    base64: base64Data
                }),
                features: [
                    new vision.Feature('DOCUMENT_TEXT_DETECTION', 1),
                ],
            })
            // send single request
            vision.annotate(visionData).then((res) => {
                // handling response
                logger.info(JSON.stringify(res.responses));
                const text = res.responses[0].textAnnotations[0].description;
                logger.info(text);
            }, (e) => {
                logger.error('Error: ', e)
            })
        }).catch((err) => {
            logger.error(err);
        });;
    res.status(200).json('Ok');
});

app.use('/v1', apiRoutes);

// Handle 500
app.use((error, req, res, next) => {
    logger.error('Uncaught error: ', error);
    res.status(500).json({ status: 'Error', code: '500' });
});

const server = app.listen(config.port, () => {
    logger.info(`EZSolver started on port ${config.port}`);
});

module.exports = server;
