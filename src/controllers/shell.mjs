import {spawn} from "child_process";

const _stripWrappingQuotes = (value) => {
    if (value.length < 2) {
        return value;
    }
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
        return value.slice(1, -1);
    }
    return value;
};

const _tokenizeCommand = (command) => {
    const tokens = [];
    const matcher = /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'|\S+/g;
    let match = matcher.exec(command);
    while (match !== null) {
        tokens.push(_stripWrappingQuotes(match[0]));
        match = matcher.exec(command);
    }
    if (tokens.length === 0) {
        throw new Error('Command cannot be empty');
    }
    return {
        executable: tokens[0],
        args: tokens.slice(1)
    };
};

const _normalizeCommandInput = (input) => {
    if (typeof input === 'string') {
        return _tokenizeCommand(input.trim());
    }
    if (input && typeof input === 'object' && typeof input.command === 'string') {
        return {
            executable: input.command,
            args: Array.isArray(input.args) ? input.args.map(x => `${x}`) : []
        };
    }
    throw new Error('Invalid command input. Use a command string or {command, args}.');
};

/**
 * Executes a command and returns a promise that resolves when the command completes.
 * Commands are executed without a shell to reduce command-injection risk.
 *
 * @param {string | {command: string, args?: string[]}} command - The command to execute.
 * @param {object} options - Options for the process execution.
 * @param {object} options.env - Environment key-value pairs to add to the child process environment.
 * @param {string} options.cwd - The working directory for the command.
 * @param {number} options.timeout - The maximum time in milliseconds for the command to run.
 * @returns {Promise<{message: string}>} A promise that resolves with a success message if the command exits with code 0.
 * The promise is rejected with an Error if the command fails.
 * @throws {Error} Throws an error if the command fails to execute.
 */
export async function run(command, options) {
    return new Promise((resolve, reject) => {
        const normalized = _normalizeCommandInput(command);
        const childProcess = spawn(normalized.executable, normalized.args, {
            env: options?.env ? {...process.env, ...options?.env} : process.env,
            cwd: options?.cwd,
            shell: false
        });
        let timedOut = false;
        let timer = null;
        if (typeof options?.timeout === 'number' && options.timeout > 0) {
            timer = setTimeout(() => {
                timedOut = true;
                childProcess.kill('SIGTERM');
            }, options.timeout);
        }
        childProcess.stdout.pipe(process.stdout);
        childProcess.stderr.pipe(process.stderr);
        childProcess.on('error', (error) => {
            if (timer) clearTimeout(timer);
            reject(error);
        });
        childProcess.on('close', code => {
            if (timer) clearTimeout(timer);
            if (timedOut) {
                reject(new Error(`Command timed out after ${options.timeout}ms`));
                return;
            }
            if (code !== 0) {
                reject(new Error(`Command exited with code ${code}`));
                return;
            }
            resolve({message: 'run succeed'});
        });
    });
}
