import {clone} from "isomorphic-git";
import gitHttp from "isomorphic-git/http/node/index.cjs";
import fs from "fs";
import {dirname, join} from "path";
import {getFunctions} from "./resolver.mjs";
import express from "express";
import {run} from "./shell.mjs";
import {fileURLToPath} from "url";
import {createRequire} from 'module';

const require = createRequire(import.meta.url);
const functionsDir = '../function/myF';
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * deploy function endpoint from user
 * @param expressApp
 * @param nodeSchedule
 * @param socketIo
 * @param functionsConfig - {object} functions resolver configs
 * @returns {Promise<void>}
 */
export async function deployFunctions(expressApp, nodeSchedule, socketIo, functionsConfig = null) {
    const functions = await getFunctions(functionsConfig);
    if (typeof functions === 'object') {
        const httpRequestFunctions = extractHttpFunctions(functions);
        const eventRequestFunctions = extractEventsFunctions(functions);
        const httpGuardFunctions = extractGuards(functions);
        const jobFunctions = extractJobs(functions);
        mountGuards(httpGuardFunctions, functions, expressApp);
        mountJob(jobFunctions, functions, nodeSchedule);
        mountHttpRoutes(httpRequestFunctions, functions, expressApp);
        mountEventRoutes(eventRequestFunctions, functions, socketIo);
        return Promise.resolve();
    } else {
        throw {message: 'example-functions must be an object'};
    }
}

/**
 * get function from a remote repository
 * @returns {Promise<void>}
 */
export async function cloneFunctionsFromGit(cloneUrl, username, token) {
    return clone({
        fs: fs,
        http: gitHttp,
        url: cloneUrl,
        dir: join(__dirname, functionsDir),
        depth: 1,
        // onMessage: message => {
        //     console.log(message);
        // },
        noTags: true,
        singleBranch: true,
        onAuth: _ => {
            return {
                username: username && token ? username : null,
                password: username && token ? token : null
            }
        },
    });
}

/**
 * install dependencies from function installed by git
 * @return {Promise}
 */
export async function installFunctionDependency() {
    return run(`npm install --omit=dev `, {
        cwd: join(__dirname, functionsDir),
    });
}

/**
 * download a tar from npm which include functions and their dependencies.
 * @param packageName - {string} package name to fetch tar file.
 * @return {Promise<void>}
 */
export async function installFunctionsFromNpmTar(packageName) {
    const options = {
        cwd: join(__dirname, functionsDir),
    };
    await prepareFolder();
    console.log(`-------${packageName}--------`);
    await run(`npm pack ${packageName}`, options);
    await run(`tar -xf ./**.tgz`, options);
    await shakeFolder(options);
    await run(`rm -r ./**.tgz`, options);
}

/**
 * download a tar file which include functions and their dependencies
 * @return {Promise<void>}
 * @experiment
 */
export async function installFunctionsFromRemoteTar(url) {
    const options = {
        cwd: join(__dirname, functionsDir),
    };
    await prepareFolder();
    await run(`curl -o pack.tgz -L ${url}`, options);
    await run(`tar -xf ./**.tgz`, options);
    await shakeFolder(options);
    await run(`rm -r ./**.tgz`, options);
}

/**
 * start node server for listening request
 */
export async function startFaasServer(faasServer, options) {
    if (
        options?.startScript
        && `${options?.startScript}`.trim() !== 'undefined'
        && `${options?.startScript}`.trim() !== 'null'
        && `${options?.startScript}`.trim().length > 0
    ) {
        const fsDir = options?.functionsConfig?.functionsDirPath ?? join(__dirname, functionsDir);
        return run(`${options?.startScript}`, {
            cwd: fsDir,
        });
    } else {
        faasServer.listen(options?.port ?? '3000');
        faasServer.on('listening', () => {
            console.log('BFast::Cloud::Functions Engine Listening on ' +options?.port);
        });
        faasServer.on('close', () => {
            console.log('BFast::Cloud::Functions Engine Stop Listening');
        });
        return faasServer;
    }
}

/**
 * @param functions
 * @return {string[]}
 */
export function extractHttpFunctions(functions) {
    return Object.keys(functions).filter(x => {
        return (functions[x] && typeof functions[x] === "object"
            && functions[x]['onRequest'] !== null && functions[x]['onRequest'] !== undefined);
    });
}

/**
 * @param functions
 * @return {string[]}
 */
export function extractEventsFunctions(functions) {
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
export function extractGuards(functions) {
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
export function extractJobs(functions) {
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
export function mountGuards(httpGuardFunctions, functions, expressApp) {
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
export function mountJob(jobFunctions, functions, nodeSchedule) {
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
export function mountHttpRoutes(httpRequestFunctions, functions, expressApp) {
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
export function mountEventRoutes(eventRequestFunctions, functions, socketIo) {
    eventRequestFunctions.forEach(functionName => {
        socketIo.of(functions[functionName].name).on('connection', socket => {
            socket.on(functions[functionName].name, (data) => {
                functions[functionName].onEvent(
                    {auth: data.auth, body: data.body},
                    {
                        socket: socket,
                        engine: socketIo,
                        topic: (topicName) => {
                            return {
                                announce: (responseData) => socketIo.of(functions[functionName].name).in(topicName).emit(functions[functionName].name, {body: responseData}),
                                join: () => socket.join(topicName),
                                broadcast: (responseData) => socket.to(topicName).emit(functions[functionName].name, {body: responseData})
                            }
                        },
                        emit: (responseData) => socket.emit(functions[functionName].name, {body: responseData}),
                        broadcast: (responseData) => socket.broadcast.emit(functions[functionName].name, {body: responseData}),
                        announce: (responseData) => socketIo.of(functions[functionName].name).emit(functions[functionName].name, {body: responseData}),
                        emitTo: (socketId, responseData) => socketIo.to(socketId).emit(functions[functionName].name, {body: responseData})
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
export async function serveStaticFiles(expressApp, functionsConfig = undefined) {
    try {
        if (functionsConfig && functionsConfig?.assets) {
            expressApp.use('/assets', express.static(join(functionsConfig?.assets)));
        } else {
            await _checkIsBFastProjectFolder(process.cwd());
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
export async function _checkIsBFastProjectFolder(projectDir) {
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

export async function prepareFolder() {
    try {
        await run(`rm -r ${functionsDir}/*`, {
            cwd: __dirname
        });
    } catch (e) {
        console.log(e.toString());
    }
    try {
        await run(`mkdir ${functionsDir}`, {
            cwd: __dirname
        });
    } catch (e) {
        console.log(e.toString());
    }
}

export async function shakeFolder(options) {
    try {
        await run(`mv package/* .`, options);
        await run(`rm -r package`, options);
    } catch (e) {
        console.log(e.toString());
    }
}

