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
git.plugins.set('fs', fs);

const app = express();
app.use(cors());
app.use(logger('dev'));
app.use(express.json({
    limit: '2024mb'
}));
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());

class FaasProxy {

    /**
     * initialize proxy server and mount deploy route endpoint and functions endpoints
     * @param options is object = {
            appId: BFAST_CLOUD_APPLICATION_ID_OR_ANY_TO IDENTIFY_YOUR_APPLICATION,
            projectId: BFAST_PROJECT_ID_OR_ANY',
            gitCloneUrl: GIT_REMOTE_URL_FOR_CLONE_FUNCTIONS,
            gitUsername: GIT_USERNAME,
            gitToken: GIT_PERSONA_ACCESS_TOKEN
        }
     */
    constructor(options) {
        this._options = options;
        this._faaSForkEngine = undefined;

        // _initiateEnv({gitUsername, gitToken, gitCloneUrl, appId, projectId}) {
        //     process.env.GIT_USERNAME = gitUsername | process.env.GIT_USERNAME;
        //     process.env.GIT_TOKEN = gitToken | process.env.GIT_TOKEN;
        //     process.env.GIT_CLONE_URL = gitCloneUrl | process.env.GIT_CLONE_URL;
        //     process.env.APPLICATION_ID = appId | process.env.APPLICATION_ID;
        //     process.env.PROJECT_ID = projectId | process.env.PROJECT_ID;
        // }

        /**
         * middleware to authenticate incoming http requests against application id you provide
         * @param request node {XMLHttpRequest}
         * @param response node {HttpResponse}
         * @param next function to call next route
         * @private
         */
        this._auth = function (request, response, next) {
            const applicationIdFromHeader = request.get('bfast-application-id');
            const applicationIdFromQueryParams = request.query.appId;
            if (this._options.appId && this._options.appId !== '' && this._options.appId === applicationIdFromHeader) {
                next();
            } else if (applicationIdFromQueryParams && applicationIdFromQueryParams === this._options.appId) {
                next();
            } else {
                this._unauthorizedResponse(response)
            }
        };

        /**
         * response when application id not match
         * @param response node {HttpResponse}
         * @private
         */
        this._unauthorizedResponse = function (response) {
            response.status(401).json({message: 'Unauthorized request'});
        };

        /**
         * mount route endpoints for deploy functions
         * @private
         */
        this._deployRoute = function () {
            app.all('/deploy', (request1, response1, next1) => this._auth(request1, response1, next1), (request, response) => {
                this._cloneFunctionsFromGit().then(_ => {
                    this._startFaaSEngine();
                    response.json({message: 'functions deployed'});
                }).catch(reason => {
                    console.log(reason);
                    response.status('403').json({message: 'Fails to deploy functions'});
                });
            });
        };

        /**
         * mount route endpoint for functions endpoints
         * @private
         */
        this._functionsRoute = function () {
            app.all('/functions/:name', (request, response, next) => this._auth(request, response, next),
                httpProxy('http://localhost:3443', {limit: '2024mb'})
            );
        };

        /**
         * clone functions from remote repository and deploy to faas engine, and restart faas engine
         * @returns {Promise<void>}
         * @private
         */
        // test case needed
        this._cloneFunctionsFromGit = async function () {
            if (this._faaSForkEngine && !this._faaSForkEngine.killed) {
                process.kill(this._faaSForkEngine.pid, 'SIGTERM');
            }
            if (this._options.gitUsername && this._options.gitUsername !== '' &&
                this._options.gitToken && this._options.gitToken !== '' &&
                this._options.gitCloneUrl && this._options.gitCloneUrl !== '') {
                try {
                    childProcess.execSync(`rm -r myF || echo 'continues...'`,
                        {cwd: path.join(__dirname, './function/')});
                    console.log('clear function folder');
                    await git.clone({
                        url: this._options.gitCloneUrl,
                        dir: path.join(__dirname, './function/myF'),
                        depth: 1,
                        username: this._options.gitUsername,
                        token: this._options.gitToken
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
        };

        /**
         * start faas engine to host user defined functions
         * @private
         */
        this._startFaaSEngine = function () {
            const faasFork = childProcess.fork(`faas`, [], {
                env: {
                    APPLICATION_ID: this._options.appId,
                    PROJECT_ID: this._options.projectId
                },
                cwd: path.join(__dirname)
            });
            this._faaSForkEngine = faasFork;
            faasFork.on('exit', (code, signal) => {
                console.log(`faas child process end with code: ${code} and signal: ${signal}`);
                this._faaSForkEngine = undefined;
            });
        };

        // this._initiateEnv(this._options);
        this._deployRoute();
        this._functionsRoute();
    };

    /**
     * Start faas proxy server for deploy and manage functions server
     * @param {String} port for faas proxy server listen
     * @param {boolean} autoInitializeClone flag for clone git remote repository
     * @returns {Server}
     */
    startProxyServer({port, autoInitializeClone}) {
        const proxyServer = http.createServer(app);
        proxyServer.listen(port);
        proxyServer.on('listening', async () => {
            console.log('proxy server start listening on port ' + port);
            if (autoInitializeClone && autoInitializeClone === true) {
                this._cloneFunctionsFromGit().then(_ => {
                    this._startFaaSEngine();
                }).catch(reason => {
                    console.log(reason);
                });
            }
        });
        return proxyServer;
    }
}

module.exports = FaasProxy;
