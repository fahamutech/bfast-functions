import {getFunctions} from "../src/index.mjs";
import assert from "assert";
import {dirname, join} from 'path';
import {fileURLToPath} from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sampleFunctionsDir = join(__dirname, 'sample_functions');
const sampleBfastJson = join(sampleFunctionsDir, 'bfast.json');

describe('Functions Generation', function () {
    it('should discover sample functions and include builtin routes', async function () {
        const functions = await getFunctions({
            functionsDirPath: sampleFunctionsDir,
            bfastJsonPath: sampleBfastJson,
        });
        assert(typeof functions === 'object');
        assert(Object.keys(functions).includes('normalhttpPublic'));
        assert(Object.keys(functions).includes('normalhttpPublicWithParams'));
        assert(Object.keys(functions).includes('_functions'));
        assert(Object.keys(functions).includes('_health'));
    });

    it('should sanitize function handlers in json discovery payload', async function () {
        const functions = await getFunctions({
            functionsDirPath: sampleFunctionsDir,
            bfastJsonPath: sampleBfastJson,
        });
        let payload;
        functions._functions.onRequest({query: {format: 'json'}, headers: {}}, {
            json: (body) => {
                payload = body;
                return body;
            }
        });
        assert(payload);
        assert(payload.normalhttpPublic);
        assert.strictEqual(payload.normalhttpPublic.onRequest, undefined);
        assert.strictEqual(payload.sampleSocket.onEvent, undefined);
    });

    it('should resolve relative local paths from process cwd', async function () {
        const functions = await getFunctions({
            functionsDirPath: 'specs/sample_functions',
            bfastJsonPath: 'specs/sample_functions/bfast.json',
        });
        assert(typeof functions === 'object');
        assert(Object.keys(functions).includes('normalhttpPublic'));
        assert(Object.keys(functions).includes('_health'));
    });
});
