const {FaaSController} = require('../src/controller/FaaSController');
const mocha = require("mocha");
const {it, describe, before, after, afterEach} = mocha
const assert = require('assert');

describe('Functions Generation', function () {
    let faaSController;
    before(function (done) {
        faaSController = new FaaSController();
        done();
    });

    after(function (done) {
        faaSController = undefined;
        done();
    });
    it('should return http functions object of given dir to scan', async function () {
        const functions = await faaSController.getFunctions({
            functionsDirPath: __dirname + '/../example-functions/',
        });
        assert(typeof functions === 'object');
        assert(typeof functions['hello'] === 'object');
        assert(typeof functions['hello'].onRequest === 'function');
        assert(functions['hello'].onRequest.name === 'onRequest');
        assert(typeof functions['hello'].path === 'string');
        assert(functions['hello'].path === '/hello');
        // assert(typeof functions['mambo'].onRequest.arguments === 'function');
    });
});
