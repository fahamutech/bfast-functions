import {clone} from "isomorphic-git";
import fs from "fs";
import {dirname, join} from "path";
import {getFunctions} from "./resolver.mjs";
import express from "express";
import {run} from "./shell.mjs";
import {fileURLToPath} from "url";
import {createRequire} from 'module';
import gitHttp from  "isomorphic-git/http/node";

const require = createRequire(import.meta.url);
const functionsDir = '../function/myF';
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Deploys function endpoints from the user-provided functions.
 * This function extracts HTTP, event, guard, and job functions and mounts them accordingly.
 * @param {express.Application} expressApp - The Express application instance.
 * @param {object} nodeSchedule - The node-schedule instance for scheduling jobs.
 * @param {object} socketIo - The Socket.IO instance for handling real-time events.
 * @param {object} functionsConfig - Configuration for resolving functions, including the path to the functions directory.
 * @returns {Promise<void>} A promise that resolves when all functions are deployed.
 * @throws {Error} Throws an error if the functions object is not valid.
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
        throw new Error('functions must be an object.');
    }
}

/**
 * Clones functions from a remote Git repository.
 * @param {string} cloneUrl - The URL of the Git repository to clone.
 * @param {string} username - The username for authenticating with the private repository.
 * @param {string} token - The personal access token or password for the private repository.
 * @returns {Promise<void>} A promise that resolves when the repository is cloned.
 */
export async function cloneFunctionsFromGit(cloneUrl, username, token) {
    return clone({
        fs: fs,
        http: gitHttp,
        url: cloneUrl,
        dir: join(__dirname, functionsDir),
        depth: 1,
        noTags: true,
        singleBranch: true,
        onAuth: _ => ({
            username: username && token ? username : null,
            password: username && token ? token : null
        }),
    });
}

/**
 * Installs dependencies for the functions cloned from Git.
 * @returns {Promise<any>} A promise that resolves when the dependencies are installed.
 */
export async function installFunctionDependency() {
    return run('npm install --omit=dev', {
        cwd: join(__dirname, functionsDir),
    });
}

/**
 * Installs functions from a given npm package tarball.
 * @param {string} packageName - The name of the npm package to install.
 * @returns {Promise<void>} A promise that resolves when the functions are installed.
 */
export async function installFunctionsFromNpmTar(packageName) {
    const options = {
        cwd: join(__dirname, functionsDir),
    };
    await prepareFolder();
    console.log(`Packing and extracting npm package: ${packageName}`);
    await run(`npm pack ${packageName}`, options);
    await run('tar -xf ./**.tgz', options);
    await shakeFolder(options);
    await run('rm -r ./**.tgz', options);
}

/**
 * Installs functions from a remote tarball URL.
 * @param {string} url - The URL of the tarball to download and extract.
 * @returns {Promise<void>} A promise that resolves when the functions are installed.
 */
export async function installFunctionsFromRemoteTar(url) {
    const options = {
        cwd: join(__dirname, functionsDir),
    };
    await prepareFolder();
    console.log(`Downloading and extracting functions from: ${url}`);
    await run(`curl -o pack.tgz -L ${url}`, options);
    await run('tar -xf ./**.tgz', options);
    await shakeFolder(options);
    await run('rm -r ./**.tgz', options);
}

/**
 * Starts the FaaS server or a custom start script.
 * @param {object} faasServer - The HTTP server instance.
 * @param {Options} options - The FaaS engine options.
 * @returns {Promise<any>} A promise that resolves with the running server instance or the result of the custom script.
 */
export async function startFaasServer(faasServer, options) {
    if (
        options?.startScript
        && `${options?.startScript}`.trim() !== 'undefined'
        && `${options?.startScript}`.trim() !== 'null'
        && `${options?.startScript}`.trim().length > 0
    ) {
        const fsDir = options?.functionsConfig?.functionsDirPath ?? join(__dirname, functionsDir);
        console.log(`Executing custom start script: ${options.startScript}`);
        return run(`${options?.startScript}`, {
            cwd: fsDir,
        });
    } else {
        const port = options?.port ?? '3000';
        faasServer.listen(port);
        faasServer.on('listening', () => {
            console.log(`BFast::Cloud::Functions Engine Listening on ${port}`);
        });
        faasServer.on('close', () => {
            console.log('BFast::Cloud::Functions Engine Stop Listening');
        });
        return faasServer;
    }
}

/**
 * Extracts HTTP-triggered functions from the functions object.
 * @param {object} functions - The object containing all functions.
 * @returns {string[]} An array of function names that are HTTP-triggered.
 */
export function extractHttpFunctions(functions) {
    return Object.keys(functions).filter(x => {
        return (functions[x] && typeof functions[x] === "object"
            && functions[x]['onRequest'] !== null && functions[x]['onRequest'] !== undefined);
    });
}

/**
 * Extracts event-triggered functions from the functions object.
 * @param {object} functions - The object containing all functions.
 * @returns {string[]} An array of function names that are event-triggered.
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
 * Extracts guard functions from the functions object.
 * @param {object} functions - The object containing all functions.
 * @returns {string[]} An array of function names that are guards.
 */
export function extractGuards(functions) {
    return Object.keys(functions).filter(x => {
        return (functions[x] && typeof functions[x] === "object"
            && functions[x]['onGuard'] !== null && functions[x]['onGuard'] !== undefined);
    });
}

/**
 * Extracts scheduled job functions from the functions object.
 * @param {object} functions - The object containing all functions.
 * @returns {string[]} An array of function names that are scheduled jobs.
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
 * Mounts guard functions as middleware in the Express application.
 * @param {string[]} httpGuardFunctions - An array of guard function names.
 * @param {object} functions - The object containing all functions.
 * @param {express.Application} expressApp - The Express application instance.
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
 * Mounts scheduled jobs using node-schedule.
 * @param {string[]} jobFunctions - An array of job function names.
 * @param {object} functions - The object containing all functions.
 * @param {object} nodeSchedule - The node-schedule instance.
 */
export function mountJob(jobFunctions, functions, nodeSchedule) {
    jobFunctions.forEach(functionName => {
        nodeSchedule.scheduleJob(functions[functionName]['rule'], functions[functionName]['onJob']);
    });
}

/**
 * Mounts HTTP-triggered functions as routes in the Express application.
 * @param {string[]} httpRequestFunctions - An array of HTTP function names.
 * @param {object} functions - The object containing all functions.
 * @param {express.Application} expressApp - The Express application instance.
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
 * Mounts event-triggered functions as Socket.IO event handlers.
 * @param {string[]} eventRequestFunctions - An array of event function names.
 * @param {object} functions - The object containing all functions.
 * @param {object} socketIo - The Socket.IO instance.
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
 * Serves static files from the 'assets' directory.
 * @param {express.Express} expressApp - The Express application instance.
 * @param {{assets: string}} functionsConfig - Configuration object with the path to the assets directory.
 * @returns {Promise<void>}
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
 * Checks if the current directory is a BFast project by looking for 'bfast.json'.
 * @param {string} projectDir - The path to the project directory.
 * @returns {Promise<object>} A promise that resolves with the project credentials if valid.
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

/**
 * Prepares the functions directory by cleaning and recreating it.
 * @returns {Promise<void>}
 */
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

/**
 * Moves the contents of the 'package' directory to the root and removes the 'package' directory.
 * This is used after extracting a tarball that contains a 'package' directory.
 * @param {object} options - The options object containing the current working directory.
 * @returns {Promise<void>}
 */
export async function shakeFolder(options) {
    try {
        await run(`mv package/* .`, options);
        await run(`rm -r package`, options);
    } catch (e) {
        console.log(e.toString());
    }
}

