export class Options {
    /**
     * The port number for the FaaS server to listen on.
     * @type {string}
     * @default 3000
     */
    port;

    /**
     * The URL to clone a Git repository containing the functions.
     * This is used when the 'mode' is set to 'git'.
     * Supports GitHub, GitLab, Bitbucket, etc.
     * @type {string}
     * @example 'https://github.com/your-username/your-functions-repo.git'
     */
    gitCloneUrl;

    /**
     * The username for authenticating with the Git repository if it's private.
     * @type {string}
     */
    gitUsername;

    /**
     * The personal access token or password for authenticating with the Git repository if it's private.
     * @type {string}
     */
    gitToken;

    /**
     * The name of the npm package containing the functions.
     * This is used when the 'mode' is set to 'npm'.
     * The package should be a tarball (.tgz).
     * @type {string}
     * @example 'my-functions-package'
     */
    npmTar;

    /**
     * The URL to download a tarball (.tgz) containing the functions.
     * This is used when the 'mode' is set to 'url'.
     * @type {string}
     * @example 'https://example.com/my-functions.tgz'
     */
    urlTar;

    /**
     * The mode for pulling/loading the functions. This determines which source to use.
     * - 'git': Clones a Git repository using 'gitCloneUrl'.
     * - 'url': Downloads a tarball from a URL using 'urlTar'.
     * - 'npm': Downloads a package from an npm registry using 'npmTar'.
     * - 'local': Uses a local directory specified by 'functionsConfig'.
     * @type {'git' | 'url' | 'npm' | 'local'}
     */
    mode;

    /**
     * Configuration for using functions from a local directory.
     * If this is provided, the FaaS engine will use the local functions
     * instead of cloning from a remote source (git, url, or npm).
     * @type {{
     *   functionsDirPath: string,
     *   assets: string,
     *   bfastJsonPath: string
     * }}
     * @property {string} functionsDirPath - The absolute path to the directory containing the function files.
     * @property {string} assets - The absolute path to the directory for static assets.
     * @property {string} bfastJsonPath - The absolute path to the 'bfast.json' configuration file.
     */
    functionsConfig;

    /**
     * A custom start script to execute instead of the default behavior of spinning up the functions server.
     * This can be used to run a custom server or perform other initialization tasks.
     * @type {string}
     * @example 'node my-custom-server.js'
     */
    startScript;
}
