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
     * @param {string}  appId application id to authenticate request
     * @param {string} projectId project id from bfast cloud or any ( options )
     * @param {string} gitToken personal access token from github or bitbucket ( required if repository is private )
     * @param {string} gitCloneUrl functions git repository url
     * @param {string} gitUsername git repository username ( required if repository is private )
     * @param {boolean} autoStartFaasEngine either to start faas engine every time we deploy functions ( default to true )
     * @param {boolean} testMode if system is under test ( default is false )
     */
    constructor({appId, projectId, gitCloneUrl, gitUsername, gitToken, autoStartFaasEngine, testMode}) {
        this._options = {
            appId,
            projectId,
            gitCloneUrl,
            gitUsername,
            gitToken,
            autoStartFaasEngine,
            testMode
        };
        this._faaSForkEngine = undefined;

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
         * mount route endpoint for deploy functions
         * @private
         */
        this._deployRoute = (autoStartFaasEngine) => {
            app.all('/deploy', (request1, response1, next1) => this._auth(request1, response1, next1), (request, response) => {
                this._cloneFunctionsFromGit().then(_ => {
                    if (autoStartFaasEngine && autoStartFaasEngine === true) {
                        this._startFaaSEngine();
                    }
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
                httpProxy('http://localhost:3443', {limit: '2024mb'}),
            );
        };

        /**
         * clone functions from remote repository and deploy to faas engine, and restart faas engine
         * @returns {Promise<void>}
         * @private
         */
        // test case needed
        this._cloneFunctionsFromGit = async () => {
            this._stopFaasEngine();
            //
            // this._options.gitUsername && this._options.gitUsername !== '' &&
            // this._options.gitToken && this._options.gitToken !== '' &&
            //
            if (this._options.gitCloneUrl && this._options.gitCloneUrl !== '') {
                try {
                    childProcess.execSync(`rm -r myF || echo 'continues...'`,
                        {cwd: path.join(__dirname, './function/')});
                    console.log('clear function folder');
                    await git.clone({
                        url: this._options.gitCloneUrl,
                        dir: path.join(__dirname, './function/myF'),
                        depth: 1,
                        username: this._options.gitUsername && this._options.gitToken ? this._options.gitUsername : null,
                        token: this._options.gitUsername && this._options.gitToken ? this._options.gitToken : null
                    });
                    console.log('done cloning git repository');
                    if (this._options.testMode && this._options.testMode === true) {
                        console.log('skip install npm package');
                    } else {
                        childProcess.execSync(`npm install`, {cwd: path.join(__dirname, './function/myF/')});
                        console.log('done install npm package');
                    }
                    return await Promise.resolve()
                } catch (e) {
                    console.log(e);
                    throw {message: e.toString()};
                }
            } else {
                throw {message: 'please provide clone url and token to fetch your functions'};
            }
        };

        // mount routes
        this._deployRoute(this._options.autoStartFaasEngine | true);
        this._functionsRoute();
    };

    /**
     * Start faas proxy server for deploy and manage functions server
     * @param {string} port for faas proxy server listen
     * @param {boolean} autoInitializeClone flag for clone git remote repository
     * @returns {Server}
     */
    startProxyServer({port, autoInitializeClone}) {
        const proxyServer = http.createServer(app);
        proxyServer.listen(port);
        proxyServer.on('listening', async () => {
            console.log('proxy server start listening on port ' + port);
        });
        if (autoInitializeClone && autoInitializeClone === true) {
            this._cloneFunctionsFromGit().then(_ => {
                this._startFaaSEngine();
            }).catch(reason => {
                console.log(reason);
            });
        }
        return proxyServer;
    }

    /**
     * start faas engine to host user defined functions
     * @private
     */
    _startFaaSEngine() {
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
    }

    /**
     * stop faas engine which hold user defined functions
     * @private
     */
    _stopFaasEngine() {
        if (this._faaSForkEngine && !this._faaSForkEngine.killed) {
            process.kill(this._faaSForkEngine.pid, 'SIGTERM');
        }
    }

    /**
     * restart faas engine
     * @private
     */
    _restartFaasEngine() {
        this._stopFaasEngine();
        this._startFaaSEngine();
    }

}

module.exports = FaasProxy;
