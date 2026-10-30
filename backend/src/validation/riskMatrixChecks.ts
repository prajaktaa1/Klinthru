/** Synthetic in-memory verification only. Never connected to operational storage. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import type { MethodologyRecord, RiskReadClient, RiskRecord } from "../types/riskAssessment";
import type { AuthUser } from "../types/domain";
process.env.DATABASE_URL = ""; process.env.NODE_ENV = "test";
const user: AuthUser = { id: "matrix-test-owner", name: "Test actor", role: "Engineer", email: "matrix@example.invalid" };
const policy = { activeStatuses: ["test-active"], highLevels: ["test-high"], mediumLevels: ["test-medium"], lowLevels: ["test-low"], categoryKeys: ["test-a", "test-b"], sourceCategories: ["test-source"], calendarTimeZone: "UTC", sourceCounting: "primary-source-per-risk", percentageRounding: "counts-only", reviewSelection: "earliest-open-current-revision", missingReview: "unavailable" };
const method = { id: "matrix-test-method", methodologyId: "test-method-identity", name: "Synthetic methodology", version: "saved-method-version", approvalStatus: "Approved", rules: policy,
  likelihoodRuleVersion: "saved-likelihood-version", consequenceRuleVersion: "saved-consequence-version",
  matrixVersion: { id: "matrix-test-version", matrixId: "test-matrix-identity", name: "Synthetic matrix", version: "saved-matrix-version", approvalStatus: "Approved",
    cells: Array.from({ length: 25 }, (_, i) => ({ likelihood: Math.floor(i / 5) + 1, consequence: i % 5 + 1, level: "test-low" })),
    likelihoodDictionary: Array.from({ length: 5 }, (_, i) => ({ level: i + 1, label: `Saved likelihood ${i + 1}` })), consequenceDictionary: Array.from({ length: 5 }, (_, i) => ({ level: i + 1, label: `Saved consequence ${i + 1}` })) } };
const result = (l: number, c: number) => ({ likelihood: l, consequence: c, score: l * c, level: "test-low" });
function record(index = 0): RiskRecord {
  const id = `matrix-test-record-${index}`, revisionId = `matrix-test-revision-${index}`;
  return { id, riskId: `matrix-test-risk-${index}`, title: "Live title must not replace snapshot", status: "test-active", pipelineId: "matrix-test-pipeline", currentApprovedRevisionId: revisionId,
    pipeline: { pipelineName: "Synthetic pipeline", pipelineCode: "test-code", createdById: user.id }, asset: null,
    currentApprovedRevision: { id: revisionId, riskRecordId: id, approvalStatus: "Approved", methodologyVersionId: method.id, matrixVersionId: method.matrixVersion.id, assessmentDate: new Date("2039-01-01Z"), approvedAt: new Date("2039-01-02Z"), category: index === 12 ? "test-b" : "test-a", primarySourceCategory: "test-source", inherentResult: result(5, 4), currentResult: result(3, 2), residualResult: result(1, 1), scopeScenarioSnapshot: { title: `Frozen synthetic title ${index}` }, sourceSnapshot: [{ sourceLinkId: "test-link", sourceModule: "test-module", sourceRecordType: "test-type", sourceRecordId: "test-source", sourceVersion: "saved-source-version", capturedAt: "2039-01-01T00:00:00Z", inputs: { privateEngineering: "must-not-be-exposed" }, contentHash: "test-snapshot-hash" }], dataSufficiency: "Sufficient" },
    reviews: [{ dueDate: new Date("2039-02-01Z"), completedAt: null, revisionId }] };
}
async function run() {
  const { buildRiskMatrix, createRiskMatrixRepository, matrixScopeSchema } = await import("../data/riskMatrixRepository");
  const records = Array.from({ length: 13 }, (_, i) => record(i));
  const before = JSON.stringify({ records, method });
  const response = buildRiskMatrix(records, method), item = response.item!;
  assert.equal(response.status, "available"); assert.equal(item.total, 13);
  for (const basis of ["inherent", "current", "residual"] as const) {
    assert.equal(item.distributions[basis].length, 25); assert.equal(item.distributions[basis].reduce((n, cell) => n + cell.count, 0), item.total);
    for (const cell of item.distributions[basis]) assert.equal(cell.count, item.rows.filter(row => row[basis].likelihood === cell.likelihood && row[basis].consequence === cell.consequence).length);
  }
  assert.equal(item.distributions.current.find(cell => cell.likelihood === 3 && cell.consequence === 2)?.count, 13);
  assert.equal(item.distributions.residual.find(cell => cell.likelihood === 1 && cell.consequence === 1)?.count, 13);
  assert.equal(item.matrix.version, "saved-matrix-version"); assert.equal(item.methodology.likelihoodRuleVersion, "saved-likelihood-version");
  assert.ok(!JSON.stringify(response).includes("must-not-be-exposed")); assert.equal(item.rows[0].title, "Frozen synthetic title 0");
  assert.equal(buildRiskMatrix(records, method, "test-b").item?.summary?.total, 1);
  assert.equal(buildRiskMatrix(records, method, "invented-category").item, null);
  assert.equal(buildRiskMatrix([], method).item?.total, 0);
  assert.equal(buildRiskMatrix([record(), record()], method).item, null);
  for (const change of [{ matrixVersionId: "new-matrix" }, { methodologyVersionId: "new-method" }, { approvalStatus: "Draft" }, { sourceSnapshot: [] }, { currentResult: result(6, 1) }, { currentResult: { ...result(3, 2), level: "unapproved" } }, { residualResult: null }]) {
    const invalid = record(); Object.assign(invalid.currentApprovedRevision!, change); assert.equal(buildRiskMatrix([invalid], method).item, null);
  }
  const changedMatrix = structuredClone(method); changedMatrix.matrixVersion.cells[0].level = "test-high";
  assert.equal(buildRiskMatrix(records, changedMatrix).item, null, "Changed matrix cannot silently reclassify saved residual results");
  assert.equal(buildRiskMatrix(records, { ...method, approvalStatus: "Draft" }).item, null);
  const missingDictionary = structuredClone(method); missingDictionary.matrixVersion.likelihoodDictionary = [];
  assert.equal(buildRiskMatrix(records, missingDictionary).item?.matrix.likelihoodDictionary, null);
  assert.equal(JSON.stringify({ records, method }), before, "All saved input objects remain immutable");
  let query: any;
  let population = records;
  const reader: RiskReadClient = { risk: { findMany: async args => { query = args; return population; } }, riskMethodologyVersion: { findFirst: async () => method, findMany: async () => [method] } };
  const repository = createRiskMatrixRepository(() => reader), scope = { pipelineId: "matrix-test-pipeline", methodologyVersionId: method.id };
  assert.equal((await repository.read(user, scope)).item?.total, 13);
  assert.equal(query.where.pipeline.createdById, user.id); assert.equal(query.where.pipelineId, scope.pipelineId); assert.equal(query.where.currentApprovedRevision.methodologyVersionId, method.id);
  population = [record()]; population[0].pipeline.createdById = "other-owner"; assert.equal((await repository.read(user, scope)).item, null);
  population = [record()]; population[0].pipelineId = "other-pipeline"; assert.equal((await repository.read(user, scope)).item, null);
  assert.equal((await createRiskMatrixRepository(() => null).read(user, scope)).item, null);
  assert.equal((await repository.read(user, {})).item, null);
  assert.equal(matrixScopeSchema.safeParse({ ...scope, dateRange: "invented" }).success, false);
  assert.equal(matrixScopeSchema.safeParse({ ...scope, category: "" }).success, false);
  const express = (await import("express")).default, { riskAssessmentsRouter } = await import("../routes/riskAssessments"), { store } = await import("../data/store"), { signToken } = await import("../lib/jwt");
  const original = store.findUserById; store.findUserById = async id => id === user.id ? { ...user, passwordHash: "test-only", createdAt: new Date().toISOString() } : null;
  const app = express(); app.use(express.json()); app.use("/api/risk-assessments", riskAssessmentsRouter); const server = createServer(app);
  try {
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve)); const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/risk-assessments/matrix`;
    const headers = { Authorization: `Bearer ${signToken({ sub: user.id, role: user.role, email: user.email })}`, "Content-Type": "application/json" };
    assert.equal((await fetch(base)).status, 401); assert.equal((await fetch(base + "?dateRange=unapproved", { headers })).status, 400);
    const read = await fetch(base, { headers }); assert.equal(read.status, 200); assert.equal(read.headers.get("cache-control"), "private, no-store"); assert.equal((await read.json() as { item: unknown }).item, null);
    for (const verb of ["POST", "PATCH", "PUT", "DELETE"]) assert.equal((await fetch(base, { method: verb, headers, body: "{}" })).status, 423);
  } finally { store.findUserById = original; await new Promise<void>(resolve => server.close(() => resolve())); }
  if (process.env.RISK_IMG05_TEST_ARTIFACTS === "1") {
    const fs = await import("node:fs"), path = await import("node:path"); const dir = path.resolve(__dirname, "../../../tmp/risk-img05-review"); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, "synthetic-matrix.json"), JSON.stringify(response));
  }
  console.log("IMG-05 backend PASS: three distinct saved bases, 25-cell reconciliation, exact version/dictionaries, category scope, snapshot privacy, immutability, duplicate rejection, owner/pipeline authorization, authenticated GET and mutation locks. Database disabled.");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
