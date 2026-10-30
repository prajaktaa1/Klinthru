// Isolated local synthetic backend/render checks. No operational APIs or data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const frontend = path.resolve(__dirname, '..');
const dir = path.resolve(frontend, '../tmp/risk-img06-review');
const backend = require('node:child_process').spawnSync(process.execPath, ['--import', 'tsx', 'src/validation/riskConfigurationChecks.ts'], {
  cwd: path.resolve(frontend, '../backend'), env: { ...process.env, DATABASE_URL: '', NODE_ENV: 'test', RISK_IMG06_TEST_ARTIFACTS: '1' }, encoding: 'utf8', windowsHide: true
});
assert.equal(backend.status, 0, backend.stderr || backend.error?.message); process.stdout.write(backend.stdout);
const ts = require(path.join(frontend, 'node_modules/typescript'));
const load = Module._load;
Module._load = function(request, parent, main) {
  if (request === '@/lib/apiClient') return { fetchRiskConfiguration: () => { throw new Error('Operational API access prohibited during render checks'); } };
  return load.call(this, request.startsWith('@/') ? path.join(frontend, 'src', request.slice(2)) : request, parent, main);
};
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
  module._compile(outputText, filename);
};
const React = require(path.join(frontend, 'node_modules/react'));
const { renderToStaticMarkup } = require(path.join(frontend, 'node_modules/react-dom/server'));
const { RiskConfigurationView } = require(path.join(frontend, 'src/components/risk-configuration-workspace.tsx'));
const data = JSON.parse(fs.readFileSync(path.join(dir, 'synthetic-configuration.json'), 'utf8'));
const props = { data: null, loading: false, error: null, pipelineId: 'fixture-pipeline', methodologyVersionId: 'config-fixture-method', riskOverview: null };
const render = p => renderToStaticMarkup(React.createElement(RiskConfigurationView, p));
const absent = render(props);
for (const name of ['Risk Matrices Setup', 'Scoring Rules', 'Likelihood Dictionary', 'Consequence Dictionary', 'Risk Thresholds', 'Approval Workflow', 'Notification Rules', 'Review Intervals', 'Integration Settings', 'Configuration Status', 'Recent Changes', 'Risk Methodology', 'Rule Versions', 'ALARP Rules']) assert.ok(absent.includes(name), name);
assert.ok(absent.includes('Unavailable / MISSING FIELD'));
for (const text of ['Corporate 5x5', '324', 'Executive Director', 'Valid Configuration', 'All settings are correctly configured.', 'Connected', 'John Doe', '01 Jan 2026', '12 months']) assert.ok(!absent.includes(text), `Reference data must not be a default: ${text}`);
const available = { ...props, data };
const html = render(available);
for (const text of ['Frozen fixture methodology', 'fixture-method-business-id', 'fixture-method-version', 'fixture-matrix-business-id', 'fixture-matrix-version', 'fixture-likelihood-version', 'fixture-consequence-version', 'Frozen likelihood 5', 'Frozen consequence 5', 'fixture-category', 'fixture-low', 'fixture-business-risk', 'Saved fixture review purpose', '02 May 2038', 'Native fixture connector', 'Ready', '04 Feb 2038']) assert.ok(html.includes(text), text);
assert.ok(!/>\s*Connected\s*</.test(html) && !html.includes('Historical review must not enter current list') && !html.includes('private-'));
assert.ok(html.includes('Verification incomplete') && !html.includes('Valid Configuration'));
const matrix = html.match(/<table aria-label="Configuration classification matrix; scores unavailable"[\s\S]*?<\/table>/)[0];
assert.equal((matrix.match(/<td /g) || []).length, 25); assert.ok(matrix.includes('Unavailable')); assert.ok(!matrix.includes('risk counts'));
for (const state of [{ pipelineId: 'other-pipeline' }, { methodologyVersionId: 'other-method' }, { loading: true }, { error: 'Scope unavailable' }]) assert.ok(!render({ ...available, ...state }).includes('Frozen fixture methodology'), 'Stale/unauthorized data hidden');
const missingSources = structuredClone(data); missingSources.item.reviews = { status: 'unavailable', reason: 'Review fixture unavailable', items: [], truncated: false }; missingSources.item.integrations = { status: 'unavailable', reason: 'Hub fixture unavailable', items: [], truncated: false };
const partial = render({ ...available, data: missingSources }); assert.ok(partial.includes('Frozen fixture methodology') && partial.includes('Hub fixture unavailable')); assert.ok(!partial.includes('Native fixture connector'));
function nodes(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { node.forEach(n => nodes(n, out)); return out; }
  if (typeof node.type === 'function') return nodes(node.type(node.props), out);
  out.push(node); nodes(node.props?.children, out); return out;
}
const tree = nodes(RiskConfigurationView(available));
const text = node => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join('') : node?.props ? text(node.props.children) : '';
const buttons = tree.filter(node => node.type === 'button'); assert.ok(buttons.length >= 13); assert.ok(buttons.every(node => node.props.disabled && !node.props.onClick), 'All editing, toggles, delete and audit controls disabled');
for (const name of ['Edit Matrix', 'Edit Rules', 'Manage', 'Configure', 'Add Rule', 'View All']) assert.ok(buttons.some(node => text(node.props.children) === name), name);
assert.ok(buttons.find(node => node.props['aria-label'] === 'Notification toggle unavailable').props['aria-checked'] === undefined, 'Unknown rule is not an enabled/off assertion');
assert.ok(tree.filter(node => node.type === 'details').length >= 3, 'Native read-only disclosures for reviews, Hub evidence and extra policies');
assert.ok(tree.find(node => node.type === 'a' && node.props.href === '/integration-hub'), 'Verified Integration Hub navigation');
const checks = tree.find(node => node.type === 'aside'); assert.ok(!JSON.stringify(checks).includes('text-green') && !JSON.stringify(checks).includes('text-emerald'), 'No false green configuration checks');
console.log('IMG-06 UI PASS: all 11 panels, 25 classification cells, exact identities/dictionaries, no invented scores/probabilities/thresholds/roles, scoped saved dates and native Hub states, unavailable/stale/error isolation, disabled editing and native read disclosures.');
if (process.env.RISK_IMG06_RENDER_ARTIFACTS === '1') {
  for (const [name, markup] of [['unavailable', absent], ['synthetic-layout-only', html]]) fs.writeFileSync(path.join(dir, name + '.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="render.css"><title>IMG-06 isolated verification</title></head><body><main style="padding:16px;max-width:1680px;margin:auto"><p>ISOLATED SYNTHETIC VERIFICATION ONLY — No operational records or APIs.</p>' + markup + '</main><script>addEventListener("load",()=>{const ds=[...document.querySelectorAll("details")];ds.forEach(d=>d.querySelector("summary").click());document.documentElement.dataset.disclosuresOpen=ds.every(d=>d.open);document.documentElement.dataset.viewport=innerWidth;document.documentElement.dataset.scrollWidth=document.documentElement.scrollWidth;document.documentElement.dataset.bodyOverflow=document.documentElement.scrollWidth>innerWidth;});</script></body></html>');
}
