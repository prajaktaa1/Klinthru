import assert from "node:assert/strict";
import { createServer } from "node:http";
import { AddressInfo } from "node:net";

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

async function stopServer(server: ReturnType<typeof createServer>) {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
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

async function createPipeline(baseUrl: string, token: string) {
  const response = await fetch(`${baseUrl}/api/pipelines`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      pipelineCode: "ILI-DATA-001",
      pipelineName: "ILI Data Test Line",
      pipeMaterial: "Carbon Steel",
      pipeGrade: "API 5L X52",
      nominalWallThickness: 8,
      status: "Active"
    })
  });
  assert.equal(response.status, 201);
  return (await response.json() as { id: string }).id;
}

async function assertUnavailableDataEndpoint(baseUrl: string, token: string, path: string, pipelineId: string) {
  const response = await fetch(`${baseUrl}${path}/${pipelineId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(response.status, 200, `${path} should return a safe response`);
  const payload = await response.json() as { pipelineId: string; status: string; tableAvailable: boolean; count: number; reason: string; data: unknown[] };
  assert.equal(payload.pipelineId, pipelineId);
  assert.equal(payload.status, "unavailable");
  assert.equal(payload.tableAvailable, false);
  assert.equal(payload.count, 0);
  assert.deepEqual(payload.data, []);
  assert.match(payload.reason, /storage is unavailable/);
}

async function run() {
  const { server, baseUrl } = await startServer();
  try {
    for (const path of ["/api/ili/runs", "/api/ili/anomalies", "/api/ili/assessment-results"]) {
      const unauthenticated = await fetch(`${baseUrl}${path}/pipeline-1`);
      assert.equal(unauthenticated.status, 401, `${path} must require authentication`);
    }

    const token = await login(baseUrl);
    for (const path of ["/api/ili/runs", "/api/ili/anomalies", "/api/ili/assessment-results"]) {
      const missing = await fetch(`${baseUrl}${path}/missing-pipeline`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.equal(missing.status, 404, `${path} must enforce pipeline access`);
    }

    const pipelineId = await createPipeline(baseUrl, token);
    await assertUnavailableDataEndpoint(baseUrl, token, "/api/ili/runs", pipelineId);
    await assertUnavailableDataEndpoint(baseUrl, token, "/api/ili/anomalies", pipelineId);
    await assertUnavailableDataEndpoint(baseUrl, token, "/api/ili/assessment-results", pipelineId);
  } finally {
    await stopServer(server);
  }

  console.log("ILI read endpoint checks passed.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
