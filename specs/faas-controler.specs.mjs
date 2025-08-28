import {getFunctions} from "../src/index.mjs";
import assert from "assert";
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Functions Generation', function () {
    before(function (done) {
        done();
    });
    after(function (done) {
        done();
    });
    it('should return http functions object of given dir to scan', async function () {
        const functions = await getFunctions({
            functionsDirPath: __dirname + '/../example-functions/',
        });
        console.log(functions);
        assert(typeof functions === 'object');
        assert(Object.keys(functions).includes('_functions'));
        assert(Object.keys(functions).includes('_health'));
        // assert(typeof functions['hello'] === 'object');
        // assert(typeof functions['hello'].onRequest === 'function');
        // assert(functions['hello'].onRequest.name === 'onRequest');
        // assert(typeof functions['hello'].path === 'string');
        // assert(functions['hello'].path === '/hello');
        // assert(typeof functions['mambo'].onRequest.arguments === 'function');
    });
});
