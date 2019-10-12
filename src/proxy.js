const http = require('http');
const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const path = require('path');
const childProcess = require('child_process');
const git = require('isomorphic-git');
const httpProxy = require('express-http-proxy');
const fs = require('fs');

const app = express();
const username = process.env.GIT_USERNAME;
const token = process.env.GIT_TOKEN;
const cloneUrl = process.env.GIT_CLONE_URL;
const appId = process.env.APPLICATION_ID;
const projectId = process.env.PROJECT_ID;
let faaSForkEngine = undefined;

git.plugins.set('fs', fs);

app.use(cors());
app.use(logger('dev'));
app.use(express.json({
    limit: '2024mb'
}));
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());

function auth(request, response, next) {
    const applicationIdFromHeader = request.get('bfast-application-id');
    const applicationIdFromQueryParams = request.query.appId;
    if (appId && appId !== '' && appId === applicationIdFromHeader) {
        next();
    } else if (applicationIdFromQueryParams && applicationIdFromQueryParams === appId) {
        next();
    } else {
        response.status(401).json({message: 'Unauthorized request'});
    }
}

app.all('/deploy', (request, response, next) => auth(request, response, next), (request, response) => {
    cloneFunctionsFromGit().then(_ => {
        startFaaSEngine();
        response.json({message: 'functions deployed'});
    }).catch(reason => {
        console.log(reason.toString());
        response.status(401).json({message: 'functions not deployed'});
    });
});

app.all('/functions/:name', (request, response, next) => auth(request, response, next),
    httpProxy('http://localhost:3443', {limit: '2024mb'})
);

const startFaaSEngine = () => {
    const faasFork = childProcess.fork(`www`, [], {
        env: {
            APPLICATION_ID: appId,
            PROJECT_ID: projectId
        },
        cwd: path.join(__dirname)
    });
    faaSForkEngine = faasFork;
    faasFork.on('exit', (code, signal) => {
        console.log(`faas childProcess end with code: ${code} and signal: ${signal}`);
        faaSForkEngine = undefined;
    });
};

const cloneFunctionsFromGit = async () => {

    if (faaSForkEngine && !faaSForkEngine.killed) {
        process.kill(faaSForkEngine.pid, 'SIGTERM');
    }

    if (username && username !== '' && token && token !== '' && cloneUrl && cloneUrl !== '') {
        try {
            childProcess.execSync(`rm -r myF || echo 'continues...'`,
                {cwd: path.join(__dirname, './function/')});
            console.log('clear function folder');
            await git.clone({
                url: cloneUrl,
                dir: path.join(__dirname, './function/myF'),
                depth: 1,
                username: username,
                token: token
            });
            console.log('done cloning git repository');
            childProcess.execSync(`npm install`,
                {cwd: path.join(__dirname, './function/myF/')});
            console.log('done install npm package');
            return await Promise.resolve()
        } catch (e) {
            console.log(e);
            throw {message: e.toString()};
        }
    } else {
        throw {message: 'please provide clone url and token to fetch your functions'};
    }

};

const proxyServer = http.createServer(app);
proxyServer.listen('3000');
proxyServer.on('listening', async () => {
    console.log('proxy server start listening on port 3000');
    cloneFunctionsFromGit().then(_ => {
        startFaaSEngine();
    }).catch(reason => {
        console.log(reason);
    });
});

module.exports = proxyServer;
