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

const toCompactCodeText = (value, maxLength = 900) => {
    const codeText = toCodeText(value).trim();
    if (codeText.length <= maxLength) {
        return codeText;
    }
    return `${codeText.slice(0, maxLength)}\n...`;
};

const renderSummarySample = (title, value) => {
    if (value === undefined || value === null || value === '') {
        return '';
    }
    const codeText = toCompactCodeText(value);
    if (codeText.trim() === '') {
        return '';
    }
    return `
      <details class="inline-sample">
        <summary>${escapeHtml(title)}</summary>
        <pre><code>${escapeHtml(codeText)}</code></pre>
      </details>
    `;
};

const renderDocumentationPage = (functions) => {
    const descriptors = toExportedDescriptors(functions);
    const summaryRows = descriptors.map((entry) => {
        const descriptor = entry.descriptor ?? {};
        const description = descriptor?.description ?? descriptor?.doc ?? '';
        const requestSample = descriptor?.requestSample ?? descriptor?.request;
        const responseSample = descriptor?.responseSample ?? descriptor?.response;
        const endpoint = getEndpointLabel(entry.name, descriptor, entry.descriptorType);
        const method = entry.descriptorType === 'http'
            ? (typeof descriptor?.method === 'string' ? descriptor.method.toUpperCase() : 'ALL')
            : '';
        const path = entry.descriptorType === 'http'
            ? (descriptor?.path ? `${descriptor.path}` : `/functions/${entry.name}`)
            : endpoint;
        const summarySamples = `${renderSummarySample('Request', requestSample)}${renderSummarySample('Response', responseSample)}`;
        return `
          <tr class="function-row"
            data-name="${escapeHtml(entry.name)}"
            data-type="${escapeHtml(entry.descriptorType)}"
            data-method="${escapeHtml(method)}"
            data-path="${escapeHtml(path)}"
            data-endpoint="${escapeHtml(endpoint)}"
            data-description="${escapeHtml(description || '')}">
            <td><a href="#fn-${escapeHtml(entry.name)}">${escapeHtml(entry.name)}</a></td>
            <td>${escapeHtml(entry.descriptorType.toUpperCase())}</td>
            <td><code>${escapeHtml(endpoint)}</code></td>
            <td>${escapeHtml(description || '-')}</td>
            <td>${summarySamples || '-'}</td>
          </tr>
        `;
    }).join('');

    const detailCards = descriptors.map((entry) => {
        const descriptor = entry.descriptor ?? {};
        const description = descriptor?.description ?? descriptor?.doc;
        const requestSample = descriptor?.requestSample ?? descriptor?.request;
        const responseSample = descriptor?.responseSample ?? descriptor?.response;
        const endpoint = getEndpointLabel(entry.name, descriptor, entry.descriptorType);
        const method = entry.descriptorType === 'http'
            ? (typeof descriptor?.method === 'string' ? descriptor.method.toUpperCase() : 'ALL')
            : '';
        const path = entry.descriptorType === 'http'
            ? (descriptor?.path ? `${descriptor.path}` : `/functions/${entry.name}`)
            : endpoint;
        const additionalFields = {};
        Object.entries(entry.sanitized).forEach(([key, value]) => {
            if (!descriptorKnownDocFields.has(key) && !descriptorHiddenFields.has(key)) {
                additionalFields[key] = value;
            }
        });
        return `
          <article class="function-card"
            id="fn-${escapeHtml(entry.name)}"
            data-name="${escapeHtml(entry.name)}"
            data-type="${escapeHtml(entry.descriptorType)}"
            data-method="${escapeHtml(method)}"
            data-path="${escapeHtml(path)}"
            data-endpoint="${escapeHtml(endpoint)}"
            data-description="${escapeHtml(description || '')}">
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
    .inline-sample + .inline-sample {
      margin-top: .4rem;
    }
    .inline-sample summary {
      cursor: pointer;
      color: var(--accent);
      font-size: .82rem;
    }
    .inline-sample pre {
      margin: .35rem 0 0;
      max-width: 380px;
      max-height: 190px;
      overflow: auto;
      background: var(--code-bg);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: .5rem;
      white-space: pre-wrap;
      word-break: break-word;
      font-size: .82rem;
    }
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
    .toolbar {
      display: grid;
      gap: .75rem;
      margin-top: .9rem;
      padding: .9rem;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: #fbfcfe;
    }
    .toolbar-grid {
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      gap: .6rem;
      align-items: end;
    }
    .toolbar-field {
      grid-column: span 12;
      display: grid;
      gap: .25rem;
    }
    .toolbar-field label {
      font-size: .8rem;
      color: var(--muted);
      font-weight: 600;
    }
    .toolbar-actions {
      display: flex;
      flex-wrap: wrap;
      gap: .5rem;
      align-items: center;
    }
    .toolbar input, .toolbar select, .toolbar button {
      width: 100%;
      border: 1px solid var(--line);
      background: #fff;
      border-radius: 8px;
      font-size: .9rem;
      color: var(--text);
      padding: .5rem .65rem;
    }
    .toolbar button {
      width: auto;
      cursor: pointer;
      background: #f4f8fc;
      border-color: #cfe0f1;
      font-weight: 600;
    }
    .toolbar-stats {
      display: flex;
      flex-wrap: wrap;
      gap: .4rem;
      align-items: center;
    }
    .count-chip {
      display: inline-flex;
      align-items: center;
      gap: .35rem;
      border-radius: 999px;
      padding: .2rem .55rem;
      border: 1px solid #d7e4f2;
      background: #f4f8fc;
      font-size: .78rem;
      color: #31557a;
      font-weight: 600;
      white-space: nowrap;
    }
    .muted-chip {
      color: var(--muted);
      border-color: var(--line);
      background: #fff;
    }
    .hidden {
      display: none !important;
    }
    .grouped-summary {
      display: grid;
      gap: .8rem;
      margin-top: .8rem;
    }
    .type-group {
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: .7rem .8rem;
      background: #fff;
      display: grid;
      gap: .45rem;
    }
    .type-group h3 {
      font-size: .9rem;
      color: #223549;
    }
    .type-links {
      display: grid;
      gap: .25rem;
      margin: 0;
      padding-left: 1rem;
      font-size: .9rem;
    }
    .empty-state {
      border: 1px dashed var(--line);
      border-radius: 10px;
      padding: .9rem;
      color: var(--muted);
      background: #fff;
      font-size: .92rem;
    }
    @media (min-width: 780px) {
      .toolbar-field.search { grid-column: span 4; }
      .toolbar-field.type { grid-column: span 2; }
      .toolbar-field.method { grid-column: span 2; }
      .toolbar-field.path { grid-column: span 4; }
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
      <section class="toolbar" aria-label="Documentation search and filters">
        <div class="toolbar-grid">
          <div class="toolbar-field search">
            <label for="filter-search">Search</label>
            <input id="filter-search" type="search" placeholder="Function, path, method, description">
          </div>
          <div class="toolbar-field type">
            <label for="filter-type">Type</label>
            <select id="filter-type">
              <option value="all">All types</option>
              <option value="http">HTTP</option>
              <option value="guard">GUARD</option>
              <option value="event">EVENT</option>
              <option value="job">JOB</option>
              <option value="other">OTHER</option>
            </select>
          </div>
          <div class="toolbar-field method">
            <label for="filter-method">Method</label>
            <select id="filter-method">
              <option value="all">All methods</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
              <option value="ALL">ALL</option>
            </select>
          </div>
          <div class="toolbar-field path">
            <label for="filter-path-prefix">Path prefix</label>
            <input id="filter-path-prefix" type="text" placeholder="e.g. /shop/:p/:a/report">
          </div>
        </div>
        <div class="toolbar-actions">
          <button id="filter-reset" type="button">Reset Filters</button>
          <label><input id="toggle-grouped-view" type="checkbox"> Group summary by type</label>
          <label><input id="toggle-detail-view" type="checkbox"> Show detail cards</label>
        </div>
        <div class="toolbar-stats" id="filter-stats"></div>
      </section>
      ` : ''}
      ${descriptors.length > 0 ? `
      <table aria-label="Function summary" id="summary-table">
        <thead>
          <tr>
            <th>Function</th>
            <th>Type</th>
            <th>Endpoint / Trigger</th>
            <th>Description</th>
            <th>Request / Response</th>
          </tr>
        </thead>
        <tbody>
          ${summaryRows}
        </tbody>
      </table>
      <section id="grouped-summary" class="grouped-summary hidden" aria-label="Grouped function summary"></section>
      ` : '<p class="muted">No functions discovered.</p>'}
    </section>
    ${descriptors.length > 0 ? `
    <section class="functions-grid hidden" id="function-cards" aria-label="Function details">
      ${detailCards}
    </section>
    <section class="empty-state hidden" id="empty-state">No functions matched the current filters.</section>
    ` : ''}
  </main>
  <script>
    (() => {
      const summaryRows = Array.from(document.querySelectorAll('.function-row'));
      const detailCards = Array.from(document.querySelectorAll('.function-card'));
      if (summaryRows.length === 0 || detailCards.length === 0) {
        return;
      }

      const searchInput = document.getElementById('filter-search');
      const typeSelect = document.getElementById('filter-type');
      const methodSelect = document.getElementById('filter-method');
      const pathPrefixInput = document.getElementById('filter-path-prefix');
      const resetButton = document.getElementById('filter-reset');
      const groupedToggle = document.getElementById('toggle-grouped-view');
      const detailToggle = document.getElementById('toggle-detail-view');
      const statsContainer = document.getElementById('filter-stats');
      const summaryTable = document.getElementById('summary-table');
      const groupedSummary = document.getElementById('grouped-summary');
      const detailsSection = document.getElementById('function-cards');
      const emptyState = document.getElementById('empty-state');

      const byName = new Map();
      detailCards.forEach((card) => byName.set(card.dataset.name, card));

      const typeOrder = ['http', 'guard', 'event', 'job', 'other'];
      const labelByType = {
        http: 'HTTP',
        guard: 'GUARD',
        event: 'EVENT',
        job: 'JOB',
        other: 'OTHER'
      };

      const normalize = (value) => (value || '').toLowerCase().trim();

      const matchesFilter = (dataset, filters) => {
        if (filters.type !== 'all' && dataset.type !== filters.type) {
          return false;
        }
        if (filters.method !== 'all') {
          const method = (dataset.method || '').toUpperCase();
          if (method !== filters.method.toUpperCase()) {
            return false;
          }
        }
        if (filters.pathPrefix) {
          const path = dataset.path || dataset.endpoint || '';
          if (!path.toLowerCase().startsWith(filters.pathPrefix)) {
            return false;
          }
        }
        if (filters.search) {
          const text = [dataset.name, dataset.type, dataset.method, dataset.path, dataset.endpoint, dataset.description]
            .join(' ')
            .toLowerCase();
          if (!text.includes(filters.search)) {
            return false;
          }
        }
        return true;
      };

      const renderStats = (visibleRows) => {
        const total = summaryRows.length;
        const chips = ['<span class="count-chip muted-chip">Showing ' + visibleRows.length + ' / ' + total + '</span>'];
        typeOrder.forEach((type) => {
          const count = visibleRows.filter((row) => row.dataset.type === type).length;
          if (count > 0) {
            chips.push('<span class="count-chip">' + labelByType[type] + ': ' + count + '</span>');
          }
        });
        statsContainer.innerHTML = chips.join('');
      };

      const renderGroupedSummary = (visibleRows) => {
        const groups = new Map(typeOrder.map((type) => [type, []]));
        visibleRows.forEach((row) => groups.get(row.dataset.type)?.push(row));

        const sections = typeOrder
          .filter((type) => (groups.get(type) || []).length > 0)
          .map((type) => {
            const rows = groups.get(type);
            const links = rows.map((row) => {
              const endpoint = row.dataset.endpoint || '';
              const safeName = row.dataset.name || '';
              return '<li><a href="#fn-' + safeName + '"><code>' + endpoint + '</code> ' + safeName + '</a></li>';
            }).join('');
            return '<section class="type-group">'
              + '<h3>' + labelByType[type] + ' (' + rows.length + ')</h3>'
              + '<ol class="type-links">' + links + '</ol>'
              + '</section>';
          });
        groupedSummary.innerHTML = sections.join('');
      };

      const applyFilters = () => {
        const filters = {
          search: normalize(searchInput.value),
          type: normalize(typeSelect.value) || 'all',
          method: normalize(methodSelect.value) || 'all',
          pathPrefix: normalize(pathPrefixInput.value)
        };

        const visibleRows = [];
        summaryRows.forEach((row) => {
          const visible = matchesFilter(row.dataset, filters);
          row.classList.toggle('hidden', !visible);
          const card = byName.get(row.dataset.name || '');
          if (card) {
            card.classList.toggle('hidden', !visible);
          }
          if (visible) {
            visibleRows.push(row);
          }
        });

        renderStats(visibleRows);
        renderGroupedSummary(visibleRows);

        const groupedEnabled = groupedToggle.checked;
        summaryTable.classList.toggle('hidden', groupedEnabled);
        groupedSummary.classList.toggle('hidden', !groupedEnabled);
        detailsSection.classList.toggle('hidden', !detailToggle.checked);
        emptyState.classList.toggle('hidden', visibleRows.length > 0);
      };

      [searchInput, typeSelect, methodSelect, pathPrefixInput, groupedToggle, detailToggle]
        .forEach((el) => el.addEventListener('input', applyFilters));

      resetButton.addEventListener('click', () => {
        searchInput.value = '';
        typeSelect.value = 'all';
        methodSelect.value = 'all';
        pathPrefixInput.value = '';
        groupedToggle.checked = false;
        detailToggle.checked = false;
        applyFilters();
      });

      applyFilters();
    })();
  </script>
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
