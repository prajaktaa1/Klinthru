import assert from "node:assert/strict";
import { createServer, Server } from "node:http";
import { AddressInfo } from "node:net";

import { createValidExternalAssessment, createValidSensorAssignment } from "./testPayloads";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "";
process.env.SEED_ADMIN_PASSWORD = "admin-test-password";
process.env.SEED_ENGINEER_PASSWORD = "engineer-test-password";
process.env.SEED_VIEWER_PASSWORD = "viewer-test-password";

type LoginResponse = {
  token: string;
};

async function startServer() {
  const { createApp } = await import("../app");
  const { initializeStorage } = await import("../data/store");

  const mode = await initializeStorage();
  assert.equal(mode, "memory", "Test mode should allow memory fallback");

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
  assert.equal(response.status, 200, `Login should succeed for ${email}`);
  return (await response.json()) as LoginResponse;
}

function authHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
}

async function postJson(baseUrl: string, path: string, token: string, body: unknown) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body)
  });
}

async function getJson(baseUrl: string, path: string, token: string) {
  return fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers: authHeaders(token)
  });
}

async function run() {
  const { server, baseUrl } = await startServer();

  try {
    const admin = await login(baseUrl, "admin@klinthru.local", "admin-test-password");
    const engineer = await login(baseUrl, "engineer@klinthru.local", "engineer-test-password");
    const viewer = await login(baseUrl, "viewer@klinthru.local", "viewer-test-password");

    const pipelineResponse = await postJson(baseUrl, "/api/pipelines", engineer.token, {
      pipelineCode: "OWNER-LINE-1",
      pipelineName: "Engineer Line",
      pipeMaterial: "Carbon Steel",
      pipeGrade: "API 5L X52",
      status: "Active"
    });
    assert.equal(pipelineResponse.status, 201);
    const pipeline = await pipelineResponse.json() as { id: string };

    const engineerAssessment = createValidExternalAssessment("owner-assessment-1", "Engineer Line", pipeline.id);
    assert.equal((await postJson(baseUrl, "/api/assessments", engineer.token, engineerAssessment)).status, 201);

    const duplicateReportA = await postJson(baseUrl, "/api/reports", engineer.token, {
      assessmentId: engineerAssessment.id,
      assessment: engineerAssessment
    });
    assert.equal(duplicateReportA.status, 201);
    const firstReport = await duplicateReportA.json() as { id: string };

    const duplicateReportB = await postJson(baseUrl, "/api/reports", engineer.token, {
      assessmentId: engineerAssessment.id,
      assessment: engineerAssessment
    });
    assert.equal(duplicateReportB.status, 201);
    const secondReport = await duplicateReportB.json() as { id: string };
    assert.equal(secondReport.id, firstReport.id, "Duplicate submission should return the existing report");

    const engineerReports = await (await getJson(baseUrl, "/api/reports", engineer.token)).json() as unknown[];
    assert.equal(engineerReports.length, 1, "Duplicate submission should create only one report");

    const viewerReportResponse = await getJson(baseUrl, `/api/reports/${firstReport.id}`, viewer.token);
    assert.equal(viewerReportResponse.status, 404, "Ordinary users cannot view another user's report");

    const adminReportResponse = await getJson(baseUrl, `/api/reports/${firstReport.id}`, admin.token);
    assert.equal(adminReportResponse.status, 200, "Admins can view all reports");

    const viewerAssignmentResponse = await postJson(
      baseUrl,
      "/api/sensor-assignments",
      viewer.token,
      createValidSensorAssignment("viewer-sensor-1")
    );
    assert.equal(viewerAssignmentResponse.status, 403, "Viewers cannot modify sensor assignments");

    const engineerAssignmentResponse = await postJson(
      baseUrl,
      "/api/sensor-assignments",
      engineer.token,
      createValidSensorAssignment("engineer-sensor-1")
    );
    assert.equal(engineerAssignmentResponse.status, 201, "Engineers can create sensor assignments");

    console.log("Memory safety checks passed.");
  } finally {
    await stopServer(server);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
