const FaasProxy = require('./proxy');
const proxyServer = new FaasProxy({
    appId: process.env.APPLICATION_ID,
    projectId: process.env.PROJECT_ID,
    gitUsername: process.env.GIT_USERNAME,
    gitToken: process.env.GIT_TOKEN,
    gitCloneUrl: process.env.GIT_CLONE_URL,
    testMode: false,
    autoStartFaasEngine: true,
}).startProxyServer({port: '3000', autoInitializeClone: true});

module.exports = proxyServer;
