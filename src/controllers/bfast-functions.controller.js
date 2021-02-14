const git = require('isomorphic-git');
const gitHttp = require("isomorphic-git/http/node");
const fs = require('fs');
const {join} = require('path');
const {FunctionsResolverController} = require('./functions-resolver.controller');
const {ShellController} = require('./shell.controller');
const express = require('express')

class BfastFunctionsController {

    /**
     *
     * @param functionResolver - {FunctionsResolverController} functions resolver controller
     * @param shellController - {ShellController} shell executor controller
     */
    constructor({functionResolver, shellController} = {
        shellController: new ShellController(),
        functionResolver: new FunctionsResolverController()
    }) {
        this.functionResolver = functionResolver;
        this.shellController = shellController;
        this.functionsDir = '../function/myF';
    }

    /**
     * deploy function endpoint from user
     * @param expressApp
     * @param nodeSchedule
     * @param socketIo
     * @param functionsConfig - {object} functions resolver configs
     * @returns {Promise<void>}
     */
    async deployFunctions(expressApp, nodeSchedule, socketIo, functionsConfig = null) {
        const functions = await this.functionResolver.getFunctions(functionsConfig);
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
     * @deprecated will be removed from 2.x
     */
    async cloneFunctionsFromGit(cloneUrl, username, token) {
        return git.clone({
            fs: fs,
            http: gitHttp,
            url: cloneUrl,
            dir: join(__dirname, this.functionsDir),
            depth: 1,
            onMessage: message => {
                console.log(message);
            },
            noTags: true,
            singleBranch: true,
            onAuth: _ => {
                return {
                    username: username && token ? username : null,
                    password: username && token ? token : null
                }
            },
        });
    };

    /**
     * install dependencies from function installed by git
     * @return {Promise}
     * @deprecated will be removed from 2.x
     */
    async installFunctionDependency() {
        return this.shellController.run(`npm install --production`, {
            cwd: join(__dirname, this.functionsDir),
        });
    };

    /**
     * download a tar from npm which include functions and their dependencies.
     * @param packageName - {string} package name to fetch tar file.
     * @return {Promise<void>}
     */
    async installFunctionsFromNpmTar(packageName) {
        const options = {
            cwd: join(__dirname, this.functionsDir),
        };
        await this.prepareFolder();
        await this.shellController.run(`npm pack ${packageName}`, options);
        await this.shellController.run(`tar -xf ./**.tgz`, options);
        await this.shakeFolder(options);
        await this.shellController.run(`rm -r ./**.tgz`, options);
    }

    /**
     * download a tar file which include functions and their dependencies
     * @return {Promise<void>}
     */
    async installFunctionsFromRemoteTar(url) {
        const options = {
            cwd: join(__dirname, this.functionsDir),
        };
        await this.prepareFolder();
        await this.shellController.run(`curl -O -L ${url}`, options);
        await this.shellController.run(`tar -xf ./**.tgz`, options);
        await this.shakeFolder(options);
        await this.shellController.run(`rm -r ./**.tgz`, options);
    }

    /**
     * start node server for listening request
     */
    async startFaasServer(faasServer, port) {
        faasServer.listen(port);
        faasServer.on('listening', () => {
            console.log('BFast::Cloud::Functions Engine Listening on ' + port);
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
                            engine: socketIo,
                            emit: (responseData) => socket.emit(functions[functionName].name, {body: responseData}),
                            broadcast: (responseData) => socketIo.of(functions[functionName].name).emit(functions[functionName].name, {body: responseData}),
                        }
                    );
                });
            });
        });
    }

    /**
     *
     * @param expressApp
     * @param functionsConfig {{assets: string}}
     * @return {Promise<void>}
     */
    async serveStaticFiles(expressApp, functionsConfig= undefined) {
        try {
            if (functionsConfig && functionsConfig.assets){
                expressApp.use('/assets', express.static(join(functionsConfig.assets)));
            }else {
                await this._checkIsBFastProjectFolder(process.cwd());
                expressApp.use('/assets', express.static(join(process.cwd(), "assets")));
            }
        } catch (_) {
            expressApp.use('/assets', express.static(join(process.cwd(), "src", "function", "myF", "assets")));
        }
    }

    /**
     * Get bfast credentials of a current project
     * @param projectDir {String} path of a bfast functions working directory where <code>bfast</code> command run
     * @returns {Promise<{projectId}>}. Promise rejected when <code>bfast.json</code> is no found.
     * @private
     */
    async _checkIsBFastProjectFolder(projectDir) {
        return new Promise((resolve, reject) => {
            try {
                const projectCredential = require(`${projectDir}/bfast.json`);
                if (projectCredential && projectCredential.ignore) {
                    resolve(projectCredential);
                } else {
                    reject('projectId can not be determined, ' +
                        'check if your current directory is bfast project and bfast.json file exist');
                }
            } catch (e) {
                reject('Not in bfast project folder');
            }
        });
    }

    async prepareFolder() {
        try {
            await this.shellController.run(`rm -r ${this.functionsDir}/*`, {
                cwd: __dirname
            });
        } catch (e) {
            console.log(e.toString());
        }
        try {
            await this.shellController.run(`mkdir ${this.functionsDir}`, {
                cwd: __dirname
            });
        } catch (e) {
            console.log(e.toString());
        }
    }

    async shakeFolder(options) {
        try {
            await this.shellController.run(`mv package/* .`, options);
            await this.shellController.run(`rm -r package`, options);
        } catch (e) {
            console.log(e.toString());
        }
    }
}

module.exports = {
    BfastFunctionsController: BfastFunctionsController
};
