# Environment Variables

`src/start.mjs` maps environment variables to `start(options)`.

Before the function project is loaded, BFast resolves application environment
values that point to Docker secrets. For example, when a service has a secret
mounted as `/run/secrets/database-password`:

```bash
DATABASE_PASSWORD=/run/secrets/database-password
```

BFast reads that file and exposes its contents through
`process.env.DATABASE_PASSWORD`. The content is preserved exactly, including
whitespace and a trailing newline. Create secrets without a trailing newline when
that matters.

Only values below `/run/secrets/` are resolved. Other absolute paths remain paths.
Variables whose names end in `_FILE` also remain paths, allowing applications and
libraries that support the conventional file-based setting to read them directly:

```bash
DATABASE_PASSWORD_FILE=/run/secrets/database-password
```

Startup fails if an automatically resolved secret is missing or unreadable. The
error names the environment variable and file path but never logs the secret value.

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
- `BFAST_BODY_LIMIT` (JSON/form body size limit; default: `2mb`)
- `BFAST_ACCESS_LOG` (`off` turns the per-request access log off; `dev`, `combined`,
  `common`, `short` or `tiny` pick the format; default: `dev`)
- `BFAST_SHUTDOWN_TIMEOUT_MS` (how long running requests may finish after SIGTERM or
  SIGINT before the process exits anyway; default: `8000`, below Docker's 10 s stop wait)
- `BFAST_HEALTHCHECK` (set to `off` to disable the image health check, for example when
  `START_SCRIPT` runs a server that does not serve `/functions-health` on `PORT`)
- `BFAST_RAW_BODY` (set to `true` to expose the original JSON bytes as a Buffer
  at `request.rawBody` for webhook signature verification; disabled by default)

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
