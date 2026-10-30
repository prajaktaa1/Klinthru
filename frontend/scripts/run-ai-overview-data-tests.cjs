// Isolated source DTO/render checks only. Operational requests are prohibited.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
process.env.DATABASE_URL='';process.env.NODE_ENV='test';
const frontend=path.resolve(__dirname,'..'),root=path.resolve(frontend,'..');
const ts=require(path.join(frontend,'node_modules/typescript'));
let states=[], index=0, effects=[], updates=[], unauthorized=false;
const React=require(path.join(frontend,'node_modules/react'));
const react={...React,useState:initial=>{const slot=index++;return [states[slot] ?? (typeof initial==='function'?initial():initial),value=>updates.push({slot,value})];},useEffect:fn=>effects.push(fn),useMemo:fn=>fn()};
const load=Module._load;
Module._load=function(request,parent,main){
  if(request==='react') return react;
  if(request==='next/navigation') return {useRouter:()=>({replace:()=>{}})};
  if(request==='@/lib/apiClient') return new Proxy({}, {get:(_,name)=>name==='isUnauthorizedError'?error=>error?.isolatedUnauthorized===true:()=>{if(unauthorized)return Promise.reject({isolatedUnauthorized:true});throw new Error('Operational API prohibited');}});
  if(request==='@/components/pipeline-selector') return {PipelineSelector:()=>React.createElement('div',null,'Existing selector')};
  return load.call(this,request.startsWith('@/')?path.join(frontend,'src',request.slice(2)):request,parent,main);
};
for(const ext of ['.ts','.tsx']) require.extensions[ext]=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);
const {scopedAiGrowth,scopedAiCp,aiCpHistoricalSeries}=require(path.join(frontend,'src/lib/ai-predictions-bindings.ts'));
// Deliberately small DTOs test subject identity, never engineering calculations.
const result={pipelineId:'subject-a',featureId:'feature-only',status:'calculated',earlierInspectionDate:'2030-01-01T00:00:00Z',laterInspectionDate:'2031-01-01T00:00:00Z',earlierDepth:1,laterDepth:2,growthRate:1,growthRateUnit:'mm/year',rul:7,rulUnit:'years',reason:'Recorded source context'};
const growth={pipelineId:'subject-a',featureId:'feature-only',growth:result,rul:{...result,criterion:{threshold:null}}};
const cp={pipelineId:'subject-a',pipeline:{id:'subject-a'}};
const saved=JSON.stringify(growth);
assert.equal(scopedAiGrowth('subject-a',growth),growth);
assert.equal(scopedAiGrowth('subject-b',growth),null);
assert.equal(scopedAiGrowth(undefined,growth),null);
assert.equal(scopedAiGrowth('subject-a',{...growth,rul:{...growth.rul,pipelineId:'other'}}),null);
assert.equal(scopedAiGrowth('subject-a',{...growth,rul:{...growth.rul,featureId:'other-feature'}}),null);
assert.equal(scopedAiGrowth('subject-a',{...growth,featureId:null}),null,'Calculated growth needs complete feature identity');
assert.equal(scopedAiGrowth('subject-a',{...growth,growth:{...result,featureId:null}}),null);
assert.equal(scopedAiGrowth('subject-a',{...growth,growth:{...result,pipelineId:null}}),null);
assert.equal(scopedAiGrowth('subject-a',{...growth,rul:{...growth.rul,pipelineId:null}}),null);
assert.equal(scopedAiGrowth('subject-a',{...growth,featureId:null,growth:{...result,featureId:null},rul:{...growth.rul,featureId:null}}),null);
assert.equal(scopedAiGrowth('subject-a',{...growth,featureId:undefined,growth:{...result,featureId:undefined},rul:{...growth.rul,featureId:undefined}}),null);
const unavailableGrowth={pipelineId:'subject-a',featureId:null,growth:{pipelineId:null,featureId:null,status:'insufficient_history'},rul:{pipelineId:null,featureId:null}};
assert.equal(scopedAiGrowth('subject-a',unavailableGrowth),unavailableGrowth,'Unavailable responses need no fabricated feature');
assert.equal(scopedAiCp('subject-a',cp),cp);assert.equal(scopedAiCp('subject-b',cp),null);
assert.equal(scopedAiCp('subject-a',{...cp,pipelineId:'other'}),null);assert.equal(JSON.stringify(growth),saved);
const {evaluateAiPredictionsReadiness}=require(path.join(root,'backend/src/aiPredictions/readiness.ts'));
const readiness=evaluateAiPredictionsReadiness({assessmentCount:0,pipelineCount:0,deviceRecordCount:0,cpReadingCount:0,comparableCpSeriesCount:0,iliSchemaAvailable:false,correlatedIliDefectCount:0});
const {AiPredictionsWorkspace}=require(path.join(frontend,'src/components/ai-predictions-workspace.tsx'));
const {renderToStaticMarkup}=require(path.join(frontend,'node_modules/react-dom/server'));
function render(pipeline='subject-a',failed=false,cpRead=null){
  states=['real',readiness,{id:pipeline},growth,'success',null,cpRead,cpRead?'success':'idle',null,false,failed];index=0;effects=[];
  return renderToStaticMarkup(React.createElement(AiPredictionsWorkspace,{mode:'real'}));
}
const current=render();
assert.ok(current.includes('Backend ILI depth values'));
assert.ok(current.includes('not a pipeline average')&&current.includes('not a portfolio maximum'));
assert.ok(!current.includes('7.0 years')&&!current.includes('1.000 mm/year'),'A feature is not a portfolio KPI');
assert.ok(!render('subject-b').includes('Backend ILI depth values'),'Scope change hides stale data before effects');
assert.ok(!render('subject-a',true).includes('Backend ILI depth values'),'Failed readiness cannot expose cached source data');
for(const forbidden of ['F-005','11.4 years','TP-05, -690 mV','AI-2026-001']) assert.ok(!current.includes(forbidden));
assert.ok(!current.includes('87%'),'No demo model confidence in real output');
assert.ok(current.includes('disabled=""'));
// Isolated native history metadata; no criterion or model-derived value is generated.
const observation=(id,date,value)=>({id,testPointId:'point-a',measurementType:'ON_POTENTIAL',referenceElectrode:'AgAgCl',readingAt:date,valueMv:value,valueV:null,protectionStatus:'Unknown'});
const cpRead={...cp,trend:[observation('two','2031-01-03T00:00:00Z',-710),observation('one','2031-01-01T00:00:00Z',-700)]};
const original=JSON.stringify(cpRead),series=aiCpHistoricalSeries(cpRead);
assert.equal(series.unit,'mV AgAgCl');assert.deepEqual(series.readings.map(r=>r.id),['one','two']);assert.equal(JSON.stringify(cpRead),original);
const cpMarkup=render('subject-a',false,cpRead);
assert.ok(cpMarkup.includes('mV AgAgCl'));assert.ok(!cpMarkup.includes('mV CSE')&&!cpMarkup.includes('-850 mV criterion'));
for(const field of ['testPointId','measurementType','referenceElectrode']) {
 const mixed={...cpRead,trend:[cpRead.trend[0],{...cpRead.trend[1],[field]:field==='referenceElectrode'?'CSE':'different'}]};
 assert.equal(aiCpHistoricalSeries(mixed).readings.length,0);
 assert.ok(render('subject-a',false,mixed).includes('MISSING FIELD'));
}
assert.equal(aiCpHistoricalSeries({...cpRead,trend:[cpRead.trend[0],{...cpRead.trend[1],valueMv:NaN}]}).readings.length,0);
assert.equal(aiCpHistoricalSeries({...cpRead,trend:[cpRead.trend[0],{...cpRead.trend[1],readingAt:cpRead.trend[0].readingAt}]}).readings.length,0);
assert.equal(aiCpHistoricalSeries({...cpRead,trend:[cpRead.trend[0],{...cpRead.trend[1],id:cpRead.trend[0].id}]}).readings.length,0);
assert.equal(aiCpHistoricalSeries({...cpRead,trend:cpRead.trend.map(r=>({...r,valueMv:0}))}).readings.length,2,'Zero is a stored value');
async function checkAuthorizationLoss() {
 unauthorized=true;
 for(const effectIndex of [1,2]) {
  render();updates=[];effects[effectIndex]();
  await new Promise(resolve=>setImmediate(resolve));
  for(const slot of [1,3,6]) assert.ok(updates.some(u=>u.slot===slot&&u.value===null),'Source401 clears all cached context');
  assert.ok(updates.some(u=>u.slot===10&&u.value===true),'Source401 blocks display until fresh authentication');
 }
 console.log('AI IMG-01 frontend data PASS: scoped reads, 401 cache clearing, homogeneous native CP history/units, blocked ambiguous histories, no universal criterion, no feature-as-aggregate or demo values.');
}
checkAuthorizationLoss().catch(error=>{console.error(error);process.exitCode=1;});
