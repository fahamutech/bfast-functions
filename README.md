# bfast-function

A lightweight serverless functions engine for Node.js built on Express and Socket.IO.

Run HTTP routes, real‑time Socket.IO events, global/route guards (middleware), and scheduled jobs — all defined as plain JavaScript modules. Use it locally with a folder of functions, or deploy by pulling functions from Git, an npm tarball, or a remote URL. Ships with static assets serving, health and discovery endpoints, and a simple programmatic API.

- npm: https://www.npmjs.com/package/bfast-function
- License: MIT
- Runtime: Node.js 18+

---

## Features

- HTTP functions (Express handler shape)
- Socket.IO event functions (per‑namespace handlers)
- Guards (Express middleware) at `/` or a specific path
- Scheduled jobs (cron‑like with `node-schedule`)
- Static assets served at `/assets`
- Function auto‑discovery from one or more folders
- Multiple deployment modes: `local`, `git`, `npm`, `url`
- Health `GET /functions-health` and discovery `GET /functions-all`
- Optional custom `startScript` to run any process instead of the built‑in server

---

## Quick start

Install bfast tools cli and create a starter project

```bash
npm i -g bfast-tools
bfast fs create <name-of-project> #Example : bfast fs create my-bfast-project
```

Create your functions (CommonJS or ESM). Each exported value is a descriptor object.

Example: `functions/example.js`

```js
// CommonJS
module.exports.hello = {
  // Optional: defaults to /functions/hello
  path: '/hello',
  // Optional: defaults to Express "all" method
  method: 'get',
  // Standard Express handler
  onRequest: (req, res) => {
    res.status(200).send('Hello, World!');
  }
}

module.exports.guardAll = {
  // Mount at root as a global middleware
  path: '/',
  onGuard: (req, res, next) => {
    // your auth/logging/etc
    return next();
  }
}

module.exports.sampleEvent = {
  // Socket.IO namespace AND event name
  name: '/echo',
  onEvent: (request, response) => {
    // request = { auth, body }
    response.emit({echoed: request.body});
  }
}

module.exports.sampleJob = {
  // node-schedule rule (runs every minute)
  rule: '* * * * *',
  onJob: () => {
    console.log('job tick:', new Date().toISOString());
  }
}
```

Start a server (ESM):

```js
// index.mjs
import { start } from 'bfast-function';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

await start({
  port: '3000',
  functionsConfig: {
    // You can pass one folder or an array of folders
    functionsDirPath: `${__dirname}/functions`,
    // Optional: location of bfast.json (see “Configuration”)
    bfastJsonPath: `${__dirname}/bfast.json`,
    // Optional: custom path where static files live
    // assets: `${__dirname}/assets`
  }
});
```

Run it:

```bash
node index.mjs
```

Now:
- HTTP: `GET http://localhost:3000/hello` → "Hello, World!"
- Health: `GET http://localhost:3000/functions-health`
- Discovery: `GET http://localhost:3000/functions-all`
- Static: `GET http://localhost:3000/assets/...` (if you placed files there)

---

### Starter template (GitHub)

Use this ready‑to‑go example repo to bootstrap a simple bfast project:

Repo: https://github.com/joshuamshana/BFastFunctionExample

Option A — Local development (clone + run your own entry file)

```bash
# 1) Clone the template
 git clone https://github.com/joshuamshana/BFastFunctionExample.git
 cd BFastFunctionExample
 npm i
```

If the template does not include an entry script, create `index.mjs`:

```js
import { start } from 'bfast-function';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
await start({
  port: '3000',
  functionsConfig: {
    functionsDirPath: `${__dirname}/functions`,
    // optional: bfastJsonPath: `${__dirname}/bfast.json`
    // optional: assets: `${__dirname}/assets`
  }
});
```

Run it and try endpoints:

```bash
node index.mjs
curl http://localhost:3000/functions-health
curl http://localhost:3000/functions-all
# If the template provides an HTTP export named `hello` with no explicit `path`:
curl http://localhost:3000/functions/hello
```

Option B — No code: run in Git mode pointing at the template

```bash
PORT=3000 MODE=git \
GIT_CLONE_URL=https://github.com/joshuamshana/BFastFunctionExample.git \
node node_modules/bfast-function/src/start.mjs

# Then test
curl http://localhost:3000/functions-health
curl http://localhost:3000/functions-all
```

## Authoring functions

Functions are discovered by scanning the folder(s) you pass in `functionsDirPath` for `*.js, *.mjs, *.cjs` (recursively). Each export must be an object with one of the following shapes.

### HTTP function

```js
export const myApi = {
  // Optional: defaults to /functions/myApi
  path: '/api',
  // Optional: one of: get|post|put|patch|delete|all (default "all")
  method: 'post',
  // Express signature
  onRequest: (req, res) => {
    res.json({ok: true});
  }
}
```

Notes:
- If `path` is omitted, the route becomes `/functions/<exportName>`.
- `method` is lower‑cased internally and defaults to `all` (Express’ `app.all`).

### Guard (middleware)

```js
export const secure = {
  // "/" mounts globally, any other path mounts at that prefix
  path: '/',
  onGuard: (req, res, next) => {
    // deny example
    // return res.status(401).send('Unauthorized');
    return next();
  }
}
```

### Socket.IO event

```js
export const chat = {
  // Used as namespace and event name
  name: '/chat',
  onEvent: (request, response) => {
    // request: { auth, body }
    // response helpers:
    // - emit(data)
    // - broadcast(data)
    // - announce(data) // to the whole namespace
    // - emitTo(socketId, data)
    // - topic(topicName).join()
    // - topic(topicName).broadcast(data)
    // - topic(topicName).announce(data)
  }
}
```

Client example:

```js
import { io } from 'socket.io-client';
const s = io('http://localhost:3000/chat');
s.on('/chat', (packet) => {
  // packet = { body: ... }
  console.log(packet.body);
});
s.emit('/chat', { auth: {token: 'x'}, body: { msg: 'hi' } });
```

### Scheduled job

```js
export const everyMinute = {
  rule: '* * * * *', // node-schedule format
  onJob: () => {
    console.log('tick');
  }
}
```

---

## Configuration

### bfast.json (optional)

If present, used to control function discovery ignores. Example:

```json
{
  "ignore": [
    "**/node_modules/**",
    "**/specs/**",
    "**/*.specs.js",
    "**/*.specs.mjs",
    "**/*.specs.cjs"
  ]
}
```

- Place it at the path you pass in `functionsConfig.bfastJsonPath`.
- If omitted, sensible defaults are used.

### `start` options

The engine accepts an `Options` object:

```ts
interface Options {
  port?: string;                 // default '3000'
  mode?: 'git'|'npm'|'url'|'local';
  gitCloneUrl?: string;          // for mode 'git'
  gitUsername?: string;          // for private repos
  gitToken?: string;             // for private repos
  npmTar?: string;               // for mode 'npm' (package name to pack)
  urlTar?: string;               // for mode 'url' (direct .tgz URL)
  functionsConfig?: {
    functionsDirPath: string | string[]; // one or more folders
    assets?: string;                      // static files root
    bfastJsonPath?: string;               // path to bfast.json
  };
  startScript?: string;           // if set, run this instead of starting HTTP server
}
```

See the source for details: `src/models/options.mjs`.

---

## Deployment modes

You can populate the functions directory in four ways.

1) Local (recommended for development)

```js
await start({
  port: '3000',
  functionsConfig: { functionsDirPath: '/abs/path/to/functions' }
});
```

Note: When `functionsConfig.functionsDirPath` is provided, local functions are used and remote modes are skipped (the `mode` value is effectively ignored).

2) Git

```js
await start({
  port: '3000',
  mode: 'git',
  gitCloneUrl: 'https://github.com/you/your-functions.git',
  gitUsername: process.env.GIT_USERNAME, // optional
  gitToken: process.env.GIT_TOKEN        // optional
});
```

3) npm tarball (package name)

```js
await start({
  port: '3000',
  mode: 'npm',
  npmTar: 'your-functions-package'
});
```

4) Remote URL (.tgz)

```js
await start({
  port: '3000',
  mode: 'url',
  urlTar: 'https://example.com/your-functions.tgz'
});
```

Notes:
- When using `git`, dependencies inside the functions folder are installed (`npm install --omit=dev`).
- When using `npm`/`url`, the tarball is extracted and normalized before deployment.

---

## Running with environment variables

You can boot the engine without writing code using env vars that map to the `Options` fields. The built‑in starter reads:

- `PORT` (default `3000`)
- `MODE` (`git` | `npm` | `url` | `local`, default `git`)
- `GIT_CLONE_URL`, `GIT_USERNAME`, `GIT_TOKEN`
- `NPM_TAR`
- `URL_TAR`
- `START_SCRIPT`

Example:

```bash
PORT=3000 MODE=local START_SCRIPT="" node node_modules/bfast-function/src/start.mjs
```

Or with Git:

```bash
PORT=8080 MODE=git \
GIT_CLONE_URL=https://github.com/you/your-functions.git \
GIT_USERNAME=you GIT_TOKEN=xxxx \
node node_modules/bfast-function/src/start.mjs
```

---

## Docker

Build (if you cloned this repo):

```bash
docker build -t bfast-function .
```

Run (local functions folder mounted):

```bash
docker run --rm -p 3000:3000 \
  -e MODE=local \
  -e PORT=3000 \
  -v "$(pwd)/functions:/faas/functions" \
  bfast-function
```

Run (Git mode):

```bash
docker run --rm -p 3000:3000 \
  -e MODE=git \
  -e PORT=3000 \
  -e GIT_CLONE_URL=https://github.com/you/your-functions.git \
  -e GIT_USERNAME=you -e GIT_TOKEN=xxxx \
  bfast-function
```

Container entrypoint executes `npm run start`, which invokes the same env‑driven starter as above.

---

## Static assets

Static files are served from `/assets`.

Resolution order:
- If you pass `functionsConfig.assets`, that path is used.
- Else, if the current working directory contains `assets/`, that folder is served.
- Else, a built‑in fallback folder is used for development.

---

## Built‑in endpoints

- `GET /functions-health` → `{ "message": "running" }`
- `GET /functions-all` → JSON map of all discovered functions (by export name)

---

## Troubleshooting & tips

- ESM vs CommonJS: your function files can be `.js`, `.mjs`, or `.cjs`. The loader attempts dynamic `import()` first, then falls back to `require()`.
- Missing routes? Ensure your exports are objects and contain `onRequest`, `onEvent`, `onGuard`, or `onJob` with `rule`.
- Default paths: if `path` is omitted for HTTP functions, the route is `/functions/<exportName>`.
- Socket.IO: event `name` is both the namespace and the event key.
- Jobs: `rule` must be present and valid per `node-schedule`.
- Ignoring files: provide a `bfast.json` with `ignore` globs if needed.

---

## API reference (source)

- Options shape: `src/models/options.mjs`
- Core runtime: `src/core.mjs`
- Function discovery: `src/controllers/resolver.mjs`
- Mounting & deployment: `src/controllers/index.mjs`

---

## Contributing

Issues and PRs are welcome. Please read `CONTRIBUTING.md` and our `CODE_OF_CONDUCT.md`.

---

## License

MIT © BFast Cloud
