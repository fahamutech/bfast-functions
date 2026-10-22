import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const secretsDirectory = '/run/secrets/';

/**
 * Replace application environment values that point at Docker secret files.
 *
 * Variables ending in _FILE intentionally keep their path so libraries and
 * application code that implement the conventional *_FILE contract continue
 * to work. Only files below /run/secrets are read; other absolute paths remain
 * normal configuration values.
 */
export function hydrateSecretEnvironment(environment = process.env, readFile = readFileSync) {
    for (const [name, value] of Object.entries(environment)) {
        if (name.endsWith('_FILE') || typeof value !== 'string' || !value.startsWith(secretsDirectory)) {
            continue;
        }

        const secretPath = resolve(value);
        if (!secretPath.startsWith(secretsDirectory) || secretPath === secretsDirectory.slice(0, -1)) {
            throw new Error(`Invalid Docker secret path configured for ${name}`);
        }

        try {
            environment[name] = readFile(secretPath, 'utf8');
        } catch (cause) {
            throw new Error(`Unable to load Docker secret for ${name} from ${secretPath}`, {cause});
        }
    }

    return environment;
}
