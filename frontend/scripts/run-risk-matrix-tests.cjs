// Synthetic test DTO only. Never contacts application APIs or operational storage.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const frontend = path.resolve(__dirname, '..');
const ts = require(path.join(frontend, 'node_modules/typescript'));
const originalLoad = Module._load;
Module._load = function(request, parent, main) {
  if (request === '@/lib/apiClient') return { fetchRiskMatrix: () => { throw new Error('Operational requests prohibited in render tests'); } };
  return originalLoad.call(this, request.startsWith('@/') ? path.join(frontend, 'src', request.slice(2)) : request, parent, main);
};
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
  module._compile(outputText, filename);
};
const React = require(path.join(frontend, 'node_modules/react'));
const { renderToStaticMarkup } = require(path.join(frontend, 'node_modules/react-dom/server'));
const { RiskMatrixView } = require(path.join(frontend, 'src/components/risk-matrix-workspace.tsx'));
const { selectMatrixCell } = require(path.join(frontend, 'src/lib/risk-matrix-types.ts'));
const dir = path.resolve(frontend, '../tmp/risk-img05-review');
// Make the check reproducible without a pre-existing ignored review fixture.
const backend = require('node:child_process').spawnSync(process.execPath, ['--import', 'tsx', 'src/validation/riskMatrixChecks.ts'], {
  cwd: path.resolve(frontend, '../backend'), env: { ...process.env, DATABASE_URL: '', NODE_ENV: 'test', RISK_IMG05_TEST_ARTIFACTS: '1' }, encoding: 'utf8', windowsHide: true
});
assert.equal(backend.status, 0, backend.stderr || backend.error?.message);
process.stdout.write(backend.stdout);
const data = JSON.parse(fs.readFileSync(path.join(dir, 'synthetic-matrix.json'), 'utf8'));
const callbacks = {};
const props = { data: null, loading: false, error: null, pipelineLabel: 'Synthetic scope', basis: 'current', comparisonBasis: 'residual', category: '', selection: null, page: 1, allRows: false,
  ...Object.fromEntries(['Basis', 'Comparison', 'Category', 'Apply', 'Reset', 'Select', 'Page', 'AllRows'].map(name => ['on' + name, value => { callbacks[name] = value ?? true; }])) };
const render = value => renderToStaticMarkup(React.createElement(RiskMatrixView, value));
const absent = render(props);
for (const text of ['Current Risk Matrix', 'Current vs Residual Risk Matrix', 'Matrix Configuration', 'Risk Matrix Legend', 'Scoring Criteria', 'Selected Cell Details', 'Risks in Selected Matrix Cell', 'Date Range', 'Threat Category', 'Risk Category', 'Apply', 'Reset', 'Unavailable / MISSING FIELD']) assert.ok(absent.includes(text), text);
assert.ok(!absent.includes('324') && !absent.includes('Corporate 5x5') && !absent.includes('R-00123'));
assert.equal((absent.match(/<td /g) || []).length, 71); // 50 matrix, 20 criteria, one empty table row.
const selection = { basis: 'current', likelihood: 3, consequence: 2 };
const available = { ...props, data, selection };
const html = render(available);
assert.equal(selectMatrixCell(data.item, selection).rows.length, 13);
assert.equal(selectMatrixCell(data.item, selection).categories.reduce((n, row) => n + row.count, 0), 13);
assert.equal(selectMatrixCell(data.item, { ...selection, basis: 'residual' }).rows.length, 0);
assert.equal(selectMatrixCell(data.item, { ...selection, basis: 'residual', likelihood: 1, consequence: 1 }).rows.length, 13);
const corrupted = structuredClone(data.item); corrupted.distributions.current.find(cell => cell.likelihood === 3 && cell.consequence === 2).count = 99;
assert.equal(selectMatrixCell(corrupted, selection), null, 'Mismatched table/count is never published');
assert.ok(html.includes('saved-matrix-version') && html.includes('saved-method-version') && html.includes('Saved likelihood 3') && html.includes('Saved consequence 2'));
assert.ok(html.includes('Showing 1–10 of 13 risks') && html.includes('test-a') && html.includes('test-b'));
assert.ok(!html.includes('Frozen synthetic title 10'));
assert.ok(render({ ...available, page: 2 }).includes('Showing 11–13 of 13 risks'));
assert.ok(render({ ...available, allRows: true }).includes('Showing 1–13 of 13 risks'));
assert.ok(!render({ ...available, loading: true }).includes('Frozen synthetic title'));
assert.ok(!render({ ...available, error: 'Scope denied' }).includes('Frozen synthetic title'));
for (const basis of ['inherent', 'current', 'residual']) assert.ok(render({ ...available, basis }).includes(`${basis[0].toUpperCase() + basis.slice(1)} Risk Matrix`));
function nodes(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { node.forEach(value => nodes(value, out)); return out; }
  if (typeof node.type === 'function') return nodes(node.type(node.props), out);
  out.push(node); nodes(node.props?.children, out); return out;
}
const tree = nodes(RiskMatrixView(available));
const byLabel = value => tree.find(node => node.props?.['aria-label'] === value);
const button = text => tree.find(node => node.type === 'button' && node.props.children === text);
const textOf = node => typeof node === 'string' ? node : Array.isArray(node) ? node.map(textOf).join('') : node?.props ? textOf(node.props.children) : '';
const action = text => tree.find(node => node.type === 'button' && textOf(node.props.children) === text);
byLabel('Primary matrix basis').props.onChange({ target: { value: 'inherent' } }); assert.equal(callbacks.Basis, 'inherent');
button('Inherent').props.onClick(); assert.equal(callbacks.Comparison, 'inherent');
byLabel('Matrix risk category').props.onChange({ target: { value: 'test-b' } }); assert.equal(callbacks.Category, 'test-b');
button('Apply').props.onClick(); assert.equal(callbacks.Apply, true);
button('Reset').props.onClick(); assert.equal(callbacks.Reset, true);
const cells = tree.filter(node => node.type === 'button' && /^(Current|Residual) likelihood /.test(node.props['aria-label'] || ''));
assert.equal(cells.length, 50);
cells.find(node => node.props['aria-label'].startsWith('Residual likelihood 1, consequence 1:')).props.onClick(); assert.deepEqual(callbacks.Select, { basis: 'residual', likelihood: 1, consequence: 1 });
button('Next').props.onClick(); assert.equal(callbacks.Page, 2);
action('View All Risks').props.onClick(); assert.equal(callbacks.AllRows, true);
for (const text of ['Configure Matrix', 'Create Mitigation Plan', 'Export List']) assert.ok(action(text).props.disabled, text);
assert.ok(byLabel('Historical date range unavailable').props.disabled && byLabel('Threat category unavailable').props.disabled);
assert.ok(tree.filter(node => node.type === 'button' && node.props['aria-label']?.includes('menu unavailable')).every(node => node.props.disabled));
console.log('IMG-05 UI PASS: all panels, 50 cells, independent bases, selection/category reconciliation, paging/View All, loading/error isolation, filters and disabled unsupported actions. Synthetic DTO only.');
if (process.env.RISK_IMG05_RENDER_ARTIFACTS === '1') {
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, markup] of [['unavailable', absent], ['synthetic-layout-only', html]]) fs.writeFileSync(path.join(dir, name + '.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="render.css"><title>IMG-05 isolated verification</title></head><body><main style="padding:16px;max-width:1680px;margin:auto"><p>ISOLATED SYNTHETIC VERIFICATION ONLY — No operational records or APIs.</p>' + markup + '</main><script>addEventListener("load",()=>{document.documentElement.dataset.viewport=innerWidth;document.documentElement.dataset.scrollWidth=document.documentElement.scrollWidth;document.documentElement.dataset.bodyOverflow=document.documentElement.scrollWidth>innerWidth;});</script></body></html>');
}
