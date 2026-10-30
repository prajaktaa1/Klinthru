// Offline contract/UI checks only. Operational requests throw; no storage is initialized.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const frontend = path.resolve(__dirname, '..');
const ts = require(path.join(frontend, 'node_modules/typescript'));
const React = require(path.join(frontend, 'node_modules/react'));
const { renderToStaticMarkup } = require(path.join(frontend, 'node_modules/react-dom/server'));
const originalLoad = Module._load;
let testNavigation = false, slots = [false, 'Overview'], index = 0;
const hookedReact = {...React, useState(initial) { const slot = index++; if (slots[slot] === undefined) slots[slot] = initial; return [slots[slot], value => { slots[slot] = value; }]; }};
Module._load = function(request, parent, main) {
  if (request === 'react' && testNavigation) return hookedReact;
  if (request === 'next/navigation') return {useRouter: () => ({replace() {}})};
  if (request === '@/lib/apiClient') return new Proxy({}, {get: () => () => {throw new Error('Operational API prohibited');}});
  if (request === '@/components/pipeline-selector') return {PipelineSelector: () => null};
  return originalLoad.call(this, request.startsWith('@/') ? path.join(frontend, 'src', request.slice(2)) : request, parent, main);
};
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {fileName: filename, compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true}}).outputText, filename);
const {AiPredictionResults} = require(path.join(frontend, 'src/components/ai-prediction-results.tsx'));
const render = props => renderToStaticMarkup(React.createElement(AiPredictionResults, props));
const markup = render({});
for (const field of ['Prediction ID','Pipeline','Segment','KPI Range (km)','Prediction Type','Predicted Outcome','Time Horizon','Confidence','Status','Generated On','Actions','Model Run ID','Model Version','Input Snapshot ID','Feature Set Version','Source Lineage','Reviewer','Review Status']) assert.ok(markup.includes(field),field);
for (const example of ['AI-2024-001','Northeast Line','SEG-12A','92%','124 results','28</','Mar 15, 2024']) assert.ok(!markup.includes(example),'No reference record: '+example);
assert.equal((markup.match(/<select /g)||[]).length,6);
assert.equal((markup.match(/<table /g)||[]).length,1);
assert.ok(markup.includes('Showing N/A results') && markup.includes('N/A is not a zero-result count'));
assert.ok(markup.includes('View Full Analysis') && markup.includes('disabled=""'));
assert.ok(render({loading:true}).includes('Loading source readiness'));
assert.ok(render({failed:true}).includes('Source readiness unavailable'));
// Exercise the real tab event handlers and render again with their state updates.
testNavigation = true;
const {AiImg02Overview} = require(path.join(frontend, 'src/components/ai-predictions-workspace.tsx'));
function tree() { index=0; return AiImg02Overview({readiness:null,loading:false,failed:false,children:React.createElement('p',null,'Preserved source context')}); }
function button(node,label) {
  if (!node || typeof node!=='object') return null;
  if (node.type==='button' && node.props.children===label) return node;
  for (const child of React.Children.toArray(node.props?.children)) {const found=button(child,label); if(found)return found;}
  return null;
}
let overview=tree();
assert.ok(renderToStaticMarkup(overview).includes('Predicted Risk Hotspots'));
assert.equal(button(overview,'Prediction Results').props.disabled,false);
button(overview,'Prediction Results').props.onClick();
let results=tree(), resultMarkup=renderToStaticMarkup(results);
assert.ok(resultMarkup.includes('data-ai-img03="prediction-results"'));
assert.ok(!resultMarkup.includes('Predicted Risk Hotspots'));
assert.equal(button(results,'Deterioration Trends').props.disabled,false);
assert.equal(button(results,'Inspection Prioritization').props.disabled,false);
for (const tab of ['Configuration']) assert.equal(button(results,tab).props.disabled,false);
button(results,'Overview').props.onClick();
assert.ok(renderToStaticMarkup(tree()).includes('Preserved source context'));
if (process.argv[2]) {const output=path.resolve(process.argv[2]);fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'results-markup.html'),resultMarkup);}
console.log('AI IMG-03 PASS: no synthetic rows/counts/confidence, blocked unavailable controls, complete lineage slots, loading/error states, Results/Overview navigation and preserved source context. No operational requests.');
