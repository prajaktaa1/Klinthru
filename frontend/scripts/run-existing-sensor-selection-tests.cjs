const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript");
const root=path.resolve(__dirname,"../.."),snapshot=JSON.parse(fs.readFileSync(path.join(root,"artifacts/sensors-local-activation/inventory.json"),"utf8")),options=JSON.parse(fs.readFileSync(path.join(root,"artifacts/sensors-local-activation/pl002-registration-options.json"),"utf8"));
options.forEach(option=>{option.existingDevice=snapshot.devices.find(row=>row.deviceId===option.assetCode)??null;});
let slots=[],cursor=0,effects=[],dirty=true,tree,writes=0,fetches=0,legacy=false;
const react={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],value=>{const next=typeof value==="function"?value(slots[i]):value;if(!Object.is(next,slots[i])){slots[i]=next;dirty=true;}}];},useRef(initial){const i=cursor++;return slots[i]??(slots[i]={current:initial});},useEffect(fn,deps){const i=cursor++;if(!slots[i]||!deps.every((value,index)=>Object.is(value,slots[i].deps[index]))){slots[i]?.cleanup?.();effects.push(()=>{slots[i]={deps,cleanup:fn()};});}}};
const api={fetchPipelines:async()=>snapshot.pipelines,fetchSensorRegistrationOptions:async pipelineId=>{fetches++;return options.filter(row=>row.pipelineId===pipelineId).map(row=>legacy?{...row,registrationBlockers:undefined}:row);},createDeviceRecord:async()=>{writes++;throw Error("No registration writes are permitted in this test");},ApiError:class extends Error{},isUnauthorizedError:()=>false,isBackendUnavailableError:()=>false};
const moduleObject={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,"frontend/src/components/sensor-registration-form.tsx"),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2021,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module:moduleObject,exports:moduleObject.exports,require:name=>name==="react"?react:name==="@/lib/apiClient"?api:name==="@/components/ui"?{Panel:"panel"}:require(name)});
const {SensorRegistrationForm}=moduleObject.exports;
function nodes(node){if(!node||typeof node!=="object")return[];return[node,...[node.props?.children].flat(Infinity).flatMap(nodes)];}
function input(label){const wrapper=nodes(tree).find(node=>node.type==="label"&&[node.props.children].flat().some(child=>typeof child==="string"&&child.startsWith(label)));assert.ok(wrapper,label);return nodes(wrapper).find(node=>node.type==="input"||node.type==="select");}
async function flush(){for(let attempt=0;attempt<30;attempt++){if(dirty){dirty=false;cursor=0;tree=SensorRegistrationForm({onRegistered:()=>{throw Error("Must not register");},onUnauthorized:()=>{}});const pending=effects;effects=[];pending.forEach(fn=>fn());}await new Promise(resolve=>setImmediate(resolve));if(!dirty&&!effects.length)return;}throw Error("Did not settle");}
const named=name=>nodes(tree).find(node=>node.props?.["aria-label"]===name);
async function reloadOptions(){named("Registration pipeline").props.onChange({target:{value:""}});await flush();named("Registration pipeline").props.onChange({target:{value:snapshot.pipelines.find(row=>row.pipelineCode==="PL-002").id}});await flush();}

(async()=>{
await flush();const pipeline=snapshot.pipelines.find(row=>row.pipelineCode==='PL-002');named('Registration pipeline').props.onChange({target:{value:pipeline.id}});await flush();
const select=code=>options.find(row=>row.assetCode===code),submit=()=>nodes(tree).find(n=>n.type==='button'&&n.props.type==='submit');
for(const code of ['SNS-001','SNS-002']){
 const option=select(code),device=snapshot.devices.find(row=>row.deviceId===code);
 assert.equal(nodes(named('Registration Sensor Asset')).find(n=>n.type==='option'&&n.props.value===option.assetRecordId).props.disabled,false);
 named('Registration Sensor Asset').props.onChange({target:{value:option.assetRecordId}});await flush();
 for(const [label,value] of [['Device ID',device.deviceId],['Sensor Type',device.deviceType],['Location',device.pipelineOrLocation],['Inventory status',device.status],['Engineering Unit',device.unit]])assert.equal(input(label).props.value,value);
 assert.equal(input('Engineering Unit').props.readOnly,true);assert.equal(input('Inventory status').props.disabled,true);assert.equal(submit().props.disabled,true);assert.ok(JSON.stringify(tree).includes('Already Registered'));
 nodes(tree).find(n=>n.type==='button'&&n.props.children==='View Sensor Details').props.onClick();await flush();
 const details=nodes(tree).find(n=>n.props?.['aria-label']==='Registered sensor details');assert.ok(details);for(const text of [device.deviceId,device.deviceType,device.pipelineOrLocation,device.unit,device.isDemoData?'DEMO':'REAL'])assert.ok(JSON.stringify(details).includes(text));
 nodes(tree).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});await flush();assert.equal(writes,0);
}
const template=select('SNS-002');options.push({...template,assetRecordId:'isolated-unregistered',assetCode:'ISOLATED-NEW',existingDevice:null,registrationClassification:'DEMO',registrationBlockers:[]});await reloadOptions();
named('Registration Sensor Asset').props.onChange({target:{value:'isolated-unregistered'}});await flush();assert.equal(submit().props.disabled,true);assert.equal(named('Confirm verified sensor identity'),undefined);assert.equal(input('Engineering Unit').props.readOnly,false);
input('Engineering Unit').props.onChange({target:{value:'degC'}});await flush();assert.equal(submit().props.disabled,false);
let payload;api.createDeviceRecord=async input=>{payload=input;throw Error('TEST WRITE BLOCKED');};nodes(tree).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});await flush();assert.equal(payload.deviceId,'ISOLATED-NEW');assert.equal(payload.isDemoData,undefined);assert.equal(writes,0);
console.log('PASS existing saved asset selection: SNS-001/SNS-002 actual values and classifications, Already Registered, read-only details, zero duplicate requests, eligible new registration remains enabled only after required unit. No actual API/database writes.');
})().catch(error=>{console.error(error);process.exitCode=1;});
