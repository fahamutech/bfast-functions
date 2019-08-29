'use strict';

const express = require('express');
const functions = require('../bfastfunction');
const router = express.Router();

router.post('/:name', (request, response) => {
    const functionName = request.params.name;
    if (functionName && functions && functions[functionName]) {
        functions[functionName](request, response);
    } else {
        response.status(404).json({message: `${functionName} function is not available`});
    }
});

module.exports = router;
