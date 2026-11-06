const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript");
const root=path.resolve(__dirname,"../.."),snapshot=JSON.parse(fs.readFileSync(path.join(root,"artifacts/sensors-local-activation/inventory.json"),"utf8")),options=JSON.parse(fs.readFileSync(path.join(root,"artifacts/sensors-local-activation/pl002-registration-options.json"),"utf8"));
// Isolate the pre-registration scenario: SNS-002 is unregistered in this fixture only.
options.forEach(option=>{option.existingDevice=option.assetCode==="SNS-002"?null:snapshot.devices.find(row=>row.deviceId===option.assetCode)??null;});
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
(async()=>{await flush();assert.equal(named("Registration mode"),undefined);
const pipeline=snapshot.pipelines.find(row=>row.pipelineCode==="PL-002");named("Registration pipeline").props.onChange({target:{value:pipeline.id}});await flush();
const temperature=options.find(row=>row.assetCode==="SNS-002"),pressure=options.find(row=>row.assetCode==="SNS-001");
const assetOption=id=>nodes(named("Registration Sensor Asset")).find(n=>n.type==="option"&&n.props.value===id);
assert.equal(assetOption(temperature.assetRecordId).props.disabled,false);assert.equal(assetOption(pressure.assetRecordId).props.disabled,false);
named("Registration Sensor Asset").props.onChange({target:{value:temperature.assetRecordId}});await flush();
assert.equal(input("Device ID").props.value,"SNS-002");assert.equal(input("Sensor Type").props.value,"Temperature Sensor");assert.equal(input("Location").props.value,"PL-002 / SEG-04 / KP 190");assert.equal(input("Inventory status").props.disabled,true);
assert.equal(named("Refresh saved sensor assets"),undefined);
for(const text of ["Prepare from a saved Sensor Asset.","DEMO ONLY.","Saved equipment:","SNS-001 (REAL):","Refresh saved assets"])assert.ok(!JSON.stringify(tree).includes(text),text);
assert.equal(named("Confirm verified sensor identity"),undefined);assert.equal(input("Engineering Unit").props.value,"");
input("Engineering Unit").props.onChange({target:{value:"degC"}});await flush();
assert.equal(nodes(tree).find(n=>n.type==="button"&&n.props.type==="submit").props.disabled,false);
let payload;api.createDeviceRecord=async body=>{payload=body;throw Error("TEST WRITE BLOCKED");};
await nodes(tree).find(n=>n.type==="form").props.onSubmit({preventDefault(){}});await flush();
assert.equal(payload.deviceId,"SNS-002");assert.equal(payload.isDemoData,undefined);assert.equal(payload.demoConfirmed,undefined);assert.equal(payload.status,"Inactive");assert.equal(payload.latestReadingOrState,"Not Available");assert.equal(writes,0);assert.ok(nodes(tree).some(n=>n.props?.role==="alert"),"Submission errors stay visible");
// Additional assets use backend classification, no frontend sensor-code allowlist.
options.push({...temperature,assetRecordId:"isolated-extra",assetCode:"ISOLATED-EXTRA",registrationClassification:"REAL",registrationBlockers:[]});await reloadOptions();
assert.equal(assetOption("isolated-extra").props.disabled,false);named("Registration Sensor Asset").props.onChange({target:{value:"isolated-extra"}});await flush();
assert.ok(named("Confirm verified sensor identity"));input("Engineering Unit").props.onChange({target:{value:"degC"}});await flush();assert.equal(nodes(tree).find(n=>n.type==="button"&&n.props.type==="submit").props.disabled,true);
legacy=true;await reloadOptions();assert.equal(assetOption(temperature.assetRecordId).props.disabled,true);assert.ok(JSON.stringify(tree).includes("has not supplied automatic classification"));
console.log("PASS automatic classification form: no mode selector, SNS-002 saved defaults selectable, SNS-001 selectable for inspection, backend-owned classification payload, REAL evidence required, stale backend fail-closed, no database writes.");})().catch(error=>{console.error(error);process.exitCode=1;});
