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

const bodyLimit = process.env.BFAST_BODY_LIMIT || '2mb';
// const allowedCorsOrigins = `${process.env.BFAST_CORS_ORIGINS ?? ''}`
//     .split(',')
//     .map(origin => origin.trim())
//     .filter(Boolean);
// const corsOptions = allowedCorsOrigins.length > 0
//     ? {
//         origin: (origin, callback) => {
//             if (!origin || allowedCorsOrigins.includes(origin)) {
//                 callback(null, true);
//                 return;
//             }
//             callback(new Error('CORS origin is not allowed'));
//         }
//     }
//     : {origin: false};

const _app = express();
_app.disable('x-powered-by');
_app.use((_, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
});
_app.use(cors());
_app.use(logger('dev'));
_app.use(express.json({
    limit: bodyLimit
}));
_app.use(express.urlencoded({
    extended: false,
    limit: bodyLimit,
    parameterLimit: 1000
}));
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

const normalizedOptionKeys = [
    'port',
    'gitCloneUrl',
    'mode',
    'functionsConfig',
    'gitToken',
    'gitUsername',
    'npmTar',
    'urlTar',
    'startScript'
];

const normalizeOptions = (options = defaultOptions) => {
    const input = (options && typeof options === 'object') ? options : {};
    const normalized = {};
    normalizedOptionKeys.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(input, key)) {
            normalized[key] = input[key];
        }
    });
    return {
        ...defaultOptions,
        ...normalized
    };
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
    const normalizedOptions = normalizeOptions(options);
    const v = validate(normalizedOptions, {
        type: 'object',
        properties: {
            port: {
                anyOf: [
                    {type: 'string', pattern: '^\\d{1,5}$'},
                    {type: 'number', minimum: 1, maximum: 65535}
                ]
            },
            mode: {
                enum: ['git', 'npm', 'url', 'local']
            }
        },
        required: ['port', 'mode']
    }, {required: true});

    if (v.valid === false) {
        throw new Error(`Options validation failed: ${v.errors.map(x => x.message).join(', ')}`);
    }

    console.log('Starting FaaS engine with the following options:', normalizedOptions);

    await _prepareFunctions(normalizedOptions);
    await serveStaticFiles(_app, normalizedOptions?.functionsConfig);
    await deployFunctions(_app, nodeSchedule, _io, normalizedOptions?.functionsConfig);
    return startFaasServer(faasServer, normalizedOptions);
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
                let gitCloneUrl;
                try {
                    const parsed = new URL(`${options?.gitCloneUrl}`.trim());
                    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                        throw new Error('Invalid protocol');
                    }
                    gitCloneUrl = parsed.toString();
                } catch (_) {
                    console.log("gitCloneUrl [ GIT_CLONE_URL ] must be a valid http(s) URL");
                    process.exit(1);
                }
                await cloneFunctionsFromGit(gitCloneUrl, options?.gitUsername, options?.gitToken);
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
        case "local":
            console.log("local mode requires FUNCTIONS_DIR_PATH (and optionally BFAST_JSON_PATH/ASSETS_PATH) when using src/start.mjs");
            process.exit(1);
            break;
        default:
            console.log("MODE must be one of: git, npm, url, local");
            process.exit(1);
            break;
    }
}
