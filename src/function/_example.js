exports.hello_normal__ = {
    path: '/example-functions/hello',
    onRequest: (request, response) => {
        response.json({message: 'Hello, World!'});
    }
};
