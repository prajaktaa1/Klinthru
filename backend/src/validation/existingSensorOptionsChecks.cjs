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
const pipeline=snapshot.pipelines.find(row=>row.pipelineCode==='PL-002'),before=JSON.stringify(snapshot);
const response=await call('GET /registration-options',{query:{pipelineId:pipeline.id}});assert.ifError(response.error);
for(const code of ['SNS-001','SNS-002']){
 const option=response.result.find(row=>row.assetCode===code),device=snapshot.devices.find(row=>row.deviceId===code);
 assert.ok(option.existingDevice);for(const field of ['id','deviceId','deviceType','pipelineOrLocation','unit','status','isDemoData'])assert.equal(option.existingDevice[field],device[field]);
 assert.ok(option.registrationBlockers.some(reason=>reason.includes('already exists')));
 const blocked=await call('POST /',{body:{deviceId:device.deviceId,deviceType:device.deviceType,pipelineOrLocation:device.pipelineOrLocation,status:'Inactive',latestReadingOrState:'Not Available',unit:device.unit,assetRecordId:option.assetRecordId,pipelineId:option.pipelineId,segmentRecordId:option.segmentRecordId,identityConfirmed:true}});assert.equal(blocked.result.message,'Device ID already exists.');
}
// Scoped options must never return inaccessible registry records.
const oldList=store.listDevices;store.listDevices=async()=>[];
const scoped=await call('GET /registration-options',{query:{pipelineId:pipeline.id}});assert.ifError(scoped.error);assert.ok(scoped.result.every(row=>row.existingDevice===null));store.listDevices=oldList;
assert.ok((await call('GET /registration-options',{query:{pipelineId:'foreign'}})).error);assert.equal(writes,0);assert.equal(JSON.stringify(snapshot),before);
console.log('PASS saved asset API options: existing SNS-001 REAL/SNS-002 DEMO saved details, scoped registry disclosure, foreign pipeline rejection and duplicate POST protection. Zero database writes.');
})().catch(error=>{console.error(error);process.exitCode=1;});
