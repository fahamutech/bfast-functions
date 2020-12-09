exports.hello = {
    path: '/example-functions/hello2',
    onRequest: (request, response) => {
        response.json({message: 'Hello2, World!'});
    }
};
