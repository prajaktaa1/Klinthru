// Offline source-link/UI checks: API calls prohibited; no operational records or copies.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const frontend=path.resolve(__dirname,'..'),ts=require(path.join(frontend,'node_modules/typescript')),React=require(path.join(frontend,'node_modules/react'));
const{renderToStaticMarkup}=require(path.join(frontend,'node_modules/react-dom/server'));
const original=Module._load;let hooks=false,index=0,slots=[];
const hooked={...React,useState(initial){if(!hooks)return React.useState(initial);const slot=index++;if(slots[slot]===undefined)slots[slot]=initial;return[slots[slot],value=>{slots[slot]=typeof value==='function'?value(slots[slot]):value;}];}};
Module._load=function(request,parent,main){if(request==='react')return hooked;if(request==='next/navigation')return{useRouter:()=>({replace(){}})};if(request==='@/lib/apiClient')return new Proxy({},{get:()=>()=>{throw Error('Operational request prohibited');}});if(request==='@/components/pipeline-selector')return{PipelineSelector:()=>null};return original.call(this,request.startsWith('@/')?path.join(frontend,'src',request.slice(2)):request,parent,main);};
for(const ext of['.ts','.tsx'])require.extensions[ext]=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);
const{AiRelatedData}=require(path.join(frontend,'src/components/ai-related-data.tsx'));
const render=props=>renderToStaticMarkup(React.createElement(AiRelatedData,props)),markup=render({});
for(const label of['Linked Records (N/A)','Source Module','Record ID','Title / Description','Relevance','Link Status','Data Lineage','Related Data by Source','Record Details'])assert.ok(markup.includes(label),label);
for(const example of['DM-2024-0017','AI-PRED-0036','SCADA-88421','DOC-44721','124 records','35% WT','26%','87%'])assert.ok(!markup.includes(example),'No screenshot record/link: '+example);
assert.ok(markup.includes('N/A is not zero linked records')&&markup.includes('no verified relationship edges'));
for(const route of['/ili-analysis','/scada','/cp-monitoring','/defect-manager','/risk-assessment','/sensors','/ecda-assessment','/document-upload']){assert.ok(markup.includes(`href="${route}"`));assert.ok(fs.existsSync(path.join(frontend,'src/app',route.slice(1),'page.tsx')),'Existing owner route only');}
assert.ok(render({loading:true}).includes('Loading source readiness'));
assert.ok(render({failed:true}).includes('Source readiness unavailable'));
function find(node,label){if(!node||typeof node!=='object')return null;if(node.type==='button'&&(node.props['aria-label']===label||React.Children.toArray(node.props.children).includes(label)))return node;for(const child of React.Children.toArray(node.props?.children)){const found=find(child,label);if(found)return found;}return null;}
hooks=true;slots=[true,'Details',false];
function related(){index=0;return AiRelatedData({});}
find(related(),'AI Connection').props.onClick();assert.ok(renderToStaticMarkup(related()).includes('Source Record Version'));
find(related(),'Linked Records (N/A)').props.onClick();assert.ok(renderToStaticMarkup(related()).includes('Original Record ID'));
find(related(),'Documents (N/A)').props.onClick();assert.ok(renderToStaticMarkup(related()).includes('Document Version ID'));
find(related(),'Close Record Details').props.onClick();assert.ok(!renderToStaticMarkup(related()).includes('id="ai-source-details"'));
find(related(),'Record Details').props.onClick();assert.ok(renderToStaticMarkup(related()).includes('id="ai-source-details"'));
find(related(),'Learn more about related data').props.onClick();assert.ok(renderToStaticMarkup(related()).includes('Source records remain owned by their original modules'));
slots=[false,'Overview'];const{AiImg02Overview}=require(path.join(frontend,'src/components/ai-predictions-workspace.tsx'));
function tree(){index=0;return AiImg02Overview({readiness:null,loading:false,failed:false,children:React.createElement('p',null,'Preserved native history')});}
const overview=tree();assert.equal(find(overview,'Related Data').props.disabled,false);find(overview,'Related Data').props.onClick();
const relatedView=tree(),snapshot=renderToStaticMarkup(relatedView);assert.ok(snapshot.includes('data-ai-img08="related-data"'));assert.ok(!snapshot.includes('Predicted Risk Hotspots'));
for(const tab of['Configuration'])assert.equal(find(relatedView,tab).props.disabled,false);
for(const[tab,attribute]of[['Model Performance','data-ai-img07'],['Scenario Analysis','data-ai-img06'],['Inspection Prioritization','data-ai-img05'],['Deterioration Trends','data-ai-img04'],['Prediction Results','data-ai-img03']]){find(tree(),tab).props.onClick();assert.ok(renderToStaticMarkup(tree()).includes(attribute));}
find(tree(),'Overview').props.onClick();assert.ok(renderToStaticMarkup(tree()).includes('Preserved native history'));
if(process.argv[2]){const dir=path.resolve(process.argv[2]);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'related-markup.html'),snapshot);}
console.log('AI IMG-08 PASS: seven-tab preservation, native module destinations, no invented original IDs/links/counts, N/A lineage, detail sections/close/reopen/help, source ownership and loading/failure states. Exact record/API lineage remains blocked.');
