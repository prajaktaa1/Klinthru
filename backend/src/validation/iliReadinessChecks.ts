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
      pipelineCode: "ILI-READY-001",
      pipelineName: "ILI Readiness Test Line",
      pipeMaterial: "Carbon Steel",
      pipeGrade: "API 5L X52",
      nominalWallThickness: 8,
      status: "Active"
    })
  });
  assert.equal(response.status, 201);
  return (await response.json() as { id: string }).id;
}

async function run() {
  const { server, baseUrl } = await startServer();
  try {
    const unauthenticated = await fetch(`${baseUrl}/api/ili/readiness/pipeline-1`);
    assert.equal(unauthenticated.status, 401, "ILI readiness must require authentication");

    const token = await login(baseUrl);
    const missingPipeline = await fetch(`${baseUrl}/api/ili/readiness/missing-pipeline`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(missingPipeline.status, 404, "ILI readiness must enforce pipeline access");

    const pipelineId = await createPipeline(baseUrl, token);
    const response = await fetch(`${baseUrl}/api/ili/readiness/${pipelineId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(response.status, 200);
    const payload = await response.json() as {
      pipelineId: string;
      status: string;
      ready: boolean;
      reason: string;
      tables: { available: boolean; inspectionRuns: boolean; anomalies: boolean; assessmentResults: boolean };
      counts: { inspectionRuns: number; anomalies: number; assessmentResults: number };
      services: {
        b31gCalculation: { available: boolean; status: string };
        corrosionGrowthSource: { available: boolean; status: string };
        remainingUsefulLife: { available: boolean; status: string };
      };
      blockers: string[];
    };

    assert.equal(payload.pipelineId, pipelineId);
    assert.equal(payload.ready, false);
    assert.equal(payload.status, "unavailable");
    assert.equal(payload.tables.available, false);
    assert.equal(payload.tables.inspectionRuns, false);
    assert.equal(payload.tables.anomalies, false);
    assert.equal(payload.tables.assessmentResults, false);
    assert.deepEqual(payload.counts, { inspectionRuns: 0, anomalies: 0, assessmentResults: 0 });
    assert.equal(payload.services.b31gCalculation.available, false);
    assert.equal(payload.services.b31gCalculation.status, "not_configured");
    assert.equal(payload.services.corrosionGrowthSource.available, false);
    assert.equal(payload.services.corrosionGrowthSource.status, "ili_data_unavailable");
    assert.equal(payload.services.remainingUsefulLife.available, false);
    assert.equal(payload.services.remainingUsefulLife.status, "failure_criterion_not_configured");
    assert.ok(payload.blockers.some((blocker) => blocker.includes("ILI table storage")));
  } finally {
    await stopServer(server);
  }

  console.log("ILI readiness checks passed.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
