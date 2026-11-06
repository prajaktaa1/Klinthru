const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript");
const root=path.resolve(__dirname,"../.."),snapshot=JSON.parse(fs.readFileSync(path.join(root,"artifacts/sensors-local-activation/inventory.json"),"utf8"));
let slots=[],cursor=0,tree,writes=[],updated=0,unauthorized=0,fail=false;
const react={useState(value){const i=cursor++;if(!(i in slots))slots[i]=value;return[slots[i],next=>{slots[i]=typeof next==="function"?next(slots[i]):next;}];},useRef(value){const i=cursor++;return slots[i]??(slots[i]={current:value});}};
class ApiError extends Error{constructor(message){super(message);this.fields={unit:message};}}
const api={ApiError,isUnauthorizedError:()=>false,updateDeviceDetails:async(id,input)=>{writes.push({id,input});if(fail)throw new ApiError("Allowed units: \u00b0C, \u00b0F, K");return{...device,unit:input.unit};}};
const device=snapshot.devices.find(row=>row.deviceId==="SNS-002");assert.ok(device?.isDemoData);
function load(file,mocks={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2021,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module,exports:module.exports,require:name=>mocks[name]??require(name)});return module.exports;}
const helper=load("frontend/src/lib/sensor-details.ts"),{DemoDeviceRegistry}=load("frontend/src/components/demo-device-registry.tsx",{react,"@/lib/apiClient":api,"@/lib/sensor-details":helper});
function nodes(node){if(!node||typeof node!=="object")return[];return[node,...[node.props?.children].flat(Infinity).flatMap(nodes)];}
function render(canEdit=true){cursor=0;tree=DemoDeviceRegistry({records:[device],canEdit,onUpdated:()=>updated++,onUnauthorized:()=>unauthorized++});}
const button=text=>nodes(tree).find(n=>n.type==="button"&&n.props.children===text);
const input=()=>nodes(tree).find(n=>n.type==="input");
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{render(false);assert.equal(button("Edit Sensor Details"),undefined);render();assert.equal(writes.length,0);button("Edit Sensor Details").props.onClick();render();assert.equal(input().props.value,device.unit);assert.equal(writes.length,0);
input().props.onChange({target:{value:"\u00b0C"}});render();button("Cancel").props.onClick();render();assert.equal(writes.length,0);assert.equal(input(),undefined);
button("Edit Sensor Details").props.onClick();render();fail=true;input().props.onChange({target:{value:"bar"}});render();nodes(tree).find(n=>n.type==="form").props.onSubmit({preventDefault(){}});await tick();render();assert.ok(JSON.stringify(tree).includes("Allowed units"));assert.equal(input().props.value,"bar");assert.equal(updated,0);
fail=false;input().props.onChange({target:{value:"\u00b0C"}});render();const submit=nodes(tree).find(n=>n.type==="form").props.onSubmit;submit({preventDefault(){}});submit({preventDefault(){}});await tick();render();assert.equal(writes.length,2,"Only one save while request pending");assert.equal(writes[1].id,device.id);assert.equal(JSON.stringify(writes[1].input),JSON.stringify({unit:"\u00b0C"}));assert.equal(updated,1);assert.equal(input(),undefined);assert.equal(device.unit,"bar","Snapshot remains unchanged");assert.equal(unauthorized,0);
console.log("PASS unit editor: role-gated edit, no automatic writes, Cancel, server validation retained, explicit unit-only Save, repeated-submit guard and refresh callback. No real API/database writes.");})().catch(error=>{console.error(error);process.exitCode=1;});
