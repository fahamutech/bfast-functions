import {exec} from "child_process";

/**
 * Executes a shell command and returns a promise that resolves when the command completes.
 * This function pipes the standard output and standard error of the child process to the main process.
 *
 * @param {string} command - The shell command to execute.
 * @param {object} options - Options for the `exec` command.
 * @param {object} options.env - Environment key-value pairs to add to the child process environment.
 * @param {string} options.cwd - The working directory for the command.
 * @param {number} options.timeout - The maximum time in milliseconds for the command to run.
 * @returns {Promise<{message: string}>} A promise that resolves with a success message if the command exits with code 0.
 * The promise is rejected with the exit code if the command fails.
 * @throws {Error} Throws an error if the command fails to execute.
 *
 * @security **Important:** This function executes shell commands directly. To prevent command injection
 * vulnerabilities, ensure that any user-provided input is properly sanitized before being passed to this function.
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
