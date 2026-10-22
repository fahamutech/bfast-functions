import assert from 'node:assert/strict';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, beforeEach, describe, it} from 'mocha';
import {dependencyInstallArgs} from '../src/controllers/index.mjs';

describe('Functions dependency install', function () {
    let folder;
    beforeEach(() => {
        folder = mkdtempSync(join(tmpdir(), 'bfast-install-'));
    });
    afterEach(() => {
        rmSync(folder, {recursive: true, force: true});
    });

    it('uses npm ci for production dependencies when the project has a lock file', function () {
        writeFileSync(join(folder, 'package-lock.json'), '{}');
        assert.deepStrictEqual(dependencyInstallArgs(folder), ['ci', '--omit=dev']);
    });

    it('treats npm-shrinkwrap.json as a lock file', function () {
        writeFileSync(join(folder, 'npm-shrinkwrap.json'), '{}');
        assert.deepStrictEqual(dependencyInstallArgs(folder), ['ci', '--omit=dev']);
    });

    it('falls back to npm install when the project has no lock file', function () {
        assert.deepStrictEqual(dependencyInstallArgs(folder), ['install', '--omit=dev']);
    });
});
