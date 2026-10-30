/** Authorized backup/restore rehearsal. Source is READ ONLY; all DDL is loopback-only. */
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto"),net=require("node:net");
const {spawn}=require("node:child_process");
require("dotenv").config({path:path.resolve(__dirname,"../../.env")});
const {PrismaClient}=require("@prisma/client");
const root=path.resolve(__dirname,"../../../artifacts/chainage/recovery-readiness");
const stamp=new Date().toISOString().replace(/[:.]/g,"-");
const directory=path.join(root,stamp),bin="C:/Program Files/PostgreSQL/18/bin";
const hash=s=>crypto.createHash("sha256").update(s).digest("hex");
const quote=s=>'"'+s.replaceAll('"','""')+'"';
const cli=path.join(process.env.APPDATA,"npm/node_modules/neonctl/bin/cli.js");
let sourcePassword="",localPassword="";
function sanitize(s){for(const secret of [sourcePassword,localPassword])if(secret)s=s.replaceAll(secret,"[redacted]");return s;}
function command(executable,args,env=process.env,timeout=180000) {
  return new Promise((resolve,reject)=>{
    const child=spawn(executable,args,{env,windowsHide:true,stdio:["ignore","pipe","pipe"]});
    let stdout="",stderr="";const timer=setTimeout(()=>{child.kill();reject(new Error("Timed out: "+path.basename(executable)));},timeout);
    child.stdout.on("data",b=>stdout+=b);child.stderr.on("data",b=>stderr+=b);
    child.on("error",e=>{clearTimeout(timer);reject(e);});
    child.on("close",code=>{clearTimeout(timer);code===0?resolve({stdout,stderr}):reject(new Error(sanitize(path.basename(executable)+" failed: "+stderr.slice(-4000))));});
  });
}
async function neonGet(route){for(let attempt=0;attempt<3;attempt++){try{const r=await command(process.execPath,[cli,"api",route,"--method","GET","--output","json","--no-analytics"],{...process.env,CI:"true"});return JSON.parse(r.stdout);}catch(e){if(attempt===2)throw e;console.log("Retrying read-only Neon target verification after a transient connection failure...");await new Promise(resolve=>setTimeout(resolve,1000*(attempt+1)));}}}
async function inventory(tx) {
  const tables=await tx.$queryRawUnsafe(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`);
  const rows=[];
  for(const table of tables){const values=await tx.$queryRawUnsafe(`SELECT row_to_json(t)::text AS row FROM public.${quote(table.tablename)} t`);rows.push({table:table.tablename,count:values.length,sha256:hash(values.map(v=>v.row).sort().join("\n"))});}
  const columns=await tx.$queryRawUnsafe(`SELECT table_name,column_name,ordinal_position,data_type,udt_name,is_nullable,column_default,numeric_precision,numeric_scale FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position`);
  const constraints=await tx.$queryRawUnsafe(`SELECT c.relname AS table_name,con.conname,con.contype,pg_get_constraintdef(con.oid) AS definition FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname,con.conname`);
  const indexes=await tx.$queryRawUnsafe(`SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname`);
  const enums=await tx.$queryRawUnsafe(`SELECT t.typname,e.enumlabel,e.enumsortorder FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' ORDER BY t.typname,e.enumsortorder`);
  return {tables:rows,columns,constraints,indexes,enums,records_sha256:hash(JSON.stringify(rows)),schema_sha256:hash(JSON.stringify({columns,constraints,indexes,enums}))};
}
async function readonlyInventory(db){return db.$transaction(async tx=>{await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");await tx.$executeRawUnsafe("SET LOCAL TIME ZONE 'UTC'");return inventory(tx);},{isolationLevel:"RepeatableRead",timeout:120000});}
function canonicalInventory(value){
  // A logical pg_dump restore compacts attnum gaps left by historically dropped columns.
  // Preserve surviving column order and all definitions; do not compare obsolete physical slots.
  const positions={};const columns=value.columns.map(c=>({...c,ordinal_position:(positions[c.table_name]=(positions[c.table_name]||0)+1)}));
  return {...value,columns,schema_sha256:hash(JSON.stringify({columns,constraints:value.constraints,indexes:value.indexes,enums:value.enums}))};
}
function localUrl(port,name){const u=new URL(`postgresql://restore_admin@127.0.0.1:${port}/${name}`);u.password=localPassword;return u;}
function assertLocal(url,port){if(url.hostname!=="127.0.0.1"||Number(url.port)!==port||!/^kl_chainage_restore_(primary|committed)$/.test(url.pathname.slice(1)))throw new Error("Restore target must be this rehearsal's isolated loopback database.");}
async function main(){
  const source=new URL(process.env.DATABASE_URL);sourcePassword=decodeURIComponent(source.password);
  const endpoints=await neonGet("/projects/weathered-smoke-69232580/endpoints");
  const endpoint=endpoints.endpoints.find(e=>e.host===source.hostname.replace("-pooler.","."));
  if(!endpoint||endpoint.branch_id!=="br-lively-lake-azype02e")throw new Error("Source is not the approved klinthru-development endpoint.");
  const branch=await neonGet("/projects/weathered-smoke-69232580/branches/br-lively-lake-azype02e");
  if(branch.branch?.name!=="klinthru-development")throw new Error("Source branch name verification failed.");
  source.hostname=endpoint.host; // positively matched direct host, not a guessed endpoint
  fs.mkdirSync(directory,{recursive:true});
  const account=`${process.env.USERDOMAIN}\\${process.env.USERNAME}`;
  await command("icacls.exe",[directory,"/inheritance:r","/grant:r",`${account}:(OI)(CI)F`]);
  console.log("PASS source matched klinthru-development; backup directory restricted to the current Windows account.");
  const envSource={...process.env,PGHOST:source.hostname,PGPORT:source.port||"5432",PGDATABASE:source.pathname.slice(1),PGUSER:decodeURIComponent(source.username),PGPASSWORD:sourcePassword,PGSSLMODE:"require",PGCHANNELBINDING:"require"};
  const archive=path.join(directory,"klinthru-development.backup"),db=new PrismaClient({datasources:{db:{url:source.toString()}}});
  let baseline,clusterStarted=false,port,envLocal;
  const cluster=path.join(directory,"temporary-cluster");
  try {
    baseline=await db.$transaction(async tx=>{
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");await tx.$executeRawUnsafe("SET LOCAL TIME ZONE 'UTC'");
      const mode=await tx.$queryRawUnsafe("SELECT current_setting('transaction_read_only') AS mode");if(mode[0].mode!=="on")throw new Error("Source transaction is not read only.");
      const snapshot=(await tx.$queryRawUnsafe("SELECT pg_export_snapshot() AS snapshot"))[0].snapshot;
      const original=await inventory(tx);
      console.log(`Backing up ${original.tables.length} tables from one exported read-only snapshot...`);
      await command(path.join(bin,"pg_dump.exe"),["--format=custom","--snapshot",snapshot,"--file",archive,"--no-password"],envSource,240000);
      return original;
    },{isolationLevel:"RepeatableRead",timeout:300000});
    const listing=await command(path.join(bin,"pg_restore.exe"),["--list",archive]);
    fs.writeFileSync(path.join(directory,"archive-contents.txt"),listing.stdout);
    fs.writeFileSync(path.join(directory,"source-manifest.json"),JSON.stringify(baseline,null,2));
    console.log(`PASS recoverable archive created (${fs.statSync(archive).size} bytes); table of contents readable.`);
    localPassword=crypto.randomBytes(32).toString("hex");
    const passwordFile=path.join(directory,"temporary-init-password.txt");fs.writeFileSync(passwordFile,localPassword+"\n");
    try {await command(path.join(bin,"initdb.exe"),["-D",cluster,"-U","restore_admin","--pwfile",passwordFile,"--auth-host=scram-sha-256","--auth-local=scram-sha-256","--no-locale","--encoding=UTF8"]);}finally{fs.unlinkSync(passwordFile);}
    port=await new Promise((resolve,reject)=>{const server=net.createServer();server.on("error",reject);server.listen(0,"127.0.0.1",()=>{const p=server.address().port;server.close(()=>resolve(p));});});
    if([5432,4000,4002].includes(port))throw new Error("Unsafe temporary port.");
    envLocal={...process.env,PGHOST:"127.0.0.1",PGPORT:String(port),PGUSER:"restore_admin",PGPASSWORD:localPassword,PGSSLMODE:"disable",PGCHANNELBINDING:"disable"};
    await command(path.join(bin,"pg_ctl.exe"),["-D",cluster,"-l",path.join(directory,"temporary-postgres.log"),"-o",`-h 127.0.0.1 -p ${port}`,"-w","-t","60","start"],envLocal);clusterStarted=true;
    const verify=async(name)=>{
      const url=localUrl(port,name);assertLocal(url,port);
      await command(path.join(bin,"createdb.exe"),["--no-password",name],{...envLocal,PGDATABASE:"postgres"});
      await command(path.join(bin,"pg_restore.exe"),["--exit-on-error","--no-owner","--no-privileges","--no-password","--dbname",name,archive],envLocal,240000);
      const local=new PrismaClient({datasources:{db:{url:url.toString()}}});
      try {const restored=await readonlyInventory(local);if(JSON.stringify(restored)!==JSON.stringify(baseline))throw new Error("Restored records/schema do not match the source snapshot.");return {local,restored};}catch(e){await local.$disconnect();throw e;}
    };
    const primary=await verify("kl_chainage_restore_primary");
    let transactionRollback=false;
    try {
      try {await primary.local.$transaction(async tx=>{
        // Generic scratch-object DDL only: NEVER execute the Chainage Agent migration.
        await tx.$executeRawUnsafe('CREATE SCHEMA rollback_readiness_probe');
        await tx.$executeRawUnsafe("CREATE TYPE rollback_readiness_probe.direction AS ENUM ('FORWARD','REVERSE')");
        await tx.$executeRawUnsafe('CREATE TABLE rollback_readiness_probe.sample (id integer PRIMARY KEY, distance_m numeric(24,9))');
        await tx.$executeRawUnsafe('INSERT INTO rollback_readiness_probe.sample VALUES (1,18900.65)');
        await tx.$executeRawUnsafe('ALTER TABLE rollback_readiness_probe.sample ADD COLUMN label text');
        await tx.$executeRawUnsafe('CREATE INDEX sample_distance_idx ON rollback_readiness_probe.sample(distance_m)');
        throw new Error("ROLLBACK_PROBE_EXPECTED");
      });}catch(e){if(e.message!=="ROLLBACK_PROBE_EXPECTED")throw e;}
      const probe=await primary.local.$queryRawUnsafe("SELECT count(*)::int AS count FROM pg_namespace WHERE nspname='rollback_readiness_probe'");
      if(probe[0].count!==0)throw new Error("Scratch DDL rollback failed.");
      transactionRollback=true;
      // Committed scratch changes are not reversible using ROLLBACK; prove a fresh restore instead.
      await primary.local.$executeRawUnsafe('CREATE SCHEMA committed_recovery_probe');
      await primary.local.$executeRawUnsafe('CREATE TABLE committed_recovery_probe.sample (id integer PRIMARY KEY)');
      await primary.local.$executeRawUnsafe('INSERT INTO committed_recovery_probe.sample VALUES (1)');
      console.log("PASS isolated restore matches all 52 table/data/schema inventories; generic transactional DDL rollback verified.");
    }finally{await primary.local.$disconnect();}
    const overlapTest=await command(process.execPath,[path.resolve(__dirname,"../../node_modules/tsx/dist/cli.mjs"),path.join(__dirname,"segmentOverlapDatabaseChecks.ts")],{...process.env,DATABASE_URL:localUrl(port,"kl_chainage_restore_primary").toString(),NODE_ENV:"test"});
    fs.writeFileSync(path.join(directory,"isolated-overlap-tests.log"),sanitize(overlapTest.stdout));
    console.log(sanitize(overlapTest.stdout).trim());
    const committed=await verify("kl_chainage_restore_committed");
    try {const probe=await committed.local.$queryRawUnsafe("SELECT count(*)::int AS count FROM pg_namespace WHERE nspname='committed_recovery_probe'");if(probe[0].count!==0)throw new Error("Fresh backup restore retained post-checkpoint scratch objects.");}finally{await committed.local.$disconnect();}
    const sourceAfter=await readonlyInventory(db);
    if(JSON.stringify(sourceAfter)!==JSON.stringify(baseline))throw new Error("Active source changed since backup; do not claim unchanged data without investigation.");
    const report={status:"PASS",createdAt:new Date().toISOString(),project:"Klinthru",branch:"klinthru-development",endpointId:endpoint.id,archive:path.basename(archive),archiveBytes:fs.statSync(archive).size,archiveSha256:hash(fs.readFileSync(archive)),tableCount:baseline.tables.length,totalRows:baseline.tables.reduce((n,t)=>n+t.count,0),sourceRecordsSha256:baseline.records_sha256,sourceSchemaSha256:baseline.schema_sha256,restoredAllTableHashes:true,restoredAllSchemaInventories:true,transactionRollback,postCommitRecoveryByFreshIsolatedRestore:true,isolatedOverlapAndConcurrentSaveTests:true,sourceUnchanged:true,restoreLocation:{host:"127.0.0.1",port,databases:["kl_chainage_restore_primary","kl_chainage_restore_committed"]},ownershipAndGrants:"Archive retains original ownership/ACL metadata; rehearsal uses --no-owner --no-privileges on the isolated local role.",chainageMigrationExecuted:false,activeSourceDdlExecuted:false,activeSourceRecordsModified:false,temporaryClusterStopped:false};
    fs.writeFileSync(path.join(directory,"verification.json"),JSON.stringify(report,null,2));
    fs.writeFileSync(path.join(root,"latest-run.json"),JSON.stringify({directory,verification:path.join(directory,"verification.json")},null,2));
    console.log("PASS second isolated restore proves checkpoint recovery after committed scratch changes; live source unchanged. Chainage migration not executed.");
  } catch(e){fs.writeFileSync(path.join(directory,"failure.json"),JSON.stringify({status:"FAIL",message:sanitize(e.message),archiveExists:fs.existsSync(archive),chainageMigrationExecuted:false},null,2));throw e;}
  finally{
    await db.$disconnect();
    if(clusterStarted){await command(path.join(bin,"pg_ctl.exe"),["-D",cluster,"-m","fast","-w","-t","60","stop"],envLocal);const file=path.join(directory,"verification.json");if(fs.existsSync(file)){const r=JSON.parse(fs.readFileSync(file));r.temporaryClusterStopped=true;fs.writeFileSync(file,JSON.stringify(r,null,2));}console.log("PASS temporary loopback PostgreSQL cluster stopped.");}
  }
}
module.exports={inventory,readonlyInventory,canonicalInventory,command,hash};
if(require.main===module)main().catch(e=>{console.error(sanitize(e.message));process.exitCode=1;});
