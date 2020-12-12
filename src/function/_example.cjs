exports.helloCommonjs = {
    path: '/example-functions/hello-c',
    onRequest: (request, response) => {
        response.json({message: 'Hello, World! --> commonjs'});
    }
};
