import assert from "node:assert/strict";
import http from "node:http";

import { createApp } from "../app";
import { env } from "../config/env";

function request(server: http.Server, path: string, method = "GET") {
  return new Promise<number>((resolve, reject) => {
    const address = server.address();
    if (!address || typeof address === "string") return reject(new Error("Server address unavailable"));
    const req = http.request({ host: "127.0.0.1", port: address.port, path, method }, (response) => { response.resume(); response.on("end", () => resolve(response.statusCode || 0)); });
    req.on("error", reject); req.end();
  });
}

async function main() {
  const server = createApp().listen(0);
  try {
    assert.equal(await request(server, "/api/super-admin/companies"), 401);
    assert.equal(await request(server, "/api/super-admin/configuration"), 401);
    assert.equal(await request(server, "/api/super-admin/activity"), 401);
    assert.equal(await request(server, "/api/super-admin/referrals", "POST"), 401);
    assert.equal(await request(server, "/api/super-admin/referrals/demo/revoke", "POST"), 401);
    assert.equal(await request(server, "/api/super-admin/companies/company-test", "POST"), 401);
    assert.equal(await request(server, "/api/super-admin/referrals/demo/redeem", "POST"), 401);
    assert.equal(await request(server, "/api/company/company-test/users"), 401);
    assert.equal(await request(server, "/api/company/company-test/users", "POST"), 401);
    console.log("PASS: Super Admin management routes reject unauthenticated requests.");
  } finally {
    server.close();
  }

  const previous = env.companyWorkflowEnabled;
  env.companyWorkflowEnabled = true;
  const guardedServer = createApp().listen(0);
  try {
    assert.equal(await request(guardedServer, "/api/pipelines"), 401);
    assert.equal(await request(guardedServer, "/api/asset-master/assets"), 401);
    assert.equal(await request(guardedServer, "/api/documents"), 503);
    assert.equal(await request(guardedServer, "/api/scada/overview"), 503);
    console.log("PASS: Unaudited company modules fail closed when company workflow is enabled.");
  } finally {
    env.companyWorkflowEnabled = previous;
    guardedServer.close();
  }
}

void main();
