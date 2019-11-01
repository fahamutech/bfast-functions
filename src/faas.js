const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const http = require('http');
const _FaaSController = require('./controller/FaaSController').FaaSController;

const _faaSController = new _FaaSController();
const _app = express();
_app.use(cors());
_app.use(logger('dev'));
_app.use(express.json({
    limit: '2024mb'
}));
_app.use(express.urlencoded({extended: false}));
_app.use(cookieParser());

_app.use('/names', function (request, response) {
    _faaSController.getNames().then(names => {
        response.json(names);
    }).catch(reason => {
        response.status(503).json(reason);
    });
});

_faaSController.getFunctions().then(functions => {
    if (typeof functions === 'object') {
        Object.keys(functions).forEach(functionName => {
            // if (typeof functions[functionName] === 'function' || Array.isArray(functions[functionName])) {
            _app.use(`/functions/${functionName}`, functions[functionName]);
            //  }
        });
    } else {
        throw {message: 'It\'s not object'};
    }
}).catch(reason => {
    console.log(reason);
});

const faasServer = http.createServer(_app);
faasServer.listen('3443');
faasServer.on('listening', () => {
    console.log('FaaS Engine Listening on 3443');
});
