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

git.plugins.set('fs', fs);

app.use(cors());
app.use(logger('dev'));
app.use(express.json({
    limit: '2024mb'
}));
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());

class FaasProxy {
    constructor(options) {
        this.options = options;
        this._faaSForkEngine = undefined;
        // this._initiateEnv(this.options);
        this._deployRoute();
        this._functionsRoute();
    };

    // _initiateEnv({gitUsername, gitToken, gitCloneUrl, appId, projectId}) {
    //     process.env.GIT_USERNAME = gitUsername | process.env.GIT_USERNAME;
    //     process.env.GIT_TOKEN = gitToken | process.env.GIT_TOKEN;
    //     process.env.GIT_CLONE_URL = gitCloneUrl | process.env.GIT_CLONE_URL;
    //     process.env.APPLICATION_ID = appId | process.env.APPLICATION_ID;
    //     process.env.PROJECT_ID = projectId | process.env.PROJECT_ID;
    // }

    _auth(request, response, next) {
        const applicationIdFromHeader = request.get('bfast-application-id');
        const applicationIdFromQueryParams = request.query.appId;
        if (this.options.appId && this.options.appId !== '' && this.options.appId === applicationIdFromHeader) {
            next();
        } else if (applicationIdFromQueryParams && applicationIdFromQueryParams === this.options.appId) {
            next();
        } else {
            this._unauthorizedResponse(response)
        }
    }

    _unauthorizedResponse(response) {
        response.status(401).json({message: 'Unauthorized request'});
    }

    _deployRoute() {
        app.all('/deploy', (request, response, next) => this._auth(request, response, next), (request, response) => {
            this._cloneFunctionsFromGit().then(_ => {
                this._startFaaSEngine();
                response.json({message: 'functions deployed'});
            }).catch(reason => {
                console.log(reason.toString());
                this._unauthorizedResponse(response)
            });
        });
    }

    _functionsRoute() {
        app.all('/functions/:name', (request, response, next) => this._auth(request, response, next),
            httpProxy('http://localhost:3443', {limit: '2024mb'})
        );
    }

    async _cloneFunctionsFromGit() {
        if (this._faaSForkEngine && !this._faaSForkEngine.killed) {
            process.kill(this._faaSForkEngine.pid, 'SIGTERM');
        }
        if (this.options.gitUsername && this.options.gitUsername !== '' &&
            this.options.gitToken && this.options.gitToken !== '' &&
            this.options.gitCloneUrl && this.options.gitCloneUrl !== '') {
            try {
                childProcess.execSync(`rm -r myF || echo 'continues...'`,
                    {cwd: path.join(__dirname, './function/')});
                console.log('clear function folder');
                await git.clone({
                    url: this.options.gitCloneUrl,
                    dir: path.join(__dirname, './function/myF'),
                    depth: 1,
                    username: this.options.gitUsername,
                    token: this.options.gitCloneUrl
                });
                console.log('done cloning git repository');
                childProcess.execSync(`npm install`, {cwd: path.join(__dirname, './function/myF/')});
                console.log('done install npm package');
                return await Promise.resolve()
            } catch (e) {
                console.log(e);
                throw {message: e.toString()};
            }
        } else {
            throw {message: 'please provide clone url and token to fetch your functions'};
        }
    }

    _startFaaSEngine() {
        const faasFork = childProcess.fork(`faas`, [], {
            env: {
                APPLICATION_ID: this.options.appId,
                PROJECT_ID: this.options.projectId
            },
            cwd: path.join(__dirname)
        });
        this._faaSForkEngine = faasFork;
        faasFork.on('exit', (code, signal) => {
            console.log(`faas child process end with code: ${code} and signal: ${signal}`);
            this._faaSForkEngine = undefined;
        });
    };

    startProxyServer() {
        const proxyServer = http.createServer(app);
        proxyServer.listen('3000');
        proxyServer.on('listening', async () => {
            console.log('proxy server start listening on port 3000');
            this._cloneFunctionsFromGit().then(_ => {
                this._startFaaSEngine();
            }).catch(reason => {
                console.log(reason);
            });
        });
        return proxyServer;
    }
}

module.exports = FaasProxy;
