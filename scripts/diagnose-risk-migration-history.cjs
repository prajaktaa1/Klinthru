// Read local SQL and dated captured ledger only. No Prisma/application imports or DB access.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname,'..');
const evidence = JSON.parse(fs.readFileSync(path.join(root,'artifacts/baseline-reconciliation-review-20261019/catalog-manifest.json'),'utf8'));
const mismatches=[], missing=[];
for (const row of evidence.migration_history) {
  const file = path.resolve(root, row.local_file.replace(/[\\/]/g,path.sep));
  if (!file.startsWith(root+path.sep)) throw new Error('Historical path is outside workspace');
  if (!fs.existsSync(file)) { missing.push(row.migration_name); continue; }
  const bytes=fs.readFileSync(file), actual=crypto.createHash('sha256').update(bytes).digest('hex');
  if (actual!==row.checksum) mismatches.push({migration:row.migration_name,bytes:bytes.length,historicalChecksum:row.checksum,currentLocalChecksum:actual});
}
const migrations=path.join(root,'backend/prisma/migrations');
const sqlFiles=fs.readdirSync(migrations,{withFileTypes:true}).filter(d=>d.isDirectory()&&fs.existsSync(path.join(migrations,d.name,'migration.sql')));
const riskCreates=[];
for (const dir of sqlFiles) for (const match of fs.readFileSync(path.join(migrations,dir.name,'migration.sql'),'utf8').matchAll(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?"(Risk\w*)"/g)) riskCreates.push({migration:dir.name,table:match[1]});
const result={evidenceCapturedAt:evidence.captured_at_utc,liveStateVerified:false,localSqlFiles:sqlFiles.length,historicalRows:evidence.migration_history.length,matched:evidence.migration_history.length-mismatches.length-missing.length,mismatches,missingLocalFiles:missing,riskCreatesInMigrationDirectory:riskCreates,action:'Preserve history. Original SQL recovery and approved lineage/installation recording remain required. Do not rewrite checksums, resolve/reset or replay the mismatched file.'};
console.log(JSON.stringify(result,null,2));
if (process.argv.includes('--write-review')) {
  const out=path.join(root,'artifacts/risk-local-completion-20261020');fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'checksum-diagnosis.json'),JSON.stringify(result,null,2)+'\n');
}
