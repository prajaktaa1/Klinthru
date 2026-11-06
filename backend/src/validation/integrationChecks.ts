import assert from "node:assert/strict";

import { calculateIntegrationSummary, canManageIntegrations, canTestIntegrations, sanitizeEvent, serializeConnector } from "../integrations/service";
import { RestConnectorAdapter } from "../integrations/connectorAdapter";
import { redactSensitive, testRestConnector, validateRestUrl } from "../integrations/security";
import { mergeConnectorConfiguration, validateConnectorInput, validateConnectorPatch, validateConnectorScope } from "../integrations/validation";
import { ConnectorRecord, IntegrationEventRecord } from "../integrations/types";
import { validateManualRecord } from "../integrations/manualRecords";

function connector(overrides: Partial<ConnectorRecord> = {}): ConnectorRecord {
  return {
    id: "connector-1",
    name: "Inspection API",
    connectorType: "REST",
    enabled: true,
    status: "Ready",
    endpoint: "https://api.example.com/inspection",
    configuration: { region: "apac" },
    secretReference: "vault://integration/inspection",
    secretConfigured: true,
    lastTestedAt: null,
    lastSuccessfulTestAt: null,
    lastFailureAt: null,
    lastFailureCode: null,
    lastFailureMessage: null,
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    updatedAt: new Date("2026-09-01T00:00:00.000Z"),
    authorId: "user-1",
    ...overrides
  };
}

async function run() {
  const manual = validateManualRecord({ module: "Data Mapping", name: " Pipe ID ", status: "Active", details: { sourceField: "Pipe_ID", targetField: "Asset ID" } });
  assert.equal(manual.name, "Pipe ID");
  assert.throws(() => validateManualRecord({ module: "Unknown", name: "Bad", details: {} }));
  assert.throws(() => validateManualRecord({ module: "Scheduler", name: "Unsafe", details: { apiKey: "secret" } }));
  assert.throws(() => validateManualRecord({ module: "Scheduler", name: "Unsafe", details: JSON.parse('{"__proto__":"bad"}') }));
  assert.equal(canManageIntegrations("Admin"), true);
  assert.equal(canManageIntegrations("Engineer"), false);
  assert.equal(canManageIntegrations("Viewer"), false);
  assert.equal(canTestIntegrations("Admin"), true);
  assert.equal(canTestIntegrations("Engineer"), true);
  assert.equal(canTestIntegrations("Viewer"), false);

  const scopeContext = { userId: "user-1", role: "Engineer" as const, companyId: "company-1", pipeline: { id: "pipeline-1", createdById: "user-1", companyId: "company-1",creatorCompanyId:"company-1",companyRecordId:"company-1" }, asset: { id: "asset-1", pipelineId: "pipeline-1" } };
  assert.deepEqual(validateConnectorScope({ pipelineId: "pipeline-1", assetId: "asset-1" }, scopeContext), { companyId: "company-1", pipelineId: "pipeline-1", assetId: "asset-1" });
  assert.throws(() => validateConnectorScope({ pipelineId: "pipeline-1", assetId: "asset-other" }, scopeContext));
  assert.throws(() => validateConnectorScope({ pipelineId: "pipeline-other" }, scopeContext));
  assert.throws(() => validateConnectorScope({ pipelineId: "pipeline-1" }, { ...scopeContext, companyId: "company-other" }));
  assert.throws(() => validateConnectorScope({ pipelineId: "pipeline-1" }, { ...scopeContext, companyId: undefined }));

  assert.equal(validateConnectorInput({ name: " REST ", endpoint: "https://api.example.com/status" }).name, "REST");
  assert.throws(() => validateRestUrl("file:///etc/passwd"));
  assert.throws(() => validateRestUrl("https://token:secret@example.com"));
  assert.throws(() => validateConnectorInput({ name: "Unsafe", endpoint: "https://api.example.com", configuration: { authorization: "Bearer secret" } }));
  assert.throws(() => validateConnectorPatch({}));
  const metadata = validateConnectorPatch({ configuration: { integrationMetadata: { sourceSystem: " Verified REST ", protocol: "REST", environment: "Production", dataDomains: ["Operational Data"] } } }).configuration!;
  assert.equal((metadata.integrationMetadata as Record<string, unknown>).sourceSystem, "Verified REST");
  for (const value of [{ protocol: "OPC UA" }, { environment: "Invented" }, { dataDomains: ["Repeated", "Repeated"] }, { configurationVersion: 99 }, { password: "secret" }, { sourceSystem: 3 }, { targetModules: [""] }]) {
    assert.throws(() => validateConnectorPatch({ configuration: { integrationMetadata: value } }));
  }
  const old = { token: "legacy-secret", nested: { untouched: true }, integrationMetadata: { owner: "Existing Team", unknownLegacyKey: "preserved", configurationVersion: 2 } };
  const next = mergeConnectorConfiguration(old, metadata)!;
  assert.equal(next.token, old.token);
  assert.deepEqual(next.nested, old.nested);
  assert.deepEqual(old.integrationMetadata, { owner: "Existing Team", unknownLegacyKey: "preserved", configurationVersion: 2 });
  assert.equal((next.integrationMetadata as Record<string, unknown>).owner, "Existing Team");
  assert.equal((next.integrationMetadata as Record<string, unknown>).unknownLegacyKey, "preserved");
  assert.equal((next.integrationMetadata as Record<string, unknown>).configurationVersion, 3);
  assert.equal((mergeConnectorConfiguration(next, metadata)!.integrationMetadata as Record<string, unknown>).configurationVersion, 3);
  assert.equal((mergeConnectorConfiguration(next, { integrationMetadata: { sourceSystem: null } })!.integrationMetadata as Record<string, unknown>).sourceSystem, null);
  assert.equal(mergeConnectorConfiguration(old, undefined), undefined);
  assert.throws(() => mergeConnectorConfiguration({ integrationMetadata: "legacy" }, metadata));
  assert.throws(() => mergeConnectorConfiguration([], metadata));
  assert.throws(() => mergeConnectorConfiguration({ integrationMetadata: { configurationVersion: -1 } }, metadata));

  const blocked = await testRestConnector("http://127.0.0.1:4000", { fetchImpl: async () => new Response("unexpected") });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.errorCode, "SSRF_BLOCKED");

  const redirectBlocked = await testRestConnector("https://public.example.com", {
    resolveHostname: async () => ["203.0.113.10"],
    fetchImpl: async () => new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest/meta-data" } })
  });
  assert.equal(redirectBlocked.ok, false);
  assert.equal(redirectBlocked.errorCode, "SSRF_BLOCKED");

  const success = await testRestConnector("https://public.example.com", {
    resolveHostname: async () => ["203.0.113.10"],
    fetchImpl: async () => new Response("ok", { status: 200 })
  });
  assert.equal(success.ok, true);
  assert.equal(success.statusCode, 200);
  const adapter = new RestConnectorAdapter({ resolveHostname: async () => ["203.0.113.10"], fetchImpl: async () => new Response(null, { status: 204 }) });
  assert.equal((await adapter.test({ connectorType: "REST", endpoint: "https://public.example.com" })).statusCode, 204);

  const redacted = redactSensitive({ authorization: "Bearer top-secret", metadata: { apiKey: "abc", safe: "visible" } }) as Record<string, unknown>;
  assert.equal(redacted.authorization, "[REDACTED]");
  assert.deepEqual(redacted.metadata, { apiKey: "[REDACTED]", safe: "visible" });
  assert.equal(serializeConnector(connector({ endpoint: "https://user:pass@example.com/api?token=hidden", configuration: { token: "hidden" }, lastFailureMessage: "Authorization: Bearer hidden" })).endpoint, "https://example.com/api?token=%5BREDACTED%5D");
  assert.equal(sanitizeEvent({ connectorId: "connector-1", operation: "Test", outcome: "Failure", errorCode: "HTTP_ERROR", errorMessage: "token=hidden", durationMs: -4, itemCount: -2, authorId: "user-1" }).errorMessage, "token=[REDACTED]");
  for (const [raw, normalized] of [[17.4, 17], [-4, 0], [300000.6, 300000]]) {
    const input = { connectorId: "connector-1", operation: "Test" as const, outcome: "Success" as const, errorCode: null, errorMessage: null, durationMs: raw, itemCount: null, authorId: "user-1" };
    assert.equal(sanitizeEvent(input).durationMs, normalized);
    assert.equal(input.durationMs, raw);
  }

  const now = new Date("2026-09-02T12:00:00.000Z");
  const connectors = [
    connector({ id: "active", lastSuccessfulTestAt: new Date("2026-09-02T11:00:00.000Z") }),
    connector({ id: "disabled", enabled: false, status: "Disabled" })
  ];
  const events: IntegrationEventRecord[] = [
    { id: "recent", connectorId: "active", operation: "Test", outcome: "Failure", errorCode: "HTTP_ERROR", errorMessage: "HTTP 500", durationMs: 100, itemCount: null, createdAt: new Date("2026-09-02T11:30:00.000Z"), authorId: "user-1" },
    { id: "old", connectorId: "active", operation: "Test", outcome: "Failure", errorCode: "HTTP_ERROR", errorMessage: "HTTP 500", durationMs: 100, itemCount: null, createdAt: new Date("2026-08-30T11:30:00.000Z"), authorId: "user-1" }
  ];
  assert.deepEqual(calculateIntegrationSummary(connectors, events, now), {
    activeConnectors: 1,
    latestSuccessfulTestAt: "2026-09-02T11:00:00.000Z",
    failuresLast24Hours: 1,
    uptime: null,
    throughput: null
  });

  console.log("Integration checks passed.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
