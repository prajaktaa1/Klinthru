// Local rendering only: no requests, database initialization or operational records.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const frontend = path.resolve(__dirname, '..');
const ts = require(path.join(frontend, 'node_modules/typescript'));
const React = require(path.join(frontend, 'node_modules/react'));
const { renderToStaticMarkup } = require(path.join(frontend, 'node_modules/react-dom/server'));
const load = Module._load;
Module._load = function(request, parent, main) {
  if (request === 'next/navigation') return { useRouter: () => ({replace() {}}) };
  if (request === '@/lib/apiClient') return new Proxy({}, { get: () => () => { throw new Error('Operational request prohibited'); } });
  if (request === '@/components/pipeline-selector') return { PipelineSelector: () => null };
  return load.call(this, request.startsWith('@/') ? path.join(frontend, 'src', request.slice(2)) : request, parent, main);
};
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
const { AiImg02Overview } = require(path.join(frontend, 'src/components/ai-predictions-workspace.tsx'));
const render = props => renderToStaticMarkup(React.createElement(AiImg02Overview, { readiness: null, loading: false, failed: false, ...props }));
const markup = render();
assert.equal((markup.match(/<table /g) || []).length, 3);
assert.equal((markup.match(/aria-current="page"/g) || []).length, 1);
assert.equal((markup.match(/<option>/g) || []).length, 2);
assert.ok(markup.includes('aria-label="AI Predictions tabs"'));
for (const title of ['Prediction Results','Deterioration Trends','Inspection Prioritization','Scenario Analysis','Model Performance','Related Data','Reports','Configuration','Predicted Risk Hotspots','Predicted Defect Count','Remaining Life Distribution','AI Key Insights','Deterioration Trend (Sample Segment)','Quick Actions','Top Predicted High-Risk Segments','Recent AI Predictions','Upcoming AI Analyses']) assert.ok(markup.includes(title), title);
for (const forbidden of ['87%', 'PR-1042', '1,245', '0.92', '~4.2', 'Apr 26, 2025', 'High anomaly scores', 'mV CSE']) assert.ok(!markup.includes(forbidden), 'No invented result: '+forbidden);
assert.ok(markup.includes('N/A') && markup.includes('BLOCKED'));
assert.ok(markup.includes('disabled=""'));
assert.ok(render({ loading: true }).includes('Loading authenticated source readiness'));
assert.ok(render({ failed: true }).includes('Source readiness unavailable'));
assert.ok(markup.includes('AI predictions are advisory'));
if (process.argv[2]) {
  const directory = path.resolve(process.argv[2]);
  fs.mkdirSync(directory, {recursive:true});
  fs.writeFileSync(path.join(directory, 'overview-markup.html'), markup);
}
console.log('AI IMG-02 PASS: reference panels/columns, blocked N/A, disabled unsupported operations, no screenshot records, loading/error states. Rendering only; no operational access.');
