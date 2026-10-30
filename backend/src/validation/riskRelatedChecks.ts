/** Synthetic local test fixtures only. Never operational data or seeded records. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import type { AuthUser } from "../types/domain";
import type { RelatedReader, RelatedRiskRecord, SourceReference, SourceResolver } from "../types/riskRelatedData";
process.env.DATABASE_URL = ""; process.env.NODE_ENV = "test";
const user: AuthUser = { id: "fixture-owner", role: "Engineer", email: "related@example.invalid", name: "Fixture user" };
const result = (likelihood: number) => ({ likelihood, consequence: 1, score: likelihood, level: `fixture-level-${likelihood}` });
const cells = Array.from({ length: 25 }, (_, i) => ({ likelihood: Math.floor(i / 5) + 1, consequence: i % 5 + 1, level: `fixture-level-${Math.floor(i / 5) + 1}` }));
function fixture(): RelatedRiskRecord {
  const sourceLinks: SourceReference[] = ["one", "two"].map((id, i) => ({ id, riskRecordId: "fixture-record", sourceModule: "ILI", sourceRecordType: "IliAnomaly", sourceRecordId: "fixture-source", sourceVersion: "fixture-version", relationship: i ? "Supporting" : "Primary", contributionType: i ? "Context" : "Likelihood", confidence: null, linkedById: user.id, linkedAt: new Date("2035-04-01Z"), retiredAt: null, retirementReason: null }));
  const revision = { id: "fixture-revision", riskRecordId: "fixture-record", approvalStatus: "Approved", approvedAt: new Date("2035-04-02Z"), category: "fixture-category", methodologyVersionId: "fixture-method", matrixVersionId: "fixture-matrix", scopeScenarioSnapshot: { title: "Frozen fixture title", location: "Fixture location", threatType: "Fixture threat" }, sourceSnapshot: sourceLinks.map(link => ({ sourceLinkId: link.id, sourceModule: link.sourceModule, sourceRecordType: link.sourceRecordType, sourceRecordId: link.sourceRecordId, sourceVersion: link.sourceVersion, capturedAt: "2035-04-02T00:00:00Z", inputs: { frozen: "Never substituted by live metadata" }, contentHash: "fixture-content-hash" })), inherentResult: result(5), currentResult: result(4), residualResult: result(2), methodologyVersion: { id: "fixture-method", approvalStatus: "Approved", matrixVersion: { id: "fixture-matrix", approvalStatus: "Approved", cells } } };
  return { id: "fixture-record", riskId: "fixture-risk", pipelineId: "fixture-pipeline", currentApprovedRevisionId: revision.id, status: "fixture-status", pipeline: { id: "fixture-pipeline", pipelineName: "Fixture pipeline", pipelineCode: "fixture-code", createdById: user.id }, sourceLinks, currentApprovedRevision: revision, revisions: [revision] };
}
async function run() {
  const { createRiskRelatedRepository, relatedScopeSchema } = await import("../data/riskRelatedRepository");
  let record = fixture(), query: unknown;
  const reader: RelatedReader = { findMany: async args => { query = args; return [record]; } };
  let calls = 0;
  const resolve: SourceResolver = async link => { calls++; return { status: "available", metadata: { canonicalId: link.sourceRecordId, displayId: "Fixture display ID", title: "Authorized live title", location: "Live fixture location", status: "Fixture source status", date: "2035-04-01T00:00:00Z", dateLabel: "Inspection Date", updatedAt: "2035-04-03T00:00:00Z", result: "Source result", version: link.sourceVersion, navigation: null } }; };
  const repo = createRiskRelatedRepository(() => reader, () => resolve);
  const scope = relatedScopeSchema.parse({ riskId: record.riskId, methodologyVersionId: "fixture-method", pipelineId: record.pipelineId });
  const original = JSON.stringify(record);
  const data = await repo.read(user, scope);
  assert.equal(data.status, "available"); assert.equal(data.total, 1); assert.equal(data.items.length, 1); assert.equal(calls, 1); assert.equal(data.items[0].links.length, 2);
  assert.equal(data.items[0].versionStatus, "matched"); assert.equal(data.items[0].freshness, "Unverified");
  assert.equal(data.risk?.title, "Frozen fixture title"); assert.equal(data.items[0].source?.title, "Authorized live title");
  assert.equal(data.risk?.inherent.likelihood, 5); assert.equal(data.risk?.current.likelihood, 4); assert.equal(data.risk?.residual.likelihood, 2);
  assert.equal(data.counts.find(c => c.group === "Defects")?.count, null, "Unprobed service is not zero");
  assert.ok(JSON.stringify(query).includes(user.id)); assert.equal(JSON.stringify(record), original, "No records/snapshots mutated");
  assert.equal((await repo.options(user, scope)).items.length, 1);
  assert.equal((await repo.read(user, { ...scope, q: "not-present" })).referenceTotal, 0);
  assert.equal((await repo.read(user, { ...scope, status: "not-present" })).items.length, 0);
  assert.equal((await repo.read(user, { ...scope, page: 2, pageSize: 1 })).items.length, 0);
  const denied: SourceResolver = async () => ({ status: "unavailable", reason: "Unavailable source/access" });
  const unavailable = await createRiskRelatedRepository(() => reader, () => denied).read(user, scope);
  assert.equal(unavailable.status, "available"); assert.equal(unavailable.total, null); assert.equal(unavailable.items[0].source, null); assert.equal(unavailable.counts.find(c => c.group === "ILI Anomalies")?.count, null);
  assert.equal((await createRiskRelatedRepository(() => reader, () => denied).read(user, { ...scope, q: "unknown-title" })).total, null, "Search over missing titles never establishes zero");
  const wrongId: SourceResolver = async (link, context) => { const value = await resolve(link, context); if (value.status === "available") value.metadata.canonicalId = "unauthorized-extra-id"; return value; };
  assert.equal((await createRiskRelatedRepository(() => reader, () => wrongId).read(user, scope)).items[0].source, null);
  const failed: SourceResolver = async () => { throw new Error("source failure"); };
  assert.ok((await createRiskRelatedRepository(() => reader, () => failed).read(user, scope)).risk);
  record.sourceLinks[0].sourceVersion = "changed-version"; assert.equal((await repo.read(user, scope)).risk, null);
  record = fixture(); record.pipeline.createdById = "other-owner"; assert.equal((await repo.read(user, scope)).risk, null);
  record = fixture(); record.currentApprovedRevision!.methodologyVersion.matrixVersion.id = "wrong-matrix"; assert.equal((await repo.read(user, scope)).risk, null);
  record = fixture(); record.currentApprovedRevision!.approvalStatus = "Draft"; assert.equal((await repo.read(user, scope)).risk, null);
  record = fixture(); record.currentApprovedRevisionId = "newer-pointer"; assert.equal((await repo.read(user, { ...scope, revisionId: "fixture-revision" })).risk?.historical, true);
  assert.equal((await repo.read(user, scope)).risk, null);
  record = fixture();
  // The same native record at two source versions remains one source-record count.
  record.sourceLinks[1].sourceVersion = "second-version";
  (record.currentApprovedRevision!.sourceSnapshot as any[])[1].sourceVersion = "second-version";
  const versions = await repo.read(user, scope);
  assert.equal(versions.referenceTotal, 2); assert.equal(versions.total, 1);
  assert.equal(versions.counts.find(c => c.group === "ILI Anomalies")?.count, 1);
  record = fixture();
  // Exercise the actual adapters through native module readers, all injected in memory.
  const iliModule = require("../ili/data"), cpModule = require("../cpMonitoring/data"), scadaModule = require("../utils/scadaData"), prismaModule = require("../lib/prisma");
  const originalReaders = [iliModule.listIliAnomaliesForPipeline, cpModule.getCpMonitoringData, scadaModule.getScadaOverview, prismaModule.getPrismaClient];
  try {
    let iliCalls = 0, docQuery: any;
    iliModule.listIliAnomaliesForPipeline = async (pipeline: string, actor: AuthUser) => { iliCalls++; assert.equal(pipeline, "fixture-pipeline"); assert.equal(actor, user); return { status: "available", data: [{ id: "fixture-source", pipelineId: pipeline, featureId: "native-feature", anomalyType: "Native type", kpKm: 1, location: null, depthMm: 1, depthPercent: null, inspectionDate: "2035-04-01T00:00:00Z", updatedAt: "2035-04-03T00:00:00Z" }] }; };
    cpModule.getCpMonitoringData = async () => ({ availability: { testPoints: { available: true } }, testPoints: [{ id: "native-cp", code: "native-code", name: null, location: null, kp: null, readingAt: null }] });
    scadaModule.getScadaOverview = async (pipeline: string, actor: AuthUser) => { assert.equal(actor, user); return { indicators: [{ id: "native-indicator", pipelineId: pipeline, indicatorId: "native-display", name: "Native indicator", measuredAt: "2035-04-01T00:00:00Z" }], events: [] }; };
    prismaModule.getPrismaClient = () => ({ managedDocument: { findFirst: async (args: any) => { docQuery = args; return { documentId: "native-document", documentNumber: null, title: "Native document", updatedAt: new Date("2035-04-03Z"), createdAt: new Date("2035-04-01Z"), versions: [{ documentVersionId: "native-version", revision: "native-revision", approvalStatus: "Approved", uploadedAt: new Date("2035-04-02Z") }] }; } } });
    const { createAuthoritativeRelatedResolver } = await import("../utils/riskRelatedSources");
    const native = createAuthoritativeRelatedResolver(), context = { pipelineId: "fixture-pipeline", user };
    const reference = fixture().sourceLinks[0];
    const a = await native(reference, context); assert.equal(a.status, "available");
    await native(reference, context); assert.equal(iliCalls, 1, "Request-local native reader cache");
    assert.equal((await native({ ...reference, sourceRecordId: "not-found" }, context)).status, "unavailable");
    assert.equal((await native({ ...reference, sourceModule: "CP", sourceRecordType: "CpTestPoint", sourceRecordId: "native-cp" }, context)).status, "available");
    assert.equal((await native({ ...reference, sourceModule: "SCADA", sourceRecordType: "ScadaIndicator", sourceRecordId: "native-indicator" }, context)).status, "available");
    const document = await native({ ...reference, sourceModule: "Documents", sourceRecordType: "ManagedDocument", sourceRecordId: "native-document", sourceVersion: "native-version" }, context);
    assert.equal(document.status, "available"); assert.ok(JSON.stringify(docQuery.where).includes(user.id), "Original Document Management authorization scope retained");
    assert.equal(docQuery.where.documentId, "native-document"); assert.ok(!JSON.stringify(docQuery).includes('"fileContent":true'));
    assert.equal((await native({ ...reference, sourceModule: "Defect Manager", sourceRecordType: "Defect" }, context)).status, "unavailable");
    assert.equal((await native({ ...reference, sourceModule: "Documents", sourceRecordType: "ManagedDocument", sourceRecordId: "native-document", sourceVersion: "missing-version" }, context)).status, "unavailable");
  } finally { [iliModule.listIliAnomaliesForPipeline, cpModule.getCpMonitoringData, scadaModule.getScadaOverview, prismaModule.getPrismaClient] = originalReaders; }
  assert.equal((await createRiskRelatedRepository(() => null).read(user, scope)).status, "schema-unavailable");
  for (const value of [{ ...scope, page: 0 }, { ...scope, unexpected: "x" }, { ...scope, pageSize: 51 }, { ...scope, module: "unregistered" }]) assert.equal(relatedScopeSchema.safeParse(value).success, false);
  // Real HTTP guards; test-only user lookup, no storage initialization or database.
  const express = (await import("express")).default;
  const { riskAssessmentsRouter } = await import("../routes/riskAssessments");
  const { store } = await import("../data/store"); const { signToken } = await import("../lib/jwt");
  const findUser = store.findUserById;
  store.findUserById = async id => id === user.id ? { ...user, passwordHash: "fixture-only", createdAt: new Date().toISOString() } : null;
  const app = express(); app.use(express.json()); app.use("/api/risk-assessments", riskAssessmentsRouter);
  const server = createServer(app);
  try {
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/risk-assessments/related-data`;
    const headers = { Authorization: `Bearer ${signToken({ sub: user.id, role: user.role, email: user.email })}`, "Content-Type": "application/json" };
    assert.equal((await fetch(base)).status, 401);
    assert.equal((await fetch(base, { headers })).status, 400);
    for (const url of [base + "/options", base + "?riskId=fixture-risk"]) { const response = await fetch(url, { headers }); assert.equal(response.status, 200); assert.equal((await response.json() as { status: string }).status, "schema-unavailable"); }
    for (const method of ["POST", "PATCH", "PUT", "DELETE"]) assert.equal((await fetch(base, { method, headers, body: "{}" })).status, 423);
  } finally { store.findUserById = findUser; await new Promise<void>(resolve => server.close(() => resolve())); }
  console.log("IMG-03 backend checks PASS: authorized approved scopes, frozen/live separation, source deduplication, isolated failures, version/matrix guards, filters, pagination, authenticated GETs and mutation locks. No database access.");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
