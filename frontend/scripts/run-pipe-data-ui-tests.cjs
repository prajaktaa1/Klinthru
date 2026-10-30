const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

const selector = read("src/components/pipeline-selector.tsx");
const assessmentForm = read("src/components/assessment-form.tsx");

assert.match(selector, /mode\?: "manage" \| "select-only"/, "Shared selector should support assessment select-only mode");
assert.match(selector, /fetchPipelines\(query\)/, "Assessment dropdown should be populated from Pipeline History Pipeline records");
assert.match(selector, /fetchPipelineById\(pendingPipelineId\)/, "Load Pipe Data should fetch the selected Pipeline record");
assert.match(selector, /Select a pipeline/, "Assessment dropdown should include the requested placeholder");
assert.match(selector, /Load Pipe Data/, "Assessment dropdown should expose the Load Pipe Data button");
assert.match(selector, /Loading\.\.\./, "Load Pipe Data should show a loading label");
assert.match(selector, /animate-spin/, "Load Pipe Data should show a spinner while loading");
assert.match(selector, /disabled=\{!pendingPipelineId \|\| isLoadingSelectedPipeline\}/, "Load Pipe Data should be disabled until a pipeline is selected");
assert.match(selector, /pipelineName} \{"\\u2014"\} {pipeline\.pipelineCode}/, "Dropdown options should display Pipeline Name — Pipeline Code");
assert.doesNotMatch(selector, /fetchAssessmentPipeDataRecords/, "Pipeline dropdown must not load External/Internal pipe-data records");
assert.match(selector, /label="Pipeline Code"/, "Dashboard Create/Edit Pipeline form should include Pipeline Code");
assert.match(selector, /Pipeline Code is required\./, "Dashboard Create/Edit Pipeline form should validate required Pipeline Code");
assert.match(selector, /Pipeline Status/, "Dashboard Create/Edit Pipeline form should include Pipeline Status");
assert.match(selector, /pipelineStatusOptions = \["Active", "Inactive"\]/, "Pipeline Status should use existing active/inactive status values");
assert.match(selector, /pipelineCode: form\.pipelineCode\.trim\(\)/, "Pipeline create/update should save the existing pipelineCode field");
assert.match(selector, /status: form\.status\?\.trim\(\) \|\| "Active"/, "Pipeline create/update should save the existing status field");

assert.match(assessmentForm, /Select a pipeline to load its saved information from Pipeline History\./, "Pipe Data should show the requested instruction");
assert.match(assessmentForm, /renderPipelineMasterSummary/, "Loaded Pipe Data should render as a read-only summary grid");
assert.match(assessmentForm, /Not provided/, "Missing Pipeline values should display Not provided");
assert.match(assessmentForm, /Pipeline Code/, "External/Internal Pipe Data summary should include Pipeline Code when relevant");
assert.match(assessmentForm, /Pipeline Status/, "External/Internal Pipe Data summary should include Pipeline Status when relevant");
assert.match(assessmentForm, /Edit Pipe Data/, "Loaded Pipe Data should expose Edit Pipe Data");
assert.match(assessmentForm, /Save Changes/, "Editing Pipe Data should expose Save Changes");
assert.match(assessmentForm, /handleCancelPipelineDataEdit/, "Editing Pipe Data should expose Cancel");
assert.match(assessmentForm, /updatePipeline\(selectedPipeline\.id, pipelineInput\)/, "Save Changes should update the same selected Pipeline record");
assert.doesNotMatch(assessmentForm, /createPipeline\(/, "Assessment Pipe Data must not create duplicate Pipeline records");
assert.match(assessmentForm, /window\.confirm\("Discard unsaved Pipeline Master Data changes and switch pipelines\?"\)/, "Unsaved edits should warn before loading a different pipeline");

console.log("Focused Pipe Data UI tests passed.");
