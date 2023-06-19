export class Options {
    /** port default is 3000
     * @type {string}
     */
    port
    /** clone url if you host function on github, bitbucket or gitlab
     * @type {string}
     */
    gitCloneUrl
    /** git username
     * @type {string}
     */
    gitUsername
    /** git token if repository is private
     * @type {string}
     */
    gitToken
    /** name if package in npm if mode is npm
     * @type {string}
     */
    npmTar
    /** url to retrieve tar from your server
     * @type {string}
     */
    urlTar
    /** mode of puling functions
     * @type {'git' | 'url' | 'npm'}
     */
    mode
    /** if functions folder is local supply this, if exist faas engine will not use a git clone url
     * @type {{
        functionsDirPath: string,
        assets: string,
        bfastJsonPath: string
    }}
     */
    functionsConfig
    /** script to run instead of spin functioins server
     * @type {string}
     */
    startScript
}
