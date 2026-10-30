/** Isolated read-only contract checks. No storage initialization, seeds or operational connections. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
process.env.DATABASE_URL = "";
process.env.NODE_ENV = "test";

async function run() {
  const { createAiReadinessSnapshotReader } = await import("../aiPredictions/readinessData");
  const { evaluateAiPredictionsReadiness } = await import("../aiPredictions/readiness");
  const user = { id: "isolated-owner", name: "Isolated actor", email: "actor@example.invalid", role: "Engineer" as const };
  const unavailable = await createAiReadinessSnapshotReader(() => null)(user);
  assert.equal(unavailable.unavailableSources?.length, 5);
  const absent = evaluateAiPredictionsReadiness(unavailable);
  assert.equal(absent.capabilities.cpDriftPrediction.status, "data_source_not_connected");
  assert.ok(!absent.capabilities.predictionScan.availableData.some(s => s.includes("No stored assessment records")));
  assert.equal(absent.readyCapabilities, 0);
  assert.ok(!("unavailableSources" in absent), "Public response contract unchanged");

  // SQL is inspected, never executed. Counts are test responses, never inserted records.
  const calls: Array<{sql: string; values: unknown[]}> = [];
  let missingTable: string | null = null, invalidCount = false, failed = false;
  const db = { async $queryRawUnsafe<T>(sql: string, ...values: unknown[]): Promise<T> {
    calls.push({sql,values});
    assert.match(sql, /^SELECT /); assert.ok(!/\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE)\b/.test(sql));
    if (failed) throw new Error("Isolated source outage");
    if (sql.includes("to_regclass")) return [{exists: !String(values[0]).includes(`"${missingTable}"`)}] as T;
    return [{count: invalidCount ? null : 0}] as T;
  }};
  const read = createAiReadinessSnapshotReader(() => db);
  const empty = await read(user), before = JSON.stringify(empty);
  assert.equal(empty.unavailableSources?.length, 0);
  assert.equal(evaluateAiPredictionsReadiness(empty).capabilities.cpDriftPrediction.status, "insufficient_history");
  assert.equal(JSON.stringify(empty), before);
  assert.ok(calls.filter(c => !c.sql.includes("to_regclass")).every(c => c.values[0] === user.id));
  assert.ok(calls.some(c => c.sql.includes('"isDemoData" = false')));
  assert.ok(calls.some(c => c.sql.includes('GROUP BY "pipelineId", "testPointId", "measurementType", "referenceElectrode"')));
  assert.ok(calls.some(c => c.sql.includes('GROUP BY run."pipelineId", anomaly."featureId"')));
  calls.length = 0;
  await read({...user, role: "Admin"});
  assert.ok(calls.filter(c => !c.sql.includes("to_regclass")).every(c => c.values.length === 0));
  missingTable = "CpReadingHistory"; calls.length = 0;
  const missingCp = await read(user);
  assert.ok(missingCp.unavailableSources?.includes("cp"));
  assert.ok(!calls.some(c => c.sql.includes('FROM public."CpReadingHistory"')));
  invalidCount = true; await assert.rejects(read(user), /Invalid authoritative source count/);
  invalidCount = false; failed = true; await assert.rejects(read(user), /source outage/);

  const express = (await import("express")).default;
  const { aiPredictionsRouter } = await import("../routes/aiPredictions");
  const { store } = await import("../data/store");
  const { signToken } = await import("../lib/jwt");
  const original = store.findUserById;
  store.findUserById = async id => id === user.id ? {...user,passwordHash:"not-used",createdAt:new Date().toISOString()} : null;
  const app = express(); app.use("/api/ai-predictions", aiPredictionsRouter);
  const server = createServer(app);
  try {
    await new Promise<void>(resolve => server.listen(0,"127.0.0.1",resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/ai-predictions`;
    for (const path of ["/readiness", "/corrosion-growth/isolated-pipeline"]) {
      const denied = await fetch(base+path);
      assert.equal(denied.status,401); assert.equal(denied.headers.get("cache-control"),"private, no-store");
      const response = await fetch(base+path,{headers:{Authorization:`Bearer ${signToken({sub:user.id,role:user.role,email:user.email})}`}});
      assert.equal(response.status,200); assert.equal(response.headers.get("cache-control"),"private, no-store");
      if (path === "/readiness") {
        const body = await response.json() as typeof absent;
        assert.deepEqual(Object.keys(body).sort(),Object.keys(absent).sort());
        assert.equal(body.readyCapabilities,0);
      }
    }
  } finally {
    store.findUserById = original;
    await new Promise<void>(resolve => server.close(()=>resolve()));
  }
  console.log("AI IMG-01 data PASS: DB-only reads, unavailable versus empty, source grouping, demo exclusion, scope/privacy, unchanged response keys and authenticated existing routes. No database access or storage initialization.");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
