/** Restore only the task-created temporary branch; active development stays read only. */
const fs=require("node:fs"),path=require("node:path");
require("dotenv").config({path:path.resolve(__dirname,"../../.env")});
const {PrismaClient}=require("@prisma/client");
const {readonlyInventory,canonicalInventory,command,hash}=require("./chainageBackupRestore.cjs");
const project="weathered-smoke-69232580",branchName="chainage-restore-rehearsal-20261029";
let branchId="",temporaryHost="";
const directory=path.resolve(__dirname,"../../../artifacts/chainage/recovery-readiness/2026-10-29T09-54-15-346Z");
const cli=path.join(process.env.APPDATA,"npm/node_modules/neonctl/bin/cli.js"),bin="C:/Program Files/PostgreSQL/18/bin";
const archive=path.join(directory,"klinthru-development.backup");
let targetPassword="",sourcePassword="";
const sanitize=s=>[targetPassword,sourcePassword].filter(Boolean).reduce((text,secret)=>text.replaceAll(secret,"[redacted]"),s);
async function neon(args){let last;for(let n=0;n<3;n++){try {return await command(process.execPath,[cli,...args,"--output","json","--no-analytics"],{...process.env,CI:"true"});}catch(e){last=e;if(n<2)await new Promise(r=>setTimeout(r,1000));}}throw last;}
async function api(route,method="GET"){const r=await neon(["api",route,"--method",method]);return JSON.parse(r.stdout);}
function targetUrl(base,name){const u=new URL(base);u.pathname="/"+name;if(!temporaryHost||u.hostname!==temporaryHost||u.hostname.startsWith("ep-lucky-art-")||!/^kl_chainage_restore_(primary|committed)$/.test(name))throw new Error("Unapproved restore target.");return u;}
async function retryInventory(db){for(let n=0;n<3;n++){try{return canonicalInventory(await readonlyInventory(db));}catch(e){if(n===2)throw e;console.log("Retrying read-only inventory after a connection interruption...");await db.$disconnect();await new Promise(r=>setTimeout(r,2000));}}}
async function main(){
  const baseline=canonicalInventory(JSON.parse(fs.readFileSync(path.join(directory,"source-manifest.json"),"utf8")));
  const endpoints=(await api(`/projects/${project}/endpoints`)).endpoints;
  const sourceUrl=new URL(process.env.DATABASE_URL);sourcePassword=decodeURIComponent(sourceUrl.password);
  const sourceEndpoint=endpoints.find(e=>e.host===sourceUrl.hostname.replace("-pooler.","."));
  if(sourceEndpoint?.branch_id!=="br-lively-lake-azype02e")throw new Error("Active source is not the approved development branch.");
  sourceUrl.hostname=sourceEndpoint.host;
  sourceUrl.searchParams.set("connect_timeout","30");sourceUrl.searchParams.set("pool_timeout","30");
  const active=new PrismaClient({datasources:{db:{url:sourceUrl.toString()}}});
  try{const current=await retryInventory(active);if(JSON.stringify(current)!==JSON.stringify(baseline))throw new Error("Source changed after backup; refresh before rehearsal.");}finally{await active.$disconnect();}
  const created=JSON.parse((await neon(["branches","create","--project-id",project,"--parent","br-lively-lake-azype02e","--name",branchName,"--schema-only","--no-secrets","--expires-at","2026-10-30T12:00:00Z"])).stdout);
  branchId=created.branch.id;temporaryHost=created.endpoints.find(e=>e.branch_id===branchId).host;
  fs.writeFileSync(path.join(directory,"temporary-target.json"),JSON.stringify({branchId,branchName,host:temporaryHost,sourceBranchId:"br-lively-lake-azype02e",createdFor:"Isolated backup restore only"},null,2));
  const metadata=(await api(`/projects/${project}/branches/${branchId}`)).branch;
  if(metadata.id!==branchId||metadata.name!==branchName||metadata.default||metadata.primary||metadata.init_source!=="parent-schema")throw new Error("Temporary branch verification failed.");
  const endpoint=created.endpoints.find(e=>e.branch_id===branchId);
  if(!endpoint||endpoint.id===sourceEndpoint.id)throw new Error("Temporary and active endpoints must differ.");
  const captured=await neon(["connection-string",branchId,"--project-id",project,"--database-name","neondb","--role-name","neondb_owner"]);
  const connection=new URL(captured.stdout.trim());targetPassword=decodeURIComponent(connection.password);
  connection.searchParams.set("connect_timeout","30");connection.searchParams.set("pool_timeout","30");
  if(connection.hostname!==endpoint.host||connection.hostname===sourceUrl.hostname)throw new Error("Connection target isolation failed.");
  const source=new PrismaClient({datasources:{db:{url:sourceUrl.toString()}}});
  const admin=new PrismaClient({datasources:{db:{url:connection.toString()}}});
  let passed=false;
  try{
    const before=await retryInventory(source);
    if(JSON.stringify(before)!==JSON.stringify(baseline))throw new Error("Development source changed after the backup snapshot; refresh backup before claiming unchanged data.");
    const env={...process.env,PGHOST:connection.hostname,PGPORT:connection.port||"5432",PGUSER:decodeURIComponent(connection.username),PGPASSWORD:targetPassword,PGSSLMODE:"require",PGCHANNELBINDING:"require"};
    const restore=async name=>{
      const url=targetUrl(connection,name);
      const exists=await admin.$queryRawUnsafe("SELECT 1 FROM pg_database WHERE datname=$1",name);
      if(exists.length)throw new Error("Rehearsal database already exists; refuse to overwrite it.");
      await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
      await command(path.join(bin,"pg_restore.exe"),["--exit-on-error","--no-owner","--no-privileges","--no-password","--dbname",name,archive],env,240000);
      const db=new PrismaClient({datasources:{db:{url:url.toString()}}});
      try{const restored=await retryInventory(db);if(JSON.stringify(restored)!==JSON.stringify(baseline)){
        fs.writeFileSync(path.join(directory,"restored-manifest.json"),JSON.stringify(restored,null,2));
        const differingTables=restored.tables.filter(t=>JSON.stringify(t)!==JSON.stringify(baseline.tables.find(b=>b.table===t.table))).map(t=>t.table);
        throw new Error("Restore verification mismatch: "+JSON.stringify({differingTables,dataEqual:restored.records_sha256===baseline.records_sha256,schemaEqual:restored.schema_sha256===baseline.schema_sha256}));
      }return db;}catch(e){await db.$disconnect();throw e;}
    };
    console.log("Restoring backup into an EMPTY database on the positively verified temporary branch...");
    const primary=await restore("kl_chainage_restore_primary");
    try{
      try{await primary.$transaction(async tx=>{
        await tx.$executeRawUnsafe("CREATE SCHEMA rollback_readiness_probe");
        await tx.$executeRawUnsafe("CREATE TYPE rollback_readiness_probe.direction AS ENUM ('FORWARD','REVERSE')");
        await tx.$executeRawUnsafe("CREATE TABLE rollback_readiness_probe.sample (id integer PRIMARY KEY, distance_m numeric(24,9))");
        await tx.$executeRawUnsafe("INSERT INTO rollback_readiness_probe.sample VALUES (1,18900.65)");
        await tx.$executeRawUnsafe("ALTER TABLE rollback_readiness_probe.sample ADD COLUMN label text");
        await tx.$executeRawUnsafe("CREATE INDEX sample_distance_idx ON rollback_readiness_probe.sample(distance_m)");
        throw new Error("ROLLBACK_EXPECTED");
      });}catch(e){if(e.message!=="ROLLBACK_EXPECTED")throw e;}
      const probe=await primary.$queryRawUnsafe("SELECT count(*)::int AS count FROM pg_namespace WHERE nspname='rollback_readiness_probe'");
      if(probe[0].count!==0)throw new Error("Generic DDL rollback rehearsal failed.");
      await primary.$executeRawUnsafe("CREATE SCHEMA committed_recovery_probe");
      await primary.$executeRawUnsafe("CREATE TABLE committed_recovery_probe.sample (id integer PRIMARY KEY)");
      await primary.$executeRawUnsafe("INSERT INTO committed_recovery_probe.sample VALUES (1)");
      console.log(`PASS first restore: ${baseline.tables.length} tables and all row/schema fingerprints match; generic transaction rollback passed.`);
    }finally{await primary.$disconnect();}
    const tests=await command(process.execPath,[path.resolve(__dirname,"../../node_modules/tsx/dist/cli.mjs"),path.join(__dirname,"segmentOverlapDatabaseChecks.ts")],{...process.env,DATABASE_URL:targetUrl(connection,"kl_chainage_restore_primary").toString(),NODE_ENV:"test",CHAINAGE_RESTORE_ENDPOINT:endpoint.host,CHAINAGE_RESTORE_BRANCH_ID:branchId,CHAINAGE_RESTORE_BRANCH_NAME:branchName},120000);
    fs.writeFileSync(path.join(directory,"isolated-overlap-tests.log"),sanitize(tests.stdout));console.log(sanitize(tests.stdout).trim());
    const recovered=await restore("kl_chainage_restore_committed");
    try{const probe=await recovered.$queryRawUnsafe("SELECT count(*)::int AS count FROM pg_namespace WHERE nspname='committed_recovery_probe'");if(probe[0].count!==0)throw new Error("Fresh recovery restore retained scratch changes.");}finally{await recovered.$disconnect();}
    const after=await retryInventory(source);if(JSON.stringify(after)!==JSON.stringify(baseline))throw new Error("Active source changed during rehearsal.");
    const result={status:"PASS",verifiedAt:new Date().toISOString(),project:"Klinthru",sourceBranch:"klinthru-development",sourceEndpoint:sourceEndpoint.id,archive:path.basename(archive),archiveBytes:fs.statSync(archive).size,archiveSha256:hash(fs.readFileSync(archive)),tableCount:baseline.tables.length,totalRows:baseline.tables.reduce((n,t)=>n+t.count,0),sourceRecordsSha256:baseline.records_sha256,sourceSchemaSha256:baseline.schema_sha256,allTableCountsAndHashesMatched:true,allColumnConstraintIndexEnumInventoriesMatched:true,transactionalDdlAndDataRollback:"PASS (generic scratch objects only)",postCommitRecovery:"PASS (second fresh isolated database restored from the same backup)",isolatedOverlapConcurrencyAndApiTests:"PASS",activeSourceUnchanged:true,activeSourceDdlExecuted:false,chainageMigrationExecuted:false,target:{branchId,branchName,endpointId:endpoint.id,databases:["kl_chainage_restore_primary","kl_chainage_restore_committed"]},targetCleanedUp:false,restoreOwnership:"--no-owner --no-privileges used only for rehearsal; the full archive retains original ownership/ACL metadata.",localFallbackReason:"Installed PostgreSQL executables lack postgres.bki; isolated Neon branch used instead."};
    result.schemaComparison="Logical surviving column order and definitions compared. Historical dropped-column ordinal gaps compact on a logical restore; no schema definition differences are ignored.";
    fs.writeFileSync(path.join(directory,"verification.json"),JSON.stringify(result,null,2));
    fs.writeFileSync(path.join(path.dirname(directory),"latest-run.json"),JSON.stringify({directory,verification:path.join(directory,"verification.json")},null,2));passed=true;
    console.log("PASS second restore and final read-only active-source comparison. No Chainage migration executed.");
  }finally{
    await admin.$disconnect();await source.$disconnect();
    // Only the exact task-created, non-default temporary branch may be removed.
    const final=(await api(`/projects/${project}/branches/${branchId}`)).branch;
    if(final.name!==branchName||final.default||final.primary||final.id===sourceEndpoint.branch_id)throw new Error("Cleanup target guard failed.");
    await api(`/projects/${project}/branches/${branchId}`,"DELETE");
    const branches=(await api(`/projects/${project}/branches`)).branches;
    if(branches.some(b=>b.id===branchId))throw new Error("Temporary branch cleanup was not confirmed.");
    if(passed){const file=path.join(directory,"verification.json"),r=JSON.parse(fs.readFileSync(file));r.targetCleanedUp=true;fs.writeFileSync(file,JSON.stringify(r,null,2));}
    console.log("PASS isolated temporary branch removed; development, staging and production branches retained.");
  }
}
main().catch(e=>{fs.writeFileSync(path.join(directory,"cloud-rehearsal-failure.json"),JSON.stringify({status:"FAIL",message:sanitize(e.message),chainageMigrationExecuted:false},null,2));console.error(sanitize(e.message));process.exitCode=1;});
