const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const http = require('http');
const _app = express();
const git = require('isomorphic-git');
const fs = require('fs');
const childProcess = require('child_process');
git.plugins.set('fs', fs);
const path = require('path');
const FaasController = require('./controller/FaaSController');
const faasController = new FaasController();
_app.use(cors());
_app.use(logger('dev'));
_app.use(express.json({
    limit: '2024mb'
}));
_app.use(express.urlencoded({extended: false}));
_app.use(cookieParser());

class FaaS {
    /**
     *
     * @param port {string}
     * @param gitCloneUrl {string}
     * @param gitUsername {string}
     * @param gitToken {string}
     * @param appId {string}
     * @param projectId {string}
     * @param functionsController {FaaSController}
     */
    constructor({port, gitCloneUrl, gitUsername, gitToken, appId, projectId, functionsController}) {
        this._port = port;
        this._gitCloneUrl = gitCloneUrl;
        this._gitUsername = gitUsername;
        this._gitToken = gitToken;
        this._appId = appId;
        this._projectId = projectId;
        if (functionsController) this._functionsController = functionsController;
        else this._functionsController = faasController;

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
            request.headers['x-bfast-app-id'] = this._appId;
            request.headers['x-bfast-project-id'] = this._projectId;
            if (this._appId && this._appId !== '' && this._appId === applicationIdFromHeader) {
                next();
            } else if (applicationIdFromQueryParams && applicationIdFromQueryParams === this._appId) {
                next();
            } else {
                response.status(401).json({message: 'Unauthorized request'});
            }
        };

        /**
         * deploy endpoints for getting functions names.
         * @private
         */
        this._deployNamesRouter = () => {
            _app.use(
                '/names',
                (req, res, next) => this._auth(req, res, next),
                (request, response) => {
                    this._functionsController.getNames().then(names => {
                        response.json(names);
                    }).catch(reason => {
                        response.status(404).json(reason);
                    });
                });
        };

        /**
         * deploy function endpoint from user defined functions
         * @returns {Promise<void>}
         * @private
         */
        this._deployFunctionsRouter = async () => {
            const functions = await this._functionsController.getFunctions();
            if (typeof functions === 'object') {
                Object.keys(functions).forEach(functionName => {
                    if (functions[functionName] && typeof functions[functionName] === "object"
                        && functions[functionName].onRequest) {
                        _app.use(
                            `/functions/${functionName}`,
                            (req, res, next) => this._auth(req, res, next),
                            functions[functionName].onRequest);
                    }
                });
                return Promise.resolve();
            } else {
                throw {message: 'functions must be an object'};
            }
        };

        /**
         * get function from a remote repository
         * @returns {Promise<void>}
         * @private
         */
        this._cloneFunctionsFromGit = async () => {
            await git.clone({
                url: this._gitCloneUrl,
                dir: path.join(__dirname, './function/myF'),
                depth: 1,
                username: this._gitUsername && this._gitToken ? this._gitUsername : null,
                token: this._gitUsername && this._gitToken ? this._gitToken : null
            });
            console.log('done cloning functions');
            this._installFunctionDependency();
        };

        this._installFunctionDependency = () => {
            const results = childProcess.execSync(`npm ci --only=production`, {
                cwd: path.join(__dirname, './function/myF')
            });
            console.log(results.toString());
        };

        /**
         * start node server for listening request
         * @private
         */
        this._startFaasServer = () => {
            const faasServer = http.createServer(_app);
            faasServer.listen(this._port);
            faasServer.on('listening', () => {
                console.log('FaaS Engine Listening on ' + this._port);
            });
        }

    }

    async start() {
        try {
            await this._cloneFunctionsFromGit();
            await this._deployNamesRouter();
            await this._deployFunctionsRouter();
            this._startFaasServer();
        } catch (e) {
            console.log(e);
            process.exit(1);
        }
    }
}

module.exports = FaaS;
