// Offline only: inspect generated delegates, never query or connect.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://validation:validation@127.0.0.1:1/validation?schema=public';
require('node:net').Socket.prototype.connect = function () { throw new Error('Network prohibited in offline client verification'); };
const source = fs.readFileSync(path.join(root,'backend/prisma/schema.prisma'),'utf8');
const generated = fs.readFileSync(path.join(root,'backend/node_modules/.prisma/client/schema.prisma'),'utf8');
// Prisma formats its embedded datamodel and moves block attributes below fields.
// Compare declarations within each named block, preserving quoted values.
const normalized = text => [...text.matchAll(/^(model|enum|generator|datasource) (\w+) \{([\s\S]*?)^\}/gm)].map(([,kind,name,body])=>
  kind+':'+name+':'+body.split(/\r?\n/).filter(line=>line.trim()&&!line.trim().startsWith('//')).map(line=>line.replace(/"(?:\\.|[^"\\])*"|\s+/g, token=>token.startsWith('"')?token:'')).sort().join('\n')
).sort().join('\n');
assert.ok(normalized(generated) === normalized(source), 'Generated datamodel must match source after layout normalization');
const expected = [...source.matchAll(/^model (\w+) \{/gm)].map(m=>m[1]);
const {Prisma,PrismaClient} = require(path.join(root,'backend/node_modules/@prisma/client'));
assert.deepEqual(Prisma.dmmf.datamodel.models.map(m=>m.name).sort(),[...expected].sort());
const client = new PrismaClient();
for (const name of expected) {
  const delegate = name[0].toLowerCase()+name.slice(1);
  assert.equal(typeof client[delegate]?.findMany,'function',`Missing ${delegate} delegate`);
}
const risks=expected.filter(n=>n.startsWith('Risk'));
assert.equal(risks.length,13);
console.log(`PASS: Prisma ${Prisma.prismaVersion.client}; ${expected.length} model delegates, including all ${risks.length} Risk delegates; source/generated datamodel match after layout normalization; no query or connection.`);
