/** Engineering queries against development are read-only; no save or migration calls. */
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
require("dotenv").config({path:path.resolve(__dirname,"../../.env")});
const url=new URL(process.env.DATABASE_URL);assert.ok(url.hostname.startsWith("ep-lucky-art-"));
require("tsx/cjs");
const {PrismaClient}=require("@prisma/client"),{createApp}=require("../app.ts"),{signToken}=require("../lib/jwt.ts"),{disconnectPrisma}=require("../lib/prisma.ts"),{parseKp}=require("../coreEngine/chainage/ChainageAgent.ts");
const db=new PrismaClient();
async function main(){
 const snapshot=()=>db.$transaction(async tx=>{await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");return tx.pipeline.findMany({orderBy:{id:"asc"},include:{segments:{orderBy:{id:"asc"}},assets:{orderBy:{id:"asc"}}}});});
 const before=await snapshot(),user=await db.$transaction(async tx=>{await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");return tx.user.findFirstOrThrow({where:{role:"Admin"},select:{id:true,email:true,role:true}});});
 const token=signToken({sub:user.id,email:user.email,role:user.role}),server=createApp().listen(0,"127.0.0.1");await new Promise(r=>server.once("listening",r));const results=[];
 try{
  for(const pipeline of before){
   const call=async body=>{const r=await fetch(`http://127.0.0.1:${server.address().port}/api/chainage/${pipeline.id}`,{method:body?"POST":"GET",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};};
   const state=await call();assert.equal(state.status,200);assert.equal(state.data.assets.length,pipeline.assets.length);assert.equal(state.data.segments.length,pipeline.segments.length);
   const conversion=await call({operation:"convert",chainage:"0+050"}),distance=await call({operation:"distance",chainage:"0+000",target:"0+050"});assert.equal(conversion.status,200);assert.equal(conversion.data.result.meters,50);assert.equal(distance.data.result.distance_m,50);
   for(const segment of state.data.segments)if(segment.startKp&&segment.endKp)assert.equal(segment.length_m,parseKp(segment.endKp).meters-parseKp(segment.startKp).meters);
   const coordinate=await call({operation:"coordinate",chainage:"0+000"});assert.equal(coordinate.status,state.data.alignment.ready?200:422);
   results.push({pipeline:pipeline.pipelineCode,status:"PASS",conversion:"PASS",alongChainageDistance:"PASS",segmentDistances:"PASS",alignment:state.data.alignment,missingRoute:!pipeline.routeGeometry,missingGps:pipeline.assets.filter(a=>a.latitude===null||a.longitude===null).map(a=>a.assetId)});
  }
  assert.deepEqual(await snapshot(),before);
  const out=path.resolve(__dirname,"../../../artifacts/gis-editor");fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,"read-only-chainage.json"),JSON.stringify({status:"PASS",dataUnchanged:true,results},null,2));console.log(`PASS read-only Chainage Agent API checks for all ${results.length} real development pipelines; original records unchanged.`);
 }finally{await new Promise(r=>server.close(r));await disconnectPrisma();await db.$disconnect();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
