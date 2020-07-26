module.exports.samoleSocke = {
    name: '/test',
    onEvent: (request, response) => {
        console.log(request);
        response.emit(request.body);
    }
}

module.exports.normalhttp = {
    path: '/test',
    onRequest: (request, response) => {
        response.send('hello, world!');
    }
}
