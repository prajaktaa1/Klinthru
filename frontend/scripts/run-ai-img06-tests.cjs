// Isolated view/navigation checks only. No operational API or source mutation is allowed.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const frontend=path.resolve(__dirname,'..'),ts=require(path.join(frontend,'node_modules/typescript')),React=require(path.join(frontend,'node_modules/react'));
const{renderToStaticMarkup}=require(path.join(frontend,'node_modules/react-dom/server'));
const original=Module._load;let hooks=false,index=0,slots=[false,'Overview'];
const hooked={...React,useState(initial){const slot=index++;if(slots[slot]===undefined)slots[slot]=initial;return[slots[slot],value=>{slots[slot]=value;}];}};
Module._load=function(request,parent,main){if(request==='react'&&hooks)return hooked;if(request==='next/navigation')return{useRouter:()=>({replace(){}})};if(request==='@/lib/apiClient')return new Proxy({},{get:()=>()=>{throw Error('Operational request prohibited');}});if(request==='@/components/pipeline-selector')return{PipelineSelector:()=>null};return original.call(this,request.startsWith('@/')?path.join(frontend,'src',request.slice(2)):request,parent,main);};
for(const ext of['.ts','.tsx'])require.extensions[ext]=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);
const{AiScenarioAnalysis}=require(path.join(frontend,'src/components/ai-scenario-analysis.tsx'));
const render=props=>renderToStaticMarkup(React.createElement(AiScenarioAnalysis,props)),markup=render({});
for(const label of['1. Base Case','2. Increased Pressure Cycle','3. Improved CP','4. Delayed Inspection','5. Mitigation Scenario','Pressure Cycle (cycles/day)','CP Effectiveness (%)','Next Inspection (months)','Projected Defect Growth','Projected Remaining Life','Risk Change by Scenario','AI Recommendation','Key Benefits vs. Base Case','View Full Analysis','Download Scenario Report','Base Snapshot ID','Model Run ID','Input Snapshot ID'])assert.ok(markup.includes(label),label);
assert.equal((markup.match(/value="N\/A"/g)||[]).length,15,'No baseline/parameter defaults');
assert.equal((markup.match(/slider unavailable/g)||[]).length,5,'Unconfigured sliders have no thumb/default numeric range');
assert.equal((markup.match(/>Apply Scenario<\/button>/g)||[]).length,4);
assert.ok(!markup.includes('<polyline')&&!markup.includes('<polygon')&&!markup.includes('type="range"'));
for(const example of['value="3"','value="85"','value="95"','value="24"','+52%','-38%','-45%','-62%','+6 years','Moderate','Mitigation Scenario is the recommended strategy'])assert.ok(!markup.includes(example),'No unverified reference result: '+example);
assert.ok(markup.includes('No live records are changed')&&markup.includes('no scenario clone created'));
assert.ok(render({loading:true}).includes('Loading source readiness'));
assert.ok(render({failed:true}).includes('Source readiness unavailable'));
hooks=true;const{AiImg02Overview}=require(path.join(frontend,'src/components/ai-predictions-workspace.tsx'));
function tree(){index=0;return AiImg02Overview({readiness:null,loading:false,failed:false,children:React.createElement('p',null,'Preserved historical source context')});}
function button(node,label){if(!node||typeof node!=='object')return null;if(node.type==='button'&&node.props.children===label)return node;for(const child of React.Children.toArray(node.props?.children)){const found=button(child,label);if(found)return found;}return null;}
const overview=tree();assert.equal(button(overview,'Scenario Analysis').props.disabled,false);button(overview,'Scenario Analysis').props.onClick();
const scenario=tree(),snapshot=renderToStaticMarkup(scenario);assert.ok(snapshot.includes('data-ai-img06="scenario-analysis"'));assert.ok(!snapshot.includes('Predicted Risk Hotspots'));
for(const tab of['Configuration'])assert.equal(button(scenario,tab).props.disabled,false);
for(const[tab,attribute]of[['Inspection Prioritization','data-ai-img05'],['Deterioration Trends','data-ai-img04'],['Prediction Results','data-ai-img03']]){button(tree(),tab).props.onClick();assert.ok(renderToStaticMarkup(tree()).includes(attribute));}
button(tree(),'Overview').props.onClick();assert.ok(renderToStaticMarkup(tree()).includes('Preserved historical source context'));
if(process.argv[2]){const dir=path.resolve(process.argv[2]);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'scenario-markup.html'),snapshot);}
console.log('AI IMG-06 PASS: five-tab navigation/preservation, 15 N/A inputs, five unavailable slider tracks, blocked Apply/report/analysis, no simulated values/default bounds or source writes. No execution/clone provider exists; sandbox runtime verification remains blocked.');
