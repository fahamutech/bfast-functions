import {start} from "./index.mjs";

start({
    port: ((process.env.PORT !== 'undefined') && (process.env.PORT !== 'null')) ? process.env.PORT : '3000',
    gitUsername: process.env.GIT_USERNAME,
    mode: process.env.MODE ? process.env.MODE : 'git',
    npmTar: process.env.NPM_TAR,
    urlTar: process.env.URL_TAR,
    gitToken: process.env.GIT_TOKEN,
    gitCloneUrl: process.env.GIT_CLONE_URL,
    startScript: process.env.START_SCRIPT,
}).then(_ => {
    console.log('bfast-function initiated');
}).catch(reason => {
    console.log(reason, 'INFO: Error');
    throw reason;
});
