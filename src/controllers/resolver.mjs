import {glob} from "glob";
import {dirname, join} from "path";
import {fileURLToPath} from "url";
import {createRequire} from 'module';

const require = createRequire(import.meta.url);

const __dirname = dirname(fileURLToPath(import.meta.url));

const functionDirToArray = x => Array.isArray(x) ? x : [x];

/**
 * Dynamically loads and resolves user-defined functions from the filesystem.
 * This function searches for function files (e.g., .js, .mjs, .cjs) in the specified directory,
 * imports them, and builds an object containing all the discovered functions.
 * It also provides default functions for health checks and listing all functions.
 *
 * @param {object} options - Configuration options for resolving functions.
 * @param {string | string[]} options.functionsDirPath - The path(s) to the directory containing the function files.
 * @param {string} options.bfastJsonPath - The path to the 'bfast.json' configuration file, which can specify files to ignore.
 * @returns {Promise<object>} A promise that resolves to an object containing all the loaded functions.
 * Each key in the object is a function name, and the value is the function module.
 */
export async function getFunctions(options) {
    if (!options) {
        options = {
            functionsDirPath: join(__dirname, '../function/myF/functions'),
            bfastJsonPath: join(__dirname, '../function/myF/bfast.json')
        }
    }
    let bfastConfig;
    try {
        bfastConfig = require(options?.bfastJsonPath);
    } catch (e) {
        console.log(e);
        console.warn('cant find bfast.json');
    }
    const files = await glob(
        functionDirToArray(options?.functionsDirPath).map(x => `${x}/**/*.{js,mjs,cjs}`),
        {
            absolute: true,
            ignore: Array.isArray(bfastConfig?.ignore) ?
                bfastConfig?.ignore :
                ['**/node_modules/**', '**/specs/**', '**/*.specs.js', '**/*.specs.mjs', '**/*.specs.cjs']
        }
    );
    const functions = {};
    for (const file of files) {
        let functionsFile;
        try {
            functionsFile = await import(file);
        } catch (e78788) {
            console.log(e78788);
            functionsFile = undefined;
        }
        if (functionsFile === undefined) {
            functionsFile = require(file);
        }
        const functionNames = Object.keys(functionsFile);
        for (const functionName of functionNames) {
            if (functionsFile[functionName] && typeof functionsFile[functionName] === "object") {
                functions[functionName] = functionsFile[functionName];
            }
        }
    }
    return {
        ...functions,
        _functions: {
            path: '/functions-all',
            onRequest: (_, response) => response.json(functions)
        },
        _health: {
            path: '/functions-health',
            onRequest: (_, response) => response.json({message: 'running'})
        }
    };
}
