import {exec} from "child_process";
import {promisify} from "util";

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
export async function run(command, options) {
    const result = await promisify(exec)(command, {
            env: options.env,
            cwd: options.cwd,
            timeout: options.timeout
        }
    );
    return result.toString();
}
