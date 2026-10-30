/** Synthetic in-memory verification; never operational records or database access. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
process.env.DATABASE_URL = ""; process.env.NODE_ENV = "test";
async function run() {
  const { createRiskDriversRepository } = await import("../data/riskRemainingRepository");
  const user = { id: "remaining-fixture-owner", name: "Fixture actor", role: "Engineer" as const, email: "remaining@example.invalid" };
  const scope = { pipelineId: "remaining-pipeline", methodologyVersionId: "remaining-method" };
  const item = { asOf: "2038-03-01T00:00:00Z", population: "Active official Risk_ID records", total: 2,
    summary: { total: 2, high: 0, medium: 0, low: 2, overdueReviews: 0 }, methodology: { id: scope.methodologyVersionId, methodologyId: "saved-method-id", name: "Saved methodology", version: "saved-version", likelihoodRuleVersion: "saved-likelihood", consequenceRuleVersion: "saved-consequence" }, matrix: { id: "saved-matrix", matrixId: "saved-matrix-business", name: "Saved matrix", version: "saved-matrix-version" }, rows: [], privateEngineering: "private-value-never-exposed" };
  const before = JSON.stringify(item); let called = false;
  const repo = createRiskDriversRepository(async (actor, filter) => { assert.equal(actor, user); assert.deepEqual(filter, scope); called = true; return { status: "available", reason: null, item } as any; });
  const response = await repo.read(user, scope);
  assert.ok(called); assert.equal(response.status, "partial"); assert.equal(response.drivers, null); assert.equal(response.context?.total, 2); assert.equal(response.context?.matrix.version, "saved-matrix-version"); assert.ok(!JSON.stringify(response).includes("private-value")); assert.equal(JSON.stringify(item), before);
  assert.equal((await createRiskDriversRepository(async () => { throw new Error("source unavailable"); }).read(user, scope)).context, null);
  const express = (await import("express")).default, { riskAssessmentsRouter } = await import("../routes/riskAssessments"), { store } = await import("../data/store"), { signToken } = await import("../lib/jwt");
  const original = store.findUserById; store.findUserById = async id => id === user.id ? { ...user, passwordHash: "fixture-only", createdAt: new Date().toISOString() } : null;
  const app = express(); app.use(express.json()); app.use("/api/risk-assessments", riskAssessmentsRouter); const server = createServer(app);
  try {
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve)); const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/risk-assessments`;
    const headers = { Authorization: `Bearer ${signToken({ sub: user.id, role: user.role, email: user.email })}`, "Content-Type": "application/json" };
    for (const path of ["drivers", "register", "history", "reporting"]) {
      assert.equal((await fetch(`${base}/${path}`)).status, 401); assert.equal((await fetch(`${base}/${path}?invented=true`, { headers })).status, 400);
      const read = await fetch(`${base}/${path}`, { headers }); assert.equal(read.headers.get("cache-control"), "private, no-store"); assert.equal(read.status, 200);
      for (const method of ["POST", "PATCH", "DELETE"]) assert.equal((await fetch(`${base}/${path}`, { method, headers, body: "{}" })).status, 423);
    }
  } finally { store.findUserById = original; await new Promise<void>(resolve => server.close(() => resolve())); }
  const { createRiskRegisterRepository } = await import("../data/riskRegisterRepository");
  const saved = { likelihood: 2, consequence: 2, score: 4, level: "saved-low" };
  const registerItem = { ...item, rows: [{ riskId: "fixture-risk", title: "Frozen title", pipelineId: scope.pipelineId, pipelineName: "Fixture pipeline", pipelineCode: "fixture-code", category: "saved-category", sourceCategory: "saved-source", status: "saved-open", inherent: { ...saved, likelihood: 3, score: 6 }, current: saved, residual: { ...saved, likelihood: 1, score: 2 }, revisionId: "fixture-revision", assessmentDate: "2038-01-01Z" }] };
  const metadata = [{ id: "fixture-record", riskId: "fixture-risk", pipelineId: scope.pipelineId, pipeline: { createdById: user.id }, currentApprovedRevisionId: "fixture-revision", currentApprovedRevision: { id: "fixture-revision", riskRecordId: "fixture-record", scopeScenarioSnapshot: { location: "Frozen location" } }, owner: { name: "Authoritative owner" }, segment: null, reviews: [{ riskRecordId: "fixture-record", revisionId: "fixture-revision", dueDate: new Date("2038-01-02Z"), completedAt: null }] }];
  let query: any;
  const register = createRiskRegisterRepository(async () => ({ status: "available", reason: null, item: registerItem } as any), () => async args => { query = args; return metadata; });
  const registered = await register.read(user, scope); assert.equal(registered.rows[0].ownerName, "Authoritative owner"); assert.equal(registered.rows[0].nextReview, "2038-01-02"); assert.equal(registered.rows[0].segmentLabel, "Frozen location"); assert.equal(registered.rows[0].linkedDefectId, null); assert.equal(query.where.pipeline.createdById, user.id);
  assert.deepEqual([registered.rows[0].inherent.score, registered.rows[0].current.score, registered.rows[0].residual.score], [6,4,2]);
  const missingMetadata = await createRiskRegisterRepository(async () => ({ status: "available", reason: null, item: registerItem } as any), () => async () => []).read(user, scope);
  assert.equal(missingMetadata.rows[0].riskId, "fixture-risk"); assert.equal(missingMetadata.rows[0].ownerName, null); assert.equal(missingMetadata.rows[0].nextReview, null); assert.match(missingMetadata.metadataReason!, /incomplete/);
  const emptyRegister = await createRiskRegisterRepository(async () => ({ status: "available", reason: null, item: { ...registerItem, rows: [] } } as any), () => async () => []).read(user, scope);
  assert.equal(emptyRegister.rows.length, 0); assert.equal(emptyRegister.metadataReason, null);
  metadata[0].pipeline.createdById = "other-owner"; const denied = await register.read(user, scope); assert.equal(denied.rows[0].ownerName, null); assert.ok(denied.metadataReason); assert.equal(denied.rows[0].riskId, "fixture-risk");
  const { createRiskHistoryRepository, historyScopeSchema } = await import("../data/riskHistoryRepository");
  const savedHistory: any = { riskId: "fixture-risk", revisionId: "fixture-revision", revisionNumber: 1, approvalStatus: "Approved", historical: true, assessmentDate: "2038-01-01Z", results: { inherent: registerItem.rows[0].inherent, current: saved, residual: registerItem.rows[0].residual }, methodology: item.methodology, matrix: item.matrix, reviews: [], history: [{ id: "event", kind: "Decision", label: "Saved approval", actorId: null, actorName: null, at: "2038-01-02Z", justification: "Saved evidence", reviewId: null }], sourceSnapshot: "private-snapshot-never-exposed" };
  const historyRepo = createRiskHistoryRepository(async () => ({ status: "available", reason: null, item } as any), { options: async (actor, filter) => { assert.equal(actor, user); assert.equal(filter.methodologyVersionId, scope.methodologyVersionId); return { status: "available", reason: null, items: [] }; }, detail: async () => ({ status: "available", reason: null, item: savedHistory }) });
  const historyBefore = JSON.stringify(savedHistory), historical = await historyRepo.read(user, { ...scope, riskId: "fixture-risk", revisionId: "fixture-revision" });
  assert.equal(historical.selected?.matrix.version, "saved-matrix-version"); assert.deepEqual([historical.selected?.results.inherent?.score,historical.selected?.results.current?.score,historical.selected?.results.residual?.score],[6,4,2]); assert.ok(!JSON.stringify(historical).includes("private-snapshot")); assert.equal(JSON.stringify(savedHistory), historyBefore);
  assert.equal((await historyRepo.read(user, { ...scope, riskId: "wrong-risk", revisionId: "fixture-revision" })).selected, null);
  assert.equal(historyScopeSchema.safeParse({ ...scope, riskId: "fixture-risk" }).success, false); assert.equal(historyScopeSchema.safeParse({ ...scope, dateRange: "unapproved" }).success, false);
  const { createRiskReportingRepository } = await import("../data/riskReportingRepository");
  const reporting = await createRiskReportingRepository(async (actor, filter) => { assert.equal(actor, user); assert.deepEqual(filter, scope); return { status: "available", reason: null, item } as any; }).read(user, scope);
  assert.equal(reporting.context?.total, 2); assert.equal(reporting.mutationsEnabled, false);
  for (const key of ["templates", "categories", "preview", "schedules", "recent"] as const) assert.equal(reporting[key], null);
  assert.equal(reporting.reportingRoute, "/report"); assert.ok(!JSON.stringify(reporting).includes("private-value")); assert.equal(JSON.stringify(item), before);
  console.log("Remaining Risk checks PASS: scoped official context delegation; no fabricated attribution; private-input exclusion; immutable inputs; authenticated strict GET and mutation locks. No database access.");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
