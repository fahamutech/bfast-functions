const {FaaS} = require('../src/faas');
new FaaS({
    port: 4000,
    functionsConfig: {
        functionsDirPath: __dirname+'/sample_functions/',
        bfastJsonPath: __dirname+'/sample_functions/bfast.json'
    }
}).start().catch(console.log);
