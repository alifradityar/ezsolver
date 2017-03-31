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

const _imageEncode = (arrayBuffer) => {
    let u8 = new Uint8Array(arrayBuffer)
    let b64encoded = btoa([].reduce.call(new Uint8Array(arrayBuffer),function(p,c){return p+String.fromCharCode(c)},''))
    let mimetype="image/jpeg"
    return "data:"+mimetype+";base64,"+b64encoded
};

const _truncate = (str, maxLen) => {
    if (maxLen <= 2) {
        return str;
    }
    if (str.length > maxLen) {
        return str.subString(0, maxLen-2) + "..";
    }
    return str;
}

app.use(jsonParser);
app.use(jsonErrorHandler);
app.use(expressLogger);

const fetchWolframAndReply = (userId, messageQuery) => {
     // Wolframalpha
    axios.get(`http://api.wolframalpha.com/v2/query`, {
            params: {
                input: messageQuery,
                appid: config.wolframalphaToken,
            }  
        }).then((resp) => {
            // console.log(resp.data);
            parseString(resp.data)
                .then((json) => {
                    // console.log(json.queryresult.pod);
                    const pods = json.queryresult.pod;
                    let counter = 0;
                    const answerColumns = []
                    pods.forEach((pod, index) => {
                        const title = pod['$'].title;
                        const subPods = pod.subpod;
                        let replyMessagePart = "";
                        subPods.forEach((subPod) => {
                            logger.info(title);
                            logger.info(subPod.img[0]);
                            logger.info(subPod.plaintext[0]);
                            logger.info("====");
                            replyMessagePart = replyMessagePart.length == 0 ? subPod.plaintext[0] : replyMessagePart + "\n" + subPod.plaintext[0];
                        });
                        if (title === 'Input' || 
                            title === 'Solution' || 
                            title === 'Decimal approximation' || 
                            title === 'Response' ||
                            title === 'Result' || 
                            title === 'Roots' ||
                            title === 'Solutions' ||
                            title === 'Root') {
                            counter++;
                            pods[index].used = true;
                            const imageUrl = `${config.imageProxyUrl}/${encodeURIComponent(subPods[0].img[0]['$'].src)}/512/768.jpg`
                            answerColumns.push({
                                thumbnailImageUrl: imageUrl,
                                title: title,
                                text: replyMessagePart || title,
                                actions: [
                                    {
                                        type: "message",
                                        label: "Detail",
                                        text: replyMessagePart || title
                                    }
                                ]
                            });
                        }
                    });
                    pods.forEach((pod, index) => {
                        const title = pod['$'].title;
                        const subPods = pod.subpod;
                        let replyMessagePart = "";
                        subPods.forEach((subPod) => {
                            logger.info(title);
                            logger.info(subPod.img[0]);
                            logger.info(subPod.plaintext[0]);
                            logger.info("====");
                            replyMessagePart = replyMessagePart.length == 0 ? subPod.plaintext[0] : replyMessagePart + "\n" + subPod.plaintext[0];
                        });
                        if (counter < 5 && !pods[index].used) {
                            counter++;
                            pods[index].used = true;
                            const imageUrl = `${config.imageProxyUrl}/${encodeURIComponent(subPods[0].img[0]['$'].src)}/512/341.jpg`
                            answerColumns.push({
                                thumbnailImageUrl: imageUrl,
                                title: title,
                                text: _truncate(replyMessagePart || title),
                                actions: [
                                    {
                                        type: "message",
                                        label: "Detail",
                                        text: _truncate(replyMessagePart || title),
                                    }
                                ]
                            });
                        }
                    });
                    const data = {
                        to: userId,
                        messages: [{
                            type: "template",
                            altText: "this is a carousel template",
                            template: {
                                type: "carousel",
                                columns: answerColumns,
                            }
                        },{
                            type: "text",
                            text: "If our interpretation of the your input is wrong, kindly rewrite it manually",
                        }],
                        
                    };
                    logger.info(data);
                    axios.post(`https://api.line.me/v2/bot/message/push`, data, {
                            headers: {
                                Authorization: `Bearer ${config.lineToken}`,
                            },
                        }).then((resp) => {
                            logger.info('Reply success');
                            logger.info(resp.data);
                        }).catch((err) => {
                            logger.error(err.data);
                        });;
                });
        }).catch((err) => {
            logger.error(err);
        });
};

apiRoutes.post('/lineWebhook', (req, res) => {
    const events = req.body.events || [];
    events.map((event) => {
        logger.info(event);
        const replyToken = event.replyToken;
        const messageType = event.message.type;
        const messageId = event.message.id;
        const userId = event.source.userId;
        const data = {
            replyToken: replyToken,
            messages:[{
                type: "text",
                text: "Gotcha! Please wait a moment, looking for the answer...",
            }],
        };
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

        if (messageType === 'text') {
            const messageQuery = event.message.text || 'pi';
            fetchWolframAndReply(userId, messageQuery);
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
                            new vision.Feature('TEXT_DETECTION', 1),
                        ],
                    })
                    // send single request
                    vision.annotate(visionData).then((res) => {
                        // handling response
                        logger.info(JSON.stringify(res.responses));
                        const messageQuery = res.responses[0].textAnnotations[0].description;
                        logger.info(messageQuery);
                        fetchWolframAndReply(userId, messageQuery.replace(/(\r\n|\n|\r)/gm,"; "));
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
            const visionData = new vision.Request({
                    image: new vision.Image({
                        base64: base64Data
                    }),
                    features: [
                        new vision.Feature('TEXT_DETECTION', 1),
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
