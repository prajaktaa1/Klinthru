const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path"),ts=require("typescript");
const root=path.resolve(__dirname,"..");
function load(file,mocks={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2021,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module,exports:module.exports,require:name=>name in mocks?mocks[name]:require(name),console,Date,Map,Set,URL,Blob,setTimeout,setInterval:()=>0,clearInterval:()=>{}});return module.exports;}
const {resolveSensorTelemetry}=load(path.join(root,"src/lib/sensor-telemetry.ts"));
const {apiReadingPayload,readingProvenance}=load(path.join(root,"../backend/src/utils/readingProvenance.ts"));
const now=Date.now(),device={id:"device-row",deviceId:"TEST-DEVICE",isDemoData:false,deviceType:"Flow Meter",status:"Active",pipelineOrLocation:"Unassigned"};
const assignment={id:"assignment-row",sensorId:device.deviceId,sensorName:"Test assignment"};
const link={sensorId:device.deviceId,pipelineId:"pipeline-row-1",assetRecordId:"asset-row-1",segmentRecordId:"segment-row-1",pipelineCode:"PL-001",assetId:"TEST-ASSET"};
const tag={active:true,pipelineId:link.pipelineId,assetId:link.assetRecordId,sensorAssignmentId:assignment.id,staleAfterSeconds:60,freshness:"Live",engineeringUnit:"bar",reading:{dataMode:"REAL",sourceChannel:"API",receiveTimestamp:new Date(now-1000).toISOString(),sourceTimestamp:new Date(now-1000).toISOString(),value:0,engineeringUnit:"bar",quality:"Good"}};
assert.equal(resolveSensorTelemetry(device,link,assignment,[tag],now).connectivity,"Online (recent reading)");
assert.equal(resolveSensorTelemetry(device,link,assignment,[tag],now).value,0);
for(const tags of [[],[tag,tag],[{...tag,pipelineId:"foreign"}],[{...tag,assetId:"foreign"}],[{...tag,sensorAssignmentId:"foreign"}],[{...tag,reading:{...tag.reading,dataMode:"DEMO"}}]])assert.equal(resolveSensorTelemetry(device,link,assignment,tags,now).connectivity,"Unknown");
assert.equal(resolveSensorTelemetry({...device,isDemoData:true},link,assignment,[tag],now).value,null);
assert.equal(resolveSensorTelemetry(device,link,assignment,[{...tag,reading:{...tag.reading,quality:"Bad"}}],now).connectivity,"Unknown");
assert.equal(resolveSensorTelemetry(device,link,assignment,[tag],now+120000).connectivity,"Stale");
assert.equal(readingProvenance(12,"connector").sourceChannel,null);
assert.equal(readingProvenance(apiReadingPayload(0,"connector"),"connector").sourceChannel,"API");
assert.equal(readingProvenance(apiReadingPayload(0,"foreign"),"connector").sourceChannel,null);
for(const channel of ["API","MQTT","TCP"]){const incoming={...tag,reading:{...tag.reading,sourceChannel:channel,deviceId:device.deviceId,pipelineId:link.pipelineId}};assert.equal(resolveSensorTelemetry(device,link,undefined,[incoming],now).channel,channel);}
const {SensorIngestionReadings}=load(path.join(root,"src/components/sensor-ingestion-readings.tsx"),{react:{useState:value=>[value,()=>{}],useEffect:()=>{}},"@/lib/apiClient":{}});
const uiTags=["API","MQTT","TCP"].map((channel,index)=>({...tag,id:channel,displayName:channel,reading:{...tag.reading,sourceChannel:channel,deviceId:"isolated-"+index}}));
const panel=SensorIngestionReadings({pipelineId:link.pipelineId,tags:[...uiTags,{...tag,id:"demo",reading:{...tag.reading,dataMode:"DEMO",sourceChannel:"MQTT",deviceId:"DEMO-MUST-NOT-RENDER"}}]});
assert.equal(nodes(panel).filter(node=>node.type==="tr").length,4);
assert.ok(!JSON.stringify(panel).includes("DEMO-MUST-NOT-RENDER"));
// Render the actual component with deterministic hooks and isolated API responses, no server or database.
let slots=[],cursor=0,effects=[],dirty=true,tree,props={records:[],assignments:[],masterLinks:[]};
const equal=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
const react={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],value=>{const next=typeof value==="function"?value(slots[i]):value;if(!Object.is(next,slots[i])){slots[i]=next;dirty=true;}}];},useRef(initial){const i=cursor++;return slots[i]??(slots[i]={current:initial});},useMemo(fn){cursor++;return fn();},useEffect(fn,deps){const i=cursor++;if(!equal(slots[i]?.deps,deps)){slots[i]?.cleanup?.();effects.push(()=>{slots[i]={deps,cleanup:fn()};});}}};
const pipelines=[{id:"pipeline-row-1",pipelineCode:"PL-001"},{id:"pipeline-row-2",pipelineCode:"PL-002"}];
const segments=[{id:"segment-row-1",pipelineId:pipelines[0].id,segmentId:"SEG-1"},{id:"segment-row-2",pipelineId:pipelines[1].id,segmentId:"SEG-2"}];
const assets=[{id:"asset-row-1",pipelineId:pipelines[0].id,segmentId:segments[0].id,assetType:"SENSOR",assetId:"TEST-ASSET"},{id:"asset-row-2",pipelineId:pipelines[1].id,segmentId:segments[1].id,assetType:"SENSOR",assetId:"TEST-ASSET-2"},{id:"valve-row",pipelineId:pipelines[0].id,assetType:"VALVE",assetId:"VALVE"}];
let fail=false,slow=false,release;
const api={fetchPipelines:async()=>pipelines,fetchMasterSegments:async id=>{if(fail)throw Error("isolated failure");if(slow&&id===pipelines[0].id)return new Promise(resolve=>{release=()=>resolve(segments.filter(s=>s.pipelineId===id));});return segments.filter(s=>s.pipelineId===id);},fetchMasterAssets:async id=>assets.filter(a=>a.pipelineId===id),fetchScadaOverview:async id=>({pipeline:{id},tags:[tag]})};
const sensorData=load(path.join(root,"src/lib/sensor-data.ts"));
const {SensorsTable}=load(path.join(root,"src/components/sensors-table.tsx"),{react,"@/lib/apiClient":api,"@/lib/sensor-telemetry":{resolveSensorTelemetry},"@/lib/sensor-data":sensorData,"@/lib/sensor-details":load(path.join(root,"src/lib/sensor-details.ts")),"@/components/ui":{Panel:"panel"},"lucide-react":{Download:"icon",X:"icon",Search:"icon"}});
async function flush(){for(let i=0;i<25;i++){if(dirty){dirty=false;cursor=0;tree=SensorsTable(props);const run=effects;effects=[];run.forEach(fn=>fn());}await new Promise(resolve=>setImmediate(resolve));if(!dirty&&!effects.length)return;}throw Error("Render did not settle");}
function nodes(node){if(!node||typeof node!=="object")return[];return[node,...[node.props?.children].flat(Infinity).flatMap(nodes)];}
const control=name=>nodes(tree).find(n=>n.props?.["aria-label"]===name);
const options=name=>nodes(control(name)).filter(n=>n.type==="option").map(n=>n.props.value);
async function choose(name,value){control(name).props.onChange({target:{value}});await flush();}
(async()=>{await flush();assert.deepEqual(Array.from(options("Pipeline filter")),["",...pipelines.map(p=>p.id)]);assert.equal(control("Sensor Asset filter").props.disabled,true);
await choose("Pipeline filter",pipelines[0].id);assert.deepEqual(Array.from(options("Segment filter")),["",segments[0].id]);assert.deepEqual(Array.from(options("Sensor Asset filter")),["",assets[0].id]);
await choose("Segment filter",segments[0].id);await choose("Sensor Asset filter",assets[0].id);await choose("Search sensors","empty search");props={...props,refreshVersion:1};dirty=true;await flush();assert.equal(control("Segment filter").props.value,segments[0].id);assert.equal(control("Sensor Asset filter").props.value,assets[0].id);assert.equal(control("Search sensors").props.value,"empty search");
await choose("Pipeline filter",pipelines[1].id);assert.equal(control("Segment filter").props.value,"");assert.equal(control("Sensor Asset filter").props.value,"");assert.deepEqual(Array.from(options("Segment filter")),["",segments[1].id]);assert.deepEqual(Array.from(options("Sensor Asset filter")),["",assets[1].id]);
props={...props,records:[device],assignments:[assignment],masterLinks:[link]};dirty=true;await flush();assert.equal(nodes(tree).filter(n=>n.type==="tr"&&n.props["aria-selected"]!==undefined).length,0,"Foreign pipeline hides device");
await choose("Search sensors","");await choose("Pipeline filter",pipelines[0].id);assert.equal(nodes(tree).filter(n=>n.type==="tr"&&n.props["aria-selected"]!==undefined).length,1);
// Row selection is independent of export checkboxes and survives a saved-record refresh.
let row=nodes(tree).find(n=>n.type==="tr"&&n.props["aria-selected"]!==undefined);
row.props.onClick();await flush();
assert.equal(control("Select "+device.deviceId).props.checked,false);
assert.ok(JSON.stringify(control("Sensor details")).includes("TEST-DEVICE"));
assert.ok(JSON.stringify(control("Sensor details")).includes("Inventory Status"));
assert.ok(JSON.stringify(control("Sensor details")).includes("Not Available"));
props={...props,records:[{...device}],refreshVersion:3};dirty=true;await flush();
assert.ok(control("Close sensor details"));
await choose("Pipeline filter",pipelines[1].id);assert.equal(control("Close sensor details"),undefined);
await choose("Pipeline filter",pipelines[0].id);
control("Select "+device.deviceId).props.onChange({target:{checked:true}});await flush();assert.equal(control("Close sensor details"),undefined);
row=nodes(tree).find(n=>n.type==="tr"&&n.props["aria-selected"]!==undefined);
row.props.onKeyDown({target:row,currentTarget:row,key:"Enter",preventDefault(){}});await flush();assert.ok(control("Close sensor details"));
const {savedSensorDetailRows,sensorDetailValue}=load(path.join(root,"src/lib/sensor-details.ts"));
const saved={...device,deviceId:"SNS-001",deviceType:"Pressure Transmitter",status:"Inactive",pipelineOrLocation:"PL-002 / SEG-03 / KP 125",unit:"bar"};
const details=Object.fromEntries(savedSensorDetailRows(saved,{...link,pipelineCode:"PL-002",segmentId:"SEG-03",assetId:"SNS-001",kp:"125"},undefined,resolveSensorTelemetry(saved,link,undefined,[])));
for(const [key,value] of Object.entries({"Sensor ID":"SNS-001",Type:"Pressure Transmitter",Pipeline:"PL-002",Segment:"SEG-03",Asset:"SNS-001",KP:"125","Inventory Status":"Inactive",Connectivity:"Not Available",Channel:"Not Available","Last Reading":"Not Available"}))assert.equal(details[key],value);
assert.equal(sensorDetailValue(0),"0");assert.equal(sensorDetailValue(" "),"Not Available");
assert.equal(Object.fromEntries(savedSensorDetailRows(saved,undefined,undefined,null))["Sensor ID"],"SNS-001");
console.log("PASS details: row/keyboard selection, independent checkbox, refresh, pipeline switching, saved SNS-001 fields and missing-data fallback.");
await choose("Pipeline filter",pipelines[1].id);slow=true;await choose("Pipeline filter",pipelines[0].id);await choose("Pipeline filter",pipelines[1].id);release();await flush();assert.deepEqual(Array.from(options("Segment filter")),["",segments[1].id],"Late response cannot overwrite new pipeline");slow=false;
fail=true;props={...props,refreshVersion:2};dirty=true;await flush();assert.ok(nodes(tree).some(n=>n.props?.role==="alert"));assert.equal(control("Segment filter").props.disabled,true);
console.log("PASS actual dropdown component: PL-001/PL-002 without devices, database IDs, pipeline isolation, sensor assets only, switching/reset, search/refresh preservation, assignments, empty/error states. PASS telemetry: REAL/DEMO, ambiguous links, units/quality, freshness, zero values and server API provenance.");})().catch(error=>{console.error(error);process.exitCode=1;});
