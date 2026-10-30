const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

const dashboard = read("src/components/dashboard.tsx");
const apiClient = read("src/lib/apiClient.ts");
const calculationReportHistoryModal = read("src/components/calculation-report-history-modal.tsx");
const reportsRoute = fs.readFileSync(path.resolve(projectRoot, "../backend/src/routes/reports.ts"), "utf8");

assert.match(dashboard, /fetchPipelines\(\)/, "Dashboard Pipeline History should list all owner-visible pipelines");
assert.match(dashboard, /pipelineBundles/, "Dashboard should keep per-pipeline history state");
assert.match(dashboard, /function getPipelineOptionLabel\(pipeline: PipelineRecord\)/, "Dashboard should distinguish duplicate pipeline names with Pipeline Code");
assert.match(dashboard, /Select a pipeline/, "Dashboard Pipeline History should show one searchable pipeline selector");
assert.match(dashboard, /list="dashboard-pipeline-options"/, "Pipeline History selector should be searchable through the supported browser dropdown");
assert.match(dashboard, /value=\{getPipelineOptionLabel\(pipeline\)\}/, "Pipeline options should display Pipeline Name and Pipeline Code");
assert.match(dashboard, /pipelines\.find\(\(candidate\) => getPipelineOptionLabel\(candidate\) === value\)/, "Pipeline selection should resolve the selected option to a Pipeline ID");
assert.match(dashboard, /fetchPipelineHistory\(pipeline\.id\)/, "Dashboard should load history for the selected pipeline ID");
assert.match(dashboard, /setPipelineHistory\(null\);\s*setPipelineHistoryNotice\(null\);/s, "Switching pipelines should clear the previous pipeline history before loading");
assert.match(dashboard, /fetchAssessmentPipeDataHistory\(\{ pipelineId: pipeline\.id, assessmentType: "All" \}\)/, "Inspection history should filter existing pipe-data records by pipelineId");
assert.match(dashboard, /searchReports\(\{ pipelineId: pipeline\.id \}\)/, "Report history should filter existing reports by pipelineId");
assert.match(dashboard, /getLatestReport\(selectedPipelineBundle\?\.history\?\.reports\)/, "Latest-report action should select from the selected pipeline reports");
assert.match(dashboard, /downloadReportFile\(reportId, "pdf"\)/, "Latest-report download should reuse the existing report download API");
assert.match(dashboard, /No report available/, "Pipelines without reports should expose a no-report state");
assert.match(dashboard, /Select a pipeline to view available master data and history\./, "No selection should show the current empty state");
assert.match(dashboard, /No pipelines available\./, "Empty pipeline lists should fail safely");
assert.match(dashboard, /function clearSelectedPipeline\(\)/, "Dashboard should have a single selected-pipeline clear path");
assert.match(dashboard, /setSelectedPipeline\(null\)/, "Cancel should clear the selected pipeline by ID");
assert.match(dashboard, /setPipelineSearchValue\(""\)/, "Cancel should clear the selected pipeline label");
assert.match(dashboard, /setActiveModal\(null\)/, "Cancel should close selected-pipeline history or report views");
assert.match(dashboard, /setIsPipelineActionsOpen\(false\)/, "Cancel should close the Actions dropdown");
assert.match(dashboard, /function handleCancelPipelineSelection\(\)/, "Cancel should route through a selected-pipeline handler");
assert.match(dashboard, /if \(hasPipelineEditChanges\) \{\s*setIsDiscardConfirmOpen\(true\)/s, "Unsaved edit changes should require confirmation before clearing");
assert.match(dashboard, /Discard unsaved changes\?/, "Unsaved edit confirmation should use the requested question");
assert.match(dashboard, /Keep Editing/, "Unsaved edit confirmation should offer Keep Editing");
assert.match(dashboard, /Discard Changes/, "Unsaved edit confirmation should offer Discard Changes");
assert.match(dashboard, /discardEditRequestKey=\{discardEditRequestKey\}/, "Discard Changes should tell the edit form to discard local edits");
assert.match(dashboard, /onDirtyChange=\{setHasPipelineEditChanges\}/, "Dashboard should know when the edit form has unsaved changes");

for (const label of [
  "View Pipeline",
  "Edit Pipeline",
  "Inspection History",
  "View Reports",
  "Download Report"
]) {
  assert.match(dashboard, new RegExp(label), `Actions dropdown should include ${label}`);
}

assert.match(dashboard, /function PipelineHistoryActionsDropdown\(/, "Actions should render as one responsive dropdown per pipeline");
assert.match(dashboard, /type: "calculation-reports"/, "Dashboard should track the selected pipeline for calculation report history");
assert.match(dashboard, /<CalculationReportHistoryModal/, "Dashboard should open the calculation report history modal");
assert.match(dashboard, /hidePicker/, "Dashboard should preserve create and edit workflow without rendering the old pipeline picker");
assert.match(dashboard, /Create New Pipeline/, "Dashboard should keep Create New Pipeline above the selector");
assert.doesNotMatch(dashboard, /pipelines\.map\(\(pipeline\) => \{\s*const bundle/s, "Dashboard should not render one large card per pipeline");
assert.match(dashboard, /rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700/, "Cancel should be styled as a neutral outlined button");
assert.match(dashboard, />Updated<|formatDate\(pipeline\.updatedAt/, "Pipeline rows should show the current updated date");
assert.match(dashboard, /Inspection History/, "Pipeline actions should expose inspection history");
assert.match(dashboard, /No inspections/, "Missing inspection dates should show No inspections");
assert.match(dashboard, />Status<|formatPipelineStatus/, "Pipeline rows should show pipeline status");

const clearSelectedPipeline = dashboard.match(/function clearSelectedPipeline\(\) \{[\s\S]*?\n  \}/)?.[0] ?? "";
const handleCancelPipelineSelection = dashboard.match(/function handleCancelPipelineSelection\(\) \{[\s\S]*?\n  \}/)?.[0] ?? "";
const discardPipelineSelection = dashboard.match(/function discardPipelineSelection\(\) \{[\s\S]*?\n  \}/)?.[0] ?? "";
for (const [name, source] of [
  ["clearSelectedPipeline", clearSelectedPipeline],
  ["handleCancelPipelineSelection", handleCancelPipelineSelection],
  ["discardPipelineSelection", discardPipelineSelection]
]) {
  assert.doesNotMatch(source, /createPipeline|updatePipeline|delete|remove|createReport|updateReport/i, `${name} must not call create, update, or delete APIs`);
}

assert.match(dashboard, /Inspection file upload is not available yet\. Enter inspection data through the External or Internal Corrosion Assessment\./, "Upload action should open the requested informational modal");
assert.match(dashboard, /Go to External Assessment/, "Upload info modal should link to External Assessment");
assert.match(dashboard, /Go to Internal Assessment/, "Upload info modal should link to Internal Assessment");
assert.match(dashboard, />\s*Cancel\s*<\/button>/, "Upload info modal should include Cancel");
assert.doesNotMatch(dashboard, /type="file"/, "Upload info modal must not show a file picker");
assert.doesNotMatch(dashboard, /FormData/, "No real upload workflow should be implemented");

assert.match(apiClient, /pipelineId\?: string/, "Report search client should accept pipelineId");
assert.match(apiClient, /params\.set\("pipelineId", search\.pipelineId\.trim\(\)\)/, "Report search client should send pipelineId");
assert.match(reportsRoute, /pipelineId: typeof request\.query\.pipelineId === "string" \? request\.query\.pipelineId : undefined/, "Reports route should expose the existing pipelineId filter");

assert.match(calculationReportHistoryModal, /Calculation Report History/, "Calculation report modal should use the requested title");
assert.match(
  calculationReportHistoryModal,
  /Review and download saved External and Internal Corrosion calculation reports for this pipeline\./,
  "Calculation report modal should show the requested instruction"
);
assert.match(calculationReportHistoryModal, /searchReports\(\{ pipelineId: pipeline\.id \}\)/, "Calculation reports should load only the selected pipeline");
assert.match(calculationReportHistoryModal, /history\.filter\(\(report\) => report\.pipelineId === pipeline\.id\)/, "Calculation reports should keep client-side pipelineId scoping");
assert.match(calculationReportHistoryModal, /filters\.assessmentType !== "All" && report\.assessmentType !== filters\.assessmentType/, "Calculation reports should filter External/Internal/All without mixing types");
assert.match(calculationReportHistoryModal, /formatDateOnly\(getReportDate\(report\)\) !== filters\.reportDate/, "Calculation reports should filter by report date");
assert.match(calculationReportHistoryModal, /getSearchHaystack\(report\)\.includes\(query\)/, "Calculation reports should support report/result search");
assert.match(calculationReportHistoryModal, /Download PDF/, "Calculation reports should expose PDF downloads");
assert.match(calculationReportHistoryModal, /Download Word/, "Calculation reports should expose Word downloads");
assert.match(calculationReportHistoryModal, /downloadReportFile\(reportId, format\)/, "Calculation reports should reuse the existing report download API");
assert.match(calculationReportHistoryModal, /fetchReportById\(reportId\)/, "View Report should reuse the existing report API");
assert.match(calculationReportHistoryModal, /This preview displays the saved report snapshot/, "Preview should make snapshot behavior explicit");
assert.match(calculationReportHistoryModal, /Saved Assessment Inputs/, "Preview should show saved assessment inputs");
assert.match(calculationReportHistoryModal, /Saved Calculation Results/, "Preview should show saved calculation results");
assert.match(calculationReportHistoryModal, /Risk Classification/, "Preview should show risk classification");
assert.match(calculationReportHistoryModal, /Recommendations/, "Preview should show recommendations");
assert.match(calculationReportHistoryModal, /Historical data unavailable/, "Legacy reports with missing snapshots should fail safely");
assert.match(calculationReportHistoryModal, /function getReportPipelineCode/, "Pipeline Code should come from the saved report snapshot when available");
assert.doesNotMatch(calculationReportHistoryModal, /pipeline\.pipelineCode \|\| "Not provided"/, "Report history should not substitute the current Pipeline Code into historical reports");
assert.match(calculationReportHistoryModal, /No calculation reports are available for this pipeline\./, "Empty report history should use the requested copy");
assert.match(calculationReportHistoryModal, /lg:grid-cols-\[1\.12fr_0\.88fr\]/, "Calculation report modal should use a responsive two-pane layout");
assert.doesNotMatch(calculationReportHistoryModal, /calculate|runExternal|runInternal|calculateExternal|calculateInternal/i, "Report history must not rerun calculations");

const selector = read("src/components/pipeline-selector.tsx");
assert.match(selector, /discardEditRequestKey/, "Pipeline selector should support a dashboard discard request");
assert.match(selector, /onDirtyChange\?: \(isDirty: boolean\) => void/, "Pipeline selector should report dirty edit state without changing default behavior");
assert.match(selector, /JSON\.stringify\(form\) !== JSON\.stringify\(editBaseline\)/, "Pipeline selector should only report unsaved changes when form data changed");
assert.match(selector, /setForm\(editBaseline\)/, "Pipeline selector should discard unsaved edit fields on request");

console.log("Pipeline history action UI tests passed.");
