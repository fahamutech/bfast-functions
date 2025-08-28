import express from "express";
import cookieParser from "cookie-parser";
import logger from "morgan";
import cors from "cors";
import nodeSchedule from "node-schedule";
import {createServer} from "http";
import {Server} from 'socket.io';
import {
    cloneFunctionsFromGit,
    deployFunctions,
    installFunctionDependency,
    installFunctionsFromNpmTar,
    installFunctionsFromRemoteTar,
    serveStaticFiles,
    startFaasServer
} from "./controllers/index.mjs";
import {Options} from './models/options.mjs'
import {validate} from "jsonschema";

const _app = express();
_app.use(cors());
_app.use(logger('dev'));
_app.use(express.json({
    limit: '2024mb'
}));
_app.use(express.urlencoded({extended: false}));
_app.use(cookieParser());

const faasServer = createServer(_app);
const _io = new Server(faasServer);

const defaultOptions = {
    port: '3000',
    gitCloneUrl: null,
    mode: "git",
    functionsConfig: null,
    gitToken: null,
    gitUsername: null,
    npmTar: null,
    urlTar: null
};

/**
 * Stops the running FaaS engine gracefully.
 * This function emits a "close" event to the server, allowing existing connections to terminate before exiting the process.
 * @returns {Promise<void>} A promise that resolves when the server is stopped.
 */
export async function stop() {
    try {
        faasServer?.emit("close");
        console.log('FaaS server stopped gracefully.');
    } catch (e) {
        console.error('Error while stopping the FaaS server:', e);
    }
    process.exit(0);
}

/**
 * Starts the FaaS engine with the specified options.
 * This function initializes the express server, prepares the functions based on the deployment mode,
 * serves static files, deploys the functions, and starts the FaaS server.
 * @param {Options | object} options - The configuration options for the FaaS engine. See {@link Options} for details.
 * @returns {Promise<any>} A promise that resolves with the running server instance.
 * @throws {Error} Throws an error if the provided options are invalid.
 */
export async function start(options = defaultOptions) {
    const v = validate(options, {
        type: 'object',
        properties: {
            port: {}
        },
        required: ['port']
    }, {required: true});

    if (v.valid === false) {
        throw new Error(`Options validation failed: ${v.errors.map(x => x.message).join(', ')}`);
    }

    console.log('Starting FaaS engine with the following options:', options);

    await _prepareFunctions(options);
    await serveStaticFiles(_app, options?.functionsConfig);
    await deployFunctions(_app, nodeSchedule, _io, options?.functionsConfig);
    return startFaasServer(faasServer, options);
}

/**
 * Prepares the functions for deployment based on the specified mode in the options.
 * This function handles cloning from Git, downloading from a URL or npm, or using local functions.
 * @param {Options | object} options - The configuration options for the FaaS engine.
 * @returns {Promise<void>}
 * @private
 */
async function _prepareFunctions(options = defaultOptions) {
    // If a local functions directory is specified, use it directly.
    if (options?.functionsConfig?.functionsDirPath) {
        console.log(`Using local functions from: ${options.functionsConfig.functionsDirPath}`);
        return;
    }
    switch (options?.mode) {
        case "git":
            if (`${options?.gitCloneUrl}`?.startsWith('http')) {
                await cloneFunctionsFromGit(options?.gitCloneUrl, options?.gitUsername, options?.gitToken);
                console.log('project cloned from remote git');
                await installFunctionDependency();
            } else {
                console.log("gitCloneUrl [ GIT_CLONE_URL ] required");
                process.exit(1);
            }
            break;
        case "npm":
            if (options?.npmTar
                && options?.npmTar?.toString() !== ''
                && options?.npmTar?.toString() !== 'undefined'
                && options?.npmTar?.toString() !== 'null') {
                await installFunctionsFromNpmTar(options?.npmTar);
            } else {
                console.log("npm package name [ NPM_TAR ] required");
                process.exit(1);
            }
            break;
        case "url":
            if (options?.urlTar
                && options?.urlTar?.toString() !== ''
                && options?.urlTar?.toString() !== 'undefined'
                && options?.urlTar?.toString() !== 'null') {
                await installFunctionsFromRemoteTar(options?.urlTar);
            } else {
                console.log("package url [ URL_TAR ] required");
                process.exit(1);
            }
            break;
        default:
            console.log("gitCloneUrl [ GIT_CLONE_URL ] required");
            process.exit(1);
            break;
    }
}
