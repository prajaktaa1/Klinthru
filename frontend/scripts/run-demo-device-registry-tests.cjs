const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript");
const root=path.resolve(__dirname,"../.."),snapshot=JSON.parse(fs.readFileSync(path.join(root,"artifacts/sensors-local-activation/inventory.json"),"utf8"));
function load(file,mocks={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2021,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module,exports:module.exports,require:name=>mocks[name]??require(name)});return module.exports;}
const helper=load("frontend/src/lib/sensor-details.ts"),{DemoDeviceRegistry}=load("frontend/src/components/demo-device-registry.tsx",{"@/lib/sensor-details":helper,react:{useState:value=>[value,()=>{}],useRef:value=>({current:value})},"@/lib/apiClient":{}});
const tree=DemoDeviceRegistry({records:snapshot.devices}),text=JSON.stringify(tree),device=snapshot.devices.find(row=>row.deviceId==="SNS-002");
assert.ok(device?.isDemoData);for(const value of [device.deviceId,device.deviceType,device.pipelineOrLocation,device.unit,"DEMO (isDemoData=true)","Not Available"])assert.ok(text.includes(value));
for(const real of snapshot.devices.filter(row=>!row.isDemoData))assert.ok(!text.includes(real.id));
assert.equal(DemoDeviceRegistry({records:snapshot.devices.filter(row=>!row.isDemoData)}),null);
assert.ok(!text.includes("Online"));assert.ok(!text.includes("onClick"));
const view=fs.readFileSync(path.join(root,"frontend/src/components/sensors-view.tsx"),"utf8");assert.ok(view.includes("records={realRecords}"));assert.ok(view.includes("<DemoDeviceRegistry records={records}"));
console.log("PASS saved DEMO registry visibility: actual SNS-002 values, separate classification/details, REAL records excluded, no telemetry or write actions, REAL table remains filtered.");
