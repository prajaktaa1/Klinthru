/* Static server-render tests only. No browser effects, API requests or database. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const root = path.resolve(__dirname, "..");
const resolve = Module._resolveFilename;
Module._resolveFilename = function(request, ...rest) { return resolve.call(this, request.startsWith("@/") ? path.join(root, "src", request.slice(2)) : request, ...rest); };
for (const extension of [".ts", ".tsx"]) require.extensions[extension] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
let requests = 0;
global.fetch = () => { requests++; throw new Error("Network access forbidden in static test"); };
const { DesignBasisCharts } = require("../src/components/cp-design-basis-charts.tsx");
const { DesignBasisRegister, physicalAssetCount } = require("../src/components/cp-design-basis-register.tsx");
const { DesignBasisDetails } = require("../src/components/cp-design-basis-details.tsx");
const { DesignBasisEditor } = require("../src/components/cp-design-basis-editor.tsx");
const h = React.createElement;
let checks = 0;
function test(name, fn) { fn(); checks++; process.stdout.write(`PASS ${name}\n`); }
const row = { id: "test-revision", basisId: "test-basis", basisNumber: "test-only", revisionCode: "test-a", title: "Static test only", categoryKey: "test", categoryLabel: "Test category", description: "No production data", systemType: "ICCP", pipeline: { id: "test-pipeline", pipelineCode: "test-only", pipelineName: "Static test" }, lockState: "LOCKED", rowVersion: 1, contentHash: "test-hash", lifecycleStatus: "Approved", lastContentUpdatedAt: "2026-01-01T00:00:00Z", nextReviewDueAt: null, assumptions: [], scope: [], evidence: [], sourceDocuments: [], standards: [], criteriaBindings: [], checks: [], checklistSnapshot: {}, metricPolicySnapshot: {}, events: [] };
test("unavailable charts do not render screenshot percentages", () => { const html = renderToStaticMarkup(h(DesignBasisCharts, { summary: null })); assert.match(html, /MISSING FIELD/); assert.doesNotMatch(html, /92%|79%|28/); });
test("register distinguishes unavailable from verified empty", () => { const props = { selectedRows: new Set(), onSelection() {}, onView() {}, page: 1, onPage() {}, sort: "basisNumber", onSort() {}, search: "", onSearch() {}, busy: false }; const absent = renderToStaticMarkup(h(DesignBasisRegister, { ...props, list: null })); const empty = renderToStaticMarkup(h(DesignBasisRegister, { ...props, list: { items: [], total: 0 } })); assert.match(absent, /Unavailable/); assert.match(empty, /No verified Design Basis records/); assert.doesNotMatch(empty, /of 28/); });
test("physical assets deduplicate membership and never count pipeline or segment", () => { assert.equal(physicalAssetCount({ ...row, scope: [{ sourceSnapshot: { assetIds: ["test-asset", "test-asset"] } }, { sourceSnapshot: { segmentIds: ["test-segment"] } }, { sourceSnapshot: {}, assetId: "test-asset" }] }), 1); });
test("approved details expose comments and revision workflow without content editing", () => { const html = renderToStaticMarkup(h(DesignBasisDetails, { revision: row, canWrite: false, onClose() {}, onAction() {}, onEdit() {} })); assert.match(html, /Save appends a comment/); assert.match(html, /Approved design content is immutable/); assert.match(html, /Source Documents/); assert.match(html, /Revision workflow/); assert.doesNotMatch(html, />Edit<|Submit for review/); assert.match(html, /disabled=""/); });
test("draft editor has all engineering sections but no seed data", () => { const options = { segments: [], assets: [], criteriaVersions: [], systemTypes: ["ICCP", "SACP", "Hybrid"] }; const html = renderToStaticMarkup(h(DesignBasisEditor, { options, pipelineId: "test", userId: "test", onCancel() {}, onSave() {} })); for (const label of ["New Design Basis", "Design Values / Assumptions", "Source Documents", "Standards / Specifications", "Approved Criteria Versions", "Controlled Checklist and Completeness"]) assert.ok(html.includes(label)); assert.doesNotMatch(html, /DB-PL001|Soil Resistivity Study|25 Ω/); });
test("blank Boolean assumption stays missing instead of becoming false", () => { const { basisBooleanValue } = require("../src/components/cp-design-basis-editor.tsx"); assert.equal(basisBooleanValue(""), null); assert.equal(basisBooleanValue(undefined), null); assert.equal(basisBooleanValue("false"), false); assert.equal(basisBooleanValue("true"), true); });
test("missing detail values stay explicit and max-only ranges remain visible", () => {
 const props = { canWrite: false, onClose() {}, onAction() {}, onEdit() {}, onRevision() {} };
 const html = renderToStaticMarkup(h(DesignBasisDetails, { ...props, revision: { ...row, assumptions: [{ id: "test-number", parameterLabel: "Test numeric", valueKind: "NUMBER", numericValue: "2", rangeMin: null, rangeMax: "5", unit: null, sourceModule: "Engineering Assumption" }, { id: "test-boolean", parameterLabel: "Test boolean", valueKind: "BOOLEAN", booleanValue: null, sourceModule: "Engineering Assumption" }] } }));
 assert.match(html, /Range: MISSING FIELD/); assert.match(html, / - 5 /); assert.match(html, /Test boolean: MISSING FIELD/); assert.doesNotMatch(html, /Test boolean: null/);
 const empty = renderToStaticMarkup(h(DesignBasisDetails, { ...props, revision: row })); assert.match(empty, /<div>MISSING FIELD/);
});
test("missing chart tooltip values do not become percentages", () => {
 const html = renderToStaticMarkup(h(DesignBasisCharts, { summary: { charts: { completenessByCategory: [{ key: "test", label: "Test", value: null, numerator: null, denominator: null }], documentStatus: [], documentStatusTotal: 0 } } }));
 assert.match(html, /<title>Test: MISSING FIELD/); assert.doesNotMatch(html, /APPROVAL NEEDED%|\(\?\/\?\)/);
});
test("category colors stay attached to exact labels when source order changes", () => {
 const { basisCategoryColor } = require("../src/components/cp-design-basis-charts.tsx");
 const expected = { "General Information": "#aab8c9", "Environmental & Third Party": "#38a3bd", "Standards & References": "#6f6fe5", "Design Criteria": "#fdaa36", "Coating & Insulation": "#2f96d2", "Soil & Environment": "#319e66" };
 const categories = Object.entries(expected).map(([label], i) => ({ key: `test-${i}`, label, value: i, numerator: i, denominator: 100 }));
 const html = renderToStaticMarkup(h(DesignBasisCharts, { summary: { charts: { completenessByCategory: categories, documentStatus: [], documentStatusTotal: 0 } } }));
 for (const [label, color] of Object.entries(expected)) { assert.equal(basisCategoryColor(label), color); assert.ok(html.includes(`fill="${color}"`)); }
 assert.equal(basisCategoryColor("Environment & Third Party"), "#64748b");
});
test("legend follows screenshot order without adding absent statuses or mutating input", () => {
 const { orderedBasisStatuses } = require("../src/components/cp-design-basis-charts.tsx");
 const labels = ["Other", "Draft", "Approved", "Missing", "Not Required", "Overdue", "In Review"];
 const items = labels.map(label => ({ label, count: 1, percent: 14 }));
 assert.deepEqual(orderedBasisStatuses(items).map(i => i.label), ["Approved", "In Review", "Draft", "Overdue", "Not Required", "Other", "Missing"]);
 assert.deepEqual(items.map(i => i.label), labels);
 assert.deepEqual(orderedBasisStatuses([{ label: "Draft" }]), [{ label: "Draft" }]);
});
test("numbered pagination renders only actual pages with current-page semantics", () => {
 const props = { selectedRows: new Set(), onSelection() {}, onView() {}, page: 2, onPage() {}, sort: "basisNumber", onSort() {}, search: "", onSearch() {}, busy: false };
 const html = renderToStaticMarkup(h(DesignBasisRegister, { ...props, list: { items: [row], total: 21 } }));
 for (const page of [1, 2, 3]) assert.ok(html.includes(`aria-label="Page ${page}"`));
 assert.match(html, /aria-label="Page 2" aria-current="page"/); assert.doesNotMatch(html, /aria-label="Page 4"/);
 const { basisPageNumbers } = require("../src/components/cp-design-basis-register.tsx");
 assert.deepEqual(basisPageNumbers(1, 1), [1]); assert.deepEqual(basisPageNumbers(5, 10), [1, null, 4, 5, 6, null, 10]);
});
test("new page buttons and search preserve existing frontend callback behavior", () => {
 let selectedPage; let query; let viewed;
 const tree = DesignBasisRegister({ list: { items: [row], total: 21 }, selectedRows: new Set(), onSelection() {}, onView(r) { viewed = r.id; }, page: 1, onPage(p) { selectedPage = p; }, sort: "basisNumber", onSort() {}, search: "", onSearch(q) { query = q; }, busy: false });
 const elements = []; function walk(e) { React.Children.forEach(e, child => { if (React.isValidElement(child)) { elements.push(child); walk(child.props.children); } }); } walk(tree);
 elements.find(e => e.props["aria-label"] === "Page 3").props.onClick(); assert.equal(selectedPage, 3);
 elements.find(e => e.props["aria-label"] === "Search design basis items").props.onChange({ target: { value: "test query" } }); assert.equal(query, "test query");
 elements.find(e => e.type === "button" && e.props.children === "View").props.onClick(); assert.equal(viewed, row.id);
});
test("source icons preserve filenames and exact-version downloads without adding records", () => {
 const revision = { ...row, sourceDocuments: [{ id: "test-evidence-a", documentId: "test-doc-a", documentVersionId: "test-version-a", capturedFileName: "test-source.pdf" }, { id: "test-evidence-b", documentId: "test-doc-b", documentVersionId: "test-version-b", capturedFileName: "test-other.pdf" }] };
 const html = renderToStaticMarkup(h(DesignBasisDetails, { revision, canWrite: false, onClose() {}, onAction() {}, onEdit() {}, onRevision() {} }));
 assert.match(html, /data-basis-icon="pdf"/); assert.match(html, /text-red-500/); assert.match(html, /text-blue-600/);
 assert.match(html, /test-source\.pdf/); assert.match(html, /test-other\.pdf/); assert.match(html, /Source Documents \(2\)/);
 const { BasisSourceIcon } = require("../src/components/cp-design-basis-icons.tsx");
 assert.doesNotMatch(renderToStaticMarkup(h(BasisSourceIcon, { index: 0, fileName: "test-not-pdf.txt" })), /data-basis-icon="pdf"/);
});
test("workspace includes header/export/KPI icons while keeping missing counts unavailable", () => {
 const auth = require("../src/components/auth-provider.tsx"); const saved = auth.useAuth; auth.useAuth = () => ({ user: null });
 try {
  const { CpDesignBasisWorkspace } = require("../src/components/cp-design-basis-workspace.tsx");
  const html = renderToStaticMarkup(h(CpDesignBasisWorkspace, { pipeline: null, onSelectPipeline() {} }));
  assert.equal((html.match(/data-basis-icon="database"/g) ?? []).length, 2);
  assert.equal((html.match(/data-basis-icon="check"/g) ?? []).length, 2);
  assert.equal((html.match(/data-basis-icon="document"/g) ?? []).length, 2);
  for (const icon of ["export", "search", "filter"]) assert.ok(html.includes(`data-basis-icon="${icon}"`));
  assert.match(html, /Across all pipelines/); assert.match(html, /Live count follows the selected scope/);
  assert.equal((html.match(/>Unavailable<\/p>/g) ?? []).length, 5);
  assert.doesNotMatch(html, /DB-PL001|28<|92%|79%/);
 } finally { auth.useAuth = saved; }
});
test("register status symbols accompany actual status text without replacing it", () => {
 const { BasisStatus } = require("../src/components/cp-design-basis-register.tsx");
 for (const value of ["Approved", "In Review", "Draft", "Overdue"]) {
  const html = renderToStaticMarkup(h(BasisStatus, { value }));
  assert.ok(html.includes(value)); assert.ok(html.includes(`data-basis-icon="${value === "Draft" ? "clock" : "check"}"`));
  assert.match(html, /aria-hidden="true"/);
 }
});
test("static rendering never calls an API", () => assert.equal(requests, 0));
process.stdout.write(`${checks} static rendering checks passed. No network or database access.\n`);
