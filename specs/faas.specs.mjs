// import chai from "chai";
// import chai_http from "chai-http";
import {start} from "../src/core.mjs";
import {dirname} from 'path';
import {fileURLToPath} from 'url';
//
const __dirname = dirname(fileURLToPath(import.meta.url));
//
// chai.use(chai_http);
// chai.should();

// describe('Functions', function () {

// before(function (done) {
start({
    appId: 'faas',
    projectId: 'demo',
    port: 34556,
    // mode: 'git',
    // gitCloneUrl: 'https://github.com/smartstocktz/smartstock-functions',
    // gitUsername: 'joshuamshana',
    functionsConfig: {
        functionsDirPath: __dirname + '/sample_functions',
        bfastJsonPath: __dirname + '/sample_functions/bfast.json'
    },
    startScript: 'node start.js'
}).catch(console.log);
// done();
// });

//     after(async function () {
//         await stop();
//     });
//
//     it('should call a function', function (done) {
//         setTimeout(() => done(), 1000 * 60 * 60 * 24);
//     });
//
// });
