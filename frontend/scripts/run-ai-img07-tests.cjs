// Isolated rendering and tab-state regression; no operational requests or model execution.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const frontend=path.resolve(__dirname,'..'),ts=require(path.join(frontend,'node_modules/typescript')),React=require(path.join(frontend,'node_modules/react'));
const{renderToStaticMarkup}=require(path.join(frontend,'node_modules/react-dom/server'));
const original=Module._load;let hooks=false,index=0,slots=[false,'Overview'];
const hooked={...React,useState(initial){const slot=index++;if(slots[slot]===undefined)slots[slot]=initial;return[slots[slot],value=>{slots[slot]=value;}];}};
Module._load=function(request,parent,main){if(request==='react'&&hooks)return hooked;if(request==='next/navigation')return{useRouter:()=>({replace(){}})};if(request==='@/lib/apiClient')return new Proxy({},{get:()=>()=>{throw Error('Operational request prohibited');}});if(request==='@/components/pipeline-selector')return{PipelineSelector:()=>null};return original.call(this,request.startsWith('@/')?path.join(frontend,'src',request.slice(2)):request,parent,main);};
for(const ext of['.ts','.tsx'])require.extensions[ext]=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);
const{AiModelPerformance}=require(path.join(frontend,'src/components/ai-model-performance.tsx'));
const render=props=>renderToStaticMarkup(React.createElement(AiModelPerformance,props)),markup=render({});
for(const title of['Model Accuracy','Precision','Recall (Sensitivity)','False Positives','False Negatives','Confidence Calibration','Training Data Health','Last Retraining Date','Model Version (Current)','Confidence vs. Actual Outcomes','Model Performance Over Time','Feature Importance','Model Health','Model Governance','Actual-outcome tracking','AI Prediction ID','Actual Record ID','Model Run ID','Input Snapshot ID','Training Data Version','Feature Set Version','Approved By'])assert.ok(markup.includes(title),title);
for(const example of['87.3%','84.6%','81.9%','4.8%','7.1%','0.042','124,532','v2.3.1','99.9%','Gradient Boosted Trees','Data Science Team','Healthy','Good calibration'])assert.ok(!markup.includes(example),'No screenshot model evidence: '+example);
assert.ok(!markup.includes('<polyline')&&!markup.includes('<polygon'),'No invented performance history or point cloud');
assert.ok(markup.includes('Model validation scores, portfolio prediction confidence and individual prediction confidence are separate'));
assert.ok(markup.includes('explicit human approval')&&markup.includes('before production promotion'));
assert.ok(markup.includes('Absence of a source record is not evidence of a negative outcome'));
assert.ok(markup.includes('N/A')&&markup.includes('health not verified'));
assert.ok(render({loading:true}).includes('Loading source readiness'));
assert.ok(render({failed:true}).includes('Source readiness unavailable'));
hooks=true;const{AiImg02Overview}=require(path.join(frontend,'src/components/ai-predictions-workspace.tsx'));
function tree(){index=0;return AiImg02Overview({readiness:null,loading:false,failed:false,children:React.createElement('p',null,'Preserved source history')});}
function button(node,label){if(!node||typeof node!=='object')return null;if(node.type==='button'&&node.props.children===label)return node;for(const child of React.Children.toArray(node.props?.children)){const found=button(child,label);if(found)return found;}return null;}
const overview=tree();assert.equal(button(overview,'Model Performance').props.disabled,false);button(overview,'Model Performance').props.onClick();
const performance=tree(),snapshot=renderToStaticMarkup(performance);assert.ok(snapshot.includes('data-ai-img07="model-performance"'));assert.ok(!snapshot.includes('Predicted Risk Hotspots'));
for(const tab of['Configuration'])assert.equal(button(performance,tab).props.disabled,false);
for(const[tab,attribute]of[['Scenario Analysis','data-ai-img06'],['Inspection Prioritization','data-ai-img05'],['Deterioration Trends','data-ai-img04'],['Prediction Results','data-ai-img03']]){button(tree(),tab).props.onClick();assert.ok(renderToStaticMarkup(tree()).includes(attribute));}
button(tree(),'Overview').props.onClick();assert.ok(renderToStaticMarkup(tree()).includes('Preserved source history'));
if(process.argv[2]){const dir=path.resolve(process.argv[2]);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'performance-markup.html'),snapshot);}
console.log('AI IMG-07 PASS: six-tab navigation/preservation, unavailable metrics/health/approval evidence, validation versus confidence separation, outcome/lineage slots and human promotion boundary. No operational requests or model training.');
