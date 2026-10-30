const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

const selector = read("src/components/pipeline-selector.tsx");
const assessmentForm = read("src/components/assessment-form.tsx");
const cpDashboard = read("src/components/cp-dashboard-view.tsx");
const dashboard = read("src/components/dashboard.tsx");
const apiClient = read("src/lib/apiClient.ts");
const externalPage = read("src/app/external-corrosion-assessment/page.tsx");
const internalPage = read("src/app/internal-corrosion-assessment/page.tsx");
const reportView = read("src/components/report-view.tsx");
const pipeHistoryModal = read("src/components/external-pipe-history-modal.tsx");

assert.match(selector, /PipeMaterialDropdown/, "Pipeline selector should reuse the existing material dropdown");
assert.match(selector, /PipeGradeDropdown/, "Pipeline selector should reuse the dependent grade dropdown");
assert.match(selector, /pipeAgeYears/, "Pipeline selector should capture pipe age on master data");
assert.match(selector, /pipeLengthKm/, "Pipeline selector should capture pipe length on master data");
assert.match(selector, /smysMpa/, "Pipeline selector should capture SMYS on master data");
assert.match(selector, /maopBar/, "Pipeline selector should capture MAOP on master data");
assert.match(selector, /operatingPressureInputValue/, "Pipeline selector should preserve the entered operating pressure value");
assert.match(selector, /operatingPressureUnit/, "Pipeline selector should capture the selected operating pressure unit");
assert.match(selector, /pressureUnitOptions: PressureUnit\[\] = \["bar", "MPa", "kPa", "psi"\]/, "Pipeline selector should expose the required pressure units");
assert.match(selector, /wallThicknessUnitOptions: WallThicknessUnit\[\] = \["mm", "in"\]/, "Pipeline selector should expose wall thickness mm/in units");
assert.match(selector, /wallThicknessToMm\(form\.wallThicknessInputValue/, "Pipeline selector should normalize wall thickness to mm before saving");
assert.match(selector, /wallThicknessInputValue/, "Pipeline selector should preserve the entered wall thickness value");
assert.match(selector, /mm — Millimetres/, "Pipeline selector should label millimetres exactly");
assert.match(selector, /in — Inches/, "Pipeline selector should label inches exactly");
assert.match(selector, /inspectionYear/, "Pipeline selector should capture inspection year on master data");
assert.match(selector, /Operating Pressure cannot exceed MAOP/, "Pipeline selector should validate pressure against MAOP");
assert.match(selector, /Wall Thickness must be a positive number/, "Pipeline selector should validate positive wall thickness");
assert.match(dashboard, /Pipe Location\/ID/, "Dashboard should display requested master data labels");
assert.match(dashboard, /Not provided/, "Dashboard should show the requested location fallback");
assert.match(dashboard, /formatMasterNumber\(modal\.pipeline\.maopBar, "bar"\)/, "Dashboard should display MAOP with units in the pipe data view");

assert.match(selector, /fetchPipelines/, "Pipeline selector should load saved pipelines");
assert.match(selector, /createPipeline/, "Pipeline selector should create explicit Pipeline Master records");
assert.match(selector, /updatePipeline/, "Pipeline selector should edit master data only through explicit action");
assert.match(selector, /mode = "manage"/, "Pipeline selector should keep Dashboard management mode as the default");
assert.match(selector, /mode\?: "manage" \| "select-only"/, "Pipeline selector should support assessment select-only mode");
assert.match(selector, /if \(isSelectOnly\) \{/, "Assessment select-only mode should use its dedicated dropdown-only branch");
assert.match(selector, /!isSelectOnly && !hidePicker \?/, "Dashboard hidden-picker mode should hide search/create/edit/clear management controls");
assert.match(selector, /pipelineName} \{"\\u2014"\} {pipeline\.pipelineCode}/, "Pipeline selector should display name and code");
assert.match(selector, /label="Pipeline Code"/, "Create/Edit Pipeline form should expose Pipeline Code");
assert.match(selector, /Pipeline Code is required\./, "Create/Edit Pipeline form should prevent empty Pipeline Code");
assert.match(selector, /pipelineCode: form\.pipelineCode\.trim\(\)/, "Create/Edit Pipeline form should save the entered trimmed Pipeline Code");
assert.match(selector, /Pipeline Status/, "Create/Edit Pipeline form should expose Pipeline Status");
assert.match(selector, /pipelineStatusOptions = \["Active", "Inactive"\]/, "Pipeline Status should reuse the supported active/inactive values");
assert.match(selector, /status: form\.status\?\.trim\(\) \|\| "Active"/, "Create/Edit Pipeline form should preserve or default Pipeline Status");
assert.doesNotMatch(selector, /pipelineCode: getPipelineCode\(form\)/, "Create/Edit Pipeline form should not silently derive Pipeline Code");
assert.match(dashboard, /Pipeline Code/, "Dashboard Pipeline History should display Pipeline Code");
assert.match(dashboard, /Pipeline Status/, "Dashboard Pipeline History should display Pipeline Status");

assert.match(
  assessmentForm,
  /Select or create a pipeline before saving this assessment\./,
  "Assessment save should require a selected pipeline"
);
assert.match(
  assessmentForm,
  /pipelineId: selectedPipeline\?\.id/,
  "Stored assessments should include the selected pipeline ID"
);
assert.match(
  assessmentForm,
  /fetchPipelineById\(loadedPipelineId\)/,
  "Loaded assessment pipe data should restore the selected Pipeline record"
);
assert.match(assessmentForm, /mode="select-only"/, "Assessment pages should show one dropdown-only Pipeline selector under Pipe Data");
assert.match(assessmentForm, /Select a pipeline to load its saved information from Pipeline History\./, "Assessment Pipe Data should show the requested Pipeline History instruction");
assert.match(assessmentForm, /isPipelineMasterLocked/, "Populated Pipeline Master fields should be read-only until Edit is clicked");
assert.match(assessmentForm, /Edit Pipe Data/, "Assessment Pipe Data area should expose an explicit Edit Pipe Data action");
assert.match(assessmentForm, /Save Changes/, "Assessment Pipe Data area should expose Save Changes while editing");
assert.match(assessmentForm, /handleCancelPipelineDataEdit/, "Assessment Pipe Data area should support cancelling unsaved changes");
assert.match(assessmentForm, /window\.confirm\("Discard unsaved Pipeline Master Data changes and switch pipelines\?"\)/, "Pipeline switching should warn when there are unsaved edits");
assert.match(assessmentForm, /updatePipeline\(selectedPipeline\.id, pipelineInput\)/, "Save Changes should update the selected existing Pipeline record");
assert.doesNotMatch(assessmentForm, /createPipeline\(/, "Assessment Pipe Data Save Changes must not create duplicate Pipeline records");
assert.match(assessmentForm, /setPipelineDataNotice\(\{\s*tone: "error"/, "Failed Pipeline Master saves should keep the form open and show an error");
assert.match(assessmentForm, /validatePipelineMasterDraft/, "Save Changes should validate required Pipeline Master fields");
assert.match(assessmentForm, /operatingPressureInputValue/, "Save Changes should preserve operating pressure input values");
assert.match(assessmentForm, /pipeOutsideDiameter/, "Save Changes should preserve outside diameter values");
assert.match(assessmentForm, /wallThicknessInputValue/, "Save Changes should preserve wall thickness input values");
assert.match(
  assessmentForm,
  /pipeMaterial: pipeline\.pipeMaterial \?\? initialValues\.pipeMaterial/,
  "Selecting a pipeline should populate shared pipe fields from Pipeline master defaults"
);
assert.match(
  assessmentForm,
  /pipeAge: pipeline\.pipeAgeYears \?\? initialValues\.pipeAge/,
  "Switching pipelines should clear prior pipeline age when the new pipeline is missing it"
);
assert.match(
  assessmentForm,
  /pipeline\.pipeOutsideDiameter \?\? initialValues\.pipeIdDiameter/,
  "External assessment should populate diameter from the selected Pipeline and clear stale values"
);
assert.match(
  assessmentForm,
  /pipeline\.pipeInsideDiameter \?\? pipeline\.pipeOutsideDiameter \?\? initialValues\.pipeIdDiameter/,
  "Internal assessment should populate diameter from the selected Pipeline and clear stale values"
);
assert.match(
  assessmentForm,
  /pipeline\.operatingPressureUnit \?\? initialValues\.operatingPressureUnit/,
  "External assessment should preserve the Pipeline operating pressure unit"
);
assert.match(
  assessmentForm,
  /pipeline\.operatingPressureUnit \?\? initialValues\.pipelinePressureUnit/,
  "Internal assessment should preserve the Pipeline pressure unit"
);

assert.match(cpDashboard, /Save Calculation/, "CP Dashboard should expose an explicit save action");
assert.match(cpDashboard, /createCpCalculation/, "CP Dashboard should save calculations through the backend API");
assert.match(cpDashboard, /fetchCpCalculations/, "CP Dashboard should load per-pipeline CP history");

assert.match(dashboard, /fetchPipelineHistory/, "Dashboard should load pipeline history from backend");
assert.match(dashboard, /title="Inspection History"/, "Dashboard should render filtered inspection history from the Actions menu");
assert.match(dashboard, /bundle\?\.history\?\.externalAssessments/, "Dashboard inspection history should include selected-pipeline external assessments");
assert.match(dashboard, /bundle\?\.history\?\.internalAssessments/, "Dashboard inspection history should include selected-pipeline internal assessments");
assert.match(
  assessmentForm,
  /delete next\.installationYear/,
  "Internal saved pipe data payload should omit unsupported installationYear"
);
assert.match(
  assessmentForm,
  /stableAssessmentIdRef/,
  "Pipe data saves should reuse a stable assessment ID for idempotency"
);
assert.match(assessmentForm, /normalizeWallThicknessInput/, "Assessment save should normalize wall thickness to mm");
assert.match(assessmentForm, /wallThicknessDisplayValue/, "Assessment save should preserve original wall thickness display value");
assert.match(assessmentForm, /wallThicknessUnit/, "Assessment save and reopen should preserve wall thickness unit");
assert.match(assessmentForm, /temperatureToCelsius/, "Assessment save should normalize temperature to Celsius");
assert.match(assessmentForm, /temperatureFromCelsius/, "Assessment unit switching should convert from normalized Celsius");
assert.match(assessmentForm, /soilTemperatureInputValue/, "Assessment save should preserve external temperature input value");
assert.match(assessmentForm, /temperatureInputValue/, "Assessment save should preserve internal temperature input value");
assert.match(assessmentForm, /°C — Celsius/, "Assessment temperature dropdown should label Celsius exactly");
assert.match(assessmentForm, /°F — Fahrenheit/, "Assessment temperature dropdown should label Fahrenheit exactly");
assert.match(assessmentForm, /K — Kelvin/, "Assessment temperature dropdown should label Kelvin exactly");
assert.match(assessmentForm, /absolute zero/, "Assessment form should validate absolute-zero temperature limits");
assert.match(externalPage, /unitFieldName: "wallThicknessUnit"/, "External assessment should show wall thickness unit dropdown");
assert.match(internalPage, /unitFieldName: "wallThicknessUnit"/, "Internal assessment should show wall thickness unit dropdown");
assert.match(externalPage, /unitFieldName: "soilTemperatureUnit"/, "External assessment should show soil temperature unit dropdown");
assert.match(internalPage, /unitFieldName: "temperatureUnit"/, "Internal assessment should show temperature unit dropdown");
assert.doesNotMatch(externalPage, /Buried Pipeline Screening Form/, "External assessment should remove the old form heading");
assert.doesNotMatch(externalPage, /Capture environmental and electrical indicators, then generate a simplified risk profile and report\./, "External assessment should remove the old form description");
assert.match(reportView, /wallThickness: \(value\) =>/, "Report view should display wall thickness value");
assert.match(reportView, /soilTemperature: \(value\) =>/, "Report view should display external temperature value");
assert.match(reportView, /temperature: \(value\) =>/, "Report view should display internal temperature value");
assert.match(reportView, /searchReports\(\)/, "Report view should load saved reports");
assert.match(reportView, /Captured Input Summary/, "Report view should display captured report inputs");
assert.match(reportView, /getFormattedInputEntries\(report\.input\)/, "Report view should format saved report inputs");
assert.match(reportView, /key !== "pipeIdDiameterUnit"/, "Report view should hide diameter helper unit field");
assert.match(reportView, /key !== "pipeIdDiameterDisplayValue"/, "Report view should hide diameter helper display field");
assert.match(reportView, /Object\.entries\(input\)/, "Report view should enumerate saved input fields");
assert.match(pipeHistoryModal, /formatTemperaturePreview/, "Pipe data history preview should display original temperature value and unit");

assert.match(apiClient, /\/api\/pipelines/, "API client should include Pipeline backend routes");
assert.match(apiClient, /fetchPipelineById/, "API client should fetch an existing Pipeline by ID");
assert.match(apiClient, /createDocumentExtractedPipeDataRecord/, "Document-extracted pipe data should have an explicit create API");
assert.match(apiClient, /pipelineMasterDataUpdateConfirmed/, "Document-extracted pipe data should require confirmation in the API payload");
assert.match(apiClient, /\/api\/cp-calculations/, "API client should include CP calculation backend routes");

console.log("Frontend pipeline master tests passed.");
