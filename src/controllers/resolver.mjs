import {glob} from "glob";
import {dirname, join} from "path";
import {fileURLToPath} from "url";
import {createRequire} from 'module';

const require = createRequire(import.meta.url);

const __dirname = dirname(fileURLToPath(import.meta.url));

const functionDirToArray = x => Array.isArray(x) ? x : [x];

/**
 * get function from uploaded files. This function return an object which contain name of function as object property
 * and value of that property expected to be a function which accept Request (from express) and Response(from express)
 *  options to specify example-functions folder and bfast.json path to get configuration
 *  like files to ignore
 * @param options {{
        functionsDirPath: string,
        bfastJsonPath: string
    } | null | undefined}
 * @return Promise<{
 * [k:string]:{
 * path: string,
 * onRequest: Function,
 * method: string,
 * onGuard: Function,
 * onJob: Function,
 * onEvent: Function
 * }
 * }>
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
