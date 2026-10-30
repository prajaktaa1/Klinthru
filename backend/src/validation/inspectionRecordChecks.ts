import assert from "node:assert/strict";
import { createServer } from "node:http";

// Isolate the HTTP contract from live databases and accounts.
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/inspection_test";
process.env.JWT_SECRET = "inspection-record-isolated-test-secret";

async function run() {
  const { getPrismaClient, disconnectPrisma } = await import("../lib/prisma");
  const { store } = await import("../data/store");
  const { signToken } = await import("../lib/jwt");
  const { createApp } = await import("../app");
  const users = {
    engineer: { id: "engineer", name: "Inspector", email: "engineer@example.invalid", role: "Engineer" as const },
    viewer: { id: "viewer", name: "Viewer", email: "viewer@example.invalid", role: "Viewer" as const }
  };
  Object.assign(store, {
    findUserById: async (id: keyof typeof users) => users[id],
    findPipelineById: async (id: string) => id === "owned-pipeline" ? { id } : null,
    findSegmentById: async (id: string) => ({ id, pipelineId: id === "valid-segment" ? "owned-pipeline" : "other-pipeline" })
  });
  const saved: Record<string, unknown>[] = [];
  const db = getPrismaClient()!;
  Object.assign(db, { $queryRawUnsafe: async (sql: string, ...values: unknown[]) => {
    if (sql.startsWith("SELECT")) return saved.filter((record) => record.pipelineId === values[0]);
    assert.ok(sql.includes("VALUES ($1, $2"), "Writes must bind values");
    const names = ["id", "pipelineId", "reference", "type", "date", "segmentId", "vendor", "findings", "status", "nextDue", "risk", "authorId", "createdBy"];
    const record = Object.fromEntries(names.map((name, index) => [name, values[index]]));
    record.createdAt = new Date().toISOString(); saved.push(record); return [record];
  } });
  const server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/inspection-records`;
  const input = { pipelineId: "owned-pipeline", reference: "Inspection '001", type: "Visual Inspection", date: "2026-10-28", segmentId: "valid-segment", vendor: "Inspector", findings: "No visible damage", status: "Completed", nextDue: "2027-10-28", risk: "Low" };
  const call = (method: string, body?: unknown, role: keyof typeof users | null = "engineer", query = "") => fetch(base + query, {
    method, headers: { "Content-Type": "application/json", ...(role ? { Authorization: `Bearer ${signToken({ sub: users[role].id, email: users[role].email, role: users[role].role })}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  try {
    assert.equal((await call("POST", input, null)).status, 401);
    assert.equal((await call("POST", input, "viewer")).status, 403);
    assert.equal((await call("POST", { ...input, pipelineId: "inaccessible" })).status, 404);
    assert.equal((await call("POST", { ...input, segmentId: "foreign-segment" })).status, 400);
    assert.equal((await call("POST", { ...input, date: "2026-02-30" })).status, 400);
    assert.equal((await call("POST", { ...input, nextDue: "2026-10-27" })).status, 400);
    assert.equal((await call("POST", { ...input, reference: "   " })).status, 400);
    assert.equal((await call("POST", { ...input, authorId: "spoofed" })).status, 400);
    assert.equal(saved.length, 0, "Invalid requests must not write records");
    const createdResponse = await call("POST", input);
    assert.equal(createdResponse.status, 201);
    const created = await createdResponse.json() as Record<string, unknown>;
    assert.equal(created.reference, input.reference);
    assert.equal(created.createdBy, "Inspector");
    assert.equal(created.authorId, "engineer");
    const reloaded = await call("GET", undefined, "engineer", "?pipelineId=owned-pipeline");
    assert.equal(reloaded.status, 200);
    assert.deepEqual(await reloaded.json(), [created], "Saved records must survive reloading the list");
    assert.equal((await call("GET", undefined, "engineer", "?pipelineId=inaccessible")).status, 404);
    assert.equal((await call("GET")).status, 400);
    console.log("Inspection record HTTP checks passed: save/reload, validation, identity, access, segment scope, bound SQL.");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await disconnectPrisma();
  }
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
