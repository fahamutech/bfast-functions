const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const nodeSchedule = require('node-schedule');
const http = require('http');
const git = require('isomorphic-git');
const gitHttp = require("isomorphic-git/http/node");
const fs = require('fs');
const childProcess = require('child_process');
const path = require('path');
const {BfastFunctionsController} = require('./controller/BfastFunctionsController');

const _app = express();
_app.use(cors());
_app.use(logger('dev'));
_app.use(express.json({
    limit: '2024mb'
}));
_app.use(express.urlencoded({extended: false}));
_app.use(cookieParser());
const faasServer = http.createServer(_app);
const _io = require('socket.io')(faasServer);

class BfastFunctions {
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
     * @param functionsController {BfastFunctionsController}
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
            this._functionsController = new BfastFunctionsController();
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
     * @return {Promise<Server>}
     */
    async start() {
        if (this._gitCloneUrl && this._gitCloneUrl.startsWith('http')) {
            await this.cloneFunctionsFromGit();
            await this.installFunctionDependency();
        } else if (!this._functionsConfig) {
            console.log("functionConfig option is required or supply gitCloneUrl");
            process.exit(1);
        }
        await this.deployFunctions(_app, nodeSchedule, _io);
        return this.startFaasServer();
    }

    /**
     * deploy function endpoint from user defined example-functions
     * @param expressApp
     * @param nodeSchedule
     * @param socketIo
     * @returns {Promise<void>}
     */
    async deployFunctions(expressApp, nodeSchedule, socketIo) {
        const functions = await this._functionsController.getFunctions(this._functionsConfig);
        if (typeof functions === 'object') {
            const httpRequestFunctions = this.extractHttpFunctions(functions);
            const eventRequestFunctions = this.extractEventsFunctions(functions);
            const httpGuardFunctions = this.extractGuards(functions);
            const jobFunctions = this.extractJobs(functions);
            this.mountGuards(httpGuardFunctions, functions, expressApp);
            this.mountJob(jobFunctions, functions, nodeSchedule);
            this.mountHttpRoutes(httpRequestFunctions, functions, expressApp);
            this.mountEventRoutes(eventRequestFunctions, functions, socketIo);
            return Promise.resolve();
        } else {
            throw {message: 'example-functions must be an object'};
        }
    };

    /**
     * get function from a remote repository
     * @returns {Promise<void>}
     */
    async cloneFunctionsFromGit() {
        return git.clone({
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
    };

    /**
     * install dependencies from function installed by git
     * @return {Promise}
     */
    async installFunctionDependency() {
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
     */
    async startFaasServer() {
        faasServer.listen(this._port);
        faasServer.on('listening', () => {
            console.log('BFast::Cloud::Functions Engine Listening on ' + this._port);
        });
        faasServer.on('close', () => {
            console.log('BFast::Cloud::Functions Engine Stop Listening');
        });
        return faasServer;
    }

    /**
     * @param functions
     * @return {string[]}
     */
    extractHttpFunctions(functions) {
        return Object.keys(functions).filter(x => {
            return (functions[x] && typeof functions[x] === "object"
                && functions[x]['onRequest'] !== null && functions[x]['onRequest'] !== undefined);
        });
    }

    /**
     * @param functions
     * @return {string[]}
     */
    extractEventsFunctions(functions) {
        return Object.keys(functions).filter(x => {
            return (
                functions[x]
                && typeof functions[x] === "object"
                && functions[x]['onEvent'] !== null
                && functions[x]['onEvent'] !== undefined
                && functions[x]['name']
                && typeof functions[x]['name'] === "string"
            );
        });
    }

    /**
     *
     * @param functions
     * @return {string[]}
     */
    extractGuards(functions) {
        return Object.keys(functions).filter(x => {
            return (functions[x] && typeof functions[x] === "object"
                && functions[x]['onGuard'] !== null && functions[x]['onGuard'] !== undefined);
        });
    }

    /**
     *
     * @param functions
     * @return {string[]}
     */
    extractJobs(functions) {
        return Object.keys(functions).filter(x => {
            return (functions[x]
                && typeof functions[x] === "object"
                && functions[x]['onJob'] !== null
                && functions[x]['rule'] !== null
                && functions[x]['rule'] !== undefined
                && functions[x]['onJob'] !== undefined);
        });
    }

    /**
     *
     * @param httpGuardFunctions{string[]} extracted guards from functions
     * @param functions{object} your bfast::functions object
     * @param expressApp this is an instance of `express` npm package for mounting http functions
     */
    mountGuards(httpGuardFunctions, functions, expressApp) {
        httpGuardFunctions.forEach(functionName => {
            const path = (functions[functionName].path !== undefined
                && functions[functionName].path !== null
                && functions[functionName].path !== ''
                && functions[functionName].path.startsWith('/'))
                ? functions[functionName].path
                : '/';
            if (path === '/') {
                expressApp.use(functions[functionName].onGuard);
            } else {
                expressApp.use(path, functions[functionName].onGuard);
            }
        });
    }

    /**
     *
     * @param jobFunctions{string[]} extracted scheduled jobs functions
     * @param functions {object} bfast::functions object
     * @param nodeSchedule this is an instance of `node-schedule` npm package for schedule a job
     */
    mountJob(jobFunctions, functions, nodeSchedule) {
        jobFunctions.forEach(functionName => {
            nodeSchedule.scheduleJob(functions[functionName]['rule'], functions[functionName]['onJob']);
        });
    }

    /**
     *
     * @param httpRequestFunctions{string[]}
     * @param functions {object} bfast::functions object
     * @param expressApp this is an instance of `express` npm package for mounting http functions
     */
    mountHttpRoutes(httpRequestFunctions, functions, expressApp) {
        httpRequestFunctions.forEach(functionName => {
            const method = typeof functions[functionName].method === 'string'
                ? functions[functionName].method.toString().toLowerCase()
                : 'all';
            if (functions[functionName].path) {
                expressApp[method](functions[functionName].path, functions[functionName].onRequest);
            } else {
                expressApp[method](`/functions/${functionName}`, functions[functionName].onRequest);
            }
        });
    }

    /**
     *
     * @param eventRequestFunctions{string[]}
     * @param functions {object} bfast::functions object
     * @param socketIo this is an instance of `socket.io` npm package for mounting realtime event functions
     */
    mountEventRoutes(eventRequestFunctions, functions, socketIo) {
        eventRequestFunctions.forEach(functionName => {
            socketIo.of(functions[functionName].name).on('connection', socket => {
                socket.on(functions[functionName].name, (data) => {
                    functions[functionName].onEvent(
                        {auth: data.auth, body: data.body},
                        {
                            socket: socket,
                            emit: (responseData) => socket.emit(functions[functionName].name, {body: responseData})
                        }
                    );
                });
            });
        });
    }
}

module.exports = {
    BfastFunctions: BfastFunctions
};
