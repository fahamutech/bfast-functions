const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const nodeSchedule = require('node-schedule');
const http = require('http');
const {BfastFunctionsController} = require("./controllers/bfast-functions.controller");
const {ShellController} = require("./controllers/shell.controller");
const {FunctionsResolverController} = require('./controllers/functions-resolver.controller');

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
     * @param mode {'git' | 'url' | 'npm' } a git username, default is 'git'
     * @param gitToken {string} personal access token ( if a git repository is private )
     * @param npmTar - {string} npm package name, to download functions in .tgz format which are already packed for running,
     *                  you must set mode='npm'
     * @param urlTar - {string} full http url, to download functions in .tgz format which are already packed for running
     *                  you must set mode='url'
     * @param functionsConfig {{
        functionsDirPath: string,
        bfastJsonPath: string
    }} if functions folder is local supply this, if exist faas engine will not use a git clone url
     * @param controllers {
     *     {
     *         functionsResolverController: FunctionsResolverController,
     *         shellController: ShellController,
     *         bfastFunctionsController: BfastFunctionsController
     *     }
     * }
     */
    constructor(
        {
            port,
            gitCloneUrl,
            gitUsername,
            gitToken,
            npmTar,
            urlTar,
            mode,
            functionsConfig,
            controllers,
        } = {
            port: 3000,
            gitCloneUrl: null,
            mode: "git",
            functionsConfig: null,
            gitToken: null,
            gitUsername: null,
            npmTar: null,
            urlTar: null,
            controllers: {
                functionsResolverController: new FunctionsResolverController(),
                shellController: new ShellController(),
                bfastFunctionsController: new BfastFunctionsController()
            }
        }
    ) {

        this._port = port ? port : '3000';
        this._gitCloneUrl = gitCloneUrl;
        this._gitUsername = gitUsername;
        this._gitToken = gitToken;
        this._functionsConfig = functionsConfig;
        this._controllers = controllers;
        this._npmTar = npmTar;
        this._urlTar = urlTar;
        this._mode = mode ? mode : 'git';

        if (this._controllers && this._controllers.functionsResolverController) {
            this._functionsResolverController = this._controllers.functionsResolverController;
        } else {
            this._functionsResolverController = new FunctionsResolverController();
        }

        if (this._controllers && this._controllers.shellController) {
            this._shellController = this._controllers.shellController;
        } else {
            this._shellController = new ShellController();
        }

        if (this._controllers && this._controllers.bfastFunctionsController) {
            this._bfastFunctionsController = this._controllers.bfastFunctionsController;
        } else {
            this._bfastFunctionsController = new BfastFunctionsController(
                {
                    shellController: this._shellController,
                    functionResolver: this._functionsResolverController
                }
            );
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
        await this._prepareFunctions();
        await this._bfastFunctionsController.deployFunctions(_app, nodeSchedule, _io, this._functionsConfig);
        return this._bfastFunctionsController.startFaasServer(faasServer, this._port);
    }

    async _prepareFunctions() {
        if (this._functionsConfig) {
            return;
        }
        if (this._mode === "git") {
            if (this._gitCloneUrl && this._gitCloneUrl.startsWith('http')) {
                await this._bfastFunctionsController
                    .cloneFunctionsFromGit(this._gitCloneUrl, this._gitUsername, this._gitToken);
                await this._bfastFunctionsController.installFunctionDependency();
                this._bfastFunctionsController.serveStaticFiles(_app);
            } else {
                console.log("gitCloneUrl required");
                process.exit(1);
            }
        } else if (this._mode === "npm") {
            if (this._npmTar
                && this._npmTar.toString() !== ''
                && this._npmTar.toString() !== 'undefined'
                && this._npmTar.toString() !== 'null') {
                await this._bfastFunctionsController.installFunctionsFromNpmTar(this._npmTar);
            } else {
                console.log("npm package name required");
                process.exit(1);
            }
        } else if (this._mode === "url") {
            if (this._urlTar
                && this._urlTar.toString() !== ''
                && this._urlTar.toString() !== 'undefined'
                && this._urlTar.toString() !== 'null') {
                await this._bfastFunctionsController.installFunctionsFromRemoteTar(this._urlTar);
            } else {
                console.log("npm package name required");
                process.exit(1);
            }
        }
    }
}

module.exports = {
    BfastFunctions: BfastFunctions
};
