export class Options {
    /**
     * @type {string}
     */
    port
    /**
     * @type {string}
     */
    gitCloneUrl
    /**
     * @type {string}
     */
    gitUsername
    /**
     * @type {string}
     */
    gitToken
    /**
     * @type {string}
     */
    npmTar
    /**
     * @type {string}
     */
    urlTar
    /**
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
}
