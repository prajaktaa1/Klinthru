// Offline configuration UI/state checks. No settings writes, training or notifications.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const frontend=path.resolve(__dirname,'..'),ts=require(path.join(frontend,'node_modules/typescript')),React=require(path.join(frontend,'node_modules/react'));
const{renderToStaticMarkup}=require(path.join(frontend,'node_modules/react-dom/server'));
const original=Module._load;let hooks=false,index=0,slots=[];
const hooked={...React,useState(initial){if(!hooks)return React.useState(initial);const slot=index++;if(slots[slot]===undefined)slots[slot]=initial;return[slots[slot],value=>{slots[slot]=typeof value==='function'?value(slots[slot]):value;}];}};
Module._load=function(request,parent,main){if(request==='react')return hooked;if(request==='next/navigation')return{useRouter:()=>({replace(){}})};if(request==='@/lib/apiClient')return new Proxy({},{get:()=>()=>{throw Error('Operational request prohibited');}});if(request==='@/components/pipeline-selector')return{PipelineSelector:()=>null};return original.call(this,request.startsWith('@/')?path.join(frontend,'src',request.slice(2)):request,parent,main);};
for(const ext of['.ts','.tsx'])require.extensions[ext]=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);
const{AiConfiguration}=require(path.join(frontend,'src/components/ai-configuration.tsx'));
const render=props=>renderToStaticMarkup(React.createElement(AiConfiguration,props)),markup=render({});
for(const label of['AI Model Settings','Retraining Schedule','Alert Thresholds','Prediction Horizon','Feature Toggles','Data Source Inclusion / Exclusion','Governance &amp; Approval','User Notifications','Reset to Defaults','Discard Changes','Save Configuration','Configuration Version','Input Snapshot ID'])assert.ok(markup.includes(label),label);
for(const example of['Gradient Boosted Trees','v2.3','87%','70%','30%','60%','50%','Monthly','Last 5 years','May 15, 2025','Integrity Manager','AI Governance Team','John Doe','Configuration Valid'])assert.ok(!markup.includes(example),'No screenshot setting/approval: '+example);
assert.equal((markup.match(/<select /g)||[]).length,9);
assert.equal((markup.match(/aria-checked="mixed"/g)||[]).length,13,'Unknown checkboxes are not approved on/off states');
assert.equal((markup.match(/slider unavailable/g)||[]).length,4);assert.ok(!markup.includes('type="range"'),'No invented default slider values/bounds');
assert.ok(markup.includes('candidate retraining')&&markup.includes('explicit human approval before production promotion'));
assert.ok(markup.includes('href="/integration-hub"'));
assert.ok(render({loading:true}).includes('Loading source readiness'));assert.ok(render({failed:true}).includes('Source readiness unavailable'));
const readiness={capabilities:{retraining:{reason:'Isolated native readiness reason'}}};
assert.ok(render({readiness}).includes('Isolated native readiness reason'));
assert.ok(!render({readiness,failed:true}).includes('Isolated native readiness reason'));
assert.ok(!render({readiness,loading:true}).includes('Isolated native readiness reason'));
function text(node){return React.Children.toArray(node).filter(child=>typeof child==='string').join('');}
function find(node,label){if(!node||typeof node!=='object')return null;if(node.type==='button'&&(node.props['aria-label']===label||text(node.props.children)===label))return node;for(const child of React.Children.toArray(node.props?.children)){const found=find(child,label);if(found)return found;}return null;}
hooks=true;slots=['Include'];function config(){index=0;return AiConfiguration({});}
find(config(),'Exclude (N/A)').props.onClick();assert.ok(renderToStaticMarkup(config()).includes('Excluded sources: N/A'));find(config(),'Include (N/A)').props.onClick();assert.ok(renderToStaticMarkup(config()).includes('Inspection Data'));
for(const label of['Reset to Defaults','Discard Changes','Save Configuration'])assert.equal(find(config(),label).props.disabled,true);
slots=[false,'Overview'];const{AiImg02Overview}=require(path.join(frontend,'src/components/ai-predictions-workspace.tsx'));
function tree(){index=0;return AiImg02Overview({readiness:null,loading:false,failed:false,children:React.createElement('p',null,'Preserved native history')});}
const overview=tree();assert.equal(find(overview,'Configuration').props.disabled,false);find(overview,'Configuration').props.onClick();const snapshot=renderToStaticMarkup(tree());assert.ok(snapshot.includes('data-ai-img10="configuration"'));
for(const[tab,attribute]of[['Reports','data-ai-img09'],['Related Data','data-ai-img08'],['Model Performance','data-ai-img07'],['Scenario Analysis','data-ai-img06'],['Inspection Prioritization','data-ai-img05'],['Deterioration Trends','data-ai-img04'],['Prediction Results','data-ai-img03']]){const view=tree();assert.equal(find(view,tab).props.disabled,false);find(view,tab).props.onClick();slots=slots.slice(0,2);assert.ok(renderToStaticMarkup(tree()).includes(attribute));}
find(tree(),'Overview').props.onClick();assert.ok(renderToStaticMarkup(tree()).includes('Preserved native history'));
if(process.argv[2]){const dir=path.resolve(process.argv[2]);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'configuration-markup.html'),snapshot);}
console.log('AI IMG-10 PASS: nine-tab preservation, all eight sections, no invented defaults/thresholds/approvers, unknown checkbox states, disabled writes, candidate validation/human promotion boundary, native readiness gating and source include/exclude view. No operational requests.');
