import assert from "node:assert/strict";
import { createServer, Server } from "node:http";
import { AddressInfo } from "node:net";

import { createValidExternalAssessment } from "./testPayloads";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "";
process.env.SEED_ADMIN_PASSWORD = "admin-test-password";
process.env.SEED_ENGINEER_PASSWORD = "engineer-test-password";
process.env.SEED_VIEWER_PASSWORD = "viewer-test-password";

type LoginResponse = {
  token: string;
};

type DiagnosticEntry = {
  event: string;
  method: string;
  path: string;
  status: number;
  authorizationHeaderPresent: boolean;
  authenticatedUserIdPresent: boolean;
  authenticatedUserRole: string | null;
  validationFields: string[];
  validationErrorCodes: string[];
  storageMode: string | null;
  prismaWriteAttempted: boolean;
  prismaWriteSucceeded: boolean;
  prismaErrorCode: string | null;
};

async function startServer() {
  const { createApp } = await import("../app");
  const { initializeStorage } = await import("../data/store");

  await initializeStorage();
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

function captureLogs() {
  const originalLog = console.log;
  const lines: string[] = [];
  console.log = (...args: unknown[]) => {
    lines.push(args.map((arg) => String(arg)).join(" "));
  };

  return {
    lines,
    restore() {
      console.log = originalLog;
    }
  };
}

function diagnosticEntries(lines: string[]): DiagnosticEntry[] {
  return lines
    .filter((line) => line.includes('"event":"save_diagnostic"'))
    .map((line) => JSON.parse(line) as DiagnosticEntry);
}

async function login(baseUrl: string) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "engineer@klinthru.local",
      password: "engineer-test-password"
    })
  });
  assert.equal(response.status, 200, "Login should succeed for diagnostics checks");
  return (await response.json()) as LoginResponse;
}

async function postAssessment(baseUrl: string, body: unknown, token?: string) {
  return fetch(`${baseUrl}/api/assessments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:3000",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });
}

async function run() {
  const capture = captureLogs();
  const { server, baseUrl } = await startServer();

  try {
    delete process.env.SAVE_DIAGNOSTICS;
    const disabledResponse = await postAssessment(baseUrl, { pipelineName: "SHOULD-NOT-LOG" });
    assert.equal(disabledResponse.status, 401);
    assert.equal(diagnosticEntries(capture.lines).length, 0, "Diagnostics should be disabled by default");

    process.env.SAVE_DIAGNOSTICS = "true";
    const unauthorizedResponse = await postAssessment(baseUrl, { pipelineName: "UNAUTHORIZED-PAYLOAD-SECRET" });
    assert.equal(unauthorizedResponse.status, 401);
    const unauthorizedEntry = diagnosticEntries(capture.lines).at(-1);
    assert.equal(unauthorizedEntry?.status, 401);
    assert.equal(unauthorizedEntry?.path, "/api/assessments");
    assert.equal(unauthorizedEntry?.authorizationHeaderPresent, false);
    assert.equal(unauthorizedEntry?.authenticatedUserIdPresent, false);

    const { token } = await login(baseUrl);
    const invalidResponse = await postAssessment(baseUrl, { pipelineName: "INVALID-PAYLOAD-SECRET" }, token);
    assert.equal(invalidResponse.status, 400);
    const invalidEntry = diagnosticEntries(capture.lines).at(-1);
    assert.equal(invalidEntry?.status, 400);
    assert.equal(invalidEntry?.authorizationHeaderPresent, true);
    assert.equal(invalidEntry?.authenticatedUserIdPresent, true);
    assert.equal(invalidEntry?.authenticatedUserRole, "Engineer");
    assert.ok(invalidEntry?.validationFields.includes("type"));
    assert.ok(invalidEntry?.validationErrorCodes.includes("validation_failed"));

    const validAssessment = createValidExternalAssessment("diagnostic-success-assessment", "SUCCESS-PAYLOAD-SECRET");
    const successResponse = await postAssessment(baseUrl, validAssessment, token);
    assert.equal(successResponse.status, 201);
    const successEntry = diagnosticEntries(capture.lines).at(-1);
    assert.equal(successEntry?.status, 201);
    assert.equal(successEntry?.storageMode, "memory");
    assert.equal(successEntry?.prismaWriteAttempted, false);
    assert.equal(successEntry?.prismaWriteSucceeded, false);

    const diagnosticCountBeforeProductionRequest = diagnosticEntries(capture.lines).length;
    process.env.NODE_ENV = "production";
    process.env.SAVE_DIAGNOSTICS = "true";
    const productionDisabledResponse = await postAssessment(baseUrl, { pipelineName: "PRODUCTION-DISABLED-SECRET" });
    assert.equal(productionDisabledResponse.status, 401);
    assert.equal(
      diagnosticEntries(capture.lines).length,
      diagnosticCountBeforeProductionRequest,
      "Diagnostics should remain disabled in production"
    );

    const allDiagnosticLogs = diagnosticEntries(capture.lines).map((entry) => JSON.stringify(entry)).join("\n");
    assert.equal(allDiagnosticLogs.includes(token), false, "Token must not be logged");
    assert.equal(allDiagnosticLogs.includes("PAYLOAD-SECRET"), false, "Payload values must not be logged");
    assert.equal(allDiagnosticLogs.includes("DATABASE_URL"), false, "Database URL must not be logged");

    console.log("Save diagnostics checks passed.");
  } finally {
    await stopServer(server);
    capture.restore();
    process.env.NODE_ENV = "test";
    delete process.env.SAVE_DIAGNOSTICS;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
