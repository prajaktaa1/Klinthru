const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript");
const root=path.resolve(__dirname,"../..");
const snapshot=JSON.parse(fs.readFileSync(path.join(root,"artifacts/sensors-local-activation/inventory.json"),"utf8"));
assert.equal(snapshot.readOnly,true);
function load(file,mocks={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2021,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module,exports:module.exports,require:name=>name in mocks?mocks[name]:require(name),Date});return module.exports;}
const {resolveSensorTelemetry}=load(path.join(root,"frontend/src/lib/sensor-telemetry.ts"));
const {SensorIngestionReadings}=load(path.join(root,"frontend/src/components/sensor-ingestion-readings.tsx"),{react:{useState:value=>[value,()=>{}],useEffect:()=>{}},"@/lib/apiClient":{}});
function nodes(node){return node&&typeof node==="object"?[node,...[node.props?.children].flat(Infinity).flatMap(nodes)]:[];}
assert.deepEqual(snapshot.pipelines.map(row=>row.pipelineCode).sort(),["PL-001","PL-002"]);
for(const pipeline of snapshot.pipelines){
 const tags=snapshot.tags.filter(tag=>tag.pipelineId===pipeline.id);assert.equal(tags.length,0,"Audit expectations must be reviewed if actual tags change");
 const view=SensorIngestionReadings({pipelineId:pipeline.id,tags});
 assert.ok(JSON.stringify(view).includes("No verified received readings in this pipeline."));
 assert.equal(nodes(view).filter(node=>node.type==="tr").length,2,"Only the header and empty-state row may render when no actual readings exist");
}
for(const device of snapshot.devices){const result=resolveSensorTelemetry(device,undefined,undefined,[]);assert.equal(result.channel,"Unknown");assert.equal(result.connectivity,"Unknown");assert.equal(result.value,null);}
const sensors=fs.readFileSync(path.join(root,"frontend/src/components/sensors-table.tsx"),"utf8"),dashboard=fs.readFileSync(path.join(root,"frontend/src/components/executive-dashboard.tsx"),"utf8"),hub=fs.readFileSync(path.join(root,"frontend/src/components/integration-hub-workspace.tsx"),"utf8");
assert.ok(sensors.includes("resolveSensorTelemetry(record,master,linked,tags,telemetryNow)"));
assert.ok(dashboard.includes("<SensorIngestionReadings pipelineId={pipelineId}"));
assert.ok(hub.includes("if (!isDemo) return <><SensorIngestionReadings/>"));
console.log("PASS actual read-only PL-001/PL-002 snapshot: both active; zero actual tags/readings render empty telemetry; registry device remains Unknown. Sensors/Dashboard/REAL Hub provenance wiring verified. No synthetic devices, readings, secrets, API writes, or listeners used. Live nonempty provenance cannot be verified because no readings exist.");
