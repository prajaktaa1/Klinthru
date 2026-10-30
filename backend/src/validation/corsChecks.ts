import assert from "node:assert/strict";
import { createServer, Server } from "node:http";
import { AddressInfo } from "node:net";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "";
process.env.CORS_ORIGINS = "http://localhost:3000,http://localhost:4000";
process.env.SEED_ADMIN_PASSWORD = "admin-test-password";
process.env.SEED_ENGINEER_PASSWORD = "engineer-test-password";
process.env.SEED_VIEWER_PASSWORD = "viewer-test-password";

async function startServer() {
  const { createApp } = await import("../app");

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

async function preflight(baseUrl: string, origin: string) {
  return fetch(`${baseUrl}/api/assessments`, {
    method: "OPTIONS",
    headers: {
      Origin: origin,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type,authorization"
    }
  });
}

async function run() {
  const { server, baseUrl } = await startServer();

  try {
    const localhost3000 = await preflight(baseUrl, "http://localhost:3000");
    assert.equal(localhost3000.status, 204, "localhost:3000 preflight should be accepted");
    assert.equal(
      localhost3000.headers.get("access-control-allow-origin"),
      "http://localhost:3000",
      "localhost:3000 should be echoed as the allowed origin"
    );

    const localhost4000 = await preflight(baseUrl, "http://localhost:4000");
    assert.equal(localhost4000.status, 204, "localhost:4000 preflight should be accepted");
    assert.equal(
      localhost4000.headers.get("access-control-allow-origin"),
      "http://localhost:4000",
      "localhost:4000 should be echoed as the allowed origin"
    );

    const rejected = await preflight(baseUrl, "http://localhost:3001");
    assert.equal(rejected.status, 403, "unapproved origins should be rejected");

    const healthWithoutOrigin = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthWithoutOrigin.status, 200, "requests without Origin should continue to work");

    console.log("CORS checks passed.");
  } finally {
    await stopServer(server);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
