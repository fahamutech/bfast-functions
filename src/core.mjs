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
    installFunctionDependency, installFunctionsFromNpmTar, installFunctionsFromRemoteTar,
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

/**
 * stop a running faas engine
 * @return {Promise<void>}
 */
export async function stop() {
    faasServer.emit("close");
    process.exit(0);
}

/**
 * @param options {Options}
 @return Promise
 */
export async function start(
    options = {
        port: '3000', gitCloneUrl: null, mode: "git", functionsConfig: null,
        gitToken: null, gitUsername: null, npmTar: null, urlTar: null
    }
) {
    const v = validate(options, {
        type: 'object',
        properties: {
            port: {}
        },
        required: ['port']
    }, {required: true});
    if (v.valid === false){
        throw {message: 'options is invalid', reason: v.errors.map(x=>x.message).join(',')};
    }
    await _prepareFunctions(options);
    await serveStaticFiles(_app, options.functionsConfig);
    await deployFunctions(_app, nodeSchedule, _io, options.functionsConfig);
    return startFaasServer(faasServer, options.port);
}

/**
 *
 * @param options {Options}
 @return Promise
 */
async function _prepareFunctions(
    options = {
        port: 3000, gitCloneUrl: null, mode: "git", functionsConfig: null,
        gitToken: null, gitUsername: null, npmTar: null, urlTar: null
    }
) {
    if (options && options.functionsConfig && options.functionsConfig.functionsDirPath) {
        return;
    }
    if (options.mode === "git") {
        if (options.gitCloneUrl && options.gitCloneUrl.startsWith('http')) {
            await cloneFunctionsFromGit(options.gitCloneUrl, options.gitUsername, options.gitToken);
            await installFunctionDependency();
        } else {
            console.log("gitCloneUrl required");
            process.exit(1);
        }
    } else if (options.mode === "npm") {
        if (options.npmTar
            && options.npmTar.toString() !== ''
            && options.npmTar.toString() !== 'undefined'
            && options.npmTar.toString() !== 'null') {
            await installFunctionsFromNpmTar(options.npmTar);
        } else {
            console.log("npm package name required");
            process.exit(1);
        }
    } else if (options.mode === "url") {
        if (options.urlTar
            && options.urlTar.toString() !== ''
            && options.urlTar.toString() !== 'undefined'
            && options.urlTar.toString() !== 'null') {
            await installFunctionsFromRemoteTar(options.urlTar);
        } else {
            console.log("npm package name required");
            process.exit(1);
        }
    }
}
