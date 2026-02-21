# Static Assets and Built-in Endpoints

## Static Assets (`/assets`)

Static file source resolution order:
1. `functionsConfig.assets` (if provided)
2. `<cwd>/assets` if current directory is a valid BFast workspace (`bfast.json` present)
3. fallback internal path used by runtime for development

Mounted route:

```text
/assets/*
```

## Built-in Endpoints

## Health

```http
GET /functions-health
```

Response:

```json
{ "message": "running" }
```

## Discovery

```http
GET /functions-all
```

Response:
- default: structured HTML documentation page for discovered descriptors
- includes endpoint/trigger summary and function details
- if descriptor fields are present, docs include:
  - `description` or `doc`
  - `request` or `requestSample`
  - `response` or `responseSample`
- add `?format=json` (or send `Accept: application/json`) for machine-readable metadata

## Validation Scenario

```bash
curl http://localhost:3000/functions-health
curl http://localhost:3000/functions-all
curl http://localhost:3000/functions-all?format=json
curl http://localhost:3000/assets/style.css
```
