/** Synthetic in-memory records only. No operational database or connector requests. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import type { ConfigurationReader } from "../data/riskConfigurationRepository";
import type { AuthUser } from "../types/domain";
process.env.DATABASE_URL = ""; process.env.NODE_ENV = "test";
const user: AuthUser = { id: "config-fixture-owner", role: "Engineer", name: "Fixture actor", email: "configuration@example.invalid" };
function fixture() {
  return { id: "config-fixture-method", methodologyId: "fixture-method-business-id", name: "Frozen fixture methodology", version: "fixture-method-version", approvalStatus: "Approved", approvedAt: new Date("2038-02-02Z"), matrixVersionId: "config-fixture-matrix", likelihoodRuleVersion: "fixture-likelihood-version", consequenceRuleVersion: "fixture-consequence-version",
    rules: { activeStatuses: ["fixture-active"], highLevels: ["fixture-high"], mediumLevels: ["fixture-medium"], lowLevels: ["fixture-low"], categoryKeys: ["fixture-category"], sourceCategories: ["fixture-source"], calendarTimeZone: "UTC", sourceCounting: "primary-source-per-risk", percentageRounding: "counts-only", reviewSelection: "earliest-open-current-revision", missingReview: "unavailable" },
    matrixVersion: { id: "config-fixture-matrix", matrixId: "fixture-matrix-business-id", name: "Frozen fixture matrix", version: "fixture-matrix-version", approvalStatus: "Approved", approvedAt: new Date("2038-02-01Z"),
      cells: Array.from({ length: 25 }, (_, i) => ({ likelihood: Math.floor(i / 5) + 1, consequence: i % 5 + 1, level: "fixture-low" })),
      likelihoodDictionary: Array.from({ length: 5 }, (_, i) => ({ level: i + 1, label: `Frozen likelihood ${i + 1}` })), consequenceDictionary: Array.from({ length: 5 }, (_, i) => ({ level: i + 1, label: `Frozen consequence ${i + 1}` })) } };
}
function reviewFixture() {
  return { id: "fixture-risk-record", riskId: "fixture-business-risk", pipelineId: "fixture-pipeline", pipeline: { createdById: user.id }, currentApprovedRevisionId: "fixture-risk-revision",
    currentApprovedRevision: { id: "fixture-risk-revision", riskRecordId: "fixture-risk-record", methodologyVersionId: "config-fixture-method", matrixVersionId: "config-fixture-matrix", approvalStatus: "Approved", approvedAt: new Date("2038-02-03Z") },
    reviews: [{ id: "fixture-review", riskRecordId: "fixture-risk-record", revisionId: "fixture-risk-revision", dueDate: new Date("2038-05-02Z"), purpose: "Saved fixture review purpose", completedAt: null as Date | null }, { id: "fixture-historical-review", riskRecordId: "fixture-risk-record", revisionId: "old-revision", dueDate: new Date("2037-01-01Z"), purpose: "Historical review must not enter current list", completedAt: null as Date | null }] };
}
async function run() {
  const { createRiskConfigurationRepository, configurationScopeSchema, riskConfigurationRepository } = await import("../data/riskConfigurationRepository");
  let method: any = fixture(), reviews: any[] = [reviewFixture()], connectorOwner = user.id, pipelineOwner = user.id;
  let methodQuery: any, pipelineQuery: any, reviewQuery: any, connectorQuery: any;
  const connector = { id: "fixture-connector", name: "Native fixture connector", authorId: user.id, enabled: true, status: "Ready", lastTestedAt: new Date("2038-02-05Z"), lastSuccessfulTestAt: new Date("2038-02-04Z"), endpoint: "private-endpoint-must-not-leak", configuration: { secret: "private-config-must-not-leak" }, secretReference: "private-reference-must-not-leak" };
  const reader: ConfigurationReader = { method: async args => { methodQuery = args; return method; }, pipeline: async args => { pipelineQuery = args; return { id: "fixture-pipeline", createdById: pipelineOwner }; },
    reviews: async args => { reviewQuery = args; return reviews; }, connectors: async args => { connectorQuery = args; return [{ ...connector, authorId: connectorOwner }]; } };
  const repository = createRiskConfigurationRepository(() => reader), scope = { pipelineId: "fixture-pipeline", methodologyVersionId: "config-fixture-method" };
  const before = JSON.stringify({ method, reviews, connector });
  const response = await repository.read(user, scope), item = response.item!;
  assert.equal(response.status, "available"); assert.equal(item.verification, "incomplete");
  assert.equal(item.methodology.methodologyId, method.methodologyId); assert.equal(item.methodology.likelihoodRuleVersion, method.likelihoodRuleVersion); assert.equal(item.matrix.version, method.matrixVersion.version);
  assert.equal(item.matrix.cells?.length, 25); assert.ok(item.matrix.cells?.every(cell => !('score' in cell) && !('count' in cell) && !('color' in cell)), "No invented scores/colors or risk-count cells");
  assert.equal(item.matrix.likelihoodDictionary?.[0].label, "Frozen likelihood 1"); assert.deepEqual(item.categories, ["fixture-category"]);
  assert.equal(item.reviews.items.length, 1); assert.equal(item.reviews.items[0].dueDate, "2038-05-02"); assert.equal(item.reviews.items[0].revisionId, "fixture-risk-revision");
  assert.equal(item.integrations.items[0].status, "Ready"); assert.equal(item.integrations.items[0].lastSuccessfulTestAt, "2038-02-04T00:00:00.000Z");
  assert.equal(item.checks.filter(row => row.verified).length, 3); assert.ok(item.checks.filter(row => row.label.includes("workflow") || row.label.includes("intervals") || row.label.includes("Integration")).every(row => !row.verified));
  assert.ok(!JSON.stringify(response).includes("private-")); assert.ok(!JSON.stringify(response).includes("Connected")); assert.ok(!JSON.stringify(response).includes("lastSync"));
  assert.equal(JSON.stringify({ method, reviews, connector }), before, "Input records remain immutable");
  assert.equal(pipelineQuery.where.createdById, user.id); assert.equal(methodQuery.where.id, scope.methodologyVersionId); assert.equal(reviewQuery.where.pipeline.createdById, user.id); assert.equal(reviewQuery.where.currentApprovedRevision.matrixVersionId, method.matrixVersion.id); assert.equal(connectorQuery.where.authorId, user.id);
  assert.ok(!connectorQuery.select.endpoint && !connectorQuery.select.configuration && !connectorQuery.select.secretReference);
  const optional = await createRiskConfigurationRepository(() => ({ ...reader, reviews: async () => { throw new Error("optional reviews unavailable"); }, connectors: async () => { throw new Error("optional connectors unavailable"); } })).read(user, scope);
  assert.equal(optional.status, "available"); assert.equal(optional.item?.reviews.status, "unavailable"); assert.equal(optional.item?.integrations.status, "unavailable");
  const absentOptional = await createRiskConfigurationRepository(() => ({ method: reader.method, pipeline: reader.pipeline })).read(user, scope); assert.equal(absentOptional.item?.integrations.status, "unavailable");
  pipelineOwner = "other-owner"; assert.equal((await repository.read(user, scope)).item, null); pipelineOwner = user.id;
  connectorOwner = "other-owner"; assert.equal((await repository.read(user, scope)).item?.integrations.status, "unavailable"); connectorOwner = user.id;
  reviews = [reviewFixture()]; reviews[0].pipeline.createdById = "other-owner"; assert.equal((await repository.read(user, scope)).item?.reviews.status, "unavailable");
  reviews = [reviewFixture()]; reviews[0].currentApprovedRevision.matrixVersionId = "other-matrix"; assert.equal((await repository.read(user, scope)).item?.reviews.status, "unavailable");
  reviews = [reviewFixture(), reviewFixture()]; assert.equal((await repository.read(user, scope)).item?.reviews.status, "unavailable");
  reviews = []; assert.equal((await repository.read(user, scope)).item?.reviews.status, "available"); assert.deepEqual((await repository.read(user, scope)).item?.reviews.items, []);
  method = fixture(); method.matrixVersion.cells = []; const missingCells = (await repository.read(user, scope)).item!; assert.equal(missingCells.matrix.cells, null); assert.equal(missingCells.checks[0].verified, false);
  method = fixture(); method.matrixVersion.likelihoodDictionary = []; assert.equal((await repository.read(user, scope)).item?.matrix.likelihoodDictionary, null);
  for (const change of [{ approvalStatus: "Draft" }, { approvedAt: null }, { matrixVersionId: "other-matrix" }, { id: "wrong-method" }]) {
    method = { ...fixture(), ...change }; assert.equal((await repository.read(user, scope)).item, null);
  }
  method = fixture(); method.matrixVersion.approvalStatus = "Draft"; assert.equal((await repository.read(user, scope)).item, null);
  method = fixture(); reviews = [reviewFixture()];
  assert.equal((await createRiskConfigurationRepository(() => null).read(user, scope)).item, null); assert.equal((await repository.read(user, {})).item, null);
  for (const extra of [{ threshold: "invented" }, { category: "invented" }, { pipelineId: "" }]) assert.equal(configurationScopeSchema.safeParse({ ...scope, ...extra }).success, false);
  const express = (await import("express")).default, { riskAssessmentsRouter } = await import("../routes/riskAssessments"), { store } = await import("../data/store"), { signToken } = await import("../lib/jwt");
  const originalUser = store.findUserById, originalRead = riskConfigurationRepository.read;
  store.findUserById = async id => id === user.id ? { ...user, passwordHash: "fixture-only", createdAt: new Date().toISOString() } : null; riskConfigurationRepository.read = repository.read;
  const app = express(); app.use(express.json()); app.use("/api/risk-assessments", riskAssessmentsRouter); const server = createServer(app);
  try {
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve)); const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/risk-assessments/configuration`;
    const headers = { Authorization: `Bearer ${signToken({ sub: user.id, role: user.role, email: user.email })}`, "Content-Type": "application/json" };
    assert.equal((await fetch(base)).status, 401); assert.equal((await fetch(base + "?threshold=unapproved", { headers })).status, 400);
    const read = await fetch(base + "?" + new URLSearchParams(scope), { headers }); assert.equal(read.status, 200); assert.equal(read.headers.get("cache-control"), "private, no-store"); assert.equal((await read.json() as { status: string }).status, "available");
    for (const verb of ["POST", "PATCH", "PUT", "DELETE"]) assert.equal((await fetch(base, { method: verb, headers, body: "{}" })).status, 423);
  } finally { store.findUserById = originalUser; riskConfigurationRepository.read = originalRead; await new Promise<void>(resolve => server.close(() => resolve())); }
  if (process.env.RISK_IMG06_TEST_ARTIFACTS === "1") {
    const fs = await import("node:fs"), path = await import("node:path"); const dir = path.resolve(__dirname, "../../../tmp/risk-img06-review"); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, "synthetic-configuration.json"), JSON.stringify(response));
  }
  console.log("IMG-06 backend PASS: exact approved versions, configuration/count separation, no invented scores/policies, authorized saved reviews and Hub metadata, secret exclusion, partial verification, isolated missing integrations, immutable records, authenticated GET and locked mutations. Database disabled.");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
