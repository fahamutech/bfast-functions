# Validation Scenarios (Docs QA)

## Scenario 1: Local Runtime

Start runtime with local function directory via programmatic `start({ functionsConfig })`.

Expected:
- `/functions-health` returns running
- `/functions-all` lists descriptors

## Scenario 2: Remote Mode Matrix

Run each startup mode:
- `MODE=git` + `GIT_CLONE_URL`
- `MODE=npm` + `NPM_TAR`
- `MODE=url` + `URL_TAR`

Expected:
- runtime starts when required inputs are present
- runtime exits with clear message when required mode input is missing

## Scenario 3: Descriptor Contract

Validate examples for:
- `onRequest`
- `onGuard`
- `onEvent`
- `onJob`

Expected:
- routes/middleware/events/jobs mount as documented.
