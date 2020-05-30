exports.hello = {
    path: '/example-functions/hello',
    onRequest: (request, response) => {
        response.json({message: 'Hello, World!'});
    }
};
