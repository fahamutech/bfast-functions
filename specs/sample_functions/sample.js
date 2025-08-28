module.exports.sampleSocket = {
    name: '/test',
    onEvent: (request, response) => {
        response.emit(request.body);
    }
}

module.exports.simpleGuard = {
    path: '/test',
    onGuard: (request, response, next) => {
        console.log('I am a guard');
        next();
        // response.send("I am a guard");
    }
}

module.exports.normalhttp = {
    path: '/test',
    onRequest: (request, response) => {
        response.send('hello, world!');
    }
}

module.exports.normalhttpPublic = {
    method: 'get',
    path: '/hi',
    onRequest: (request, response) => {
        response.send('hello, mam!');
    }
}

module.exports.normalhttpPublicWithParams = {
    path: '/hi/:name',
    onRequest: (request, response) => {
        response.send('hello, ' + request.params.name + '!');
    }
}

module.exports.normalhttpWithParams = {
    path: '/test/:name',
    onRequest: (request, response) => {
        response.status(200).send('hello, ' + request.params.name + '!');
    }
}

// module.exports.sampleJob = {
//     rule: "1 * * * * *",
//     onJob: () => {
//         console.log("jobs run every 2 second: " + new Date());
//     }
// }
