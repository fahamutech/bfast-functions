const FaaS = require('./faas');

const faasServer = new FaaS({
    port: '3000',
    projectId: process.env.PROJECT_ID,
    appId: process.env.APPLICATION_ID,
    gitUsername: process.env.GIT_USERNAME,
    gitToken: process.env.GIT_TOKEN,
    gitCloneUrl: process.env.GIT_CLONE_URL,
});

faasServer.start().then(_ => {
    console.log('faas engine is ready');
});
