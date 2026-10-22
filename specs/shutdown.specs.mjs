import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {connect} from 'node:net';
import {EventEmitter} from 'node:events';
import {describe, it} from 'mocha';
import {accessLogMiddleware, gracefulShutdown, registerShutdownHandlers} from '../src/core.mjs';

const listening = (server) => new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const exitAfter = () => {
    let resolveExit;
    const exited = new Promise(resolve => {
        resolveExit = resolve;
    });
    return {exited, exit: (code) => resolveExit(code)};
};

describe('Graceful shutdown', function () {
    it('stops the server, stops scheduled jobs and exits 0', async function () {
        const server = createServer((_, res) => res.end('ok'));
        await listening(server);
        const {exited, exit} = exitAfter();
        let jobsStopped = false;
        const logs = [];
        gracefulShutdown({
            server,
            io: null,
            scheduler: {gracefulShutdown: async () => { jobsStopped = true; }},
            timeoutMs: 2000,
            exit,
            log: line => logs.push(line)
        });
        assert.equal(await exited, 0);
        assert.equal(jobsStopped, true);
        assert.equal(server.listening, false);
        assert.ok(logs.some(line => line.includes('stopped')));
    });

    it('closes through socket.io when it owns the server', async function () {
        const server = createServer();
        await listening(server);
        let closed = false;
        const io = {close: (done) => { closed = true; server.close(done); }};
        const {exited, exit} = exitAfter();
        gracefulShutdown({server, io, scheduler: null, timeoutMs: 2000, exit, log: () => {}});
        assert.equal(await exited, 0);
        assert.equal(closed, true);
    });

    it('exits 1 when a request is still running after the timeout', async function () {
        const server = createServer(() => {/* never answers */});
        await listening(server);
        const socket = connect(server.address().port, '127.0.0.1');
        await new Promise(resolve => socket.once('connect', resolve));
        socket.write('GET / HTTP/1.1\r\nHost: x\r\n\r\n');
        await new Promise(resolve => setTimeout(resolve, 50));
        const {exited, exit} = exitAfter();
        gracefulShutdown({server, io: null, scheduler: null, timeoutMs: 100, exit, log: () => {}});
        assert.equal(await exited, 1);
        socket.destroy();
        server.closeAllConnections();
    });
});

describe('Shutdown signals', function () {
    it('stops once on the first signal and exits at once on the second', function () {
        const proc = new EventEmitter();
        const exits = [];
        proc.exit = (code) => exits.push(code);
        const calls = [];
        registerShutdownHandlers({BFAST_SHUTDOWN_TIMEOUT_MS: '5000'}, proc, (options) => calls.push(options));
        proc.emit('SIGTERM');
        assert.equal(calls.length, 1);
        assert.equal(calls[0].timeoutMs, 5000);
        proc.emit('SIGINT');
        assert.equal(calls.length, 1);
        assert.deepEqual(exits, [1]);
    });

    it('falls back to 8000 ms for a missing or invalid timeout', function () {
        for (const value of [undefined, '', 'abc', '-5', '0']) {
            const proc = new EventEmitter();
            proc.exit = () => {};
            const calls = [];
            registerShutdownHandlers({BFAST_SHUTDOWN_TIMEOUT_MS: value}, proc, (options) => calls.push(options));
            proc.emit('SIGTERM');
            assert.equal(calls[0].timeoutMs, 8000);
        }
    });
});

describe('Access log switch', function () {
    it('is on by default and for known formats', function () {
        assert.equal(typeof accessLogMiddleware({}), 'function');
        assert.equal(typeof accessLogMiddleware({BFAST_ACCESS_LOG: 'combined'}), 'function');
        assert.equal(typeof accessLogMiddleware({BFAST_ACCESS_LOG: 'nonsense'}), 'function');
    });

    it('is off for off, false, 0, none and silent', function () {
        for (const value of ['off', 'OFF', 'false', '0', 'none', 'silent']) {
            assert.equal(accessLogMiddleware({BFAST_ACCESS_LOG: value}), null);
        }
    });
});
