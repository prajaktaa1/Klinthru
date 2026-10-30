// Review only. All database work occurs in a READ ONLY transaction. No migration/save tests.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
require("tsx/cjs");
const { PrismaClient } = require("@prisma/client");
const { alignmentLength, parseKp } = require("../coreEngine/chainage/ChainageAgent.ts");
const directory = path.resolve(__dirname, "../../../artifacts/chainage/migration-review");
const sqlPath = path.resolve(__dirname, "../../prisma/drafts/chainage-agent.sql");
const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const newColumns = {
  Pipeline: ["chainageOriginMeters", "chainageOriginName", "chainageOriginDescription", "chainageOriginReference", "chainageOriginLatitude", "chainageOriginLongitude", "chainageDirection", "chainagePrecision", "allowNegativeChainage", "chainageMatchToleranceMeters", "chainageBoundaryPolicy", "parentPipelineId", "parentTieInChainageMeters", "chainageCalibration", "chainageCoordinateSystem"],
  Segment: ["startChainageMeters", "endChainageMeters"],
  Asset: ["chainageMeters", "startChainageMeters", "endChainageMeters"]
};

async function run() {
  const db = new PrismaClient();
  try {
    const sql = fs.readFileSync(sqlPath, "utf8");
    const result = await db.$transaction(async tx => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      const environment = await tx.$queryRawUnsafe(`SELECT current_setting('transaction_read_only') AS read_only, current_setting('server_version') AS server_version, current_schema() AS schema, current_setting('search_path') AS search_path, has_schema_privilege(current_user, 'public', 'CREATE') AS can_create_in_public`);
      if (environment[0].read_only !== "on") throw new Error("Database review must be read only.");
      const before = await tx.pipeline.findMany({ orderBy: { id: "asc" }, include: { segments: { orderBy: { id: "asc" } }, assets: { orderBy: { id: "asc" } } } });
      const columns = await tx.$queryRawUnsafe(`SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default, numeric_precision, numeric_scale, is_generated FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('Pipeline','Segment','Asset') ORDER BY table_name, ordinal_position`);
      const relations = await tx.$queryRawUnsafe(`SELECT c.relname AS table_name, c.relkind, c.relrowsecurity, c.relforcerowsecurity, pg_has_role(current_user, c.relowner, 'USAGE') AS owner_role_access, has_table_privilege(current_user, c.oid, 'UPDATE') AS can_update, pg_total_relation_size(c.oid)::text AS total_bytes FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('Pipeline','Segment','Asset') ORDER BY c.relname`);
      const constraints = await tx.$queryRawUnsafe(`SELECT c.relname AS table_name, con.conname, con.contype, pg_get_constraintdef(con.oid) AS definition FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('Pipeline','Segment','Asset') ORDER BY c.relname, con.conname`);
      const triggers = await tx.$queryRawUnsafe(`SELECT c.relname AS table_name, t.tgname, t.tgenabled, pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('Pipeline','Segment','Asset') AND NOT t.tgisinternal ORDER BY c.relname,t.tgname`);
      const eventTriggers = await tx.$queryRawUnsafe(`SELECT evtname, evtevent, evtenabled, evtfoid::regproc::text AS function_name FROM pg_event_trigger ORDER BY evtname`);
      const rules = await tx.$queryRawUnsafe(`SELECT tablename, rulename, definition FROM pg_rules WHERE schemaname='public' AND tablename IN ('Pipeline','Segment','Asset')`);
      const policies = await tx.$queryRawUnsafe(`SELECT tablename, policyname, permissive, roles::text, cmd FROM pg_policies WHERE schemaname='public' AND tablename IN ('Pipeline','Segment','Asset')`);
      const indexes = await tx.$queryRawUnsafe(`SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename IN ('Pipeline','Segment','Asset') ORDER BY tablename,indexname`);
      const types = await tx.$queryRawUnsafe(`SELECT n.nspname AS schema, t.typname FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE t.typname IN ('ChainageDirection','ChainageBoundaryPolicy')`);
      const migrationHistory = await tx.$queryRawUnsafe(`SELECT migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations" WHERE migration_name ILIKE '%chainage%' OR migration_name ILIKE '%route%' OR migration_name ILIKE '%segment%' ORDER BY migration_name`);
      const allMigrations = await tx.$queryRawUnsafe(`SELECT migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY migration_name`);
      const relevantTables = await tx.$queryRawUnsafe(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name ILIKE '%audit%' OR table_name ILIKE '%pipeline%history%' OR table_name ILIKE '%segment%history%' OR table_name ILIKE '%master%change%') ORDER BY table_name`);
      const backfill = await tx.$queryRawUnsafe(`WITH candidates AS (
        SELECT 'Asset'::text AS table_name, id, 'chainageMeters'::text AS target_column, kp AS original_value FROM "Asset"
        UNION ALL SELECT 'Segment', id, 'startChainageMeters', "startKp" FROM "Segment"
        UNION ALL SELECT 'Segment', id, 'endChainageMeters', "endKp" FROM "Segment"
      ), converted AS (SELECT *, CASE WHEN original_value ~ '^[0-9]+([.][0-9]+)?$' THEN original_value::numeric * 1000 END AS meters FROM candidates)
      SELECT *, meters::text AS meters_text, CASE WHEN meters IS NULL THEN NULL ELSE abs(meters) < 1000000000000000::numeric END AS fits_integer_capacity, CASE WHEN meters IS NULL THEN NULL ELSE meters=round(meters,9) END AS exact_at_scale_9 FROM converted ORDER BY table_name,id,target_column`);
      const auditColumns = relevantTables.some(t => t.table_name === "settings_audit_events") ? await tx.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='settings_audit_events' ORDER BY ordinal_position`) : [];
      let auditEvidence = { available: false, matches: [], reason: "No supported pipeline/segment change audit table was found." };
      if (["Object_ID", "Object_Type", "Timestamp", "Before_Values", "After_Values"].every(name => auditColumns.some(c => c.column_name === name))) {
        const ids = before.flatMap(p => [p.id, p.pipelineCode, ...p.segments.flatMap(s => [s.id, s.segmentId])]);
        const matches = await tx.$queryRawUnsafe(`SELECT "Object_ID" AS object_id,"Object_Type" AS object_type,"Timestamp" AS occurred_at, action, "Before_Values" AS before_values,"After_Values" AS after_values FROM settings_audit_events WHERE "Object_ID" = ANY($1::text[]) ORDER BY "Timestamp"`, ids);
        auditEvidence = { available: true, matches, reason: matches.length ? null : "No matching audit entries for the saved pipeline/segment IDs and codes." };
      }
      const findings = before.map(p => {
        const segments = p.segments.map(s => ({ id: s.id, code: s.segmentId, start_km: s.startKp, end_km: s.endKp, route: s.routeGeometry, created_at: s.createdAt, updated_at: s.updatedAt }));
        const overlaps = [];
        for (let i=0;i<p.segments.length;i++) for (const b of p.segments.slice(i+1)) {
          const a=p.segments[i], lo=Math.max(parseKp(a.startKp).meters,parseKp(b.startKp).meters), hi=Math.min(parseKp(a.endKp).meters,parseKp(b.endKp).meters);
          if (hi>lo) overlaps.push({ first:a.segmentId,second:b.segmentId,from_m:lo,to_m:hi,overlap_m:hi-lo });
        }
        const routeLength = p.routeGeometry ? alignmentLength(p.routeGeometry) : null;
        return { id:p.id,code:p.pipelineCode,name:p.pipelineName,configured_length_km:p.pipeLengthKm,route:p.routeGeometry,route_length_m:routeLength,shortfall_m:routeLength===null?null:p.pipeLengthKm*1000-routeLength,shortfall_percent:routeLength===null?null:(1-routeLength/(p.pipeLengthKm*1000))*100,created_at:p.createdAt,updated_at:p.updatedAt,segments,overlaps,missing_gps:p.assets.filter(a=>a.latitude===null||a.longitude===null).map(a=>({id:a.id,assetId:a.assetId,type:a.assetType,kp:a.kp,latitude:a.latitude,longitude:a.longitude,coordinates:a.coordinates})) };
      });
      const after = await tx.pipeline.findMany({ orderBy: { id: "asc" }, include: { segments: { orderBy: { id: "asc" } }, assets: { orderBy: { id: "asc" } } } });
      const beforeHash=hash(JSON.stringify(before)), afterHash=hash(JSON.stringify(after));
      if(beforeHash!==afterHash) throw new Error("Source records changed inside review snapshot.");
      const columnConflicts=columns.filter(c=>(newColumns[c.table_name]||[]).includes(c.column_name));
      const indexNames=[...sql.matchAll(/CREATE INDEX "([^"]+)"/g)].map(m=>m[1]);
      const indexConflicts=indexes.filter(i=>indexNames.includes(i.indexname));
      const localDirectory=path.resolve(__dirname,"../../prisma/migrations");
      const localMigrations=fs.readdirSync(localDirectory,{withFileTypes:true}).filter(d=>d.isDirectory()&&fs.existsSync(path.join(localDirectory,d.name,"migration.sql"))).map(d=>d.name);
      const migrationReadiness={unfinished:allMigrations.filter(m=>!m.finished_at&&!m.rolled_back_at).map(m=>m.migration_name),localNotApplied:localMigrations.filter(name=>!allMigrations.some(m=>m.migration_name===name&&m.finished_at&&!m.rolled_back_at)),appliedWithoutLocalFile:allMigrations.filter(m=>m.finished_at&&!m.rolled_back_at&&!localMigrations.includes(m.migration_name)).map(m=>m.migration_name),chainageRegistered:allMigrations.some(m=>/chainage/i.test(m.migration_name)),draftRegisteredInMigrationFolder:localMigrations.some(name=>/chainage/i.test(name))};
      return { mode:"READ ONLY", environment,sql_sha256:hash(sql),counts:{pipelines:before.length,segments:before.reduce((n,p)=>n+p.segments.length,0),assets:before.reduce((n,p)=>n+p.assets.length,0)},source_hash_before:beforeHash,source_hash_after:afterHash,source_unchanged:true,columns,relations,constraints,triggers,eventTriggers,rules,policies,indexes,types,migrationHistory,migrationReadiness,relevantTables,auditEvidence,columnConflicts,indexConflicts,backfill,findings };
    }, { isolationLevel:"RepeatableRead", timeout:60000 });
    fs.mkdirSync(directory,{recursive:true});
    fs.writeFileSync(path.join(directory,"live-schema-review.json"),JSON.stringify(result,(_,v)=>typeof v==="bigint"?v.toString():v,2));
    console.log(JSON.stringify({mode:result.mode,counts:result.counts,sourceUnchanged:result.source_unchanged,columnConflicts:result.columnConflicts,indexConflicts:result.indexConflicts,typeConflicts:result.types,triggers:result.triggers,eventTriggers:result.eventTriggers,rules:result.rules,relations:result.relations,backfillCandidates:result.backfill.length,precisionFailures:result.backfill.filter(r=>r.fits_integer_capacity===false||r.exact_at_scale_9===false),unparsed:result.backfill.filter(r=>r.original_value&&r.meters===null),auditEvidence:result.auditEvidence,findings:result.findings},null,2));
  } finally { await db.$disconnect(); }
}
run().catch(error=>{console.error(error.message);process.exitCode=1;});
