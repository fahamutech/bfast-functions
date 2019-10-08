'use strict';

const express = require('express');
const FaasController = require('../controller/FaaSController').FaaSController;
const router = express.Router();

let BFastFunction;
let _faasController = new FaasController();

router.all('/:name' , (request, response) => {
    const functionName = request.params.name;
    if (functionName && BFastFunction && BFastFunction[functionName]) {
        BFastFunction[functionName](request, response);
    } else {
        response.status(404).json({message: `${functionName} function is not available`});
    }
});

function initiatesFunctions() {
    if (BFastFunction && typeof BFastFunction === 'object' && Object.keys(BFastFunction).length > 1) {
    } else {
        _faasController.getFunctions().then(functions => {
            BFastFunction = functions;
        }).catch(reason => {
            console.log(reason);
        });
    }
}

initiatesFunctions();

module.exports = router;
