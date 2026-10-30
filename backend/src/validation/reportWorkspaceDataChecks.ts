import assert from "node:assert/strict";
import { createServer, Server } from "node:http";
import { AddressInfo } from "node:net";

import { createValidExternalAssessment, createValidInternalAssessment } from "./testPayloads";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "";
process.env.SEED_ADMIN_PASSWORD = "admin-test-password";
process.env.SEED_ENGINEER_PASSWORD = "engineer-test-password";
process.env.SEED_VIEWER_PASSWORD = "viewer-test-password";

type LoginResponse = { token: string };

async function startServer() {
  const { createApp } = await import("../app");
  const { initializeStorage } = await import("../data/store");
  assert.equal(await initializeStorage(), "memory");
  const server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, resolve));
  return { server, baseUrl: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
}

async function stopServer(server: Server) {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

async function login(baseUrl: string, email: string, password: string) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  assert.equal(response.status, 200);
  return (await response.json()) as LoginResponse;
}

function headers(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

async function postJson(baseUrl: string, path: string, token: string, body: unknown) {
  return fetch(`${baseUrl}${path}`, { method: "POST", headers: headers(token), body: JSON.stringify(body) });
}

async function getJson(baseUrl: string, path: string, token: string) {
  return fetch(`${baseUrl}${path}`, { method: "GET", headers: headers(token) });
}

function assertNoDemoValues(value: unknown) {
  const serialized = JSON.stringify(value);
  for (const forbidden of ["F-005", "F-006", "F-003", "F-007", "2.1 yr", "J. Williams", "DCVG", "CCTV"]) {
    assert.equal(serialized.includes(forbidden), false, `Response must not include demo value ${forbidden}`);
  }
}

async function run() {
  const { server, baseUrl } = await startServer();
  try {
    const engineer = await login(baseUrl, "engineer@klinthru.local", "engineer-test-password");
    const viewer = await login(baseUrl, "viewer@klinthru.local", "viewer-test-password");

    const { store } = await import("../data/store");

    const pipelineResponse = await postJson(baseUrl, "/api/pipelines", engineer.token, {
      pipelineCode: "RPT-WS-001",
      pipelineName: "Reports Workspace Pipeline",
      location: "North Block",
      serviceOrProduct: "Gas",
      pipeMaterial: "Carbon Steel",
      pipeGrade: "API 5L X52",
      pipeLengthKm: 42.4,
      pipeInsideDiameter: 480,
      pipeOutsideDiameter: 508,
      diameterUnit: "mm",
      smysMpa: 358,
      maopBar: 80,
      operatingPressure: 48,
      operatingPressureUnit: "bar",
      wallThicknessInputValue: 8.2,
      wallThicknessUnit: "mm",
      status: "Active"
    });
    assert.equal(pipelineResponse.status, 201);
    const pipeline = await pipelineResponse.json() as { id: string };

    const oldAssessment = createValidExternalAssessment("rpt-ws-old", "Reports Workspace Pipeline", pipeline.id) as ReturnType<typeof createValidExternalAssessment> & { inspectionDate?: string };
    oldAssessment.createdAt = "2026-01-01T00:00:00.000Z";
    oldAssessment.inspectionDate = "2026-01-01T00:00:00.000Z";
    oldAssessment.riskLevel = "Medium";
    oldAssessment.riskScore = 44;
    await store.createAssessment({ ...oldAssessment, authorId: "user-engineer" } as any);

    const latestAssessment = createValidInternalAssessment("rpt-ws-latest", "Reports Workspace Pipeline", pipeline.id) as ReturnType<typeof createValidInternalAssessment> & { inspectionDate?: string };
    latestAssessment.createdAt = "2026-03-01T00:00:00.000Z";
    latestAssessment.inspectionDate = "2026-03-01T00:00:00.000Z";
    latestAssessment.riskLevel = "Low";
    latestAssessment.riskScore = 12;
    await store.createAssessment({ ...latestAssessment, authorId: "user-engineer" } as any);

    const peakAssessment = createValidExternalAssessment("rpt-ws-peak", "Reports Workspace Pipeline", pipeline.id) as ReturnType<typeof createValidExternalAssessment> & { inspectionDate?: string };
    peakAssessment.createdAt = "2026-02-01T00:00:00.000Z";
    peakAssessment.inspectionDate = "2026-02-01T00:00:00.000Z";
    peakAssessment.riskLevel = "High";
    peakAssessment.riskScore = 91;
    await store.createAssessment({ ...peakAssessment, authorId: "user-engineer" } as any);

    await store.createReport({
      assessmentId: latestAssessment.id,
      inspectionId: latestAssessment.id,
      assessmentType: "Internal",
      pipelineId: pipeline.id,
      pipelineName: "Reports Workspace Pipeline",
      riskLevel: "Low",
      input: latestAssessment.input as any,
      result: latestAssessment.result,
      authorId: "user-engineer"
    });

    await store.createCpCalculation({
      calculation: {
        pipelineId: pipeline.id,
        calculationType: "SACP",
        input: { pipelineId: pipeline.id },
        result: { designLifeYears: 20 }
      },
      authorId: "user-engineer",
      viewerUserId: "user-engineer",
      viewerRole: "Engineer"
    });

    const unauthenticated = await fetch(`${baseUrl}/api/reports/workspace-data/${pipeline.id}`);
    assert.equal(unauthenticated.status, 401);

    const missing = await getJson(baseUrl, "/api/reports/workspace-data/not-a-real-pipeline", engineer.token);
    assert.equal(missing.status, 404);

    const isolated = await getJson(baseUrl, `/api/reports/workspace-data/${pipeline.id}`, viewer.token);
    assert.equal(isolated.status, 404);

    const response = await getJson(baseUrl, `/api/reports/workspace-data/${pipeline.id}`, engineer.token);
    assert.equal(response.status, 200);
    const payload = await response.json() as any;

    assert.equal(payload.pipeline.status, "available");
    assert.equal(payload.pipeline.source, "Pipeline");
    assert.equal(payload.pipeline.data.id, pipeline.id);
    assert.equal(payload.pipeline.data.pipelineName, "Reports Workspace Pipeline");
    assert.equal(payload.pipeline.data.pipeLengthKm, 42.4);
    assert.equal(payload.pipeline.data.pipeOutsideDiameter, 508);
    assert.equal(payload.pipeline.data.pipeGrade, "API 5L X52");
    assert.equal(payload.pipeline.data.smysMpa, 358);

    assert.equal(payload.risk.status, "available");
    assert.equal(payload.risk.source, "Assessment");
    assert.equal(payload.risk.assessmentCount, 3);
    assert.deepEqual(payload.risk.counts, { high: 1, medium: 1, low: 1, unknown: 0 });
    assert.equal(payload.risk.latestAssessment.id, latestAssessment.id);
    assert.equal(payload.risk.peakRisk.score, 91);
    assert.equal(payload.risk.peakRisk.assessmentId, peakAssessment.id);
    assert.equal(payload.risk.peakRisk.semantics, "maximum persisted Assessment.riskScore for this pipeline");

    assert.equal(payload.existingReports.status, "available");
    assert.equal(payload.existingReports.source, "Report");
    assert.equal(payload.existingReports.count, 1);
    assert.equal(payload.existingReports.recent[0].assessmentId, latestAssessment.id);

    assert.equal(payload.cpCalculations.status, "available");
    assert.equal(payload.cpCalculations.source, "CpCalculation");
    assert.equal(payload.cpCalculations.count, 1);
    assert.equal(payload.cpCalculations.recent[0].calculationType, "SACP");

    assert.equal(payload.aiReadiness.status, "available");
    assert.equal(typeof payload.aiReadiness.readyCapabilities, "number");
    assert.equal(typeof payload.aiReadiness.blockedCapabilities, "number");

    assert.deepEqual(payload.health, { status: "unavailable", reason: "health_score_not_implemented" });
    assert.deepEqual(payload.defects, { status: "unavailable", reason: "canonical_defect_source_not_implemented" });
    assert.deepEqual(payload.ili, { status: "blocked", reason: "ili_data_source_not_operational" });
    assert.deepEqual(payload.cpMonitoring, { status: "blocked", reason: "cp_monitoring_data_source_not_operational" });
    assert.deepEqual(payload.scada, { status: "unavailable", reason: "scada_telemetry_not_implemented" });
    assert.deepEqual(payload.actions, { status: "unavailable", reason: "canonical_action_register_not_implemented" });
    assert.deepEqual(payload.delivery, { status: "unavailable", reason: "report_delivery_not_implemented" });
    assert.equal(payload.aiPredictions.reason, "readiness_only_no_prediction_results_returned");

    assertNoDemoValues(payload);

    console.log("Report workspace data checks passed.");
  } finally {
    await stopServer(server);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});





