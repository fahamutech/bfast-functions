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
     * @param port {string} http server to listen to
     * @param gitCloneUrl {string} a remote git repository
     * @param gitUsername {string} a git username
     * @param gitToken {string} personal access token ( if a git repository is private )
     * @param appId {string} bfast::cloud application id
     * @param projectId {string} bfast::cloud projectId
     * @param functionsConfig {{
        functionsDirPath: string,
        bfastJsonPath: string
    }} if functions folder is local supply this, if exist faas engine will not use a git clone url
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
         * deploy function endpoint from user defined example-functions
         * @returns {Promise<void>}
         * @private
         */
        this._deployFunctions = async () => {
            const functions = await this._functionsController.getFunctions(this._functionsConfig);
            if (typeof functions === 'object') {
                const httpRequestFunctions = Object.keys(functions).filter(x => {
                    return (functions[x] && typeof functions[x] === "object"
                        && functions[x]['onRequest'] !== null && functions[x]['onRequest'] !== undefined);
                });
                const eventRequestFunctions = Object.keys(functions).filter(x => {
                    return (
                        functions[x]
                        && typeof functions[x] === "object"
                        && functions[x]['onEvent'] !== null
                        && functions[x]['onEvent'] !== undefined
                        && functions[x]['name']
                        && typeof functions[x]['name'] === "string"
                    );
                });
                const httpGuardFunctions = Object.keys(functions).filter(x => {
                    return (functions[x] && typeof functions[x] === "object"
                        && functions[x]['onGuard'] !== null && functions[x]['onGuard'] !== undefined);
                });
                httpGuardFunctions.forEach(functionName => {
                    const path = (functions[functionName].path !== undefined
                        && functions[functionName].path !== null
                        && functions[functionName].path !== ''
                        && functions[functionName].path.startsWith('/'))
                        ? functions[functionName].path
                        : '/';
                    _app.use(path, functions[functionName].onGuard);
                });
                httpRequestFunctions.forEach(functionName => {
                    const method = typeof functions[functionName].method === 'string'
                        ? functions[functionName].method.toString().toLowerCase()
                        : 'use';
                    if (functions[functionName].path) {
                        _app[method](functions[functionName].path, functions[functionName].onRequest);
                    } else {
                        _app[method](`/functions/${functionName}`, functions[functionName].onRequest);
                    }
                });
                eventRequestFunctions.forEach(functionName => {
                    _io.of(functions[functionName].name).on('connection', socket => {
                        socket.on(functions[functionName].name, (event) => {
                            functions[functionName].onEvent({
                                auth: event.auth,
                                payload: event.payload,
                                socket: socket,
                                //   io: _io,
                            });
                        });
                    });
                });
                return Promise.resolve();
            } else {
                throw {message: 'example-functions must be an object'};
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
            console.log('example-functions cloned');
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
                console.log('BFast::Cloud::Functions Engine Listening on ' + this._port);
            });
            faasServer.on('close', () => {
                console.log('BFast::Cloud::Functions Engine Stop Listening');
            });
            return faasServer;
        }

    }

    /**
     * stop a running faas engine
     * @return {Promise<void>}
     */
    async stop() {
        faasServer.emit("close");
        process.exit(0);
    }

    /**
     *
     * @return {Promise<Server>}
     */
    async start() {
        if (this._gitCloneUrl && this._gitCloneUrl.startsWith('http')) {
            await this._cloneFunctionsFromGit();
            await this._installFunctionDependency();
        } else if (!this._functionsConfig) {
            console.log("functionConfig option is required or supply gitCloneUrl");
            process.exit(1);
        }
        await this._deployFunctions();
        this._startFaasServer();
    }
}

module.exports = {
    FaaS
};
