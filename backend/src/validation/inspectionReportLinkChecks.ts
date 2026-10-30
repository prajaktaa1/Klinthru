import assert from "node:assert/strict";
import { createServer, Server } from "node:http";
import { AddressInfo } from "node:net";

import { StoredAssessment } from "../types/domain";
import { createValidExternalAssessment, createValidInternalAssessment } from "./testPayloads";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "";
process.env.SEED_ADMIN_PASSWORD = "admin-test-password";
process.env.SEED_ENGINEER_PASSWORD = "engineer-test-password";
process.env.SEED_VIEWER_PASSWORD = "viewer-test-password";

type LoginResponse = { token: string };
type PipelineResponse = { id: string; pipelineName: string };
type AssessmentResponse = ReturnType<typeof createValidExternalAssessment> & {
  inspectionDate?: string;
};
type ReportResponse = {
  id: string;
  assessmentId: string;
  inspectionId?: string;
  pipelineId?: string;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
};
type TestAssessment =
  | (ReturnType<typeof createValidExternalAssessment> & { inspectionDate?: string })
  | (ReturnType<typeof createValidInternalAssessment> & { inspectionDate?: string });

async function startServer() {
  const { createApp } = await import("../app");
  const { initializeStorage } = await import("../data/store");
  const mode = await initializeStorage();
  assert.equal(mode, "memory");

  const app = createApp();
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function stopServer(server: Server) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
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

async function createPipeline(baseUrl: string, token: string, code: string, name: string) {
  const response = await postJson(baseUrl, "/api/pipelines", token, {
    pipelineCode: code,
    pipelineName: name,
    pipeMaterial: "Carbon Steel",
    pipeGrade: "API 5L X52",
    status: "Active"
  });
  assert.equal(response.status, 201);
  return (await response.json()) as PipelineResponse;
}

async function saveAssessment(
  baseUrl: string,
  token: string,
  assessment: TestAssessment
) {
  const response = await postJson(baseUrl, "/api/assessments", token, assessment);
  assert.equal(response.status, 201);
  return (await response.json()) as AssessmentResponse;
}

async function run() {
  const { server, baseUrl } = await startServer();

  try {
    const admin = await login(baseUrl, "admin@klinthru.local", "admin-test-password");
    const engineer = await login(baseUrl, "engineer@klinthru.local", "engineer-test-password");
    const viewer = await login(baseUrl, "viewer@klinthru.local", "viewer-test-password");

    const engineerPipeline = await createPipeline(baseUrl, engineer.token, "IRL-ENG", "Inspection Link Engineer");
    const viewerPipeline = await createPipeline(baseUrl, viewer.token, "IRL-VIEW", "Inspection Link Viewer");

    const explicitExternalDate = "2026-07-14";
    const externalAssessment: TestAssessment = createValidExternalAssessment(
      "irl-external-explicit",
      engineerPipeline.pipelineName,
      engineerPipeline.id
    );
    externalAssessment.inspectionDate = explicitExternalDate;
    const savedExternal = await saveAssessment(baseUrl, engineer.token, externalAssessment);
    assert.equal(savedExternal.inspectionDate, "2026-07-14T00:00:00.000Z");
    assert.deepEqual(savedExternal.input, externalAssessment.input, "External assessment input snapshot should remain unchanged");
    assert.deepEqual(savedExternal.result, externalAssessment.result, "External assessment result snapshot should remain unchanged");

    const explicitInternalDate = "2026-07-15T08:30:00.000Z";
    const internalAssessment: TestAssessment = createValidInternalAssessment(
      "irl-internal-explicit",
      engineerPipeline.pipelineName,
      engineerPipeline.id
    );
    internalAssessment.inspectionDate = explicitInternalDate;
    const savedInternal = await saveAssessment(baseUrl, engineer.token, internalAssessment);
    assert.equal(savedInternal.inspectionDate, explicitInternalDate);

    const defaultedAssessment = createValidExternalAssessment("irl-default-date", engineerPipeline.pipelineName, engineerPipeline.id);
    const beforeDefaultSave = Date.now();
    const savedDefaulted = await saveAssessment(baseUrl, engineer.token, defaultedAssessment);
    const afterDefaultSave = Date.now();
    assert.ok(savedDefaulted.inspectionDate, "Assessment response should include a server-generated inspection date");
    const defaultedTime = Date.parse(savedDefaulted.inspectionDate!);
    assert.ok(defaultedTime >= beforeDefaultSave && defaultedTime <= afterDefaultSave);

    const invalidAssessment: TestAssessment = createValidExternalAssessment(
      "irl-invalid-date",
      engineerPipeline.pipelineName,
      engineerPipeline.id
    );
    invalidAssessment.inspectionDate = "2026-02-30";
    const invalidResponse = await postJson(baseUrl, "/api/assessments", engineer.token, invalidAssessment);
    assert.equal(invalidResponse.status, 400);
    assert.deepEqual(await invalidResponse.json(), {
      error: "Validation failed",
      fields: {
        inspectionDate: "Must be a valid ISO date or date-time string"
      }
    });
    assert.equal((await getJson(baseUrl, "/api/assessments/irl-invalid-date", engineer.token)).status, 404);

    const reportAssessmentPayload = {
      ...externalAssessment,
      inspectionDate: savedExternal.inspectionDate
    };
    const reportResponse = await postJson(baseUrl, "/api/reports", engineer.token, {
      assessmentId: savedExternal.id,
      assessment: reportAssessmentPayload
    });
    assert.equal(reportResponse.status, 201);
    const report = (await reportResponse.json()) as ReportResponse;
    assert.equal(report.assessmentId, savedExternal.id);
    assert.equal(report.inspectionId, savedExternal.id);
    assert.deepEqual(report.input, externalAssessment.input, "Report input snapshot should remain unchanged");
    assert.deepEqual(report.result, externalAssessment.result, "Report result snapshot should remain unchanged");

    const { store } = await import("../data/store");
    const legacyAssessment = savedInternal as unknown as StoredAssessment;
    const legacyReport = await store.createReport({
      assessmentId: legacyAssessment.id,
      assessmentType: legacyAssessment.type,
      pipelineId: legacyAssessment.pipelineId,
      pipelineName: legacyAssessment.pipelineName,
      riskLevel: legacyAssessment.riskLevel,
      input: legacyAssessment.input,
      result: legacyAssessment.result,
      authorId: "user-engineer"
    });
    assert.equal(legacyReport.inspectionId, undefined);
    const loadedLegacyResponse = await getJson(baseUrl, `/api/reports/${legacyReport.id}`, engineer.token);
    assert.equal(loadedLegacyResponse.status, 200);
    const loadedLegacy = (await loadedLegacyResponse.json()) as ReportResponse;
    assert.equal(loadedLegacy.assessmentId, savedInternal.id);
    assert.equal(loadedLegacy.inspectionId, undefined);

    const viewerAssessment = createValidExternalAssessment("irl-viewer-assessment", viewerPipeline.pipelineName, viewerPipeline.id);
    const savedViewerAssessment = await saveAssessment(baseUrl, viewer.token, viewerAssessment);
    const crossOwnerReportResponse = await postJson(baseUrl, "/api/reports", engineer.token, {
      assessmentId: savedViewerAssessment.id,
      assessment: viewerAssessment
    });
    assert.equal(crossOwnerReportResponse.status, 404, "Users cannot create reports for another owner's pipeline");
    assert.equal((await getJson(baseUrl, `/api/reports/${report.id}`, viewer.token)).status, 404);
    assert.equal((await getJson(baseUrl, `/api/reports/${report.id}`, admin.token)).status, 200);

    console.log("Inspection report link checks passed.");
  } finally {
    await stopServer(server);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
