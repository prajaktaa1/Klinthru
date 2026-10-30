/* Pure in-memory/static checks. No database server, persistence or screenshot fixtures. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
process.env.DATABASE_URL = "";
process.env.CP_ENGINEERING_WRITES_ENABLED = "false";
require.extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
const domain = require("../cpEngineering/designBasisDomain.ts");
const { basisSummary } = require("../cpEngineering/designBasisMetrics.ts");
const service = require("../cpEngineering/designBasisService.ts");
let checks = 0;
function test(name, fn) { fn(); checks++; process.stdout.write(`PASS ${name}\n`); }
const at = "2026-06-01T00:00:00.000Z";
const filters = domain.parseFilters({ asOf: at });
const r = { id: "test-revision-a", basisId: "test-basis", revisionCode: "test-a", title: "Isolated unit test", categoryKey: "test", categoryLabel: "Unit test", description: null, systemType: "ICCP", nextReviewDueAt: null, checklistVersion: null, checklistSnapshot: {}, metricPolicyVersion: null, metricPolicySnapshot: {}, lockState: "DRAFT", contentHash: null, rowVersion: 1, createdAt: "2026-01-01T00:00:00.000Z", lastContentUpdatedAt: "2026-01-01T00:00:00.000Z", submittedById: null, assumptions: [], evidence: [], sourceDocuments: [], scope: [], standards: [], criteriaBindings: [], checks: [] };
const event = (eventType, revisionId, effectiveAt, occurredAt = "2026-02-01T00:00:00.000Z") => ({ id: `${eventType}-${revisionId}`, eventType, revisionId, effectiveAt, occurredAt, actorId: "test-reviewer" });
const b = { id: "test-basis", basisNumber: "test-only", pipelineId: "test-pipeline", pipelineCode: "test-only", pipelineName: "Unit test", revisions: [r], events: [] };
test("canonical hashing is order independent and valid JSON", () => { assert.equal(domain.digest({ b: 2, a: 1 }), domain.digest({ a: 1, b: 2 })); assert.deepEqual(JSON.parse(domain.canonical({ b: [2], a: 1 })), { a: 1, b: [2] }); });
test("filter allowlist rejects SQL-shaped sort and unbounded page size", () => { assert.throws(() => domain.parseFilters({ sort: "id; DROP TABLE x" })); assert.throws(() => domain.parseFilters({ pageSize: "100000" })); assert.throws(() => domain.parseFilters({ extra: "unknown" })); });
test("offset filter times normalize to UTC", () => assert.equal(domain.parseFilters({ asOf: "2026-06-01T05:30:00+05:30" }).asOf, at));
test("drafts are explicitly excluded by default", () => assert.equal(domain.currentRevision(b, at, false), undefined));
test("historical reads never expose later draft content", () => assert.equal(domain.currentRevision({ ...b, revisions: [{ ...r, lastContentUpdatedAt: "2026-07-01T00:00:00.000Z" }] }, at, true), undefined));
const r2 = { ...r, id: "test-revision-b", revisionCode: "test-b" };
const published = { ...b, revisions: [r, r2], events: [event("PUBLISHED", r.id, "2026-03-01T00:00:00.000Z"), event("PUBLISHED", r2.id, "2026-07-01T00:00:00.000Z"), event("SUPERSEDED", r.id, "2026-07-01T00:00:00.000Z")] };
test("future publication does not replace effective historical revision", () => assert.equal(domain.currentRevision(published, at, false).id, r.id));
test("half-open publication boundary selects new revision", () => assert.equal(domain.currentRevision(published, "2026-07-01T00:00:00.000Z", false).id, r2.id));
test("future-recorded publication is not known historically", () => assert.equal(domain.currentRevision({ ...b, events: [event("PUBLISHED", r.id, "2026-03-01T00:00:00.000Z", "2026-08-01T00:00:00.000Z")] }, at, false), undefined));
test("approval is not inferred from lock or unrelated criteria", () => assert.equal(domain.lifecycle({ ...r, lockState: "LOCKED" }, [], at), "Draft"));
test("frozen hash excludes submission metadata and optimistic token", () => { assert.equal(domain.digest(domain.revisionContent(r)), domain.digest(domain.revisionContent({ ...r, lockState: "LOCKED", submittedById: "another", submittedAt: at, rowVersion: 12, contentHash: "x", lastContentUpdatedAt: at }))); assert.notEqual(domain.digest(domain.revisionContent(r)), domain.digest(domain.revisionContent({ ...r, title: "Changed" }))); });
test("missing policy yields unavailable metrics rather than success zero", () => { const s = basisSummary([b], { ...filters, includeDrafts: true }); assert.equal(s.kpis.designBasisReadiness.value, null); assert.equal(s.meetsMinimumRequirements, false); assert.equal(s.kpis.designBasisDocuments.value, 0); });
test("duplicate document versions count once by Document_ID", () => { const s = basisSummary([{ ...b, revisions: [{ ...r, evidence: [{ documentId: "test-doc", id: "a" }, { documentId: "test-doc", id: "b" }] }] }], { ...filters, includeDrafts: true }); assert.equal(s.kpis.designBasisDocuments.value, 1); });
test("unknown and missing mandatory checks remain unsatisfied", () => { const checksData = [{ checkKey: "known", categoryKey: "test", categoryLabel: "Test", required: true, critical: false, applicability: "APPLICABLE", outcome: "SATISFIED" }, { checkKey: "unknown", categoryKey: "test", categoryLabel: "Test", required: true, critical: true, applicability: "UNKNOWN", outcome: "UNKNOWN" }]; const configured = { ...r, checklistVersion: "test-policy", metricPolicyVersion: "test-policy", metricPolicySnapshot: { definitionVersion: "cp-basis-v1", sourceEvidenceId: "test-evidence" }, evidence: [{ id: "test-evidence", documentId: "test-document" }], checklistSnapshot: { sourceEvidenceId: "test-evidence", requirements: checksData.map(c => ({ checkKey: c.checkKey, categoryKey: c.categoryKey, required: c.required, critical: c.critical })) }, checks: checksData }; const s = basisSummary([{ ...b, revisions: [configured] }], { ...filters, includeDrafts: true }); assert.equal(s.kpis.designBasisReadiness.value, 50); assert.equal(s.meetsMinimumRequirements, false); });
test("submission rejects absent controlled requirements", () => assert.throws(() => service.assertComplete(r), /MISSING FIELD/));
test("soil denominator includes frozen scoped segments lacking requirements", () => {
 const requirement = { checkKey: "test-soil", categoryKey: "test", required: true, critical: false, metric: "soil", subjectType: "SEGMENT", subjectId: "test-segment-a" };
 const configured = { ...r, scope: [{ sourceSnapshot: { segmentIds: ["test-segment-a", "test-segment-b", "test-segment-a"] } }], checklistVersion: "test", metricPolicyVersion: "test", metricPolicySnapshot: { definitionVersion: "cp-basis-v1", sourceEvidenceId: "test-evidence" }, checklistSnapshot: { sourceEvidenceId: "test-evidence", requirements: [requirement] }, evidence: [{ id: "test-evidence", documentId: "test-document" }], checks: [{ ...requirement, applicability: "APPLICABLE", outcome: "SATISFIED" }] };
 const metric = basisSummary([{ ...b, revisions: [configured] }], { ...filters, includeDrafts: true }).kpis.soilDataAvailability;
 assert.equal(metric.numerator, 1); assert.equal(metric.denominator, 2); assert.equal(metric.value, 50);
});
test("submission rejects numeric assumptions without an explicit unit", () => {
 const configured = { ...r, scope: [{}], assumptions: [{ valueKind: "NUMBER", numericValue: "1", unit: null }], evidence: [{ id: "test-evidence" }], checklistVersion: "test", metricPolicyVersion: "test", checklistSnapshot: { sourceEvidenceId: "test-evidence", requirements: [{}] }, metricPolicySnapshot: { sourceEvidenceId: "test-evidence" } };
 assert.throws(() => service.assertComplete(configured), /numeric assumption unit/);
});
test("typed assumptions reject non-finite decimals and wrong value kind", () => { assert.equal(domain.assumptionSchema.safeParse({}).success, false); assert.equal(domain.assumptionSchema.safeParse({ parameterKey: "unit", parameterLabel: "Unit", valueKind: "NUMBER", numericValue: "NaN", sourceModule: "Engineering Assumption", sourceSnapshot: {}, engineerId: "test" }).success, false); });
test("required obligations missing a check stay in readiness denominator", () => {
 const checksData = [{ checkKey: "present", categoryKey: "test", categoryLabel: "Test", required: true, critical: false, applicability: "APPLICABLE", outcome: "SATISFIED" }];
 const requirements = [{ checkKey: "present", categoryKey: "test", required: true, critical: false }, { checkKey: "absent", categoryKey: "test", required: true, critical: false }];
 const configured = { ...r, checklistVersion: "test", metricPolicyVersion: "test", metricPolicySnapshot: { definitionVersion: "cp-basis-v1", sourceEvidenceId: "test-evidence" }, checklistSnapshot: { sourceEvidenceId: "test-evidence", requirements }, evidence: [{ id: "test-evidence", documentId: "test-document" }], checks: checksData };
 const s = basisSummary([{ ...b, revisions: [configured] }], { ...filters, includeDrafts: true }); assert.equal(s.kpis.designBasisReadiness.denominator, 2); assert.equal(s.kpis.designBasisReadiness.value, 50);
});
test("draft-local assumption identifiers survive strict validation", () => {
 const value = domain.draftSchema.safeParse({ revisionCode: "test-a", title: "Test", categoryKey: "test", categoryLabel: "Test", assumptions: [{ id: "test-handle", parameterKey: "test-parameter", parameterLabel: "Test value", valueKind: "NUMBER", numericValue: "0.1250000000000000001", unit: "test-unit", sourceModule: "Engineering Assumption", sourceSnapshot: {}, engineerId: "test-engineer", rationale: "Isolated unit test" }] }); assert.equal(value.success, true);
});
test("malformed controlled checklist cannot be persisted through the API schema", () => {
 assert.equal(domain.draftSchema.safeParse({ revisionCode: "test", title: "Test", categoryKey: "test", categoryLabel: "Test", checklistSnapshot: { requirements: [null] } }).success, false);
});
test("master assumptions must match the exact source value and unit", () => {
 const a = { parameterKey: "pipeOutsideDiameter", valueKind: "NUMBER", numericValue: "00017.5000", textValue: null, booleanValue: null, unit: "test-unit" };
 domain.assertMasterValue(a, { pipeOutsideDiameter: 17.5, diameterUnit: "test-unit" });
 assert.throws(() => domain.assertMasterValue({ ...a, numericValue: "18" }, { pipeOutsideDiameter: 17.5, diameterUnit: "test-unit" }), /differs/);
 assert.throws(() => domain.assertMasterValue({ ...a, unit: "other-unit" }, { pipeOutsideDiameter: 17.5, diameterUnit: "test-unit" }), /unit differs/);
 assert.throws(() => domain.assertMasterValue({ ...a, parameterKey: "unmapped" }, {}), /MISSING FIELD/);
});
test("critical unsatisfied check blocks submission even if not required", () => {
 const c = { id: "test-check", checkKey: "critical-test", categoryKey: "test", categoryLabel: "Test", required: false, critical: true, applicability: "APPLICABLE", outcome: "UNSATISFIED" };
 const complete = { ...r, scope: [{ id: "test-scope", sourceSnapshot: {} }], assumptions: [{ id: "test-assumption" }], evidence: [{ id: "test-evidence" }], checklistVersion: "test", metricPolicyVersion: "test", checklistSnapshot: { sourceEvidenceId: "test-evidence", requirements: [{ checkKey: c.checkKey, categoryKey: c.categoryKey, required: false, critical: true }] }, metricPolicySnapshot: { definitionVersion: "cp-basis-v1", sourceEvidenceId: "test-evidence" }, checks: [c] };
 assert.throws(() => service.assertComplete(complete), /critical/);
});
test("metric policy evidence is required before percentages are reported", () => {
 const configured = { ...r, checklistVersion: "test", metricPolicyVersion: "test", checklistSnapshot: { sourceEvidenceId: "test-evidence", requirements: [{ checkKey: "test-check", required: true, critical: false, categoryKey: "test" }] }, metricPolicySnapshot: {}, evidence: [{ id: "test-evidence", documentId: "test-document" }], checks: [{ checkKey: "test-check", categoryKey: "test", categoryLabel: "Test", required: true, critical: false, applicability: "APPLICABLE", outcome: "SATISFIED" }] };
 const summary = basisSummary([{ ...b, revisions: [configured] }], { ...filters, includeDrafts: true }); assert.equal(summary.kpis.designBasisReadiness.availability, false);
});
const root = path.resolve(__dirname, "../../..");
test("SQL remains review-only with nine tables and no existing-table ALTER", () => { const sql = fs.readFileSync(path.join(root, "artifacts/cp-engineering-img02-preparation/proposed-additive-migration.review.sql"), "utf8"); assert.equal([...sql.matchAll(/CREATE TABLE public\."CpDesignBasis/g)].length, 9); assert.doesNotMatch(sql, /^\s*ALTER TABLE/im); assert.match(sql, /Submitted revision child content is immutable/); assert.match(sql, /append-only/); });
test("frontend preserves shared shell and includes all mapped register fields", () => { const register = fs.readFileSync(path.join(root, "frontend/src/components/cp-design-basis-register.tsx"), "utf8"); for (const label of ["Design Basis Item", "Standard / Specification", "Applicable Assets", "Last Updated"]) assert.ok(register.includes(label)); const details = fs.readFileSync(path.join(root, "frontend/src/components/cp-design-basis-details.tsx"), "utf8"); assert.ok(details.includes('act("comments", { comment })')); assert.ok(details.includes("Source Documents")); });
(async () => {
  let connected = false;
  require("../lib/prisma.ts").getPrismaClient = () => { connected = true; throw new Error("Forbidden test database access"); };
  await assert.rejects(service.writeBasis({ id: "test", name: "Test", email: "test@invalid", role: "Admin" }, "create", {}), /writes are disabled/);
  assert.equal(connected, false); checks++; process.stdout.write("PASS disabled writes fail before database acquisition\n");
  process.stdout.write(`${checks} pure/static checks passed. No database connection or mutation tests executed.\n`);
})().catch(e => { process.stderr.write(String(e)); process.exitCode = 1; });
