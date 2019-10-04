'use strict';

const express = require('express');
const router = express.Router();
const FaasController = require('../controller/FaaSController').FaaSController;
const faasController = new FaasController();

router.post('/deploy', function (request, response) {
    console.log(request.body);
    faasController.cloneOrUpdate(request.body).then(value => {
        response.json({message: 'functions deployed'});
    }).catch(reason => {
        response.status(406).json(reason);
    })
});

router.all('/names', function (request, response) {
    faasController.getNames().then(names => {
        response.json(names);
    }).catch(reason => {
        response.status(503).json(reason);
    });
});

module.exports = router;
