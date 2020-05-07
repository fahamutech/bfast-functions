exports.hello = {
    path: '/hello',
    onRequest: (request, response) => {
        response.json({message: "Hello"});
    }
}