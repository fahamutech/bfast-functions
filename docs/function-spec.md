# Function Specification

This document defines the descriptor contract loaded by `bfast-function`.

## Discovery Rules

Function files are discovered recursively from `functionsConfig.functionsDirPath` and matched by extension:
- `.js`
- `.mjs`
- `.cjs`

Each exported value is inspected. Only exports where value is an `object` are registered.

Loader behavior:
- tries dynamic `import()`
- falls back to `require()`

Ignore patterns come from `bfast.json.ignore` when provided, otherwise defaults are used.

## Descriptor Types

## 1) HTTP descriptor

Required:
- `onRequest(req, res)`

Optional:
- `path` (string route path)
- `method` (`get|post|put|patch|delete|all`, defaults to `all`)
- `description` or `doc` (string; shown on `/functions-all` docs page)
- `request` or `requestSample` (object/string; shown as request sample on `/functions-all`)
- `response` or `responseSample` (object/string; shown as response sample on `/functions-all`)

Default route behavior:
- if `path` is omitted, route is `/functions/<exportName>`.

Example:

```js
export const hello = {
  method: 'get',
  path: '/hello',
  onRequest: (req, res) => {
    res.status(200).send('ok');
  }
};
```

## 2) Guard descriptor (middleware)

Required:
- `onGuard(req, res, next)`

Optional:
- `path`

Path behavior:
- `path === '/'` or missing/invalid path -> mounted globally with `app.use(onGuard)`
- otherwise mounted at path prefix with `app.use(path, onGuard)`

Example:

```js
export const auth = {
  path: '/',
  onGuard: (req, res, next) => {
    next();
  }
};
```

## 3) Socket event descriptor

Required:
- `name` (string)
- `onEvent(request, response)`

Behavior:
- namespace = `name`
- inbound event key = `name`
- outbound event key = `name`

`request` shape:
- `{ auth, body }`

`response` helpers:
- `emit(data)`
- `broadcast(data)`
- `announce(data)`
- `emitTo(socketId, data)`
- `topic(topicName).join()`
- `topic(topicName).broadcast(data)`
- `topic(topicName).announce(data)`

Example:

```js
export const chat = {
  name: '/chat',
  onEvent: ({ body }, response) => {
    response.announce({ message: body?.message });
  }
};
```

## 4) Scheduled job descriptor

Required:
- `rule` (node-schedule rule)
- `onJob()`

Example:

```js
export const everyMinute = {
  rule: '* * * * *',
  onJob: () => {
    console.log('tick');
  }
};
```

## Built-in descriptors

The runtime adds two built-ins automatically:
- `GET /functions-health` -> `{ "message": "running" }`
- `GET /functions-all` -> HTML documentation page for discovered descriptors
  - add `?format=json` (or send `Accept: application/json`) for machine-readable JSON metadata
