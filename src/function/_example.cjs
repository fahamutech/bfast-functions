exports.hello = {
    path: '/example-functions/hello3',
    onRequest: (request, response) => {
        response.json({message: 'Hello3, World!'});
    }
};
