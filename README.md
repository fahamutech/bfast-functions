# bfast-function

A lightweight serverless runtime for Node.js that loads function descriptors from files and exposes:
- HTTP routes (Express)
- Socket.IO events
- middleware guards
- scheduled jobs

Package: `bfast-function`  
Runtime: Node.js 18+

## Two Ways to Use This Project

### 1) Function Author Guide

Use this when writing/organizing your functions.

Start here:
- [Function spec](./docs/function-spec.md)
- [Static assets and built-in endpoints](./docs/static-assets-and-endpoints.md)

Minimal local example:

```js
// index.mjs
import { start } from 'bfast-function';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

await start({
  port: '3000',
  functionsConfig: {
    functionsDirPath: `${__dirname}/functions`,
    bfastJsonPath: `${__dirname}/bfast.json`
  }
});
```

```bash
node index.mjs
```

### 2) Runtime Operator Guide

Use this when running the engine in Docker/swarm/CI and pulling function bundles remotely.

Start here:
- [Runtime options](./docs/runtime-options.md)
- [Environment variables](./docs/environment-variables.md)
- [Docker](./docs/docker.md)
- [Security and operations](./docs/security-and-ops.md)
- [Validation scenarios](./docs/validation-scenarios.md)

## Quick Checks

After startup:

```bash
curl http://localhost:3000/functions-health
curl http://localhost:3000/functions-all
```

## API Surface (Code References)

- `start/stop` entry points: `src/core.mjs`
- env-driven starter: `src/start.mjs`
- descriptor loading rules: `src/controllers/resolver.mjs`
- route/event/job mounting: `src/controllers/index.mjs`
- option model docs: `src/models/options.mjs`

## Development

```bash
npm install
npm test
```

## License

MIT
