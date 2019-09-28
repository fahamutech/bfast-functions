'use strict';

const express = require('express');
const router = express.Router();
const FaasController = require('../controller/FaaSController').FaaSController;
const faasController = new FaasController();

router.post('/deploy', function (request, response) {
    faasController.cloneOrUpdate(request.body);
    response.json({});
});

router.all('/names', function (request, response) {
    faasController.getNames().then(names => {
        response.json(names);
    }).catch(reason => {
        response.status(503).json(reason);
    });
});

module.exports = router;
