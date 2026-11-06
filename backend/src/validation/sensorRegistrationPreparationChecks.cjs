const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'../../..'),backendRequire=createRequire(path.join(root,'backend/package.json'));
const snapshot=JSON.parse(fs.readFileSync(path.join(root,'artifacts/sensors-local-activation/inventory.json'),'utf8'));
assert.equal(snapshot.readOnly,true);let writes=0;
// Isolate the pre-registration scenario in memory; never mutate saved database records.
snapshot.devices=snapshot.devices.filter(row=>row.deviceId!=='SNS-002');
const store={listPipelines:async scope=>snapshot.pipelines.filter(row=>scope?.viewerRole==='Admin'||row.createdById===scope?.viewerUserId),listSegments:async scope=>snapshot.segments.filter(row=>row.pipelineId===scope.pipelineId),listAssets:async scope=>snapshot.assets.filter(row=>row.pipelineId===scope.pipelineId),listDevices:async()=>snapshot.devices,findAssetById:async id=>snapshot.assets.find(row=>row.id===id),createDevice:async()=>{writes++;throw Error('Writes are forbidden in preparation tests');},updateDeviceLocation:async()=>{writes++;throw Error('Writes forbidden');},findDeviceById:async id=>snapshot.devices.find(row=>row.id===id)};
const cache={};function load(relative){const file=path.resolve(root,'backend/src',relative);if(cache[file])return cache[file];const mod={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;vm.runInNewContext(code,{module:mod,exports:mod.exports,require:name=>{if(name==='../data/store')return{store};if(name==='../lib/prisma')return{getPrismaClient:()=>{throw Error('No database connections permitted');}};if(name==='../middleware/auth')return{requireAuth:()=>{}};if(name==='express')return{Router:()=>router};if(name.startsWith('.'))return load(path.relative(path.join(root,'backend/src'),path.resolve(path.dirname(file),name+'.ts')));return backendRequire(name);},console});cache[file]=mod.exports;return mod.exports;}
const routes=new Map(),router={use:()=>{},get:(route,fn)=>routes.set('GET '+route,fn),post:(route,fn)=>routes.set('POST '+route,fn),patch:(route,fn)=>routes.set('PATCH '+route,fn),delete:()=>{}};
const validation=load('validation/deviceValidation.ts'),mapping=load('validation/sensorAssetRegistration.ts');load('routes/devices.ts');
const user={id:snapshot.pipelines.find(row=>row.pipelineCode==='PL-002').createdById,role:'Admin'};
async function call(route,request){let result,error;const response={json:value=>{result=value;return response;},status:()=>response};await routes.get(route)({...request,user},response,value=>{error=value;});return{result,error};}
(async()=>{const pipeline=snapshot.pipelines.find(row=>row.pipelineCode==='PL-002'),assets=snapshot.assets.filter(row=>row.pipelineId===pipeline.id);const [pressure,temperature]=['SNS-001','SNS-002'].map(code=>assets.find(asset=>asset.assetId===code));
assert.equal(mapping.canonicalSensorDeviceType(pressure.equipmentType),'Pressure Transmitter');assert.equal(mapping.canonicalSensorDeviceType(temperature.equipmentType),'Temperature Sensor');assert.equal(mapping.canonicalSensorDeviceType('Unmapped equipment'),null);
const scada=load('utils/scadaData.ts');await assert.rejects(scada.validateTagDeviceLink({assetId:temperature.id,pipelineId:pipeline.id},user));await assert.rejects(scada.validateTagDeviceLink({assetId:snapshot.assets.find(row=>row.assetId==='SNS-DEMO-001').id,pipelineId:snapshot.pipelines.find(row=>row.pipelineCode==='PL-001').id},user));
const registeredPressure=snapshot.devices.find(row=>row.deviceId===pressure.assetId);
assert.ok(registeredPressure);const originalMode=registeredPressure.isDemoData;registeredPressure.isDemoData=true;
await assert.rejects(scada.validateTagDeviceLink({assetId:pressure.id,pipelineId:pipeline.id},user),error=>JSON.stringify(error).includes("DEMO devices"));
registeredPressure.isDemoData=originalMode;
assert.equal(mapping.realSensorAssetBlockers(pressure).length,0);assert.ok(mapping.realSensorAssetBlockers(temperature).length);assert.ok(mapping.realSensorAssetBlockers(snapshot.assets.find(asset=>asset.assetId==='SNS-DEMO-001')).length);
const response=await call('GET /registration-options',{query:{pipelineId:pipeline.id}});assert.ifError(response.error);assert.equal(response.result.length,2);assert.equal(response.result.find(row=>row.assetCode==='SNS-002').blockers.length>0,true);assert.equal(response.result.find(row=>row.assetCode==='SNS-001').unit,null);fs.writeFileSync(path.join(root,'artifacts/sensors-local-activation/pl002-registration-options.json'),JSON.stringify(response.result,null,2));
assert.ok((await call('GET /registration-options',{query:{pipelineId:'not-a-saved-pipeline'}})).error);
for(const asset of assets){const segment=snapshot.segments.find(row=>row.id===asset.segmentId),location=`${pipeline.pipelineCode} / ${segment.segmentId} / KP ${asset.kp}`;
assert.ok(Number(asset.kp)>=Number(segment.startKp)&&Number(asset.kp)<=Number(segment.endKp));assert.ok(Math.abs(asset.latitude)<=90&&Math.abs(asset.longitude)<=180);const coordinates=asset.coordinates.split(",").map(Number);assert.equal(coordinates[0],asset.latitude);assert.equal(coordinates[1],asset.longitude);
const candidate={deviceId:asset.assetId,deviceType:mapping.canonicalSensorDeviceType(asset.equipmentType),pipelineOrLocation:location,status:'Inactive',latestReadingOrState:'Not commissioned',unit:'',assetRecordId:asset.id,pipelineId:pipeline.id,segmentRecordId:segment.id,identityConfirmed:false};
assert.throws(()=>validation.validateDeviceRegistrationInput(candidate));assert.ok((await call('POST /',{body:candidate})).error);
if(asset.assetId==='SNS-001'){assert.equal(await mapping.savedSensorRegistration(candidate,user),location);await assert.rejects(mapping.savedSensorRegistration({...candidate,pipelineId:snapshot.pipelines.find(row=>row.pipelineCode==='PL-001').id},user));await assert.rejects(mapping.savedSensorRegistration({...candidate,deviceType:'Temperature Sensor'},user));}
else{await assert.rejects(mapping.savedSensorRegistration(candidate,user));}
assert.ok((await call('POST /',{body:{deviceId:asset.assetId,deviceType:candidate.deviceType,pipelineOrLocation:location,status:'Inactive',latestReadingOrState:'Not commissioned'}})).error,'Saved codes cannot bypass ID/evidence validation via unlinked registration');
}
// Exercise the actual POST handler up to a blocked persistence boundary: never create a device.
const tempSegment=snapshot.segments.find(row=>row.id===temperature.segmentId);
const demo={deviceId:temperature.assetId,deviceType:'Temperature Sensor',pipelineOrLocation:`PL-002 / ${tempSegment.segmentId} / KP ${temperature.kp}`,status:'Inactive',latestReadingOrState:'Not Available',unit:'degC',assetRecordId:temperature.id,pipelineId:pipeline.id,segmentRecordId:tempSegment.id,isDemoData:true,demoConfirmed:true};
assert.equal(validation.validateDeviceRegistrationInput(demo).isDemoData,true);
assert.throws(()=>validation.validateDeviceRegistrationInput({...demo,assetRecordId:undefined}));
for(const change of [{status:"Active"},{latestReadingOrState:"42"}])assert.ok((await call("POST /",{body:{...demo,...change}})).error);
assert.equal(await mapping.savedSensorRegistration(demo,user),demo.pipelineOrLocation);
await assert.rejects(mapping.savedSensorRegistration({...demo,isDemoData:false},user));
await assert.rejects(mapping.savedSensorRegistration({...demo,pipelineId:'foreign'},user));
assert.equal(response.result.find(row=>row.assetCode==='SNS-002').demoBlockers.length,0);
assert.ok(response.result.find(row=>row.assetCode==='SNS-001').demoBlockers.length,'Saved SNS-001 duplicate remains blocked in DEMO');
let captured;store.createDevice=async input=>{captured=input;throw Error('TEST PERSISTENCE BLOCKED');};
const attempt=await call('POST /',{body:{...demo,isDemoData:false,demoConfirmed:false}});assert.equal(attempt.error.message,'TEST PERSISTENCE BLOCKED');assert.equal(captured.isDemoData,true);assert.equal(captured.device.deviceType,'Temperature Sensor');assert.equal(captured.device.isDemoData,undefined);assert.equal(captured.device.demoConfirmed,undefined);
assert.equal(response.result.find(row=>row.assetCode==='SNS-002').registrationClassification,'DEMO');
assert.equal(response.result.find(row=>row.assetCode==='SNS-002').registrationBlockers.length,0);
assert.equal(mapping.savedSensorClassification({assetId:'UNCLASSIFIED'}),'REVIEW');
const preparedReal=await mapping.prepareSavedSensorRegistration({...demo,deviceId:pressure.assetId,assetRecordId:pressure.id,segmentRecordId:pressure.segmentId,deviceType:'Pressure Transmitter',pipelineOrLocation:'PL-002 / SEG-03 / KP 125',isDemoData:true,identityConfirmed:true},user);assert.equal(preparedReal.isDemoData,false,'Client flag cannot downgrade REAL evidence path to DEMO');
assert.equal(mapping.savedSensorClassification({...temperature,assetId:'ANOTHER-ILLUSTRATIVE'}),'DEMO');
const realMissingEvidence=await call('POST /',{body:{...demo,deviceId:pressure.assetId,assetRecordId:pressure.id,segmentRecordId:pressure.segmentId,deviceType:'Pressure Transmitter',pipelineOrLocation:'PL-002 / SEG-03 / KP 125',isDemoData:true,identityConfirmed:false}});assert.ok(realMissingEvidence.error);
assert.equal(captured.isDemoData,true);
captured=undefined;await call('POST /',{body:{...demo,deviceId:'SNS-001',assetRecordId:pressure.id,segmentRecordId:pressure.segmentId,deviceType:'Pressure Transmitter',pipelineOrLocation:'PL-002 / SEG-03 / KP 125'}});assert.equal(captured,undefined);
store.createDevice=async()=>{throw Error('Writes forbidden');};
console.log('PASS automatic classification API: saved metadata overrides client mode, Inactive/no-reading constraints, REAL evidence, uncertain metadata review, foreign IDs, duplicate protection and DEMO persistence boundary.');
const quarantined=snapshot.devices.find(row=>row.deviceId==='SNS-DEMO-001');assert.ok((await call('PATCH /:id',{params:{id:quarantined.id},body:{pipelineOrLocation:quarantined.pipelineOrLocation}})).error);assert.equal(writes,0);
console.log('PASS socket-free API/helper checks against actual saved assets: explicit type aliases, GPS/KP ranges, scoped ID matching, missing unit/evidence rejection, illustrative SNS-002 block, SNS-DEMO-001 quarantine, and no unlinked bypass. Zero database writes or listeners; no new device/reading/credential records.');})().catch(error=>{console.error(error);process.exitCode=1;});
