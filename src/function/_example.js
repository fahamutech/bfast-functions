exports.hello = {
    path: '/functions/hello',
    onRequest: (request, response) => {
        response.json({message: 'Hello, World!'});
    }
};
