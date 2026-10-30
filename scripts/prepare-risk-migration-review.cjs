// Offline review artifact extraction only. Never loads app code or connects to a database.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const input = path.resolve(root, process.argv[2] || 'tmp/risk-foundation-review/full-schema-local-review.sql');
const output = path.resolve(root, 'artifacts/risk-local-completion-20261020');
const schema = fs.readFileSync(path.join(root, 'backend/prisma/schema.prisma'), 'utf8');
const models = [...schema.matchAll(/^model (Risk\w*) \{/gm)].map(m => m[1]);
assert.equal(models.length, 13);
const statements = fs.readFileSync(input, 'utf8').split(';').map(s => s.replace(/^\s*--[^\n]*$/gm, '').trim()).filter(Boolean);
const selected = statements.filter(s => /^(?:CREATE TABLE "Risk\w*"|CREATE (?:UNIQUE )?INDEX "[^"]+" ON "Risk\w*"|ALTER TABLE "Risk\w*" ADD CONSTRAINT )/.test(s));
const tables = selected.filter(s => s.startsWith('CREATE TABLE')).map(s => s.match(/^CREATE TABLE "([^"]+)"/)[1]);
assert.deepEqual([...tables].sort(), [...models].sort());
for (const s of selected) {
  const target = s.match(/^CREATE TABLE "([^"]+)"| ON "([^"]+)"|^ALTER TABLE "([^"]+)"/);
  assert.ok(target && models.includes(target[1] || target[2] || target[3]));
  for (const ref of s.matchAll(/REFERENCES "([^"]+)"/g)) assert.ok([...models,'User','Pipeline','Segment','Asset'].includes(ref[1]));
  assert.ok(!/^(?:INSERT|UPDATE|DELETE|DROP|TRUNCATE|GRANT|REVOKE)\b/.test(s));
}
fs.mkdirSync(output, { recursive: true });
const sql = '-- DRAFT REVIEW ONLY — NOT APPROVED OR READY TO APPLY.\n' +
  '-- Offline Prisma 6.19.3 empty-to-schema structural subset; NOT a target-state diff.\n' +
  '-- No approved-history guards/privileges or pending business-policy constraints included.\n' +
  '-- Requires target/catalog, lineage, engineering and security approvals.\n' +
  '-- Deliberately outside backend/prisma/migrations; no automatic deployment discovery.\n\n' + selected.join(';\n\n') + ';\n';
fs.writeFileSync(path.join(output, 'risk-tables.review.sql'), sql);
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const manifest = { status:'DRAFT_BLOCKED_NOT_FOR_APPLICATION', toolchain:'Prisma 6.19.3', targetVerified:false,
  schemaSha256:sha(schema), sqlSha256:sha(sql), tables, statementCount:selected.length,
  createTables:tables.length, indexes:selected.filter(s=>s.startsWith('CREATE UNIQUE INDEX')||s.startsWith('CREATE INDEX')).length,
  foreignKeys:selected.filter(s=>s.startsWith('ALTER TABLE')).length,
  existingMasterDependencies:['User','Pipeline','Segment','Asset'],
  omitted:'All non-Risk DDL; schema creation; approved-history guards/privileges and unresolved contract constraints. No ledger or data statements.' };
fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest,null,2));
