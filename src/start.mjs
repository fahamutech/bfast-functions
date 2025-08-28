import {start} from "./index.mjs";

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
    port: ((process.env.PORT !== 'undefined') && (process.env.PORT !== 'null')) ? process.env.PORT : '3000',
    gitUsername: process.env.GIT_USERNAME,
    mode: process.env.MODE || 'git',
    npmTar: process.env.NPM_TAR,
    urlTar: process.env.URL_TAR,
    gitToken: process.env.GIT_TOKEN,
    gitCloneUrl: process.env.GIT_CLONE_URL,
    startScript: process.env.START_SCRIPT,
}).then(_ => {
    console.log('bfast-function initiated successfully');
}).catch(reason => {
    console.error('Failed to start bfast-function:', reason);
    process.exit(1);
});
