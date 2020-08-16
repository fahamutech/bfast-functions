const {BfastFunctions} = require('./bfast.functions');
const faasServer = new BfastFunctions({
    port: ((process.env.PORT !== 'undefined') && (process.env.PORT !== 'null')) ? process.env.PORT : '3000',
    projectId: process.env.PROJECT_ID,
    appId: process.env.APPLICATION_ID,
    gitUsername: process.env.GIT_USERNAME,
    gitToken: process.env.GIT_TOKEN,
    gitCloneUrl: process.env.GIT_CLONE_URL,
});

faasServer.start().then(_ => {
    console.log('BFast::Cloud Faas Started');
});
