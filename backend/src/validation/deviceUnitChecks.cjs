const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'../../..'),backendRequire=createRequire(path.join(root,'backend/package.json'));
const snapshot=JSON.parse(fs.readFileSync(path.join(root,'artifacts/sensors-local-activation/inventory.json'),'utf8'));
assert.equal(snapshot.readOnly,true);let writes=0;
const store={listPipelines:async scope=>snapshot.pipelines.filter(row=>scope?.viewerRole==='Admin'||row.createdById===scope?.viewerUserId),listSegments:async scope=>snapshot.segments.filter(row=>row.pipelineId===scope.pipelineId),listAssets:async scope=>snapshot.assets.filter(row=>row.pipelineId===scope.pipelineId),listDevices:async()=>snapshot.devices,findAssetById:async id=>snapshot.assets.find(row=>row.id===id),createDevice:async()=>{writes++;throw Error('Writes are forbidden in preparation tests');},updateDeviceLocation:async()=>{writes++;throw Error('Writes forbidden');},findDeviceById:async id=>snapshot.devices.find(row=>row.id===id)};
const cache={};function load(relative){const file=path.resolve(root,'backend/src',relative);if(cache[file])return cache[file];const mod={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;vm.runInNewContext(code,{module:mod,exports:mod.exports,require:name=>{if(name==='../data/store')return{store};if(name==='../lib/prisma')return{getPrismaClient:()=>{throw Error('No database connections permitted');}};if(name==='../middleware/auth')return{requireAuth:()=>{}};if(name==='express')return{Router:()=>router};if(name.startsWith('.'))return load(path.relative(path.join(root,'backend/src'),path.resolve(path.dirname(file),name+'.ts')));return backendRequire(name);},console});cache[file]=mod.exports;return mod.exports;}
const routes=new Map(),router={use:()=>{},get:(route,fn)=>routes.set('GET '+route,fn),post:(route,fn)=>routes.set('POST '+route,fn),patch:(route,fn)=>routes.set('PATCH '+route,fn),delete:()=>{}};
const validation=load('validation/deviceValidation.ts'),mapping=load('validation/sensorAssetRegistration.ts');load('routes/devices.ts');
const user={id:snapshot.pipelines.find(row=>row.pipelineCode==='PL-002').createdById,role:'Admin'};
async function call(route,request){let result,error;const response={json:value=>{result=value;return response;},status:()=>response};await routes.get(route)({...request,user},response,value=>{error=value;});return{result,error};}

(async()=>{
const device=snapshot.devices.find(row=>row.deviceId==='SNS-002');assert.ok(device?.isDemoData);
const unitValidation=load('validation/deviceUnitValidation.ts');
for(const [input,expected] of [['degC','\u00b0C'],['\u00b0F','\u00b0F'],['K','K']])assert.equal(unitValidation.validateDeviceUnitUpdate({unit:input},'Temperature Sensor').unit,expected);
for(const input of [{unit:'bar'},{unit:''},{unit:'\u00b0C',isDemoData:false},{unit:'\u00b0C',deviceId:'changed'},{unit:'\u00b0C',pipelineOrLocation:'changed'}])assert.throws(()=>unitValidation.validateDeviceUnitUpdate(input,'Temperature Sensor'));
assert.equal(unitValidation.validateDeviceUnitUpdate({unit:'bar'},'Pressure Transmitter').unit,'bar');assert.throws(()=>unitValidation.validateDeviceUnitUpdate({unit:'\u00b0C'},'Pressure Transmitter'));
let changes=0,captured;
store.findDeviceById=async(id,scope)=>id===device.id&&(scope.viewerRole==='Admin'||scope.viewerUserId===device.authorId)?{...device}:null;
store.updateDeviceUnit=async(id,unit,scope)=>{changes++;captured={id,unit,scope};return{...device,unit,lastUpdatedAt:new Date().toISOString()};};
async function edit(body,actor=user,id=device.id){let result,error,status=200;const response={status(code){status=code;return this;},json(value){result=value;return this;}};await routes.get('PATCH /:id/details')({body,user:actor,params:{id}},response,value=>{error=value;});return{result,error,status};}
for(const body of [{unit:'bar'},{unit:'\u00b0C',isDemoData:false},{unit:'\u00b0C',deviceType:'Flow Meter'}])assert.ok((await edit(body)).error);
assert.equal(changes,0);assert.equal((await edit({unit:'\u00b0C'},{...user,role:'Viewer'})).status,403);
assert.equal((await edit({unit:'\u00b0C'},{...user,id:'foreign',role:'Engineer'})).status,404);
assert.equal((await edit({unit:'\u00b0C'},user,'missing')).status,404);assert.equal(changes,0);
const response=await edit({unit:'degC'});assert.ifError(response.error);assert.equal(response.result.unit,'\u00b0C');assert.equal(changes,1);assert.equal(captured.id,device.id);
for(const field of ['id','deviceId','deviceType','pipelineOrLocation','isDemoData','status','latestReadingOrState'])assert.equal(response.result[field],device[field]);
assert.equal(snapshot.devices.find(row=>row.id===device.id).unit,device.unit);
// Execute actual memory and Prisma unit-update bodies using isolated substitutes.
const source=fs.readFileSync(path.join(root,'backend/src/data/store.ts'),'utf8');
const methods=[...source.matchAll(/  async updateDeviceUnit\(id:string,unit:string,search:OwnershipScope=\{\}\):Promise<DeviceRecord\|null>\{[\s\S]*?\n  \}/g)].map(match=>match[0]);assert.equal(methods.length,3);
for(const method of methods.slice(0,2)){
 let row={...device},data;
 const prisma={deviceRecord:{updateMany:async input=>{data=input.data;row={...row,...input.data,lastUpdatedAt:input.data.lastUpdatedAt.toISOString()};return{count:1};}}};
 const mod={exports:{}};vm.runInNewContext(ts.transpileModule('module.exports=class Store {'+method+'}',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{module:mod,Date,getPrismaClient:()=>prisma});
 const isolated=new mod.exports();isolated.findDeviceById=async(id,scope)=>scope.viewerUserId==='foreign'?null:row;
 assert.equal(await isolated.updateDeviceUnit(device.id,'\u00b0C',{viewerUserId:'foreign'}),null);
 const result=await isolated.updateDeviceUnit(device.id,'\u00b0C',{});assert.equal(result.unit,'\u00b0C');
 for(const field of ['deviceId','deviceType','pipelineOrLocation','isDemoData','status'])assert.equal(result[field],device[field]);
 if(data)assert.deepEqual(Object.keys(data).sort(),['lastUpdatedAt','unit']);
}
console.log('PASS unit-only API and actual storage bodies: type-aware units, aliases, strict immutable-field rejection, role/owner/missing-device checks, metadata/classification preserved. Isolated stores only; zero actual database writes.');
})().catch(error=>{console.error(error);process.exitCode=1;});
