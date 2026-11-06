const assert=require("node:assert/strict"),fs=require("node:fs"),ts=require("typescript");
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const {resolveConnectorScope,scopedConnectorConfiguration}=require('../integrations/scope.ts');
const {validateConnectorInput,validateConnectorPatch}=require('../integrations/validation.ts');
const base={id:'pipeline-A',createdById:'owner-A',companyId:'company-A',creatorCompanyId:'company-A',companyRecordId:'company-A'};
const owner={id:'owner-A',name:'Owner',email:'owner@example.invalid',role:'Engineer',companyId:'company-A'},admin={...owner,id:'admin-A',role:'Admin'};
let rows=[{...base}],asset={id:'asset-A',pipelineId:'pipeline-A'},queries=[],assetReads=0,queryError;
const db={$queryRawUnsafe:async(sql,...values)=>{assert.ok(sql.trim().startsWith('SELECT'));assert.ok(sql.includes('p."companyId"'));assert.ok(sql.includes('WHERE p.id=$1'));queries.push({sql,values});if(queryError)throw queryError;return rows;},asset:{findFirst:async args=>{assetReads++;assert.equal(args.where.pipelineId,'pipeline-A');return asset;}}};
const input={pipelineId:'pipeline-A',assetId:'asset-A'},expected={companyId:'company-A',pipelineId:'pipeline-A',assetId:'asset-A'};
(async()=>{
assert.deepEqual(await resolveConnectorScope(db,input,owner),expected);
assert.deepEqual(await resolveConnectorScope(db,input,admin),expected,'same-company Admin may use another creator pipeline');
await assert.rejects(resolveConnectorScope(db,input,{...owner,id:'other-engineer'}));
for(const user of [{...admin,companyId:undefined},{...admin,companyId:'company-B'}]){const reads=assetReads;await assert.rejects(resolveConnectorScope(db,input,user));assert.equal(assetReads,reads,'Reject tenant failure before reading asset');}
for(const change of [{companyId:null},{creatorCompanyId:null},{creatorCompanyId:'company-B'},{companyRecordId:null},{companyRecordId:'company-B'},{createdById:null},{id:'foreign'}]){rows=[{...base,...change}];await assert.rejects(resolveConnectorScope(db,input,admin),JSON.stringify(change));}
rows=[];await assert.rejects(resolveConnectorScope(db,input,admin));rows=[base,base];await assert.rejects(resolveConnectorScope(db,input,admin));rows=[base];
asset={id:'asset-A',pipelineId:'foreign'};await assert.rejects(resolveConnectorScope(db,input,admin));asset=null;await assert.rejects(resolveConnectorScope(db,input,admin));asset={id:'asset-A',pipelineId:'pipeline-A'};
queryError=Error('Missing column');await assert.rejects(resolveConnectorScope(db,input,admin),/Missing column/);queryError=undefined;
const configured=await scopedConnectorConfiguration(db,{scope:input,configuration:{integrationMetadata:{owner:'Team'}}},admin);
assert.deepEqual(configured.integrationScope,expected);assert.equal(configured.integrationMetadata.owner,'Team');
const existing={integrationScope:expected,integrationMetadata:{owner:'Original',configurationVersion:1},preserved:true};
const updated=await scopedConnectorConfiguration(db,{configuration:{integrationMetadata:{owner:'Updated'}}},admin,existing);assert.deepEqual(updated.integrationScope,expected);assert.equal(updated.preserved,true);assert.equal(existing.integrationMetadata.owner,'Original');
await assert.rejects(scopedConnectorConfiguration(db,{configuration:null},admin,existing));
await assert.rejects(scopedConnectorConfiguration(db,{configuration:{integrationScope:{companyId:'company-B'}}},admin,existing));
for(const config of [{integrationScope:null},{integrationScope:{}},{integrationScope:{...expected,companyId:'company-B'}}])await assert.rejects(scopedConnectorConfiguration(db,{configuration:{enabled:true}},admin,config));
rows=[{...base,companyId:'company-B',creatorCompanyId:'company-B',companyRecordId:'company-B'}];await assert.rejects(scopedConnectorConfiguration(db,{scope:input},admin,existing));rows=[base];
assert.throws(()=>validateConnectorInput({name:'Scoped',endpoint:'https://example.invalid',configuration:{integrationScope:expected}}));assert.throws(()=>validateConnectorPatch({configuration:{integrationScope:expected}}));
// Legacy unscoped configuration remains unlinked; no company is fabricated.
const count=queries.length;assert.deepEqual(await scopedConnectorConfiguration(db,{configuration:{integrationMetadata:{owner:'Team'}}},{...admin,companyId:undefined}),{integrationMetadata:{owner:'Team',configurationVersion:1}});assert.equal(queries.length,count);
assert.ok(queries.every(row=>row.values.length===1&&row.values[0]==='pipeline-A'));
const routes=fs.readFileSync(require('node:path').join(__dirname,'../routes/integrations.ts'),'utf8');assert.ok(!routes.includes('pipeline.createdBy?.companyId'));assert.ok(routes.includes('configuration: await scopedConfiguration({ configuration: connectorInput.configuration, scope }, request.user!, existing.configuration)'));
console.log('PASS authoritative company scope: same-company owner/Admin, non-owner rejection, missing/dangling/inconsistent ownership, cross-company Admin, asset isolation, missing schema fail-closed, stored-scope revalidation and spoof/clear rejection. Mock SELECTs only; no database writes or network.');
})().catch(error=>{console.error(error);process.exitCode=1;});
