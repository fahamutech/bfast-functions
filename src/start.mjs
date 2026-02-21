import {start} from "./index.mjs";
import dotenv from "dotenv";
import {isAbsolute, resolve} from "path";

dotenv.config();

const normalizeEnvValue = (value) => {
    if (value === undefined || value === null) {
        return undefined;
    }
    const normalized = `${value}`.trim();
    if (normalized === '' || normalized === 'undefined' || normalized === 'null') {
        return undefined;
    }
    return normalized;
};

const normalizePathValue = (value) => {
    const normalized = normalizeEnvValue(value);
    if (!normalized) {
        return undefined;
    }
    return isAbsolute(normalized) ? normalized : resolve(process.cwd(), normalized);
};

const mode = normalizeEnvValue(process.env.MODE) || 'git';
const functionsDirPath = normalizePathValue(process.env.FUNCTIONS_DIR_PATH);
const bfastJsonPath = normalizePathValue(process.env.BFAST_JSON_PATH);
const assets = normalizePathValue(process.env.ASSETS_PATH);
const functionsConfig = mode === 'local' && functionsDirPath
    ? {
        functionsDirPath,
        bfastJsonPath,
        assets
    }
    : undefined;

/**
 * This script starts the FaaS engine by reading configuration from environment variables.
 * This is the main entry point when running the FaaS engine from the command line or in a container.
 *
 * The following environment variables can be used for configuration:
 * - PORT: The port for the FaaS server to listen on. Defaults to 3000.
 * - GIT_USERNAME: The username for authenticating with a private Git repository.
 * - MODE: The deployment mode ('git', 'npm', 'url', or 'local'). Defaults to 'git'.
 * - NPM_TAR: The name of the npm package to install functions from (for 'npm' mode).
 * - URL_TAR: The URL to download a tarball of functions from (for 'url' mode).
 * - GIT_TOKEN: The personal access token or password for a private Git repository.
 * - GIT_CLONE_URL: The URL of the Git repository to clone functions from (for 'git' mode).
 * - START_SCRIPT: A custom script to run instead of the default server.
 */
start({
    port: normalizeEnvValue(process.env.PORT) || '3000',
    gitUsername: normalizeEnvValue(process.env.GIT_USERNAME),
    mode,
    npmTar: normalizeEnvValue(process.env.NPM_TAR),
    urlTar: normalizeEnvValue(process.env.URL_TAR),
    gitToken: normalizeEnvValue(process.env.GIT_TOKEN),
    gitCloneUrl: normalizeEnvValue(process.env.GIT_CLONE_URL),
    startScript: normalizeEnvValue(process.env.START_SCRIPT),
    functionsConfig,
}).then(_ => {
    console.log('INFO::bfast-function initiated successfully');
}).catch(reason => {
    console.error('ERROR::Failed to start bfast-function:', reason);
    process.exit(1);
});
