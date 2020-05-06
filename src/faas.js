const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const http = require('http');
const _app = express();
const git = require('isomorphic-git');
const gitHttp = require("isomorphic-git/http/node");
const fs = require('fs');
const childProcess = require('child_process');
const path = require('path');
const {FaaSController} = require('./controller/FaaSController');
_app.use(cors());
_app.use(logger('dev'));
_app.use(express.json({
    limit: '2024mb'
}));
_app.use(express.urlencoded({extended: false}));
_app.use(cookieParser());
const faasServer = http.createServer(_app);
const _io = require('socket.io')(faasServer);

class FaaS {
    /**
     *
     * @param port {string}
     * @param gitCloneUrl {string}
     * @param gitUsername {string}
     * @param gitToken {string}
     * @param appId {string}
     * @param projectId {string}
     * @param functionsConfig {{
        functionsDirPath: string,
        bfastJsonPath: string
    }}
     * @param functionsController {FaaSController}
     */
    constructor({
                    port,
                    gitCloneUrl,
                    gitUsername,
                    gitToken,
                    appId,
                    projectId,
                    functionsConfig,
                    functionsController
                }) {
        this._port = port;
        this._gitCloneUrl = gitCloneUrl;
        this._gitUsername = gitUsername;
        this._gitToken = gitToken;
        this._functionsConfig = functionsConfig;
        this._appId = appId;
        this._projectId = projectId;
        if (functionsController) {
            this._functionsController = functionsController;
        } else {
            this._functionsController = new FaaSController();
        }

        /**
         * middleware to authenticate incoming http requests against application id you provide
         * @param request node {XMLHttpRequest}
         * @param response node {HttpResponse}
         * @param next function to call next route
         * @private
         */
        this._auth = function (request, response, next) {
            next();
        };

        /**
         * deploy function endpoint from user defined functions
         * @returns {Promise<void>}
         * @private
         */
        this._deployFunctionsRouter = async () => {
            const functions = await this._functionsController.getFunctions(this._functionsConfig);
            if (typeof functions === 'object') {
                Object.keys(functions).forEach(functionName => {
                    if (functions[functionName] && typeof functions[functionName] === "object"
                        && functions[functionName].onRequest) {
                        if (functions[functionName].path) {
                            _app.use(
                                functions[functionName].path,
                                (req, res, next) => this._auth(req, res, next),
                                functions[functionName].onRequest);
                        } else {
                            _app.use(
                                `/functions/${functionName}`,
                                (req, res, next) => this._auth(req, res, next),
                                functions[functionName].onRequest);
                        }
                    }
                });
                _io.on('connection', (socket) => {
                    Object.keys(functions).forEach(functionName => {
                        if (functions[functionName] && typeof functions[functionName] === "object") {
                            if (functions[functionName].onEvent) {
                                if (functions[functionName].name) {
                                    socket.on(functions[functionName].name, (event) => {
                                        functions[functionName].onEvent({
                                            auth: event.auth,
                                            payload: event.payload,
                                            socket: socket
                                        });
                                    });
                                } else {
                                    socket.on(`functions-${functionName}`.name, (event) => {
                                        functions[functionName].onEvent({
                                            auth: event.auth,
                                            payload: event.payload,
                                            socket: socket
                                        });
                                    });
                                }
                            }
                        }
                    });
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
                fs: fs,
                http: gitHttp,
                url: this._gitCloneUrl,
                dir: path.join(__dirname, './function/myF'),
                depth: 1,
                onMessage: message => {
                    console.log(message);
                },
                noTags: true,
                singleBranch: true,
                onAuth: _ => {
                    return {
                        username: this._gitUsername && this._gitToken ? this._gitUsername : null,
                        password: this._gitUsername && this._gitToken ? this._gitToken : null
                    }
                },
            });
            console.log('functions cloned');
        };

        /**
         * install dependencies from function installed by git
         * @return {Promise}
         * @private
         */
        this._installFunctionDependency = async () => {
            return new Promise((resolve, reject) => {
                childProcess.exec(`npm install --production`, {
                    cwd: path.join(__dirname, './function/myF')
                }, (error, stdout, stderr) => {
                    if (error) {
                        console.log(stderr.toString());
                        reject(error);
                    }
                    console.log(stdout.toString());
                    resolve(stdout.toString());
                });
            });
        };

        /**
         * start node server for listening request
         * @private
         */
        this._startFaasServer = () => {
            faasServer.listen(this._port);
            faasServer.on('listening', () => {
                console.log('BFast::Functions Engine Listening on ' + this._port);
            });
        }

    }

    async start() {
        try {
            if (this._gitCloneUrl && this._gitCloneUrl.startsWith('http')) {
                await this._cloneFunctionsFromGit();
                await this._installFunctionDependency();
            } else if (!this._functionsConfig) {
                throw new Error("functionConfig option is required of supplied gitCloneUrl");
            }
            await this._deployFunctionsRouter();
            this._startFaasServer();
        } catch (e) {
            console.log(e);
            process.exit(1);
        }
    }
}

module.exports = {
    FaaS
};
