const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

const assessmentForm = read("src/components/assessment-form.tsx");
const reportView = read("src/components/report-view.tsx");
const dashboard = read("src/components/dashboard.tsx");
const storage = read("src/lib/storage.ts");

assert.match(
  assessmentForm,
  /Report was not permanently saved\. Please try again\./,
  "Assessment form should show the required permanent-save failure message"
);

assert.doesNotMatch(
  assessmentForm,
  /isBackendUnavailableError\(error\)[\s\S]{0,120}router\.push\("\/report"\)/,
  "Backend-unavailable saves must not navigate to /report"
);

for (const source of [reportView, dashboard]) {
  assert.doesNotMatch(
    source,
    /loadActiveReport|setActiveReport|loadAssessments|saveAssessment|replaceAssessmentsCache|clearDemoFallbackData/,
    "Report history and dashboard must not use localStorage as permanent storage"
  );
}

assert.doesNotMatch(
  storage,
  /klinthur-active-report|klinthur-assessments|loadActiveReport|setActiveReport|saveAssessment/,
  "Storage helpers must not expose permanent report-history localStorage APIs"
);

assert.match(
  storage,
  /UNSAVED_DRAFT_KEY/,
  "Any remaining localStorage usage should be clearly separated as an unsaved draft"
);

console.log("Frontend storage safety tests passed.");
