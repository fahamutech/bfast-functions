import {exec} from "child_process";

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
 * @return {Promise<*>}
 */
export async function run(command, options) {
    return new Promise((resolve, reject) => {
        const childProcess = exec(
            command, {env: options?.env, cwd: options?.cwd, timeout: options?.timeout}
        );
        childProcess.stdout.pipe(process.stdout);
        childProcess.stderr.pipe(process.stderr);
        childProcess.on('exit', code => {
            if (code !== 0) {
                reject(code);
            } else {
                resolve({message: 'run succeed'});
            }
        });
    });
}
