'use strict';

exports.hello = (request, response) => {
    response.json({message: 'Hello, world!'});
};
