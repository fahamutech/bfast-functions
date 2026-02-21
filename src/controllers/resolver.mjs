import {glob} from "glob";
import {dirname, isAbsolute, join, resolve} from "path";
import {fileURLToPath} from "url";
import {createRequire} from 'module';

const require = createRequire(import.meta.url);

const __dirname = dirname(fileURLToPath(import.meta.url));

const functionDirToArray = x => Array.isArray(x) ? x : [x];
const resolveFromCwd = (targetPath) => {
    if (!targetPath) {
        return targetPath;
    }
    return isAbsolute(targetPath) ? targetPath : resolve(process.cwd(), targetPath);
};
const descriptorHiddenFields = new Set([
    'onRequest',
    'onGuard',
    'onEvent',
    'onJob'
]);
const descriptorKnownDocFields = new Set([
    'path',
    'method',
    'name',
    'rule',
    'doc',
    'description',
    'request',
    'requestSample',
    'response',
    'responseSample'
]);

const escapeHtml = (value) => {
    return `${value ?? ''}`
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

const toCodeText = (value) => {
    if (value === undefined || value === null) {
        return '';
    }
    if (typeof value === 'string') {
        return value;
    }
    try {
        return JSON.stringify(value, null, 2);
    } catch (_) {
        return `${value}`;
    }
};

const getDescriptorType = (descriptor) => {
    if (descriptor && typeof descriptor === 'object') {
        if (descriptor?.onRequest) {
            return 'http';
        }
        if (descriptor?.onGuard) {
            return 'guard';
        }
        if (descriptor?.onEvent && typeof descriptor?.name === 'string') {
            return 'event';
        }
        if (descriptor?.onJob && descriptor?.rule !== undefined && descriptor?.rule !== null) {
            return 'job';
        }
    }
    return 'other';
};

const getEndpointLabel = (name, descriptor, type) => {
    const normalizedPath = descriptor?.path ? `${descriptor.path}` : '';
    const method = typeof descriptor?.method === 'string'
        ? descriptor.method.toUpperCase()
        : 'ALL';
    switch (type) {
        case 'http':
            return `${method} ${normalizedPath || `/functions/${name}`}`;
        case 'guard':
            return `USE ${normalizedPath || '/'}`;
        case 'event':
            return `SOCKET ${descriptor?.name || '/'}`;
        case 'job':
            return `CRON ${toCodeText(descriptor?.rule)}`;
        default:
            return '-';
    }
};

const sanitizeDescriptor = (descriptor) => {
    const output = {};
    if (!descriptor || typeof descriptor !== 'object') {
        return output;
    }
    Object.entries(descriptor).forEach(([key, value]) => {
        if (typeof value !== 'function') {
            output[key] = value;
        }
    });
    return output;
};

const toExportedDescriptors = (functions) => {
    return Object.entries(functions)
        .map(([name, descriptor]) => {
            return {
                name,
                descriptor,
                descriptorType: getDescriptorType(descriptor),
                sanitized: sanitizeDescriptor(descriptor)
            };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
};

const renderCodeBlock = (title, value) => {
    if (value === undefined || value === null || value === '') {
        return '';
    }
    const codeText = toCodeText(value);
    if (`${codeText}`.trim() === '') {
        return '';
    }
    return `
      <section class="sample">
        <h4>${escapeHtml(title)}</h4>
        <pre><code>${escapeHtml(codeText)}</code></pre>
      </section>
    `;
};

const renderDocumentationPage = (functions) => {
    const descriptors = toExportedDescriptors(functions);
    const summaryRows = descriptors.map((entry) => {
        const description = entry.descriptor?.description ?? entry.descriptor?.doc ?? '';
        const endpoint = getEndpointLabel(entry.name, entry.descriptor, entry.descriptorType);
        return `
          <tr>
            <td><a href="#fn-${escapeHtml(entry.name)}">${escapeHtml(entry.name)}</a></td>
            <td>${escapeHtml(entry.descriptorType.toUpperCase())}</td>
            <td><code>${escapeHtml(endpoint)}</code></td>
            <td>${escapeHtml(description || '-')}</td>
          </tr>
        `;
    }).join('');

    const detailCards = descriptors.map((entry) => {
        const descriptor = entry.descriptor ?? {};
        const description = descriptor?.description ?? descriptor?.doc;
        const requestSample = descriptor?.requestSample ?? descriptor?.request;
        const responseSample = descriptor?.responseSample ?? descriptor?.response;
        const additionalFields = {};
        Object.entries(entry.sanitized).forEach(([key, value]) => {
            if (!descriptorKnownDocFields.has(key) && !descriptorHiddenFields.has(key)) {
                additionalFields[key] = value;
            }
        });
        const endpoint = getEndpointLabel(entry.name, descriptor, entry.descriptorType);
        return `
          <article class="function-card" id="fn-${escapeHtml(entry.name)}">
            <h3>${escapeHtml(entry.name)}</h3>
            <p class="meta">
              <span class="badge">${escapeHtml(entry.descriptorType.toUpperCase())}</span>
              <code>${escapeHtml(endpoint)}</code>
            </p>
            ${description ? `<p class="description">${escapeHtml(description)}</p>` : ''}
            ${renderCodeBlock('Request Sample', requestSample)}
            ${renderCodeBlock('Response Sample', responseSample)}
            ${Object.keys(additionalFields).length > 0 ? renderCodeBlock('Additional Descriptor Fields', additionalFields) : ''}
          </article>
        `;
    }).join('');

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Functions Documentation</title>
  <style>
    :root {
      color-scheme: light;
      font-family: "SF Pro Text", "Segoe UI", Arial, sans-serif;
      --bg: #f6f7fb;
      --card: #ffffff;
      --text: #1f2a37;
      --muted: #5f6b7a;
      --line: #e3e8ef;
      --accent: #0b7ec1;
      --code: #0f172a;
      --code-bg: #f1f5f9;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 1.5rem;
      background: var(--bg);
      color: var(--text);
    }
    main {
      max-width: 1100px;
      margin: 0 auto;
      display: grid;
      gap: 1rem;
    }
    h1, h2, h3, h4 { margin: 0; }
    .panel {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 1rem;
    }
    .muted { color: var(--muted); }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: .75rem;
      font-size: .95rem;
    }
    th, td {
      border-bottom: 1px solid var(--line);
      text-align: left;
      padding: .6rem .5rem;
      vertical-align: top;
    }
    th { font-size: .85rem; text-transform: uppercase; color: var(--muted); }
    code {
      color: var(--code);
      background: var(--code-bg);
      border-radius: 6px;
      padding: .1rem .35rem;
      font-family: Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: .85rem;
    }
    pre {
      margin: .45rem 0 0;
      padding: .75rem;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--code-bg);
      overflow: auto;
    }
    pre code {
      background: transparent;
      padding: 0;
      border-radius: 0;
    }
    .function-card {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 1rem;
      display: grid;
      gap: .8rem;
    }
    .functions-grid {
      display: grid;
      gap: .8rem;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: .5rem;
      align-items: center;
      margin: 0;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: .2rem .5rem;
      border-radius: 999px;
      font-size: .75rem;
      letter-spacing: .03em;
      font-weight: 600;
      background: #e7f3fb;
      color: var(--accent);
    }
    .description {
      margin: 0;
      color: var(--text);
      line-height: 1.5;
    }
    .sample {
      display: grid;
      gap: .35rem;
    }
  </style>
</head>
<body>
  <main>
    <section class="panel">
      <h1>Functions Documentation</h1>
      <p class="muted">Discovered ${descriptors.length} function descriptor(s).</p>
      <p class="muted">Use <code>?format=json</code> to get machine-readable metadata.</p>
      ${descriptors.length > 0 ? `
      <table aria-label="Function summary">
        <thead>
          <tr>
            <th>Function</th>
            <th>Type</th>
            <th>Endpoint / Trigger</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          ${summaryRows}
        </tbody>
      </table>
      ` : '<p class="muted">No functions discovered.</p>'}
    </section>
    ${descriptors.length > 0 ? `
    <section class="functions-grid" aria-label="Function details">
      ${detailCards}
    </section>
    ` : ''}
  </main>
</body>
</html>`;
};

const shouldReturnJson = (request) => {
    const queryFormat = `${request?.query?.format ?? ''}`.toLowerCase();
    if (queryFormat === 'json') {
        return true;
    }
    if (queryFormat === 'html') {
        return false;
    }
    const accept = `${request?.headers?.accept ?? ''}`.toLowerCase();
    return accept.includes('application/json') && !accept.includes('text/html');
};

const sanitizeFunctions = (functions) => {
    const result = {};
    Object.entries(functions).forEach(([name, descriptor]) => {
        result[name] = sanitizeDescriptor(descriptor);
    });
    return result;
};

/**
 * Dynamically loads and resolves user-defined functions from the filesystem.
 * This function searches for function files (e.g., .js, .mjs, .cjs) in the specified directory,
 * imports them, and builds an object containing all the discovered functions.
 * It also provides default functions for health checks and listing all functions.
 *
 * @param {object} options - Configuration options for resolving functions.
 * @param {string | string[]} options.functionsDirPath - The path(s) to the directory containing the function files.
 * @param {string} options.bfastJsonPath - The path to the 'bfast.json' configuration file, which can specify files to ignore.
 * @returns {Promise<object>} A promise that resolves to an object containing all the loaded functions.
 * Each key in the object is a function name, and the value is the function module.
 */
export async function getFunctions(options) {
    if (!options) {
        options = {
            functionsDirPath: join(__dirname, '../function/myF/functions'),
            bfastJsonPath: join(__dirname, '../function/myF/bfast.json')
        }
    }
    const resolvedBfastJsonPath = resolveFromCwd(options?.bfastJsonPath);
    const resolvedFunctionDirs = functionDirToArray(options?.functionsDirPath).map(resolveFromCwd);
    let bfastConfig;
    try {
        bfastConfig = require(resolvedBfastJsonPath);
    } catch (e) {
        console.warn(`cant find bfast.json at: ${resolvedBfastJsonPath ?? '<undefined>'}`);
    }
    const files = await glob(
        resolvedFunctionDirs.map(x => `${x}/**/*.{js,mjs,cjs}`),
        {
            absolute: true,
            ignore: Array.isArray(bfastConfig?.ignore) ?
                bfastConfig?.ignore :
                ['**/node_modules/**', '**/specs/**', '**/*.specs.js', '**/*.specs.mjs', '**/*.specs.cjs']
        }
    );
    const functions = {};
    for (const file of files) {
        let functionsFile;
        try {
            functionsFile = await import(file);
        } catch (e78788) {
            console.log(e78788);
            functionsFile = undefined;
        }
        if (functionsFile === undefined) {
            functionsFile = require(file);
        }
        const functionNames = Object.keys(functionsFile);
        for (const functionName of functionNames) {
            if (functionsFile[functionName] && typeof functionsFile[functionName] === "object") {
                functions[functionName] = functionsFile[functionName];
            }
        }
    }
    return {
        ...functions,
        _functions: {
            path: '/functions-all',
            onRequest: (request, response) => {
                if (shouldReturnJson(request)) {
                    return response.json(sanitizeFunctions(functions));
                }
                return response
                    .status(200)
                    .set('Content-Type', 'text/html; charset=utf-8')
                    .send(renderDocumentationPage(functions));
            }
        },
        _health: {
            path: '/functions-health',
            onRequest: (_, response) => response.json({message: 'running'})
        }
    };
}
