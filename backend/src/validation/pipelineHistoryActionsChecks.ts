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
type PipelineResponse = { id: string; pipelineCode: string; pipelineName: string; status: string; updatedAt: string };
type ReportResponse = {
  id: string;
  pipelineId?: string;
  pipelineName: string;
  assessmentType: "External" | "Internal";
  createdAt: string;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
};

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

async function putJson(baseUrl: string, path: string, token: string, body: unknown) {
  return fetch(`${baseUrl}${path}`, { method: "PUT", headers: headers(token), body: JSON.stringify(body) });
}

async function createPipeline(baseUrl: string, token: string, code: string, name: string) {
  const response = await postJson(baseUrl, "/api/pipelines", token, {
    pipelineCode: code,
    pipelineName: name,
    pipeLocationId: `${code}-SEG`,
    pipeMaterial: "Carbon Steel",
    pipeGrade: "API 5L X52",
    pipeAgeYears: 10,
    pipeLengthKm: 5,
    pipeOutsideDiameter: 500,
    diameterUnit: "mm",
    smysMpa: 358,
    maopBar: 50,
    operatingPressureInputValue: 3,
    operatingPressureUnit: "MPa",
    nominalWallThickness: 8,
    wallThicknessInputValue: 8,
    wallThicknessUnit: "mm",
    installationYear: 2015,
    inspectionYear: 2026,
    status: "Active"
  });
  assert.equal(response.status, 201);
  return (await response.json()) as PipelineResponse;
}

async function createReport(baseUrl: string, token: string, id: string, pipeline: PipelineResponse, type: "External" | "Internal") {
  const assessment =
    type === "External"
      ? createValidExternalAssessment(id, pipeline.pipelineName, pipeline.id)
      : createValidInternalAssessment(id, pipeline.pipelineName, pipeline.id);
  const assessmentResponse = await postJson(baseUrl, "/api/assessments", token, assessment);
  assert.equal(assessmentResponse.status, 201);
  const response = await postJson(baseUrl, "/api/reports", token, { assessmentId: id, assessment });
  assert.equal(response.status, 201);
  return (await response.json()) as ReportResponse;
}

async function updatePipelineName(baseUrl: string, token: string, pipeline: PipelineResponse, pipelineName: string) {
  const response = await putJson(baseUrl, `/api/pipelines/${pipeline.id}`, token, {
    pipelineCode: pipeline.pipelineCode,
    pipelineName,
    pipeLocationId: `${pipeline.pipelineCode}-SEG`,
    pipeMaterial: "Carbon Steel",
    pipeGrade: "API 5L X52",
    pipeAgeYears: 10,
    pipeLengthKm: 5,
    pipeOutsideDiameter: 500,
    diameterUnit: "mm",
    smysMpa: 358,
    maopBar: 50,
    operatingPressureInputValue: 3,
    operatingPressureUnit: "MPa",
    nominalWallThickness: 8,
    wallThicknessInputValue: 8,
    wallThicknessUnit: "mm",
    installationYear: 2015,
    inspectionYear: 2026,
    status: pipeline.status
  });
  assert.equal(response.status, 200);
}

async function run() {
  const { server, baseUrl } = await startServer();
  try {
    const admin = await login(baseUrl, "admin@klinthru.local", "admin-test-password");
    const engineer = await login(baseUrl, "engineer@klinthru.local", "engineer-test-password");
    const viewer = await login(baseUrl, "viewer@klinthru.local", "viewer-test-password");

    const engineerPipeline = await createPipeline(baseUrl, engineer.token, "PHA-ENG", "History Actions Engineer");
    const viewerPipeline = await createPipeline(baseUrl, viewer.token, "PHA-VIEW", "History Actions Viewer");

    const engineerPipelines = (await (await getJson(baseUrl, "/api/pipelines", engineer.token)).json()) as PipelineResponse[];
    assert.equal(
      engineerPipelines.some((pipeline) => pipeline.id === engineerPipeline.id),
      true,
      "Engineer should see their own pipeline"
    );
    assert.equal(
      engineerPipelines.some((pipeline) => pipeline.id === viewerPipeline.id),
      false,
      "Engineer should not see another user's pipeline"
    );

    const adminPipelines = (await (await getJson(baseUrl, "/api/pipelines", admin.token)).json()) as PipelineResponse[];
    assert.equal(adminPipelines.some((pipeline) => pipeline.id === engineerPipeline.id), true);
    assert.equal(adminPipelines.some((pipeline) => pipeline.id === viewerPipeline.id), true);

    const externalInspection = createValidExternalAssessment("pha-inspection-external", engineerPipeline.pipelineName, engineerPipeline.id);
    const internalInspection = createValidInternalAssessment("pha-inspection-internal", engineerPipeline.pipelineName, engineerPipeline.id);
    assert.equal((await postJson(baseUrl, "/api/external-pipe-data", engineer.token, externalInspection)).status, 201);
    assert.equal((await postJson(baseUrl, "/api/external-pipe-data", engineer.token, internalInspection)).status, 201);

    const filteredInspections = (await (
      await getJson(baseUrl, `/api/external-pipe-data?pipelineId=${engineerPipeline.id}`, engineer.token)
    ).json()) as Array<{ pipelineId?: string }>;
    assert.equal(filteredInspections.length, 2, "Inspection history should filter by selected pipeline ID");
    assert.equal(filteredInspections.every((record) => record.pipelineId === engineerPipeline.id), true);

    const firstReport = await createReport(baseUrl, engineer.token, "pha-report-old", engineerPipeline, "External");
    await new Promise((resolve) => setTimeout(resolve, 10));
    const latestReport = await createReport(baseUrl, engineer.token, "pha-report-new", engineerPipeline, "Internal");
    await createReport(baseUrl, viewer.token, "pha-report-viewer", viewerPipeline, "External");

    const reportsForPipeline = (await (
      await getJson(baseUrl, `/api/reports?pipelineId=${engineerPipeline.id}`, engineer.token)
    ).json()) as ReportResponse[];
    assert.equal(reportsForPipeline.length, 2, "Report history should filter by selected pipeline ID");
    assert.equal(reportsForPipeline.every((report) => report.pipelineId === engineerPipeline.id), true);
    assert.equal(reportsForPipeline[0].id, latestReport.id, "Newest report should be returned first for latest-report download");
    assert.notEqual(firstReport.id, latestReport.id, "Multiple reports should remain separate history records");
    assert.equal(
      reportsForPipeline.some((report) => report.assessmentType === "External"),
      true,
      "Calculation report history should include External reports for the selected pipeline"
    );
    assert.equal(
      reportsForPipeline.some((report) => report.assessmentType === "Internal"),
      true,
      "Calculation report history should include Internal reports for the selected pipeline"
    );

    const fetchedExternalReport = (await (
      await getJson(baseUrl, `/api/reports/${firstReport.id}`, engineer.token)
    ).json()) as ReportResponse;
    const fetchedInternalReport = (await (
      await getJson(baseUrl, `/api/reports/${latestReport.id}`, engineer.token)
    ).json()) as ReportResponse;
    assert.equal(fetchedExternalReport.assessmentType, "External");
    assert.equal(fetchedExternalReport.result.majorModeOfFailure, "General wall loss");
    assert.equal(fetchedInternalReport.assessmentType, "Internal");
    assert.equal(fetchedInternalReport.result.majorModeOfFailure, "Internal wall loss");
    assert.notDeepEqual(
      fetchedExternalReport.input,
      fetchedInternalReport.input,
      "External and Internal report snapshots should remain assessment-specific"
    );

    await updatePipelineName(baseUrl, engineer.token, engineerPipeline, "History Actions Engineer Updated");
    const reportAfterPipelineUpdate = (await (
      await getJson(baseUrl, `/api/reports/${firstReport.id}`, engineer.token)
    ).json()) as ReportResponse;
    assert.equal(
      reportAfterPipelineUpdate.pipelineName,
      engineerPipeline.pipelineName,
      "Existing report snapshots should not change when Pipeline Master Data is edited"
    );

    const viewerReportsForEngineerPipeline = (await (
      await getJson(baseUrl, `/api/reports?pipelineId=${engineerPipeline.id}`, viewer.token)
    ).json()) as ReportResponse[];
    assert.equal(viewerReportsForEngineerPipeline.length, 0, "Viewer should not see another user's reports by pipelineId");

    assert.equal((await getJson(baseUrl, `/api/pipelines/${engineerPipeline.id}/history`, viewer.token)).status, 404);
    assert.equal((await getJson(baseUrl, `/api/reports/${latestReport.id}/download/pdf`, engineer.token)).status, 200);
    assert.equal((await getJson(baseUrl, `/api/reports/${latestReport.id}/download/word`, engineer.token)).status, 200);
    assert.equal((await getJson(baseUrl, `/api/reports/${latestReport.id}/download/pdf`, viewer.token)).status, 404);
    assert.equal((await getJson(baseUrl, `/api/reports/${latestReport.id}/download/word`, viewer.token)).status, 404);
  } finally {
    await stopServer(server);
  }
}

run()
  .then(() => {
    console.log("Pipeline history action checks passed.");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
