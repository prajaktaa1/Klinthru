import assert from "node:assert/strict";
import { createServer } from "node:http";
import { AddressInfo } from "node:net";

import { PipelineInput } from "../types/domain";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "";
process.env.SEED_ADMIN_PASSWORD = "admin-test-password";
process.env.SEED_ENGINEER_PASSWORD = "engineer-test-password";
process.env.SEED_VIEWER_PASSWORD = "viewer-test-password";

async function startServer() {
  const { createApp } = await import("../app");
  const { initializeStorage } = await import("../data/store");
  assert.equal(await initializeStorage(), "memory");
  const server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, resolve));
  return { server, baseUrl: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
}

async function login(baseUrl: string) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "engineer@klinthru.local", password: "engineer-test-password" })
  });
  assert.equal(response.status, 200);
  return (await response.json() as { token: string }).token;
}

async function run() {
  const { server, baseUrl } = await startServer();
  const { store } = await import("../data/store");
  const pipeline = await store.createPipeline({
    pipeline: {
      pipelineCode: "DASH-TEST-001",
      pipelineName: "Dashboard Test Pipeline",
      location: "Test Location",
      serviceOrProduct: "Gas",
      pipeMaterial: "Carbon Steel",
      pipeGrade: "API 5L X52",
      pipeLengthKm: 12.5,
      wallThicknessInputValue: 8.2,
      wallThicknessUnit: "mm",
      maopBar: 80,
      operatingPressure: 40,
      operatingPressureUnit: "bar",
      status: "Active"
    } satisfies PipelineInput,
    createdById: "user-engineer"
  });
  try {
    const unauthenticated = await fetch(`${baseUrl}/api/dashboard/pipeline-1`);
    assert.equal(unauthenticated.status, 401);

    const token = await login(baseUrl);
    const response = await fetch(`${baseUrl}/api/dashboard/${pipeline.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(response.status, 200);
    const payload = await response.json() as any;

    assert.equal(payload.pipeline.id, pipeline.id);
    assert.equal(typeof payload.summary.pipelineCount, "number");
    assert.equal(typeof payload.summary.assessmentCount, "number");
    assert.deepEqual(Object.keys(payload.summary.riskCounts).sort(), ["high", "low", "medium", "unknown"]);
    assert.equal(payload.summary.pipelineHealth.status, "not_calculated");
    assert.ok(["available", "not_calculated", "unavailable"].includes(payload.summary.maopUtilisation.status));
    assert.equal(payload.modules.scada.status, "not_connected");
    assert.equal(payload.modules.alerts.status, "not_configured");
    assert.equal(typeof payload.modules.aiPredictions.readyCapabilities, "number");
    assert.ok(Array.isArray(payload.activityTimeline));

    const missing = await fetch(`${baseUrl}/api/dashboard/not-a-real-pipeline`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(missing.status, 404);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error?: Error) => error ? reject(error) : resolve()));
  }
  console.log("Dashboard aggregation checks passed.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
