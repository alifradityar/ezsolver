'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const config = require('./config');
const Promise = require('bluebird');
const logger = require('./logger').logger;
const axios = require('axios');
const parseString = Promise.promisify(require('xml2js').parseString);

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

app.use(jsonParser);
app.use(jsonErrorHandler);
app.use(expressLogger);

apiRoutes.post('/lineWebhook', (req, res) => {
    const events = req.body.events || [];
    events.map((event) => {
        // Wolframalpha
        axios.get(`http://api.wolframalpha.com/v2/query?input=pi&appid=${config.wolframalphaToken}`)
            .then((resp) => {
                // console.log(resp.data);
                parseString(resp.data)
                    .then((json) => {
                        // console.log(json.queryresult.pod);
                        const pods = json.queryresult.pod;
                        pods.forEach((pod) => {
                            const title = pod['$'].title;
                            const subPods = pod.subpod;
                            subPods.forEach((subPod) => {
                                logger.info(title);
                                logger.info(subPod.img[0]);
                                logger.info(subPod.plaintext[0]);
                            });
                        });
                    });
            });
    });
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
