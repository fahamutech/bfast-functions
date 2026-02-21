# Environment Variables

`src/start.mjs` maps environment variables to `start(options)`.

## Supported Variables

- `PORT` (default: `3000`)
- `MODE` (`git`, `npm`, `url`, `local`; default in starter is `git`)
- `GIT_CLONE_URL`
- `GIT_USERNAME`
- `GIT_TOKEN`
- `NPM_TAR`
- `URL_TAR`
- `START_SCRIPT`
- `FUNCTIONS_DIR_PATH` (used when `MODE=local`)
- `BFAST_JSON_PATH` (optional, used when `MODE=local`)
- `ASSETS_PATH` (optional, used when `MODE=local`)

## Examples

Git mode:

```bash
PORT=3000 \
MODE=git \
GIT_CLONE_URL=https://github.com/acme/functions.git \
GIT_USERNAME=acme-bot \
GIT_TOKEN=*** \
node src/start.mjs
```

NPM mode:

```bash
PORT=3000 MODE=npm NPM_TAR=acme-functions node src/start.mjs
```

Remote tarball mode:

```bash
PORT=3000 MODE=url URL_TAR=https://example.com/functions.tgz node src/start.mjs
```

Custom script mode:

```bash
START_SCRIPT="node custom-server.js" node src/start.mjs
```

Local mode:

```bash
PORT=3000 \
MODE=local \
FUNCTIONS_DIR_PATH=./specs/sample_functions \
BFAST_JSON_PATH=./specs/sample_functions/bfast.json \
node src/start.mjs
```
