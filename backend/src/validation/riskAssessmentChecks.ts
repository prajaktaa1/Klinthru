/** Synthetic in-memory test fixtures only. No app records, seeds or database access. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { buildOfficialOverview, reviewDaysLeft } from "../utils/riskAssessmentRules";
import { riskMatrixSchema, riskPolicySchema, assertDraftEditable } from "./riskAssessmentValidation";
import { assertRiskScopeLinks } from "../utils/riskSourceResolver";
import type { MethodologyRecord, RiskReadClient, RiskRecord } from "../types/riskAssessment";
import type { AuthUser } from "../types/domain";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "";

const policy = { activeStatuses: ["test-active"], highLevels: ["test-high"], mediumLevels: ["test-medium"], lowLevels: ["test-low"],
  categoryKeys: ["test-category"], sourceCategories: ["test-source"], calendarTimeZone: "Asia/Calcutta", sourceCounting: "primary-source-per-risk", percentageRounding: "counts-only", reviewSelection: "earliest-open-current-revision", missingReview: "unavailable" };
const cells = Array.from({ length: 25 }, (_, index) => ({ likelihood: Math.floor(index / 5) + 1, consequence: index % 5 + 1, level: "test-low" }));
const methodology: MethodologyRecord = { id: "test-method", methodologyId: "test-identity", version: "test-version", name: "Test only", approvalStatus: "Approved", rules: policy,
  matrixVersion: { id: "test-matrix", approvalStatus: "Approved", cells } };
const user: AuthUser = { id: "test-owner", name: "Test only", role: "Engineer", email: "risk-check@example.invalid" };
const result = (likelihood: number, consequence: number) => ({ likelihood, consequence, score: likelihood * consequence, level: "test-low" });
function record(): RiskRecord {
  return { id: "test-record", riskId: "test-only-identity", title: "Changed root title", status: "test-active", pipelineId: "test-pipeline", currentApprovedRevisionId: "test-revision",
    pipeline: { pipelineName: "Test only", pipelineCode: "test-code", createdById: user.id }, asset: null,
    currentApprovedRevision: { id: "test-revision", riskRecordId: "test-record", approvalStatus: "Approved", methodologyVersionId: methodology.id, matrixVersionId: "test-matrix",
      assessmentDate: new Date("2031-02-01T00:00:00Z"), approvedAt: new Date("2031-02-02T00:00:00Z"), category: "test-category", primarySourceCategory: "test-source",
      inherentResult: result(2, 2), currentResult: result(2, 1), residualResult: result(1, 1), scopeScenarioSnapshot: { title: "Frozen approved title" },
      sourceSnapshot: [{ sourceLinkId: "test-link", sourceModule: "test-module", sourceRecordType: "test-type", sourceRecordId: "test-source", sourceVersion: null,
        capturedAt: "2031-02-01T00:00:00Z", inputs: { testIndicator: "test-input" }, contentHash: "test-hash" }], dataSufficiency: "Sufficient" },
    reviews: [{ dueDate: new Date("2031-02-03T00:00:00Z"), completedAt: null, revisionId: "test-revision" }] };
}

async function run() {
  const asOf = new Date("2031-02-03T20:00:00Z"); // Next local calendar date in the test policy.
  const overview = buildOfficialOverview([record()], methodology, asOf);
  assert.equal(overview.status, "available");
  assert.deepEqual(overview.summary, { total: 1, high: 0, medium: 0, low: 1, overdueReviews: 1 });
  assert.deepEqual(overview.reviews, [], "Overdue reviews must not appear in Upcoming Reviews");
  const todayReview = record(); todayReview.id = "test-today"; todayReview.riskId = "test-today-id";
  todayReview.currentApprovedRevision = { ...todayReview.currentApprovedRevision!, id: "test-today-revision", riskRecordId: todayReview.id };
  todayReview.currentApprovedRevisionId = "test-today-revision";
  todayReview.reviews[0] = { dueDate: new Date("2031-02-04T00:00:00Z"), completedAt: null, revisionId: "test-today-revision" };
  const futureReview = record(); futureReview.id = "test-future"; futureReview.riskId = "test-future-id";
  futureReview.currentApprovedRevision = { ...futureReview.currentApprovedRevision!, id: "test-future-revision", riskRecordId: futureReview.id };
  futureReview.currentApprovedRevisionId = "test-future-revision";
  futureReview.reviews[0] = { dueDate: new Date("2031-02-07T00:00:00Z"), completedAt: null, revisionId: "test-future-revision" };
  const upcoming = buildOfficialOverview([futureReview, record(), todayReview], methodology, asOf);
  assert.equal(upcoming.summary?.overdueReviews, 1);
  assert.deepEqual(upcoming.reviews.map(review => [review.riskId, review.daysLeft, review.dueDate]), [
    ["test-today-id", 0, "2031-02-04T00:00:00.000Z"], ["test-future-id", 3, "2031-02-07T00:00:00.000Z"]
  ]);
  assert.equal(overview.latest[0].title, "Frozen approved title");
  assert.deepEqual([overview.latest[0].inherent.score, overview.latest[0].current.score, overview.latest[0].residual.score], [4, 2, 1]);
  for (const values of [overview.matrix, overview.byPipeline, overview.byCategory, overview.bySource, overview.byStatus]) assert.equal(values.reduce((sum, value) => sum + value.count, 0), 1);
  assert.equal(buildOfficialOverview([], methodology).summary?.total, 0); // Verified empty population, unlike unavailable schema.
  assert.equal(reviewDaysLeft(new Date("2031-02-04T00:00:00Z"), asOf, riskPolicySchema.parse(policy)), 0);
  assert.equal(reviewDaysLeft(new Date("2031-02-03T00:00:00Z"), asOf, riskPolicySchema.parse({ ...policy, calendarTimeZone: "America/Los_Angeles" })), 0);
  assert.equal(buildOfficialOverview([record(), record()], methodology).status, "approval-needed");
  assert.equal(buildOfficialOverview([record()], { ...methodology, rules: {} }).summary, null);
  assert.equal(buildOfficialOverview([record()], { ...methodology, approvalStatus: "Draft" }).summary, null);
  assert.equal(riskMatrixSchema.safeParse([...cells.slice(1), cells[1]]).success, false);
  assert.equal(riskPolicySchema.safeParse({ ...policy, highLevels: ["test-low"] }).success, false);
  for (const change of [
    { approvalStatus: "Draft" }, { matrixVersionId: "different" }, { riskRecordId: "different" }, { sourceSnapshot: [] }, { dataSufficiency: "Unknown" },
    { currentResult: { ...result(2, 1), score: 25 } }, { currentResult: { ...result(2, 1), level: "invented" } }
  ]) {
    const invalid = record(); Object.assign(invalid.currentApprovedRevision!, change);
    assert.equal(buildOfficialOverview([invalid], methodology).summary, null);
  }
  const closed = record(); closed.status = "test-inactive";
  assert.equal(buildOfficialOverview([closed], methodology).summary?.total, 0);
  const missingReview = record(); missingReview.reviews = [];
  assert.equal(buildOfficialOverview([missingReview], methodology).summary, null);
  const another = record(); another.id = "test-second"; another.riskId = "test-second-id"; another.pipelineId = "test-second-pipeline";
  another.currentApprovedRevision = { ...another.currentApprovedRevision!, id: "test-second-revision", riskRecordId: another.id };
  another.currentApprovedRevisionId = "test-second-revision";
  another.reviews[0].revisionId = "test-second-revision";
  assert.equal(buildOfficialOverview([record(), another], methodology).byPipeline.length, 2);
  assert.throws(() => assertDraftEditable({ approvalStatus: "Approved", approvedAt: new Date() }));
  assert.throws(() => assertDraftEditable({ approvalStatus: "Under Review", approvedAt: null }));
  assert.doesNotThrow(() => assertDraftEditable({ approvalStatus: "Draft", approvedAt: null }));
  assert.throws(() => assertRiskScopeLinks(user, { id: "test-pipeline", createdById: "another-owner" }));
  assert.throws(() => assertRiskScopeLinks(user, { id: "test-pipeline", createdById: user.id }, { id: "test-segment", pipelineId: "another-pipeline" }));

  // Dependency injection validates query scoping without ever opening Prisma.
  const { createRiskReadRepository } = await import("../data/riskAssessmentRepository");
  let captured: any;
  const reader: RiskReadClient = { risk: { findMany: async args => { captured = args; return [record()]; } },
    riskMethodologyVersion: { findMany: async () => [methodology], findFirst: async () => methodology } };
  const repository = createRiskReadRepository(() => reader);
  await repository.overview(user, { pipelineId: "test-pipeline", methodologyVersionId: methodology.id });
  assert.equal(captured.where.pipeline.createdById, user.id);
  assert.equal(captured.where.pipelineId, "test-pipeline");
  assert.equal(captured.where.currentApprovedRevision.methodologyVersionId, methodology.id);
  assert.equal((await createRiskReadRepository(() => null).overview(user, {})).summary, null);

  // HTTP verification: mock only user lookup, never initialize/seed storage.
  const express = (await import("express")).default;
  const { riskAssessmentsRouter } = await import("../routes/riskAssessments");
  const { store } = await import("../data/store");
  const { signToken } = await import("../lib/jwt");
  const originalLookup = store.findUserById;
  store.findUserById = async id => id === user.id ? { ...user, passwordHash: "test-only", createdAt: new Date().toISOString() } : null;
  const app = express(); app.use(express.json()); app.use("/api/risk-assessments", riskAssessmentsRouter);
  const server = createServer(app);
  try {
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/risk-assessments`;
    const anonymous = await fetch(`${base}/overview`);
    assert.equal(anonymous.status, 401);
    assert.equal(anonymous.headers.get("cache-control"), "private, no-store");
    const token = signToken({ sub: user.id, role: user.role, email: user.email });
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    for (const [method, path] of [["POST", "/risks"], ["POST", "/risks/test/source-links"], ["POST", "/risks/test/assessments"], ["PATCH", "/revisions/test"], ["POST", "/revisions/test/submit"], ["POST", "/revisions/test/decisions"], ["DELETE", "/risks/test"]]) {
      const locked = await fetch(base + path, { method, headers, body: "{}" });
      assert.equal(locked.status, 423);
      assert.equal(locked.headers.get("cache-control"), "private, no-store");
    }
    const response = await fetch(`${base}/overview`, { headers });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const body = await response.json() as { status: string; summary: unknown };
    assert.equal(body.status, "schema-unavailable"); assert.equal(body.summary, null);
    const invalid = await fetch(`${base}/overview?unexpected=value`, { headers });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.headers.get("cache-control"), "private, no-store");
    for (const path of ["/methodologies", "/readiness", "/treatments", "/treatments/summary", "/treatments/missing", "/treatments/missing/action-references"]) {
      const read = await fetch(base + path, { headers });
      assert.equal(read.status, 200);
      assert.equal(read.headers.get("cache-control"), "private, no-store");
    }
    const unsupported = await fetch(`${base}/risks`, { headers });
    assert.equal(unsupported.status, 501);
    assert.equal(unsupported.headers.get("cache-control"), "private, no-store");
    const diagnostic = await unsupported.json() as { message: string };
    assert.ok(diagnostic.message.includes("read endpoint is not implemented"));
    assert.ok(!diagnostic.message.includes("only IMG-01"));
  } finally {
    store.findUserById = originalLookup;
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
  console.log("Risk foundation checks passed: official-only reconciliation; version/snapshot guards; separated results; date boundaries; scoped reads; authenticated mutation locks. No database access.");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
