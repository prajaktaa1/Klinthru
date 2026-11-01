/** This write/concurrency test is permitted only on the positively verified isolated restore. */
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { store } from "../data/store";
import { disconnectPrisma } from "../lib/prisma";
import { createApp } from "../app";
import { signToken } from "../lib/jwt";

async function run() {
  const target = new URL(process.env.DATABASE_URL!);
  assert.ok(target.hostname === "127.0.0.1" || (process.env.CHAINAGE_RESTORE_ENDPOINT === target.hostname && process.env.CHAINAGE_RESTORE_BRANCH_ID?.startsWith("br-") && process.env.CHAINAGE_RESTORE_BRANCH_NAME === "chainage-restore-rehearsal-20261029"));
  assert.ok(!target.hostname.startsWith("ep-lucky-art-"), "The active development endpoint is forbidden.");
  assert.equal(target.pathname, "/kl_chainage_restore_primary");
  const db = new PrismaClient();
  const ids: string[] = [];
  let server: ReturnType<ReturnType<typeof createApp>["listen"]> | undefined;
  try {
    const existing = await db.pipeline.findMany({ orderBy: { id: "asc" }, include: { segments: { orderBy: { id: "asc" } }, assets: { orderBy: { id: "asc" } } } });
    const admin = await db.user.findFirstOrThrow({ where: { role: "Admin" } });
    const pipeline = await db.pipeline.create({ data: { pipelineCode: "LOCAL-OVERLAP-REHEARSAL", normalizedPipelineCode: "local-overlap-rehearsal", pipelineName: "Isolated overlap rehearsal", pipeLengthKm: 20, createdById: admin.id } }); ids.push(pipeline.id);
    const other = await db.pipeline.create({ data: { pipelineCode: "LOCAL-OVERLAP-OTHER", normalizedPipelineCode: "local-overlap-other", pipelineName: "Isolated other pipeline", pipeLengthKm: 20, createdById: admin.id } }); ids.push(other.id);
    const input = { pipelineId: pipeline.id, segmentId: "FIRST", startKp: "0", endKp: "5" };
    const raced = await Promise.allSettled([
      store.saveSegment({ segment: input }),
      store.saveSegment({ segment: { ...input, segmentId: "SECOND", startKp: "2", endKp: "6" } })
    ]);
    assert.equal(raced.filter(r => r.status === "fulfilled").length, 1, "Exactly one concurrent overlapping save may succeed.");
    const rows = await db.segment.findMany({ where: { pipelineId: pipeline.id } }); assert.equal(rows.length, 1);
    const current = rows[0];
    assert.equal((await store.saveSegment({ id: current.id, segment: { pipelineId: pipeline.id, segmentId: current.segmentId, startKp: current.startKp!, endKp: current.endKp!, name: "Metadata edit" } })).name, "Metadata edit");
    const adjacent = await store.saveSegment({ segment: { pipelineId: pipeline.id, segmentId: "ADJACENT", startKp: current.endKp!, endKp: String(Number(current.endKp) + 1) } });
    assert.ok(adjacent.id, "Shared endpoints must be allowed.");
    await store.saveSegment({ segment: { pipelineId: other.id, segmentId: "SEPARATE", startKp: current.startKp!, endKp: current.endKp! } });
    server = createApp().listen(0); await new Promise<void>(resolve => server!.once("listening", resolve));
    const token = signToken({ sub: admin.id, email: admin.email, role: admin.role });
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    const response = await fetch(`${base}/api/asset-master/segments`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ pipelineId: pipeline.id, segmentId: "HTTP-BLOCKED", startKp: "2+500", endKp: "3+000" }) });
    assert.equal(response.status, 400); const error = await response.json() as { fields: { endKp: string } }; assert.match(error.fields.endKp, /overlaps/);
    const pl001 = existing.find((p: (typeof existing)[number]) => p.pipelineCode === "PL-001")!;
    const originalOverlapSave = await fetch(`${base}/api/asset-master/segments/${pl001.segments[0].id}`, { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ pipelineId: pl001.id, segmentId: pl001.segments[0].segmentId, startKp: pl001.segments[0].startKp, endKp: pl001.segments[0].endKp }) });
    assert.equal(originalOverlapSave.status, 400, "Existing overlapping intervals are not silently saved or repaired.");
    await db.segment.deleteMany({ where: { pipelineId: { in: ids } } }); await db.pipeline.deleteMany({ where: { id: { in: ids } } }); ids.length = 0;
    const after = await db.pipeline.findMany({ orderBy: { id: "asc" }, include: { segments: { orderBy: { id: "asc" } }, assets: { orderBy: { id: "asc" } } } });
    assert.deepEqual(after, existing, "Restored original engineering records must remain unchanged.");
    console.log("PASS isolated PostgreSQL overlap checks: concurrent saves, self-edit, adjacency, separate pipelines, HTTP rejection and existing-record preservation.");
  } finally {
    if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
    if (ids.length) { await db.segment.deleteMany({ where: { pipelineId: { in: ids } } }); await db.pipeline.deleteMany({ where: { id: { in: ids } } }); }
    await disconnectPrisma(); await db.$disconnect();
  }
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
