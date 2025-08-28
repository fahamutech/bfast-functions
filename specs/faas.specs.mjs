import {start} from "../src/core.mjs";
import {dirname} from 'path';
import {fileURLToPath} from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

start({
    appId: 'faas',
    projectId: 'demo',
    port: 34556,
    // mode: 'git',
    // gitCloneUrl: 'https://github.com/Mrabasuperapp/kilimoni-functions',
    // gitUsername: 'joshuamshana',
    functionsConfig: {
        functionsDirPath: __dirname + '/sample_functions',
        bfastJsonPath: __dirname + '/sample_functions/bfast.json'
    },
    startScript: 'node start.js'
}).then(_ => {
    console.log('Done initializing');
}).catch(console.log);
