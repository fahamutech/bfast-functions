import assert from 'node:assert/strict';
import {describe, it} from 'mocha';
import {hydrateSecretEnvironment} from '../src/environment.mjs';

describe('Docker secret environment hydration', function () {
    it('loads /run/secrets paths into ordinary environment variables', function () {
        const environment = {
            DATABASE_PASSWORD: '/run/secrets/database-password',
            API_KEY: '/run/secrets/api-key'
        };
        const reads = [];

        hydrateSecretEnvironment(environment, (path, encoding) => {
            reads.push({path, encoding});
            return path.endsWith('database-password') ? 'password with spaces\n' : 'api-key-value';
        });

        assert.deepStrictEqual(environment, {
            DATABASE_PASSWORD: 'password with spaces\n',
            API_KEY: 'api-key-value'
        });
        assert.deepStrictEqual(reads, [
            {path: '/run/secrets/database-password', encoding: 'utf8'},
            {path: '/run/secrets/api-key', encoding: 'utf8'}
        ]);
    });

    it('keeps _FILE variables and non-secret paths unchanged', function () {
        const environment = {
            DATABASE_PASSWORD_FILE: '/run/secrets/database-password',
            FUNCTIONS_DIR_PATH: '/functions/source',
            URL: 'https://example.com/path',
            EMPTY: ''
        };

        hydrateSecretEnvironment(environment, () => {
            throw new Error('No file should be read');
        });

        assert.deepStrictEqual(environment, {
            DATABASE_PASSWORD_FILE: '/run/secrets/database-password',
            FUNCTIONS_DIR_PATH: '/functions/source',
            URL: 'https://example.com/path',
            EMPTY: ''
        });
    });

    it('rejects traversal outside /run/secrets', function () {
        assert.throws(
            () => hydrateSecretEnvironment({TOKEN: '/run/secrets/../host-token'}, () => 'value'),
            /Invalid Docker secret path configured for TOKEN/
        );
    });

    it('fails startup without exposing a secret value when a file cannot be read', function () {
        const sourceError = new Error('ENOENT');
        assert.throws(
            () => hydrateSecretEnvironment(
                {TOKEN: '/run/secrets/missing-token'},
                () => { throw sourceError; }
            ),
            error => error.message ===
                'Unable to load Docker secret for TOKEN from /run/secrets/missing-token' &&
                error.cause === sourceError
        );
    });
});
