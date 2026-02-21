# Runtime Options (`start(options)`)

`start` is exported from `src/core.mjs`.

## Options

```ts
interface Options {
  port?: string;
  mode?: 'git' | 'npm' | 'url' | 'local';
  gitCloneUrl?: string;
  gitUsername?: string;
  gitToken?: string;
  npmTar?: string;
  urlTar?: string;
  startScript?: string;
  functionsConfig?: {
    functionsDirPath: string | string[];
    assets?: string;
    bfastJsonPath?: string;
  };
}
```

## Precedence Rules

If `functionsConfig.functionsDirPath` is provided, local functions are used directly and remote pull modes are skipped.

That means `mode` is effectively ignored when local directory paths are configured.

## Remote Modes

When local paths are not provided:
- `mode: 'git'` requires `gitCloneUrl` (optional `gitUsername/gitToken` for private repos)
- `mode: 'npm'` requires `npmTar`
- `mode: 'url'` requires `urlTar`

Invalid/missing required values lead to process exit with an error message.

## `startScript` Behavior

If `startScript` is a non-empty string, runtime executes it instead of starting the built-in HTTP server.

Execution directory:
- local functions dir (if provided), else internal runtime function folder.

## `stop()`

`stop()` attempts graceful shutdown and then exits process.
