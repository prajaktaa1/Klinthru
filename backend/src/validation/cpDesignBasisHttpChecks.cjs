/* Loopback HTTP/handler checks. No database client is obtained or SQL executed.
 * x-local-audit-role exists ONLY in this isolated test middleware, not the app.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const ts = require("typescript");
process.env.DATABASE_URL = "";
process.env.CP_ENGINEERING_WRITES_ENABLED = "false";
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
const prisma = require("../lib/prisma.ts"); let acquisitions = 0;
prisma.getPrismaClient = () => { acquisitions++; throw new Error("Database access forbidden by local audit"); };
const auth = require("../middleware/auth.ts"); const realAuth = auth.requireAuth;
auth.requireAuth = (req, res, next) => {
  const role = req.headers["x-local-audit-role"];
  if (!role) return realAuth(req, res, next);
  req.user = { id: "audit-test-user", name: "Local audit only", email: "audit@invalid", role };
  next();
};
const { BasisError } = require("../cpEngineering/designBasisDomain.ts");
const repo = require("../cpEngineering/designBasisRepository.ts");
repo.readSnapshot = async () => { throw new BasisError(503, "Audit: schema unavailable"); };
const express = require("express");
const app = express(); app.use(express.json()); app.use("/basis", require("../routes/cpEngineeringDesignBases.ts").cpEngineeringDesignBasesRouter);
const mutations = [["POST", "/basis"], ["POST", "/basis/test/revisions"], ["PATCH", "/basis/test/revisions/test"], ["POST", "/basis/test/revisions/test/submit"], ["POST", "/basis/test/revisions/test/review-decisions"], ["POST", "/basis/test/revisions/test/publications"], ["POST", "/basis/test/revisions/test/comments"]];
const reads = ["/basis", "/basis/options", "/basis/summary", "/basis/export", "/basis/test", "/basis/test/history", "/basis/test/revisions/test"];
let checks = 0;
async function request(server, method, path, role) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: "127.0.0.1", port: server.address().port, path, method, headers: { "Content-Type": "application/json", ...(role ? { "x-local-audit-role": role } : {}) } }, res => {
      let body = ""; res.on("data", chunk => { body += chunk; }); res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
    }); req.on("error", reject); req.end(method === "GET" ? undefined : "{}");
  });
}
const server = app.listen(0, "127.0.0.1", async () => {
  try {
    for (const [method, path] of [...mutations, ...reads.map(p => ["GET", p])]) { assert.equal((await request(server, method, path)).status, 401); checks++; }
    process.stdout.write("PASS 14 unauthenticated read/write routes return 401 using real auth middleware\n");
    for (const [method, path] of mutations) { const r = await request(server, method, path, "Admin"); assert.equal(r.status, 503); assert.match(r.body.message, /writes are disabled/); checks++; }
    process.stdout.write("PASS all 7 mutation handlers reject before database acquisition while disabled\n");
    for (const path of reads) { const r = await request(server, "GET", path, "Viewer"); assert.equal(r.status, 503); assert.equal(r.body.availability, false); checks++; }
    process.stdout.write("PASS all 7 read handlers preserve explicit schema-unavailable responses\n");
    assert.equal((await request(server, "GET", "/basis?sort=unapproved", "Viewer")).status, 400); checks++;
    process.env.CP_ENGINEERING_WRITES_ENABLED = "true";
    assert.equal((await request(server, "POST", "/basis", "Viewer")).status, 403); checks++;
    process.env.CP_ENGINEERING_WRITES_ENABLED = "false";
    await assert.rejects(repo.assertWriteGuards({ $queryRawUnsafe: async () => [{ count: 26, table: "WrongTable", trigger: "WrongTrigger", fn: "WrongFunction", type: 31 }] }), /guards are not fully installed/); checks++;
    assert.equal(acquisitions, 0); checks++;
    process.stdout.write(`PASS ${checks} HTTP/guard checks; zero database acquisitions and zero SQL executions\n`);
  } catch (e) { process.stderr.write(String(e)); process.exitCode = 1; }
  finally { process.env.CP_ENGINEERING_WRITES_ENABLED = "false"; server.close(); }
});
