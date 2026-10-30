/** Executes approved guarded migration ONLY on positively verified isolated restored databases. */
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
require("dotenv").config({path:path.resolve(__dirname,"../../.env")});
const {PrismaClient}=require("@prisma/client");
const {readonlyInventory,canonicalInventory,command,hash}=require("./chainageBackupRestore.cjs");
const root=path.resolve(__dirname,"../../../artifacts/chainage/migration-rehearsal"),stamp=new Date().toISOString().replace(/[:.]/g,"-"),directory=path.join(root,stamp);
const old=path.resolve(__dirname,"../../../artifacts/chainage/recovery-readiness/2026-10-29T09-54-15-346Z");
const archive=path.join(old,"klinthru-development.backup"),sqlFile=path.resolve(__dirname,"../../prisma/drafts/chainage-agent.guarded.sql");
const approvedHash="edb663fcb4e41e6c026fe8d963678419885aa2b6a980c0b31133cf4dee518954";
const project="weathered-smoke-69232580",sourceBranch="br-lively-lake-azype02e",branchName=`chainage-migration-rehearsal-${stamp}`;
const cli=path.join(process.env.APPDATA,"npm/node_modules/neonctl/bin/cli.js"),bin="C:/Program Files/PostgreSQL/18/bin";
const q=s=>'"'+s.replaceAll('"','""')+'"';
const additions={Pipeline:["chainageOriginMeters","chainageOriginName","chainageOriginDescription","chainageOriginReference","chainageOriginLatitude","chainageOriginLongitude","chainageDirection","chainagePrecision","allowNegativeChainage","chainageMatchToleranceMeters","chainageBoundaryPolicy","parentPipelineId","parentTieInChainageMeters","chainageCalibration","chainageCoordinateSystem"],Segment:["startChainageMeters","endChainageMeters"],Asset:["chainageMeters","startChainageMeters","endChainageMeters"]};
const indexNames=["Pipeline_parentPipelineId_idx","Segment_pipelineId_startChainageMeters_idx","Asset_pipelineId_chainageMeters_idx","Asset_pipelineId_assetType_chainageMeters_idx"];
let branchId="",host="",sourcePassword="",restorePassword="",source,admin;
const report={source:"klinthru-development",status:"RUNNING",migrationFile:"chainage-agent.guarded.sql",developmentMigrationExecuted:false,activeDataUnchanged:false,temporaryResourcesRemoved:false};
function sanitize(s){for(const v of [sourcePassword,restorePassword])if(v)s=s.replaceAll(v,"[redacted]");return s;}
async function neon(args){for(let n=0;n<3;n++){try{return await command(process.execPath,[cli,...args,"--output","json","--no-analytics"],{...process.env,CI:"true"},60000);}catch(e){if(n===2)throw e;await new Promise(r=>setTimeout(r,1500));}}}
async function api(route,method="GET"){return JSON.parse((await neon(["api",route,"--method",method])).stdout);}
async function inv(db){for(let n=0;n<3;n++){try{return canonicalInventory(await readonlyInventory(db));}catch(e){if(n===2)throw e;await db.$disconnect();await new Promise(r=>setTimeout(r,2000));}}}
function target(base,name){const url=new URL(base);url.pathname="/"+name;if(!host||url.hostname!==host||url.hostname.startsWith("ep-lucky-art-")||!/^kl_chainage_migration_(rollback|migrated|recovered)$/.test(name))throw new Error("Refuse unapproved migration/restore target.");return url;}
async function originalRows(db,baseline){return db.$transaction(async tx=>{
  await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");await tx.$executeRawUnsafe("SET LOCAL TIME ZONE 'UTC'");const rows=[];
  for(const expected of baseline.tables){const names=baseline.columns.filter(c=>c.table_name===expected.table).map(c=>q(c.column_name)).join(",");const values=await tx.$queryRawUnsafe(`SELECT row_to_json(t)::text AS row FROM (SELECT ${names} FROM public.${q(expected.table)}) t`);rows.push({table:expected.table,count:values.length,sha256:hash(values.map(v=>v.row).sort().join("\n"))});}
  assert.deepEqual(rows,baseline.tables,"Original columns/rows must be unchanged on migrated restore.");return {tables:rows.length,rows:rows.reduce((n,t)=>n+t.count,0),sha256:hash(JSON.stringify(rows))};
},{isolationLevel:"RepeatableRead",timeout:120000});}
async function verifyMigration(db){
  const columns=await db.$queryRawUnsafe(`SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default,numeric_precision,numeric_scale FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('Pipeline','Segment','Asset') ORDER BY table_name,ordinal_position`);
  const newColumns=columns.filter(c=>additions[c.table_name]?.includes(c.column_name));assert.equal(newColumns.length,20);
  for(const [table,names] of Object.entries(additions))for(const name of names){const c=newColumns.find(c=>c.table_name===table&&c.column_name===name);assert.ok(c);assert.equal(c.is_nullable,"YES");assert.equal(c.column_default,null);if(/Meters$/.test(name)){assert.equal(c.data_type,"numeric");assert.equal(c.numeric_precision,24);assert.equal(c.numeric_scale,9);}}
  const enums=await db.$queryRawUnsafe(`SELECT t.typname,e.enumlabel FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid WHERE t.typname IN ('ChainageDirection','ChainageBoundaryPolicy') ORDER BY t.typname,e.enumsortorder`);
  assert.deepEqual(enums,[{typname:"ChainageBoundaryPolicy",enumlabel:"REJECT"},{typname:"ChainageBoundaryPolicy",enumlabel:"WARN"},{typname:"ChainageDirection",enumlabel:"INCREASING_DOWNSTREAM"},{typname:"ChainageDirection",enumlabel:"INCREASING_UPSTREAM"}]);
  const indexes=await db.$queryRawUnsafe(`SELECT c.relname AS name,i.indisvalid,i.indisready,pg_get_indexdef(i.indexrelid) AS definition FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid WHERE c.relname = ANY($1::text[]) ORDER BY c.relname`,indexNames);assert.equal(indexes.length,4);assert.ok(indexes.every(i=>i.indisvalid&&i.indisready));
  const fk=await db.$queryRawUnsafe(`SELECT confdeltype,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conname='Pipeline_parentPipelineId_fkey'`);assert.equal(fk.length,1);assert.equal(fk[0].confdeltype,"r");
  const conversions=await db.$queryRawUnsafe(`SELECT 'Asset'::text AS table_name,id,'chainageMeters'::text AS field,kp AS original_kp,"chainageMeters"::text AS meters,"chainageMeters"=kp::numeric*1000 AS exact FROM "Asset"
    UNION ALL SELECT 'Segment',id,'startChainageMeters',"startKp","startChainageMeters"::text,"startChainageMeters"="startKp"::numeric*1000 FROM "Segment"
    UNION ALL SELECT 'Segment',id,'endChainageMeters',"endKp","endChainageMeters"::text,"endChainageMeters"="endKp"::numeric*1000 FROM "Segment" ORDER BY table_name,id,field`);
  assert.equal(conversions.length,19);assert.ok(conversions.every(c=>c.exact===true));
  const defaults=await db.$queryRawUnsafe(`SELECT count(*)::int AS count FROM "Pipeline" WHERE "chainageOriginMeters" IS NOT NULL OR "chainageOriginName" IS NOT NULL OR "chainageOriginDescription" IS NOT NULL OR "chainageOriginReference" IS NOT NULL OR "chainageOriginLatitude" IS NOT NULL OR "chainageOriginLongitude" IS NOT NULL OR "chainageDirection" IS NOT NULL OR "chainagePrecision" IS NOT NULL OR "allowNegativeChainage" IS NOT NULL OR "chainageMatchToleranceMeters" IS NOT NULL OR "chainageBoundaryPolicy" IS NOT NULL OR "parentPipelineId" IS NOT NULL OR "parentTieInChainageMeters" IS NOT NULL OR "chainageCalibration" IS NOT NULL OR "chainageCoordinateSystem" IS NOT NULL`);assert.equal(defaults[0].count,0);
  return {columns:newColumns,enums,indexes,parentForeignKey:fk[0],conversions,unknownPipelineConfigurationPreserved:true};
}
async function main(){
  const sql=fs.readFileSync(sqlFile,"utf8");assert.equal(hash(sql),approvedHash,"The approved SQL changed; stop rather than execute a different migration.");
  const previous=JSON.parse(fs.readFileSync(path.join(old,"verification.json")));assert.equal(hash(fs.readFileSync(archive)),previous.archiveSha256);
  const baseline=canonicalInventory(JSON.parse(fs.readFileSync(path.join(old,"source-manifest.json"))));
  fs.mkdirSync(directory,{recursive:true});await command("icacls.exe",[directory,"/inheritance:r","/grant:r",`${process.env.USERDOMAIN}\\${process.env.USERNAME}:(OI)(CI)F`]);
  report.approvedSqlSha256=approvedHash;report.backupSha256=previous.archiveSha256;
  try{
    const endpoints=(await api(`/projects/${project}/endpoints`)).endpoints,sourceUrl=new URL(process.env.DATABASE_URL);sourcePassword=decodeURIComponent(sourceUrl.password);
    const live=endpoints.find(e=>e.host===sourceUrl.hostname.replace("-pooler.","."));assert.equal(live?.branch_id,sourceBranch);
    sourceUrl.hostname=live.host;sourceUrl.searchParams.set("connect_timeout","30");sourceUrl.searchParams.set("pool_timeout","30");
    source=new PrismaClient({datasources:{db:{url:sourceUrl.toString()}}});assert.deepEqual(await inv(source),baseline,"Development source changed since the verified backup; refresh before rehearsal.");
    console.log("PASS source is unchanged klinthru-development; verified archive and approved SQL checksums.");
    const created=JSON.parse((await neon(["branches","create","--project-id",project,"--parent",sourceBranch,"--name",branchName,"--schema-only","--no-secrets","--expires-at",new Date(Date.now()+86400000).toISOString()])).stdout);
    branchId=created.branch.id;const endpoint=created.endpoints.find(e=>e.branch_id===branchId);host=endpoint.host;
    report.target={branchId,branchName,endpointId:endpoint.id};fs.writeFileSync(path.join(directory,"target.json"),JSON.stringify(report.target,null,2));
    const metadata=(await api(`/projects/${project}/branches/${branchId}`)).branch;assert.equal(metadata.name,branchName);assert.equal(metadata.init_source,"parent-schema");assert.ok(!metadata.default&&!metadata.primary);assert.notEqual(endpoint.id,live.id);
    const connection=new URL((await neon(["connection-string",branchId,"--project-id",project,"--database-name","neondb","--role-name","neondb_owner"])).stdout.trim());restorePassword=decodeURIComponent(connection.password);assert.equal(connection.hostname,host);connection.searchParams.set("connect_timeout","30");connection.searchParams.set("pool_timeout","30");
    admin=new PrismaClient({datasources:{db:{url:connection.toString()}}});
    const pgEnv={...process.env,PGHOST:host,PGPORT:connection.port||"5432",PGUSER:decodeURIComponent(connection.username),PGPASSWORD:restorePassword,PGSSLMODE:"require",PGCHANNELBINDING:"require"};
    const restore=async name=>{
      const url=target(connection,name);assert.equal((await admin.$queryRawUnsafe("SELECT 1 FROM pg_database WHERE datname=$1",name)).length,0);
      await admin.$executeRawUnsafe(`CREATE DATABASE ${q(name)}`);
      await command(path.join(bin,"pg_restore.exe"),["--exit-on-error","--no-owner","--no-privileges","--no-password","--dbname",name,archive],pgEnv,240000);
      const db=new PrismaClient({datasources:{db:{url:url.toString()}}});try{assert.deepEqual(await inv(db),baseline);return db;}catch(e){await db.$disconnect();throw e;}
    };
    const execute=async(name,file,label)=>{target(connection,name);const r=await command(path.join(bin,"psql.exe"),["--no-password","--set","ON_ERROR_STOP=1","--dbname",name,"--file",file],pgEnv,240000);fs.writeFileSync(path.join(directory,label+".log"),sanitize(r.stdout+"\n"+r.stderr));};
    // Full approved migration body, replacing only the final COMMIT with ROLLBACK.
    const rollback=await restore("kl_chainage_migration_rollback");
    try{
      assert.ok(/COMMIT;\s*$/.test(sql));const rollbackFile=path.join(directory,"guarded-rollback-rehearsal.sql");fs.writeFileSync(rollbackFile,sql.replace(/COMMIT;\s*$/,"ROLLBACK;\n"));
      await execute("kl_chainage_migration_rollback",rollbackFile,"migration-rollback");assert.deepEqual(await inv(rollback),baseline);
      report.exactMigrationRollback="PASS: full guarded body executed, final ROLLBACK removed all additions/backfill and restored original inventory.";
      console.log("PASS exact guarded migration rollback rehearsal; original schema and all data match the backup.");
    }finally{await rollback.$disconnect();}
    const migrated=await restore("kl_chainage_migration_migrated");
    try{
      await execute("kl_chainage_migration_migrated",sqlFile,"migration-commit");
      report.migrationVerification=await verifyMigration(migrated);report.originalRecordsAfterMigration=await originalRows(migrated,baseline);
      fs.writeFileSync(path.join(directory,"migration-verification.json"),JSON.stringify(report.migrationVerification,null,2));
      console.log("PASS migration COMMIT on isolated restore: 20 fields, 2 enums, 4 indexes, parent FK and all 19 conversions; originals unchanged.");
      const r=await command(process.execPath,[path.join(__dirname,"chainageMigratedIntegrationChecks.cjs")],{...process.env,DATABASE_URL:target(connection,"kl_chainage_migration_migrated").toString(),NODE_ENV:"test",CHAINAGE_REHEARSAL_HOST:host,CHAINAGE_REHEARSAL_BRANCH:branchId,CHAINAGE_REHEARSAL_NAME:branchName,CHAINAGE_REHEARSAL_OUTPUT:directory},600000);
      fs.writeFileSync(path.join(directory,"integration-run.log"),sanitize(r.stdout+"\n"+r.stderr));console.log(sanitize(r.stdout).trim());
      report.integrations=JSON.parse(fs.readFileSync(path.join(directory,"integration-checks.json")));report.originalRecordsAfterIntegration=await originalRows(migrated,baseline);
    }finally{await migrated.$disconnect();}
    const recovered=await restore("kl_chainage_migration_recovered");try{assert.deepEqual(await inv(recovered),baseline);report.postCommitRecovery="PASS: fresh isolated recovery database restored original schema and every table hash after migration had committed on the test target.";}finally{await recovered.$disconnect();}
    assert.deepEqual(await inv(source),baseline);report.activeDataUnchanged=true;report.activeSchemaUnchanged=true;
    report.status=report.integrations?.fail?"FAIL (application integrations)":"PASS";
    console.log("PASS post-COMMIT recovery and final read-only development preservation check.");
  }catch(e){report.status="FAIL";report.error=sanitize(e.message);console.error(sanitize(e.message));process.exitCode=1;}
  finally{
    if(admin)await admin.$disconnect();if(source)await source.$disconnect();
    if(branchId){try{const metadata=(await api(`/projects/${project}/branches/${branchId}`)).branch;assert.equal(metadata.name,branchName);assert.notEqual(branchId,sourceBranch);assert.ok(!metadata.default&&!metadata.primary);await api(`/projects/${project}/branches/${branchId}`,"DELETE");assert.ok(!(await api(`/projects/${project}/branches`)).branches.some(b=>b.id===branchId));report.temporaryResourcesRemoved=true;console.log("PASS temporary rehearsal branch, endpoints and databases removed.");}catch(e){report.cleanupError=sanitize(e.message);report.status="BLOCKED (cleanup)";process.exitCode=1;}}
    report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(directory,"verification.json"),JSON.stringify(report,null,2));fs.writeFileSync(path.join(root,"latest-run.json"),JSON.stringify({directory,verification:path.join(directory,"verification.json")},null,2));
    console.log(`Rehearsal result: ${report.status}. Development migration was NOT executed.`);
  }
}
main().catch(e=>{console.error(sanitize(e.message));process.exitCode=1;});
