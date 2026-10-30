/** Reversible save checks on the already rolled-back isolated restore, never development. */
const assert=require("node:assert/strict"),path=require("node:path");
require("dotenv").config({path:path.resolve(__dirname,"../../.env")});
const url=new URL(process.env.DATABASE_URL);
assert.equal(url.hostname,process.env.CHAINAGE_REHEARSAL_HOST);
assert.ok(!url.hostname.startsWith("ep-lucky-art-"));
assert.equal(url.pathname,"/kl_chainage_migration_rollback");
assert.ok(process.env.CHAINAGE_REHEARSAL_NAME?.startsWith("chainage-migration-rehearsal-"));
require("tsx/cjs");
const {PrismaClient}=require("@prisma/client"),{createApp}=require("../app.ts"),{signToken}=require("../lib/jwt.ts"),{disconnectPrisma}=require("../lib/prisma.ts");
const {readonlyInventory,canonicalInventory}=require("./chainageBackupRestore.cjs");
const db=new PrismaClient();
async function main(){
  const before=canonicalInventory(await readonlyInventory(db));
  assert.ok(!before.columns.some(c=>c.column_name==="chainageMeters"));
  const user=await db.user.findFirstOrThrow({where:{role:"Admin"}}),token=signToken({sub:user.id,email:user.email,role:user.role});
  const server=createApp().listen(0,"127.0.0.1");await new Promise(resolve=>server.once("listening",resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const call=async(route,method,body)=>{const r=await fetch(base+route,{method,headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
  let id;
  try{
    const input={pipelineCode:"UNMIGRATED-COMPATIBILITY",pipelineName:"Isolated compatibility fixture",pipeMaterial:"Carbon Steel",pipeGrade:"API 5L X52",pipeLengthKm:20,status:"Active"};
    const pipeline=await call("/api/pipelines","POST",input);assert.equal(pipeline.status,201);id=pipeline.data.id;
    const segment=await call("/api/asset-master/segments","POST",{pipelineId:id,segmentId:"COMPAT-SEG",startKp:"1+000",endKp:"2+000"});assert.equal(segment.status,201);
    const assetBody={pipelineId:id,assetId:"COMPAT-ASSET",assetType:"VALVE",kp:"1+500",physicalStatus:"Active"};
    const asset=await call("/api/asset-master/assets","POST",assetBody);assert.equal(asset.status,201);
    assert.equal((await call(`/api/asset-master/assets/${asset.data.id}`,"PUT",{...assetBody,kp:"1+600"})).status,200);
    assert.equal((await call(`/api/pipelines/${id}`,"PUT",{...input,chainageDirection:"INCREASING_DOWNSTREAM"})).status,400);
    assert.equal((await db.pipeline.findUnique({where:{id}})).pipelineName,input.pipelineName);
    console.log("PASS unmigrated isolated restore: legacy pipeline/segment/asset saves and edits; unavailable settings rejected atomically.");
  }finally{
    if(id){await db.asset.deleteMany({where:{pipelineId:id}});await db.segment.deleteMany({where:{pipelineId:id}});await db.pipeline.delete({where:{id}});}
    await new Promise(resolve=>server.close(resolve));await disconnectPrisma();
  }
  assert.deepEqual(canonicalInventory(await readonlyInventory(db)),before);
  console.log("PASS unmigrated compatibility fixtures removed; original schema and all records unchanged.");
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
