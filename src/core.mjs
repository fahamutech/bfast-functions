import express from "express";
import cookieParser from "cookie-parser";
import logger from "morgan";
import cors from "cors";
import nodeSchedule from "node-schedule";
import {createServer} from "node:http";
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

const ACCESS_LOG_OFF = ['off', 'false', '0', 'none', 'silent'];
const ACCESS_LOG_FORMATS = ['dev', 'combined', 'common', 'short', 'tiny'];

/**
 * The per-request access log (morgan). BFAST_ACCESS_LOG=off turns it off, for services
 * whose own code already logs every request; dev, combined, common, short or tiny pick
 * the format. Default: dev.
 * @param {object} env - The environment to read, process.env by default.
 * @returns {Function | null} The express middleware, or null when the access log is off.
 */
export function accessLogMiddleware(env = process.env) {
    const value = `${env.BFAST_ACCESS_LOG ?? 'dev'}`.trim().toLowerCase();
    if (ACCESS_LOG_OFF.includes(value)) {
        return null;
    }
    return logger(ACCESS_LOG_FORMATS.includes(value) ? value : 'dev');
}

const _app = express();
_app.disable('x-powered-by');
_app.use((_, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
});
_app.use(cors());
const _accessLog = accessLogMiddleware();
if (_accessLog) {
    _app.use(_accessLog);
}
_app.use(express.json({
    limit: bodyLimit,
    verify: (request, _, buffer) => {
        if (process.env.BFAST_RAW_BODY === 'true') {
            request.rawBody = buffer;
        }
    }
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
 * Stops the engine without cutting running requests: no new connections, running
 * requests and sockets get timeoutMs to finish, scheduled jobs stop, then the process
 * exits 0. When something is still open after timeoutMs the process exits 1.
 * Docker waits 10 s after SIGTERM by default, so the default timeout is 8 s.
 * @param {object} deps - What to stop; every part is replaceable in tests.
 * @param {object} deps.server - The HTTP server.
 * @param {object} deps.io - The socket.io server; closing it closes the HTTP server too.
 * @param {object} deps.scheduler - node-schedule.
 * @param {number} deps.timeoutMs - How long running work may take.
 * @param {Function} deps.exit - Ends the process.
 * @param {Function} deps.log - Writes a log line.
 * @returns {Promise<void>}
 */
export async function gracefulShutdown({
    server = faasServer,
    io = _io,
    scheduler = nodeSchedule,
    timeoutMs = 8000,
    exit = process.exit,
    log = console.log
} = {}) {
    log('FaaS engine stopping: no new requests, waiting for the running ones');
    const timer = setTimeout(() => {
        log(`FaaS engine still busy after ${timeoutMs}ms, exiting anyway`);
        exit(1);
    }, timeoutMs);
    try {
        await scheduler?.gracefulShutdown?.();
        await new Promise((resolve, reject) => {
            const done = (error) => error && error.code !== 'ERR_SERVER_NOT_RUNNING' ? reject(error) : resolve();
            if (io) {
                io.close(done);
            } else {
                server.close(done);
            }
        });
        clearTimeout(timer);
        log('FaaS engine stopped');
        exit(0);
    } catch (error) {
        clearTimeout(timer);
        log(`FaaS engine stop failed: ${error}`);
        exit(1);
    }
}

/**
 * Stops the engine gracefully on SIGTERM and SIGINT (a docker or swarm stop, a redeploy).
 * A second signal exits at once. BFAST_SHUTDOWN_TIMEOUT_MS sets how long running work
 * may take (default 8000).
 * @param {object} env - The environment to read, process.env by default.
 * @param {object} proc - The process to listen on, the real one by default.
 * @param {Function} shutdown - What runs on the first signal.
 */
export function registerShutdownHandlers(env = process.env, proc = process, shutdown = gracefulShutdown) {
    const configured = Number(env.BFAST_SHUTDOWN_TIMEOUT_MS);
    const timeoutMs = Number.isFinite(configured) && configured > 0 ? configured : 8000;
    let stopping = false;
    ['SIGTERM', 'SIGINT'].forEach((signal) => {
        proc.on(signal, () => {
            if (stopping) {
                proc.exit(1);
                return;
            }
            stopping = true;
            shutdown({timeoutMs, exit: (code) => proc.exit(code)});
        });
    });
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

    console.log('Starting FaaS engine with the following options:', {
        ...normalizedOptions,
        gitToken: normalizedOptions.gitToken ? '[redacted]' : null
    });

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
