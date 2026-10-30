// Isolated representative fixtures and static browser layout checks; no app API or database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const Module = require('node:module');
const { spawnSync } = require('node:child_process');

process.env.DATABASE_URL = '';
process.env.NODE_ENV = 'test';
const frontend = path.resolve(__dirname, '..');
const root = path.resolve(frontend, '..');
const output = process.env.RISK_LAYOUT_OUTPUT_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'klinthru-risk-layout-'));
fs.mkdirSync(output, { recursive: true });
const ts = require(path.join(frontend, 'node_modules/typescript'));
const React = require(path.join(frontend, 'node_modules/react'));
const { renderToStaticMarkup } = require(path.join(frontend, 'node_modules/react-dom/server'));
const { chromium } = require(process.env.RISK_PLAYWRIGHT_MODULE || path.join(root, '.scada-test-tools/node_modules/playwright'));
const componentPath = path.join(frontend, 'src/components/risk-assessment-overview.tsx');
const originalLoad = Module._load;
Module._load = function (request, parent, ...args) {
  if (request === 'next/navigation') return { useRouter: () => ({ replace() {} }) };
  if (request === '@/lib/apiClient') throw new Error('Operational API imports prohibited in layout checks');
  return originalLoad.call(this, request.startsWith('@/') ? path.join(frontend, 'src', request.slice(2)) : request, parent, ...args);
};
const compile = (source, filename) => ts.transpileModule(source, {
  fileName: filename,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }
}).outputText;
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, filename) => module._compile(compile(fs.readFileSync(filename, 'utf8'), filename), filename);
function loadComponent(filename) {
  const compiled = new Module(componentPath, module);
  compiled.filename = componentPath;
  compiled.paths = Module._nodeModulePaths(path.dirname(componentPath));
  compiled._compile(compile(fs.readFileSync(filename, 'utf8'), componentPath), componentPath);
  return compiled.exports.RiskAssessmentOverview;
}

const result = (likelihood, consequence, level) => ({ likelihood, consequence, score: likelihood * consequence, level });
const latest = Array.from({ length: 12 }, (_, index) => ({
  riskId: `fixture-risk-${index}`, title: `Representative fixture scenario ${index}: external condition requiring an evidence-based review`,
  pipelineId: `fixture-pipeline-${index % 3}`, pipelineName: `Fixture pipeline ${index % 3}`, pipelineCode: `FIX-${index % 3}`,
  category: `Fixture category ${index % 3}`, sourceCategory: `Fixture source ${index % 2}`, status: `Fixture status ${index % 3}`,
  inherent: result(5, 4, 'fixture-inherent'), current: result(3, 2, 'fixture-current'), residual: result(1, 2, 'fixture-residual'),
  revisionId: `fixture-revision-${index}`, assessmentDate: '2038-01-01T00:00:00Z'
}));
const distribution = key => [...new Set(latest.map(row => row[key]))].map(label => ({ label, count: latest.filter(row => row[key] === label).length }));
const fixture = {
  status: 'available', reasons: [], asOf: '2038-01-02T00:00:00Z', methodologyVersionId: 'fixture-method',
  basis: 'Current approved risk', population: 'Active official Risk_ID records', summary: { total: 12, high: 0, medium: 12, low: 0, overdueReviews: 0 },
  matrix: Array.from({ length: 25 }, (_, index) => ({ likelihood: Math.floor(index / 5) + 1, consequence: index % 5 + 1, count: index === 11 ? 12 : 0, level: 'fixture-current' })),
  byCategory: distribution('category'), byStatus: distribution('status'), bySource: distribution('sourceCategory'),
  byPipeline: distribution('pipelineName'), latest,
  reviews: latest.map((row, index) => ({ riskId: row.riskId, title: row.title, dueDate: `2038-01-${String(index + 10).padStart(2, '0')}T00:00:00Z`, daysLeft: index + 8 })),
  locationRecords: [{ riskId: latest[0].riskId, assetName: 'Fixture asset', latitude: 1.25, longitude: 2.5, level: 'fixture-current' }],
  comparisons: { status: 'approval-needed', reason: 'Fixture only; no approved comparison policy supplied' }
};
const empty = { ...fixture, summary: { total: 0, high: 0, medium: 0, low: 0, overdueReviews: 0 }, matrix: fixture.matrix.map(cell => ({ ...cell, count: 0 })), byCategory: [], byStatus: [], bySource: [], byPipeline: [], latest: [], reviews: [], locationRecords: [] };
const states = [
  { name: 'populated', data: fixture }, { name: 'empty', data: empty },
  { name: 'loading', data: null, loading: true }, { name: 'unavailable', data: null, error: 'Fixture read unavailable' },
  { name: 'all-risks', data: fixture, view: 'risks' }, { name: 'all-reviews', data: fixture, view: 'reviews' }
];
const widths = [320, 375, 390, 600, 768, 1024, 1280, 1650];
function markup(Component, state) {
  const originalState = React.useState;
  let slot = 0;
  React.useState = initial => {
    const pair = originalState(initial);
    return slot++ === 0 && state.view ? [state.view, pair[1]] : pair;
  };
  try { return renderToStaticMarkup(React.createElement(Component, { data: state.data, loading: Boolean(state.loading), error: state.error || null, onTab() {} })); }
  finally { React.useState = originalState; }
}

async function run() {
  const cssPath = path.join(output, 'render.css');
  const cssBuild = spawnSync(process.execPath, ['node_modules/tailwindcss/lib/cli.js', '-i', 'src/app/globals.css', '-o', cssPath], { cwd: frontend, encoding: 'utf8', windowsHide: true });
  assert.equal(cssBuild.status, 0, cssBuild.stderr || cssBuild.error?.message);
  const css = fs.readFileSync(cssPath, 'utf8');
  const Component = loadComponent(process.env.RISK_OVERVIEW_SOURCE_FILE || componentPath);
  const document = body => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:"><style>${css}</style></head><body><main style="padding:16px;max-width:1680px;margin:auto"><p>ISOLATED REPRESENTATIVE TEST FIXTURE — no operational data or APIs.</p>${body}</main></body></html>`;
  const executablePath = process.env.CHROMIUM_EXECUTABLE || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(file => fs.existsSync(file));
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}), args: ['--disable-background-networking', '--disable-component-update'] });
  const measurements = [];
  let desktop;
  try {
    const context = await browser.newContext({ deviceScaleFactor: 1 });
    await context.route('**/*', route => route.abort());
    const page = await context.newPage();
    for (const state of states) {
      const html = document(markup(Component, state));
      fs.writeFileSync(path.join(output, `${state.name}.html`), html);
      for (const width of widths) {
        await page.setViewportSize({ width, height: 1100 });
        await page.setContent(html, { waitUntil: 'load' });
        const measured = await page.evaluate(() => ({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth }));
        measurements.push({ state: state.name, ...measured });
        assert.equal(measured.viewport, width);
        assert.ok(measured.scrollWidth <= width && measured.bodyWidth <= width, `${state.name}: overflow at ${width}px: ${JSON.stringify(measured)}`);
        if (state.name === 'populated') {
          assert.equal(await page.getByRole('img').count(), 4, 'Both donuts and both bar charts remain');
          const matrix = page.getByRole('table', { name: 'Current approved 5 by 5 risk distribution; cell values are counts' });
          assert.equal(await matrix.locator('td').count(), 25);
          assert.ok(await page.getByText('Total Risks', { exact: true }).count() >= 1);
          const table = page.locator('table').filter({ has: page.getByRole('columnheader', { name: 'Target Date', exact: true }) });
          assert.equal(await table.locator('tbody tr').count(), 5);
          if (width < 900) {
            const scrolling = await table.evaluate(table => { const container = table.parentElement; container.scrollLeft = container.scrollWidth; return { left: container.scrollLeft, width: container.clientWidth, content: container.scrollWidth }; });
            assert.ok(scrolling.left > 0, `Table must remain horizontally scrollable at ${width}px`);
            await table.evaluate(table => { table.parentElement.scrollLeft = 0; });
          }
          if ([375, 768, 1024, 1650].includes(width)) {
            const image = await page.screenshot({ path: path.join(output, `populated-${width}.png`), fullPage: true, animations: 'disabled' });
            if (width === 1650) desktop = image;
          }
        }
      }
    }
    if (process.env.RISK_OVERVIEW_BASELINE_FILE) {
      const comparison = await context.newPage();
      await comparison.setViewportSize({ width: 1650, height: 1100 });
      await comparison.setContent(document(markup(Component, states[0])), { waitUntil: 'load' });
      desktop = await comparison.screenshot({ path: path.join(output, 'populated-1650.png'), fullPage: true, animations: 'disabled' });
      await comparison.setContent(document(markup(loadComponent(process.env.RISK_OVERVIEW_BASELINE_FILE), states[0])), { waitUntil: 'load' });
      const before = await comparison.screenshot({ path: path.join(output, 'desktop-before.png'), fullPage: true, animations: 'disabled' });
      assert.ok(before.equals(desktop), 'Populated desktop screenshot must be byte-identical before/after');
      await comparison.close();
    }
    await context.close();
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ measurements, desktopUnchanged: process.env.RISK_OVERVIEW_BASELINE_FILE ? true : null, scope: 'Static SSR with current theme CSS and representative fixtures; no authenticated hydration or operational data.' }, null, 2));
    console.log(`Risk Overview layout PASS: ${measurements.length} exact-viewport checks, contained table scrolling, KPIs/charts/25 cells retained${process.env.RISK_OVERVIEW_BASELINE_FILE ? ', desktop screenshot unchanged' : ''}. Evidence: ${output}`);
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
