/** Read-only development audit, isolated backup restore for route-editor saves; no migrations. */
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
require("dotenv").config({path:path.resolve(__dirname,"../../.env")});
const {PrismaClient}=require("@prisma/client"),{readonlyInventory,canonicalInventory,command,hash}=require("./chainageBackupRestore.cjs");
const project="weathered-smoke-69232580",sourceBranch="br-lively-lake-azype02e",stamp=new Date().toISOString().replace(/[:.]/g,"-"),name=`gis-editor-verification-${stamp}`;
const out=path.resolve(__dirname,"../../../artifacts/gis-editor",stamp),old=path.resolve(__dirname,"../../../artifacts/chainage/recovery-readiness/2026-10-29T09-54-15-346Z"),archive=path.join(old,"klinthru-development.backup");
const cli=path.join(process.env.APPDATA,"npm/node_modules/neonctl/bin/cli.js"),report={status:"RUNNING",migrationExecuted:false};
let branchId,host,source,admin,target,password="",sourcePassword="";
const sanitize=s=>[password,sourcePassword].filter(Boolean).reduce((v,p)=>v.replaceAll(p,"[redacted]"),s);
async function neon(args){for(let n=0;n<3;n++){try{return await command(process.execPath,[cli,...args,"--output","json","--no-analytics"],{...process.env,CI:"true"},90000);}catch(e){if(n===2)throw e;}}}
async function api(route,method="GET"){return JSON.parse((await neon(["api",route,"--method",method])).stdout);}
async function inv(db){for(let n=0;n<3;n++){try{return canonicalInventory(await readonlyInventory(db));}catch(e){if(n===2)throw e;await db.$disconnect();}}}
async function main(){
 fs.mkdirSync(out,{recursive:true});await command("icacls.exe",[out,"/inheritance:r","/grant:r",`${process.env.USERDOMAIN}\\${process.env.USERNAME}:(OI)(CI)F`]);
 const baseline=canonicalInventory(JSON.parse(fs.readFileSync(path.join(old,"source-manifest.json"))));
 try{
  const endpoints=(await api(`/projects/${project}/endpoints`)).endpoints,u=new URL(process.env.DATABASE_URL);sourcePassword=decodeURIComponent(u.password);
  const original=endpoints.find(e=>e.host===u.hostname.replace("-pooler.","."));assert.equal(original?.branch_id,sourceBranch);u.hostname=original.host;u.searchParams.set("connect_timeout","30");
  source=new PrismaClient({datasources:{db:{url:u.toString()}}});assert.deepEqual(await inv(source),baseline);assert.equal(hash(fs.readFileSync(archive)),JSON.parse(fs.readFileSync(path.join(old,"verification.json"))).archiveSha256);
  console.log("PASS development read-only inventory and backup checksum.");
  const created=JSON.parse((await neon(["branches","create","--project-id",project,"--parent",sourceBranch,"--schema-only","--no-secrets","--name",name,"--expires-at",new Date(Date.now()+86400000).toISOString()])).stdout);
  branchId=created.branch.id;const endpoint=created.endpoints.find(e=>e.branch_id===branchId);host=endpoint.host;
  const metadata=(await api(`/projects/${project}/branches/${branchId}`)).branch;assert.equal(metadata.name,name);assert.ok(!metadata.default&&!metadata.primary);assert.notEqual(branchId,sourceBranch);assert.notEqual(endpoint.id,original.id);
  report.target={branchId,name,endpointId:endpoint.id};fs.writeFileSync(path.join(out,"target.json"),JSON.stringify(report.target,null,2));
  const connection=new URL((await neon(["connection-string",branchId,"--project-id",project,"--database-name","neondb","--role-name","neondb_owner"])).stdout.trim());assert.equal(connection.hostname,host);password=decodeURIComponent(connection.password);connection.searchParams.set("connect_timeout","30");
  admin=new PrismaClient({datasources:{db:{url:connection.toString()}}});const database="kl_route_editor_restore";
  assert.equal((await admin.$queryRawUnsafe("SELECT 1 FROM pg_database WHERE datname=$1",database)).length,0);await admin.$executeRawUnsafe(`CREATE DATABASE "${database}"`);
  await command("C:/Program Files/PostgreSQL/18/bin/pg_restore.exe",["--exit-on-error","--no-owner","--no-privileges","--no-password","--dbname",database,archive],{...process.env,PGHOST:host,PGPORT:"5432",PGUSER:decodeURIComponent(connection.username),PGPASSWORD:password,PGSSLMODE:"require",PGCHANNELBINDING:"require"},240000);
  connection.pathname="/"+database;target=new PrismaClient({datasources:{db:{url:connection.toString()}}});assert.deepEqual(await inv(target),baseline);console.log("PASS isolated restored database matches every original schema/table hash; no migration.");
  const r=await command(process.execPath,[path.join(__dirname,process.env.GIS_TEST_MODE==="assets"?"routeEditorAssetChecks.cjs":"routeEditorBrowserChecks.cjs")],{...process.env,DATABASE_URL:connection.toString(),NODE_ENV:"test",GIS_RESTORE_HOST:host,GIS_RESTORE_BRANCH:branchId,GIS_RESTORE_NAME:name,GIS_OUTPUT:out},900000);
  fs.writeFileSync(path.join(out,"browser.log"),sanitize(r.stdout+"\n"+r.stderr));console.log(sanitize(r.stdout));report.checks=JSON.parse(fs.readFileSync(path.join(out,"checks.json")));
  assert.deepEqual(await inv(target),baseline);assert.deepEqual(await inv(source),baseline);report.originalRestoreUnchanged=true;report.developmentUnchanged=true;report.status=report.checks.fail?"FAIL":"PASS";
 }catch(e){report.status="FAIL";report.error=sanitize(e.message);console.error(report.error);process.exitCode=1;}
 finally{
  await target?.$disconnect();await admin?.$disconnect();await source?.$disconnect();
  if(branchId){try{const b=(await api(`/projects/${project}/branches/${branchId}`)).branch;assert.equal(b.name,name);assert.ok(!b.default&&!b.primary);assert.notEqual(branchId,sourceBranch);await api(`/projects/${project}/branches/${branchId}`,"DELETE");assert.ok(!(await api(`/projects/${project}/branches`)).branches.some(b=>b.id===branchId));report.temporaryResourcesRemoved=true;}catch(e){report.cleanupError=sanitize(e.message);report.status="BLOCKED";process.exitCode=1;}}
  report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(out,"verification.json"),JSON.stringify(report,null,2));fs.writeFileSync(path.join(path.dirname(out),"latest-run.json"),JSON.stringify({directory:out},null,2));console.log(`${report.status}: route editor verification; development/production not migrated; temporary removed=${report.temporaryResourcesRemoved}`);
 }
}
main().catch(e=>{console.error(sanitize(e.message));process.exitCode=1;});
