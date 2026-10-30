// Offline rendering/navigation only. No operational requests, storage or engineering records.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const frontend=path.resolve(__dirname,'..'),ts=require(path.join(frontend,'node_modules/typescript')),React=require(path.join(frontend,'node_modules/react'));
const{renderToStaticMarkup}=require(path.join(frontend,'node_modules/react-dom/server'));
let hooks=false,index=0,slots=[false,'Overview'];const original=Module._load;
const hooked={...React,useState(initial){const slot=index++;if(slots[slot]===undefined)slots[slot]=initial;return[slots[slot],value=>{slots[slot]=value;}];}};
Module._load=function(request,parent,main){if(request==='react'&&hooks)return hooked;if(request==='next/navigation')return{useRouter:()=>({replace(){}})};if(request==='@/lib/apiClient')return new Proxy({},{get:()=>()=>{throw Error('Operational request prohibited');}});if(request==='@/components/pipeline-selector')return{PipelineSelector:()=>null};return original.call(this,request.startsWith('@/')?path.join(frontend,'src',request.slice(2)):request,parent,main);};
for(const ext of['.ts','.tsx'])require.extensions[ext]=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);
const{AiInspectionPrioritization}=require(path.join(frontend,'src/components/ai-inspection-prioritization.tsx'));
const render=props=>renderToStaticMarkup(React.createElement(AiInspectionPrioritization,props)),markup=render({});
for(const label of['Inspection Prioritization','Ranked Inspection Recommendations (N/A)','Priority Score','Predicted Risk','Inspection Due','Inspection Type','Recommended Method','Remaining Life','Confidence','Actions','Priority Heat Map','Recommended Inspection Locations','Recommendation Rationale','Key Drivers','AI Confidence','Recommended Action','Model Run ID','Input Snapshot ID','Action_ID'])assert.ok(markup.includes(label),label);
for(const example of['KP-1023','STA 12+340','98</','92%','2.1 yrs','Apr 22, 2025','May 15, 2025','within 30 days','36 recommendations','Riverton','Clearwater'])assert.ok(!markup.includes(example),'No reference example: '+example);
assert.equal((markup.match(/<select /g)||[]).length,6);
assert.equal((markup.match(/<td class="border border-white bg-slate-100/g)||[]).length,16,'No synthetic heat-map counts/severity');
assert.ok(markup.includes('N/A is not a zero-recommendation count'));
assert.ok(markup.includes('never an approved schedule')&&markup.includes('Engineer acceptance'));
assert.ok(render({loading:true}).includes('Loading source readiness'));
assert.ok(render({failed:true}).includes('Source readiness unavailable'));
hooks=true;const{AiImg02Overview}=require(path.join(frontend,'src/components/ai-predictions-workspace.tsx'));
function tree(){index=0;return AiImg02Overview({readiness:null,loading:false,failed:false,children:React.createElement('p',null,'Preserved historical context')});}
function button(node,label){if(!node||typeof node!=='object')return null;if(node.type==='button'&&node.props.children===label)return node;for(const child of React.Children.toArray(node.props?.children)){const found=button(child,label);if(found)return found;}return null;}
let view=tree();assert.equal(button(view,'Inspection Prioritization').props.disabled,false);button(view,'Inspection Prioritization').props.onClick();
const inspection=tree(),snapshot=renderToStaticMarkup(inspection);assert.ok(snapshot.includes('data-ai-img05="inspection-prioritization"'));assert.ok(!snapshot.includes('Predicted Risk Hotspots'));
for(const label of['Configuration'])assert.equal(button(inspection,label).props.disabled,false);
button(inspection,'Deterioration Trends').props.onClick();assert.ok(renderToStaticMarkup(tree()).includes('data-ai-img04="deterioration-trends"'));
button(tree(),'Prediction Results').props.onClick();assert.ok(renderToStaticMarkup(tree()).includes('data-ai-img03="prediction-results"'));
button(tree(),'Overview').props.onClick();assert.ok(renderToStaticMarkup(tree()).includes('Preserved historical context'));
if(process.argv[2]){const dir=path.resolve(process.argv[2]);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'inspection-markup.html'),snapshot);}
console.log('AI IMG-05 PASS: four-tab navigation/preservation, N/A recommendations/counts/heatmap/GIS, missing lineage slots, advisory-only scheduling, loading/failure states, no fabricated records or scores. No operational requests.');
