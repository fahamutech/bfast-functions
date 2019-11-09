exports.hello = {
    onRequest: (request, response) => {
        response.json({message: 'Hello, World!'});
    }
};
