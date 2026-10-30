// Isolated rendering/state checks. Operational requests are prohibited.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const frontend=path.resolve(__dirname,'..'),ts=require(path.join(frontend,'node_modules/typescript')),React=require(path.join(frontend,'node_modules/react'));
const {renderToStaticMarkup}=require(path.join(frontend,'node_modules/react-dom/server'));
const load=Module._load;let fakeHooks=false,slots=[false,'Overview'],index=0;
const hooked={...React,useState(initial){const slot=index++;if(slots[slot]===undefined)slots[slot]=initial;return[slots[slot],value=>{slots[slot]=value;}];}};
Module._load=function(request,parent,main){
 if(request==='react'&&fakeHooks)return hooked;
 if(request==='next/navigation')return{useRouter:()=>({replace(){}})};
 if(request==='@/lib/apiClient')return new Proxy({},{get:()=>()=>{throw new Error('Operational request prohibited');}});
 if(request==='@/components/pipeline-selector')return{PipelineSelector:()=>null};
 return load.call(this,request.startsWith('@/')?path.join(frontend,'src',request.slice(2)):request,parent,main);
};
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);
const {AiDeteriorationTrends}=require(path.join(frontend,'src/components/ai-deterioration-trends.tsx'));
const render=props=>renderToStaticMarkup(React.createElement(AiDeteriorationTrends,props));
const markup=render({});
for(const title of ['Corrosion Growth Trend','Wall-Thickness Decline','Defect Growth Trend','Remaining Life Projection','Risk Trajectory Over Time','Historical','AI Predicted','Confidence Band','Prediction Start Date','Model Version','Input Snapshot ID','AI Insights','Recommendation'])assert.ok(markup.includes(title),title);
assert.equal((markup.match(/<select /g)||[]).length,5);
assert.equal((markup.match(/<svg viewBox="0 0 400 160"/g)||[]).length,5);
for(const example of ['v2.3','6 mm','5 years','68%','85%','43%','Segment A-12','Apr 28, 2025','2020','2045'])assert.ok(!markup.includes(example),'No unapproved reference value: '+example);
assert.ok(!markup.includes('<polyline')&&!markup.includes('<polygon'),'No synthetic points or confidence bounds');
assert.ok(markup.includes('scale not approved')&&markup.includes('Critical Threshold: N/A'));
const actual=React.createElement('p',null,'Isolated stored-source context');
assert.ok(render({historicalContext:actual}).includes('Isolated stored-source context'));
assert.ok(!render({historicalContext:actual,loading:true}).includes('Isolated stored-source context'));
assert.ok(!render({historicalContext:actual,failed:true}).includes('Isolated stored-source context'));
fakeHooks=true;
const{AiImg02Overview}=require(path.join(frontend,'src/components/ai-predictions-workspace.tsx'));
function tree(){index=0;return AiImg02Overview({readiness:null,loading:false,failed:false,children:React.createElement('p',null,'Retained source workspace')});}
function find(node,label){if(!node||typeof node!=='object')return null;if(node.type==='button'&&node.props.children===label)return node;for(const child of React.Children.toArray(node.props?.children)){const result=find(child,label);if(result)return result;}return null;}
let view=tree();assert.equal(find(view,'Deterioration Trends').props.disabled,false);find(view,'Deterioration Trends').props.onClick();
const trends=tree(),snapshot=renderToStaticMarkup(trends);assert.ok(snapshot.includes('data-ai-img04="deterioration-trends"'));assert.ok(!snapshot.includes('Predicted Risk Hotspots'));
assert.equal(find(trends,'Inspection Prioritization').props.disabled,false);
find(trends,'Prediction Results').props.onClick();assert.ok(renderToStaticMarkup(tree()).includes('data-ai-img03="prediction-results"'));
find(tree(),'Overview').props.onClick();assert.ok(renderToStaticMarkup(tree()).includes('Retained source workspace'));
if(process.argv[2]){const dir=path.resolve(process.argv[2]);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'trends-markup.html'),snapshot);}
console.log('AI IMG-04 PASS: historical/forecast separation, unavailable intervals/thresholds/models, source-context loading/failure suppression, three-tab navigation, no synthetic forecasts or snapshot examples. No operational requests.');
