const {exec} = require('child_process');
const {promisify} = require('util');

class ShellController {

    /**
     *
     * @param command - {string} command you want to execute
     * @param options - {
     *     {
     *         env: {[key: string]: any},
     *         cwd: string,
     *         timeout: number
     *     }
     * }
     * @return {Promise<string>}
     */
    async run(command, options) {
        const result = await promisify(exec)(command, {
                env: options.env,
                cwd: options.cwd,
                timeout: options.timeout
            }
        );
        return result.toString();
    }
}

module.exports = {
    ShellController: ShellController
}
