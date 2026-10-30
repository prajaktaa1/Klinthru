import assert from "node:assert/strict";
import { createServer, Server } from "node:http";
import { AddressInfo } from "node:net";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "";
process.env.SEED_ADMIN_PASSWORD = "admin-test-password";
process.env.SEED_ENGINEER_PASSWORD = "engineer-test-password";
process.env.SEED_VIEWER_PASSWORD = "viewer-test-password";

import { AiReadinessSnapshot, evaluateAiPredictionsReadiness } from "../aiPredictions/readiness";

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
  const emptySnapshot: AiReadinessSnapshot = { assessmentCount: 0, pipelineCount: 0, deviceRecordCount: 0, cpReadingCount: 0, comparableCpSeriesCount: 0, iliSchemaAvailable: false, correlatedIliDefectCount: 0 };
  const empty = evaluateAiPredictionsReadiness(emptySnapshot);
  assert.equal(empty.capabilities.corrosionGrowthForecasting.status, "data_source_not_connected");
  assert.equal(empty.capabilities.cpDriftPrediction.status, "insufficient_history");
  assert.equal(empty.capabilities.scadaAnomalyDetection.status, "data_source_not_connected");
  assert.equal(empty.readyCapabilities, 0);

  const assessmentOnly = evaluateAiPredictionsReadiness({ ...emptySnapshot, assessmentCount: 4, pipelineCount: 1 });
  assert.equal(assessmentOnly.capabilities.modelConfidence.status, "model_not_configured");
  assert.equal(assessmentOnly.capabilities.corrosionGrowthForecasting.ready, false);
  assert.match(assessmentOnly.capabilities.remainingUsefulLife.availableData.join(" "), /not model training data/);

  const { server, baseUrl } = await startServer();
  try {
    const unauthenticated = await fetch(`${baseUrl}/api/ai-predictions/readiness`);
    assert.equal(unauthenticated.status, 401);
    const token = await login(baseUrl);
    const response = await fetch(`${baseUrl}/api/ai-predictions/readiness`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(response.status, 200);
    const payload = await response.json() as ReturnType<typeof evaluateAiPredictionsReadiness>;
    assert.equal(payload.overallStatus, "blocked");
    assert.equal(payload.readyCapabilities, 0);
    assert.equal(payload.capabilities.predictionScan.status, "backend_not_implemented");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
  console.log("AI prediction readiness checks passed.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
