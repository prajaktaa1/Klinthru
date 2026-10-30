// Isolated SSR/control verification. All operational API access is blocked.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const frontend = path.resolve(__dirname, '..'), stage = process.argv[2] || 'drivers';
const ts = require(path.join(frontend, 'node_modules/typescript')), load = Module._load;
Module._load = function(request, parent, main) {
  if (request === '@/lib/apiClient') return new Proxy({}, { get: () => () => { throw new Error('Operational API requests prohibited'); } });
  return load.call(this, request.startsWith('@/') ? path.join(frontend, 'src', request.slice(2)) : request, parent, main);
};
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
const React = require(path.join(frontend, 'node_modules/react')), { renderToStaticMarkup } = require(path.join(frontend, 'node_modules/react-dom/server'));
function nodes(node, out = []) { if (!node || typeof node !== 'object') return out; if (Array.isArray(node)) { node.forEach(n => nodes(n, out)); return out; } if (typeof node.type === 'function') return nodes(node.type(node.props), out); out.push(node); nodes(node.props?.children, out); return out; }
let Component, props, titles;
if (stage === 'drivers') {
  Component = require(path.join(frontend, 'src/components/risk-drivers-workspace.tsx')).RiskDriversView;
  let selected;
  props = { data: null, loading: false, error: null, insight: 'Overview', onInsight: v => { selected = v; } };
  titles = ['Risk Drivers by Category', 'Contributing Factors', 'Barrier Effectiveness', 'Operating Condition Influence', 'Corrosion Contribution', 'Third Party Activity', 'Geohazard Exposure', 'Top Driver Trends', 'Top Risk Drivers (Ranked)', 'Selected Driver Insights'];
  const tree = nodes(Component(props)); tree.find(n => n.props?.role === 'tab' && n.props.children === 'Affected Assets').props.onClick(); assert.equal(selected, 'Affected Assets');
  assert.ok(tree.filter(n => n.type === 'select').every(n => n.props.disabled));
}
if (stage === 'register') {
  Component = require(path.join(frontend, 'src/components/risk-register-workspace.tsx')).RiskRegisterView;
  const {filterRegisterRows} = require(path.join(frontend,'src/lib/risk-remaining-types.ts'));
  let filter, page, selection;
  const rows=Array.from({length:12},(_,i)=>({riskId:`fixture-risk-${i}`,title:`Saved title ${i}`,pipelineId:'fixture-pipeline',pipelineName:'Native pipeline',pipelineCode:'native-code',sourceCategory:'native-source',category:i===11?'category-b':'category-a',status:'native-open',revisionId:`revision-${i}`,assessmentDate:'2038-01-01Z',inherent:{likelihood:3,consequence:2,score:6,level:'native-medium'},current:{likelihood:2,consequence:2,score:4,level:'native-low'},residual:{likelihood:1,consequence:2,score:2,level:'native-low'},ownerName:'Native owner',segmentLabel:'Native location',nextReview:'2038-02-01',linkedDefectId:null}));
  const filters={q:'',pipeline:'',segment:'',category:'',statuses:[]};
  const data={scope:{pipelineId:null,methodologyVersionId:'method'},status:'available',reason:null,context:null,rows,metadataReason:null};
  props={data,loading:false,error:null,filters,basis:'current',page:1,pageSize:10,selectedId:'fixture-risk-0',detail:null,detailLoading:false,fullHistory:false,onFilters:v=>filter=v,onBasis:()=>{},onPage:v=>page=v,onPageSize:()=>{},onSelect:v=>selection=v,onHistory:()=>{}};
  titles=['Risk Register','Saved View','Save View','Column Settings','All Pipelines','All Segments','All Categories','All Statuses','More Filters','Bulk Actions','Risk Status Summary','Risk Details','Recent Activity','Rows per page:','Linked Defect ID'];
  assert.equal(filterRegisterRows(rows,{...filters,category:'category-b'}).length,1);
  assert.equal(filterRegisterRows(rows,{...filters,q:'fixture-risk-11'}).length,1);
  const tree=nodes(Component(props)); tree.find(n=>n.props?.['aria-label']==='Search risks').props.onChange({target:{value:'native'}});assert.equal(filter.q,'native');
  tree.find(n=>n.type==='button'&&n.props.children==='Next').props.onClick();assert.equal(page,2);
  tree.find(n=>n.type==='button'&&n.props.children==='fixture-risk-0').props.onClick();assert.equal(selection,'fixture-risk-0');
  const markup=renderToStaticMarkup(React.createElement(Component,props));assert.ok(markup.includes('Showing 1–10 of 12 risks'));assert.ok(!markup.includes('Saved title 11'));
  assert.ok(renderToStaticMarkup(React.createElement(Component,{...props,page:2})).includes('Showing 11–12 of 12 risks'));
  assert.ok(!renderToStaticMarkup(React.createElement(Component,{...props,loading:true})).includes('Native owner'));
  // Isolated saved-event DTOs: recent preview must show newest entries without mutating history.
  const history=Array.from({length:7},(_,i)=>({id:`event-${i}`,label:`Recorded activity ${i}`,at:`2038-01-0${i+1}T00:00:00.000Z`,actorId:null,actorName:null}));
  const historyProps={...props,detail:{item:{riskId:'fixture-risk-0',revisionId:'revision-0',methodology:{id:'method'},matrix:{id:'matrix'},history}},data:{...data,context:{methodology:{id:'method'},matrix:{id:'matrix'}}}};
  const activities=value=>nodes(Component(value)).filter(n=>n.type==='time').map(n=>n.props.children[0]);
  assert.deepEqual(activities(historyProps),history.slice(-4).reverse().map(e=>e.at));
  assert.deepEqual(activities({...historyProps,fullHistory:true}),history.slice().reverse().map(e=>e.at));
  assert.deepEqual(history.map(e=>e.id),Array.from({length:7},(_,i)=>`event-${i}`));
  assert.equal(activities({...historyProps,detailLoading:true}).length,0);
  assert.equal(activities({...historyProps,detail:{item:{...historyProps.detail.item,revisionId:'other-revision'}}}).length,0);
}
if (stage === 'history') {
  Component = require(path.join(frontend,'src/components/risk-history-workspace.tsx')).RiskHistoryView;
  let risk, revision, reset;
  const selected={riskId:'fixture-risk',revisionId:'fixture-revision',revisionNumber:1,approvalStatus:'Approved',historical:true,assessmentDate:'2038-01-01Z',methodology:{id:'method',methodologyId:'saved-method',name:'Saved method',version:'saved-version'},matrix:{id:'matrix',matrixId:'saved-matrix',version:'saved-matrix-version'},results:{inherent:{likelihood:3,consequence:2,score:6,level:'saved-medium'},current:{likelihood:2,consequence:2,score:4,level:'saved-low'},residual:{likelihood:1,consequence:2,score:2,level:'saved-low'}},reviews:[],history:[{id:'fixture-event',label:'Saved historical approval',at:'2038-01-02Z',actorId:null,actorName:'Recorded actor',justification:'Recorded evidence'}]};
  props={data:{scope:{pipelineId:null,methodologyVersionId:'method'},status:'partial',reason:'Missing aggregate policy',context:null,options:{status:'available',reason:null,items:[{riskId:'fixture-risk',revisions:[{revisionId:'fixture-revision',revisionNumber:1,status:'Approved',assessmentDate:'2038-01-01Z'}]}]},selected,selectedReason:null},loading:false,error:null,riskId:'fixture-risk',revisionId:'fixture-revision',fullHistory:false,onRisk:v=>risk=v,onRevision:v=>revision=v,onHistory:()=>{},onReset:()=>reset=true};
  titles=['Total Risk Trend','Risk Trend by Pipeline','Risk Trend by Category','Risk Trend by Source','Review Cadence','Monthly Risk Heat Map','Notable Changes & Events','Overdue Trend','Historical Milestones','Saved Assessment Revision'];
  const tree=nodes(Component(props));tree.find(n=>n.props?.['aria-label']==='Historical Risk ID').props.onChange({target:{value:'other-risk'}});assert.equal(risk,'other-risk');tree.find(n=>n.props?.['aria-label']==='Historical revision').props.onChange({target:{value:'other-revision'}});assert.equal(revision,'other-revision');tree.find(n=>n.type==='button'&&n.props.children==='Reset').props.onClick();assert.ok(reset);
  const markup=renderToStaticMarkup(React.createElement(Component,props));assert.ok(markup.includes('Saved historical approval')&&markup.includes('saved-matrix-version'));assert.ok(markup.includes('saved score 6')&&markup.includes('saved score 4')&&markup.includes('saved score 2'));assert.ok(!renderToStaticMarkup(React.createElement(Component,{...props,revisionId:'other-revision'})).includes('Recorded actor'));
}
if (stage === 'reports') {
  Component = require(path.join(frontend,'src/components/risk-reports-workspace.tsx')).RiskReportsView;
  let search, category, selected;
  props={data:null,loading:false,error:null,q:'',category:'',selected:'Risk Summary Report',onSearch:v=>search=v,onCategory:v=>category=v,onRequest:v=>selected=v};
  titles=['Report Templates','Report Categories','Report Preview','Scheduled Reports','Recent Reports','Export PDF','Export Excel','Schedule Delivery','Risk Distribution by Category'];
  const tree=nodes(Component(props));tree.find(n=>n.props?.['aria-label']==='Search requested report types').props.onChange({target:{value:'matrix'}});assert.equal(search,'matrix');
  tree.find(n=>n.props?.['aria-label']==='Report request category').props.onChange({target:{value:'Risk Analysis'}});assert.equal(category,'Risk Analysis');
  tree.find(n=>n.type==='button'&&n.props?.['aria-pressed']===false&&n.props?.onClick&&nodes(n.props.children).some(c=>c.type==='strong'&&c.props.children==='Risk Matrix Report')).props.onClick();assert.equal(selected,'Risk Matrix Report');
  assert.ok(tree.filter(n=>n.type==='button'&&(!n.props.onClick)).every(n=>n.props.disabled));
  const filtered=renderToStaticMarkup(React.createElement(Component,{...props,q:'matrix'}));assert.ok(filtered.includes('Visual risk matrix'));assert.ok(!filtered.includes('Complete risk register with all risk details'));
  assert.ok(tree.some(n=>n.type==='a'&&n.props.href==='/report'));
}
assert.ok(Component, 'Unknown verification stage');
const html = renderToStaticMarkup(React.createElement(Component, props));
for (const title of titles) assert.ok(html.includes(title.replaceAll('&','&amp;')), title);
assert.ok(html.includes('MISSING FIELD')); for (const value of ['R-00123', '324', 'John Doe']) assert.ok(!html.includes(value), value);
console.log(`IMG stage ${stage}: SSR, visible sections, unavailable states and read-only interaction checks PASS.`);
if (process.env.RISK_REMAINING_RENDER === '1') {
  const dir = path.resolve(frontend, '../tmp/risk-remaining-review', stage); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'unavailable.html'), '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="../render.css"></head><body><main style="padding:16px;max-width:1680px;margin:auto"><p>ISOLATED VERIFICATION — no operational data</p>'+html+'</main><script>addEventListener("load",()=>{document.documentElement.dataset.overflow=document.documentElement.scrollWidth>innerWidth})</script></body></html>');
}
