# Docker Guide

## Build

From repo root:

```bash
docker build -t bfast-function .
```

## Run Patterns

## 1) Local functions mounted from host

```bash
docker run --rm -p 3000:3000 \
  -e PORT=3000 \
  -v "$(pwd)/functions:/faas/functions" \
  bfast-function
```

Use this when your image/container should execute local function files.

## 2) Git mode

```bash
docker run --rm -p 3000:3000 \
  -e PORT=3000 \
  -e MODE=git \
  -e GIT_CLONE_URL=https://github.com/acme/functions.git \
  -e GIT_USERNAME=acme-bot \
  -e GIT_TOKEN=*** \
  bfast-function
```

## 3) NPM package mode

```bash
docker run --rm -p 3000:3000 \
  -e PORT=3000 \
  -e MODE=npm \
  -e NPM_TAR=acme-functions \
  bfast-function
```

## 4) Remote tarball mode

```bash
docker run --rm -p 3000:3000 \
  -e PORT=3000 \
  -e MODE=url \
  -e URL_TAR=https://example.com/functions.tgz \
  bfast-function
```

## Startup Path

Container entrypoint runs:

```bash
npm run start
```

which executes `src/start.mjs`.

## Production Notes

- Do not place tokens in image layers.
- Prefer runtime-injected secrets (swarm/k8s secrets, vault, env injection at deploy time).
- Pin image versions/tags instead of relying on mutable `latest` in production.
