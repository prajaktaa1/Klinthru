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
type PipelineResponse = { id: string };
type PipeDataResponse = {
  id: string;
  assessmentId?: string;
  assessmentType: "External" | "Internal";
  pipelineId?: string;
  input?: Record<string, unknown>;
  pipelineOutsideDiameter?: number;
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

async function createPipeline(baseUrl: string, token: string, pipelineCode: string, pipelineName: string) {
  const response = await postJson(baseUrl, "/api/pipelines", token, {
    pipelineCode,
    pipelineName,
    pipeMaterial: "Carbon Steel",
    pipeGrade: "API 5L X52",
    pipeOutsideDiameter: 610,
    diameterUnit: "mm",
    nominalWallThickness: 8,
    operatingPressure: 30,
    installationYear: 2010,
    status: "Active"
  });
  assert.equal(response.status, 201);
  return (await response.json()) as PipelineResponse;
}

async function run() {
  const { server, baseUrl } = await startServer();
  try {
    const admin = await login(baseUrl, "admin@klinthru.local", "admin-test-password");
    const engineer = await login(baseUrl, "engineer@klinthru.local", "engineer-test-password");
    const viewer = await login(baseUrl, "viewer@klinthru.local", "viewer-test-password");

    const engineerPipeline = await createPipeline(baseUrl, engineer.token, "PDH-ENG", "Engineer Pipe Data Line");
    const viewerPipeline = await createPipeline(baseUrl, viewer.token, "PDH-VIEW", "Viewer Pipe Data Line");

    const external = createValidExternalAssessment("pipe-data-external-stable", "Engineer Pipe Data Line", engineerPipeline.id);
    const internal = createValidInternalAssessment("pipe-data-internal-stable", "Engineer Pipe Data Line", engineerPipeline.id);
    const viewerExternal = createValidExternalAssessment("pipe-data-viewer-stable", "Viewer Pipe Data Line", viewerPipeline.id);
    external.input.pipeIdDiameter = 610;
    external.input.pipeIdDiameterDisplayValue = 610;
    internal.input.pipeIdDiameter = 500;
    internal.input.pipeIdDiameterDisplayValue = 500;

    const externalResponse = await postJson(baseUrl, "/api/external-pipe-data", engineer.token, external);
    assert.equal(externalResponse.status, 201);
    const firstExternal = (await externalResponse.json()) as PipeDataResponse;

    const duplicateExternalResponse = await postJson(baseUrl, "/api/external-pipe-data", engineer.token, external);
    assert.equal(duplicateExternalResponse.status, 201);
    const secondExternal = (await duplicateExternalResponse.json()) as PipeDataResponse;
    assert.equal(secondExternal.id, firstExternal.id, "Repeated submission should update/return the existing pipe data row");

    assert.equal((await postJson(baseUrl, "/api/external-pipe-data", engineer.token, internal)).status, 201);
    assert.equal((await postJson(baseUrl, "/api/external-pipe-data", viewer.token, viewerExternal)).status, 201);

    const engineerRecords = (await (await getJson(baseUrl, "/api/external-pipe-data", engineer.token)).json()) as PipeDataResponse[];
    assert.equal(engineerRecords.length, 2, "Ordinary users should see only their own ExternalPipeData rows");
    assert.equal(new Set(engineerRecords.map((record) => record.assessmentType)).size, 2, "External and Internal rows should appear");

    const adminRecords = (await (await getJson(baseUrl, "/api/external-pipe-data", admin.token)).json()) as PipeDataResponse[];
    assert.equal(adminRecords.length, 3, "Admins should see all ExternalPipeData rows");

    const viewerDirectDetail = await getJson(baseUrl, `/api/external-pipe-data/${firstExternal.id}`, viewer.token);
    assert.equal(viewerDirectDetail.status, 404, "Direct detail access should preserve record ownership");

    const adminDirectDetail = await getJson(baseUrl, `/api/external-pipe-data/${firstExternal.id}`, admin.token);
    assert.equal(adminDirectDetail.status, 200, "Admins should access another user's detail record");

    const pipelineFilter = (await (
      await getJson(baseUrl, `/api/external-pipe-data?pipelineId=${engineerPipeline.id}`, admin.token)
    ).json()) as PipeDataResponse[];
    assert.equal(pipelineFilter.length, 2, "Pipeline filter should be applied by the backend");

    const typeFilter = (await (
      await getJson(baseUrl, "/api/external-pipe-data?assessmentType=Internal", engineer.token)
    ).json()) as PipeDataResponse[];
    assert.equal(typeFilter.length, 1, "Assessment type filter should be applied by the backend");
    assert.equal(typeFilter[0].assessmentType, "Internal");
    assert.equal(typeFilter[0].pipelineOutsideDiameter, 610, "Internal summaries should expose master OD separately");

    const inspectionYearFilter = (await (
      await getJson(baseUrl, "/api/external-pipe-data?inspectionYear=2024", engineer.token)
    ).json()) as PipeDataResponse[];
    assert.equal(inspectionYearFilter.length, 1, "Inspection year filter should be applied by the backend");
    assert.equal(inspectionYearFilter[0].assessmentType, "External");

    assert.equal(
      (await postJson(baseUrl, "/api/external-pipe-data", engineer.token, { ...external, id: "" })).status,
      400,
      "Pipe data POST should require a stable assessment ID"
    );

    console.log("Pipe data history checks passed.");
  } finally {
    await stopServer(server);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
