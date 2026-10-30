/** In-memory, synthetic fixtures only. No database, seed or operational task records. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import type { AuthUser } from "../types/domain";
import type { CentralAction, CentralActionGateway, TreatmentReadClient, TreatmentRecord, TreatmentRevisionRecord } from "../types/riskTreatment";
import { treatmentScopeSchema } from "./riskTreatmentValidation";
import { selectTreatmentRevision } from "../utils/riskTreatmentRules";
import { readCentralActionReferences } from "../utils/riskTreatmentActionReferences";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "";
const user: AuthUser = { id: "test-owner", name: "Test actor", role: "Engineer", email: "treatment-test@example.invalid" };
const result = (likelihood: number, level: string) => ({ likelihood, consequence: 1, score: likelihood, level });
const cells = Array.from({ length: 25 }, (_, i) => ({ likelihood: Math.floor(i / 5) + 1, consequence: i % 5 + 1, level: i === 10 ? "test-medium" : i === 15 ? "test-high" : "test-low" }));
function record(suffix = "a"): TreatmentRecord {
  const id = `test-treatment-record-${suffix}`, riskRecordId = `test-risk-record-${suffix}`, revisionId = `test-treatment-revision-${suffix}`;
  const revision: TreatmentRevisionRecord = { id: revisionId, treatmentId: id, riskRecordId, revisionNumber: 1, baselineRevisionId: `test-baseline-${suffix}`, state: "Draft", title: "Test strategy", description: "Test rationale", treatmentType: "test-control", controlReferences: [], proposedResidualResult: result(2, "test-low"), expectedBenefit: { label: "test-benefit" },
    costAmount: "9007199254740993.125", currency: "USD", costBasis: "test-basis", costCategory: "test-category", costEstimateDate: new Date("2033-03-02Z"), costSourceReference: null, implementationStart: null, implementationEnd: null,
    evidenceReferences: [], createdById: user.id, createdAt: new Date("2033-03-02Z"), submittedAt: null, contentHash: null,
    baselineRevision: { id: `test-baseline-${suffix}`, riskRecordId, approvalStatus: "Approved", approvedAt: new Date("2033-03-01Z"), methodologyVersionId: "test-method", matrixVersionId: "test-matrix", scopeScenarioSnapshot: { title: "Frozen test scenario" }, inherentResult: result(5, "test-low"), currentResult: result(4, "test-high"), residualResult: result(3, "test-medium"), methodologyVersion: { approvalStatus: "Approved", matrixVersion: { id: "test-matrix", approvalStatus: "Approved", cells } } },
    actionLinks: [{ id: `test-link-${suffix}`, riskRecordId, treatmentRevisionId: revisionId, actionId: "test-central-shared" }], alarpAssessments: [], events: [] };
  return { id, treatmentId: `test-business-treatment-${suffix}`, riskRecordId, currentApprovedRevisionId: null, risk: { id: riskRecordId, riskId: `test-business-risk-${suffix}`, title: "Editable root title", pipelineId: "test-pipeline", pipeline: { id: "test-pipeline", pipelineName: "Test pipeline", pipelineCode: "test-code", createdById: user.id } }, revisions: [revision] };
}
const centralAction: CentralAction = { actionId: "test-central-shared", title: "Test central task", status: "In Progress", ownerId: "test-assignee", ownerName: "Test assignee", dueDate: "2033-04-01", overdue: false, costAmount: "17.50", currency: "USD", asOf: "2033-03-02T00:00:00Z" };
const gateway: CentralActionGateway = { read: async ids => ({ status: "available", actions: ids.map(actionId => ({ ...centralAction, actionId })) }) };

async function run() {
  const { createRiskTreatmentRepository } = await import("../data/riskTreatmentRepository");
  let rows = [record(), record("b")], captured: any;
  const reader: TreatmentReadClient = { riskTreatment: { findMany: async args => { captured = args; return rows; }, findFirst: async () => rows[0] ?? null }, readUser: async () => ({ name: "Test actor" }) };
  const scope = treatmentScopeSchema.parse({ pipelineId: "test-pipeline", methodologyVersionId: "test-method" });
  const repository = createRiskTreatmentRepository(() => reader, gateway);
  const before = JSON.stringify(rows);
  const list = await repository.list(user, scope);
  assert.equal(list.status, "available"); assert.equal(list.total, 2);
  assert.equal(captured.where.risk.pipeline.createdById, user.id);
  assert.equal(captured.where.risk.pipelineId, "test-pipeline");
  assert.equal(list.actions.total, 1, "A shared central action must not be duplicated across treatments");
  assert.equal(list.actions.items[0].treatmentLinks.length, 2);
  assert.equal(list.items[0].riskTitle, "Frozen test scenario");
  const summary = await repository.summary(user, scope);
  assert.equal(summary.actions.total, 1); assert.equal(summary.cost.amount, null); assert.equal(summary.reduction.percent, null); assert.equal(summary.alarp.outcome, null);
  const detail = await repository.detail(user, rows[0].treatmentId, rows[0].revisions[0].id);
  assert.equal(detail.item?.current.level, "test-high");
  assert.equal(detail.item?.residual.proposed?.level, "test-low");
  assert.equal(detail.item?.residual.approved, null); assert.equal(detail.item?.residual.verified, null);
  assert.equal(detail.item?.estimatedCost.amount, "9007199254740993.125");
  assert.equal(detail.item?.workflow[0].actorName, "Test actor");
  assert.equal(JSON.stringify(rows), before, "Reads must not mutate records or results");
  assert.equal((await createRiskTreatmentRepository(() => reader).list(user, scope)).actions.total, null);
  assert.equal((await createRiskTreatmentRepository(() => null).list(user, scope)).total, null);
  assert.equal((await repository.list(user, { ...scope, basis: "verified" })).status, "approval-needed");
  assert.equal((await repository.list(user, { ...scope, methodologyVersionId: undefined })).total, null);
  const current = rows[0];
  current.currentApprovedRevisionId = current.revisions[0].id;
  assert.equal(selectTreatmentRevision(current, "approved"), null, "A draft pointer must not become an approved forecast");
  current.revisions[0].state = "Approved"; current.revisions[0].submittedAt = new Date("2033-03-02Z"); current.revisions[0].contentHash = "test-content-hash";
  assert.equal((await repository.detail(user, current.treatmentId)).item?.residual.approved?.level, "test-low");
  const completeGateway: CentralActionGateway = { read: async () => ({ status: "available", actions: [{ ...centralAction, status: "Closed" }] }) };
  assert.equal((await createRiskTreatmentRepository(() => reader, completeGateway).detail(user, current.treatmentId)).item?.residual.verified, null, "Task completion never verifies residual risk");
  assert.equal((await repository.list(user, { ...scope, q: "absent" })).actions.total, 0);
  assert.equal((await repository.list(user, { ...scope, status: "Open" })).actions.total, 0);
  const badGateway: CentralActionGateway = { read: async () => ({ status: "available", actions: [{ ...centralAction, actionId: "unrequested-action" }] }) };
  assert.equal((await readCentralActionReferences([centralAction.actionId], user, badGateway)).status, "unavailable");
  const duplicateGateway: CentralActionGateway = { read: async () => ({ status: "available", actions: [centralAction, centralAction] }) };
  assert.equal((await readCentralActionReferences([centralAction.actionId], user, duplicateGateway)).status, "unavailable");
  assert.equal(treatmentScopeSchema.safeParse({ page: 0 }).success, false);
  assert.equal(treatmentScopeSchema.safeParse({ unrecognized: "x" }).success, false);
  rows = [record()]; rows[0].risk.pipeline.createdById = "another-owner";
  assert.equal((await repository.list(user, scope)).total, null);
  rows = [record()]; rows[0].revisions[0].baselineRevision.riskRecordId = "another-risk";
  assert.equal((await repository.detail(user, rows[0].treatmentId)).item, null);
  rows = [record()]; rows[0].revisions[0].actionLinks.push(rows[0].revisions[0].actionLinks[0]);
  assert.equal((await repository.list(user, scope)).total, null);

  const express = (await import("express")).default;
  const { riskAssessmentsRouter } = await import("../routes/riskAssessments");
  const { store } = await import("../data/store");
  const { signToken } = await import("../lib/jwt");
  const original = store.findUserById;
  store.findUserById = async id => id === user.id ? { ...user, passwordHash: "test-only", createdAt: new Date().toISOString() } : null;
  const app = express(); app.use(express.json()); app.use("/api/risk-assessments", riskAssessmentsRouter);
  const server = createServer(app);
  try {
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/risk-assessments/treatments`;
    assert.equal((await fetch(base)).status, 401);
    const headers = { Authorization: `Bearer ${signToken({ sub: user.id, role: user.role, email: user.email })}`, "Content-Type": "application/json" };
    for (const path of ["", "/summary", "/test-treatment", "/test-treatment/action-references"]) {
      const response = await fetch(base + path, { headers }); assert.equal(response.status, 200);
      const body = await response.json() as { status: string }; assert.equal(body.status, "schema-unavailable");
    }
    assert.equal((await fetch(base + "?page=0", { headers })).status, 400);
    assert.equal((await fetch(base + "/test?unexpected=value", { headers })).status, 400);
    for (const method of ["POST", "PATCH", "PUT", "DELETE"]) assert.equal((await fetch(base + "/test", { method, headers, body: "{}" })).status, 423);
  } finally { store.findUserById = original; await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
  console.log("IMG-02 backend checks passed: scoped/versioned reads; central Action_ID deduplication; independent forecasts; no automatic verification; exact money; missing integrations; HTTP auth/read-only locks. No database access.");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
