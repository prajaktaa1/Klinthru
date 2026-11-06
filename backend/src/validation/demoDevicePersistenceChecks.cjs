const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),ts=require("typescript");
// Execute both actual createDevice method bodies with isolated in-memory substitutes.
const source=fs.readFileSync(require("node:path").join(__dirname,"../data/store.ts"),"utf8");
const methods=[...source.matchAll(/  async createDevice\(input: CreateDeviceInput\): Promise<DeviceRecord> \{[\s\S]*?\n  \}/g)].map(match=>match[0]);
assert.equal(methods.length,3);
const device={deviceId:"ISOLATED-DEMO",deviceType:"Temperature Sensor",pipelineOrLocation:"PL-002 / SEG-04 / KP 190",status:"Inactive",latestReadingOrState:"Not Available",unit:"degC"};
let captured;
const prisma={deviceRecord:{findUnique:async()=>null,create:async({data})=>{captured=data;return{id:"test",...data};}}};
function make(method){const module={exports:{}};vm.runInNewContext(ts.transpileModule("module.exports=class TestStore {"+method+"}",{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{module,Date,createId:()=>"isolated",getPrismaClient:()=>prisma});const store=new module.exports();store.devices=[];return store;}
(async()=>{for(const method of methods.slice(0,2)){const store=make(method);assert.equal((await store.createDevice({device,isDemoData:true})).isDemoData,true);if(store.devices.length)assert.equal(store.devices[0].isDemoData,true);else assert.equal(captured.isDemoData,true);const real=make(method);assert.equal((await real.createDevice({device})).isDemoData,false);}console.log("PASS actual memory/Prisma createDevice bodies preserve explicit DEMO and default REAL, using isolated substitutes only. No database connection or actual device creation.");})().catch(error=>{console.error(error);process.exitCode=1;});
