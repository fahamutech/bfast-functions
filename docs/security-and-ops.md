# Security and Operations

## Secrets Handling

- Never commit `GIT_TOKEN` or private credentials into source control.
- Inject credentials at runtime through secret managers or orchestrator-native secrets.
- Avoid plaintext secrets inside compose files whenever possible.

## Private Repository Access

For `mode=git` with private repos:
- provide `GIT_USERNAME`
- provide `GIT_TOKEN`
- keep token scope minimal (read-only if possible)

## Runtime Hardening Checklist

- Run with explicit image tag/version, not floating `latest`.
- Restrict outbound network where feasible.
- Limit container privileges and filesystem write scope.
- Add health checks using `/functions-health`.
- Capture logs centrally and redact sensitive values.

## Operational Baseline

- Keep startup mode explicit (`MODE=git|npm|url`).
- Validate required env vars before release rollout.
- Monitor restart loops and startup errors in container logs.
- Use rollout strategy that supports rollback (blue/green or canary where possible).

## Incident Triage Quick Steps

1. Check container logs for mode-specific errors (`GIT_CLONE_URL`, `NPM_TAR`, `URL_TAR`).
2. Verify `/functions-health` responds.
3. Check `/functions-all` to confirm descriptor discovery.
4. Verify networking/ingress and port mapping (`PORT`, service target port).
5. Roll back image/env to last known good deployment if needed.
