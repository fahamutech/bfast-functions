import assert from "assert";
import {dirname, join} from "path";
import {fileURLToPath} from "url";
import net from "net";
import {start} from "../src/core.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sampleFunctionsDir = join(__dirname, 'sample_functions');
const sampleBfastJson = join(sampleFunctionsDir, 'bfast.json');

const createBaseUrl = (addressInfo) => {
    return `http://127.0.0.1:${addressInfo.port}`;
};

const getFreePort = async () => {
    return new Promise((resolve, reject) => {
        const srv = net.createServer();
        srv.listen(0, '127.0.0.1', () => {
            const address = srv.address();
            if (!address || typeof address === 'string') {
                srv.close(() => reject(new Error('Unable to allocate free port')));
                return;
            }
            const selectedPort = address.port;
            srv.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(selectedPort);
            });
        });
        srv.on('error', reject);
    });
};

describe('FaaS start and discoverability journey', function () {
    this.timeout(10000);

    let server;
    let baseUrl;

    afterEach(async function () {
        if (server && typeof server.close === 'function') {
            if (typeof server.closeAllConnections === 'function') {
                server.closeAllConnections();
            }
            await new Promise((resolve) => server.close(resolve));
            server = undefined;
            baseUrl = undefined;
        }
    });

    it('should deploy sample functions and make them reachable', async function () {
        const port = await getFreePort();
        server = await start({
            port,
            mode: 'local',
            functionsConfig: {
                functionsDirPath: sampleFunctionsDir,
                bfastJsonPath: sampleBfastJson
            }
        });
        baseUrl = createBaseUrl(server.address());

        const health = await fetch(`${baseUrl}/functions-health`);
        assert.strictEqual(health.status, 200);
        assert.deepStrictEqual(await health.json(), {message: 'running'});

        const hi = await fetch(`${baseUrl}/hi`);
        assert.strictEqual(hi.status, 200);
        assert.strictEqual(await hi.text(), 'hello, mam!');

        const hiName = await fetch(`${baseUrl}/hi/codex`);
        assert.strictEqual(hiName.status, 200);
        assert.strictEqual(await hiName.text(), 'hello, codex!');
    });

    it('should expose discovery endpoint in json and html formats', async function () {
        const port = await getFreePort();
        server = await start({
            port,
            mode: 'local',
            functionsConfig: {
                functionsDirPath: sampleFunctionsDir,
                bfastJsonPath: sampleBfastJson
            }
        });
        baseUrl = createBaseUrl(server.address());

        const jsonDiscovery = await fetch(`${baseUrl}/functions-all?format=json`);
        assert.strictEqual(jsonDiscovery.status, 200);
        const jsonPayload = await jsonDiscovery.json();
        assert(jsonPayload.normalhttpPublic);
        assert.strictEqual(jsonPayload.normalhttpPublic.onRequest, undefined);

        const htmlDiscovery = await fetch(`${baseUrl}/functions-all`);
        assert.strictEqual(htmlDiscovery.status, 200);
        const html = await htmlDiscovery.text();
        assert(html.includes('Functions Documentation'));
        assert(html.includes('normalhttpPublic'));

        const forcedHtmlDiscovery = await fetch(`${baseUrl}/functions-all?format=html`, {
            headers: {
                accept: 'application/json'
            }
        });
        assert.strictEqual(forcedHtmlDiscovery.status, 200);
        assert((forcedHtmlDiscovery.headers.get('content-type') || '').includes('text/html'));
        const forcedHtml = await forcedHtmlDiscovery.text();
        assert(forcedHtml.includes('Functions Documentation'));
    });
});
