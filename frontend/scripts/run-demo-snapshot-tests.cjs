const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

const reportView = read("src/components/report-view.tsx");
const reportWorkspace = read("src/components/report-workspace.tsx");

assert.match(
  reportView,
  /Report History/,
  "Report view should expose real report history"
);

assert.match(
  reportView,
  /searchReports\(\)/,
  "Report view should load reports through the existing read-only API"
);

assert.match(
  reportView,
  /onClick=\{\(\) => onOpenReport\(item\.id\)\}/,
  "Report history should keep internal report IDs for selection"
);

assert.match(
  reportView,
  /onClick=\{\(\) => onDownloadReport\(item\.id, "pdf"\)\}/,
  "Report history should keep internal report IDs for PDF export requests"
);

assert.match(
  reportView,
  /typeof report\.riskScore === "number" \? report\.riskScore : "Not Available"/,
  "Missing report risk score must remain Not Available"
);

assert.match(
  reportWorkspace,
  /Not Available — no persisted report-template catalog/,
  "Missing report-template catalog must remain Not Available"
);

assert.match(
  reportWorkspace,
  /Not Available — report section definitions are not persisted/,
  "Missing report-section definitions must remain Not Available"
);

assert.doesNotMatch(
  reportView,
  /clearDemoFallbackData|loadActiveReport|setActiveReport/,
  "Report view must not restore local demo fallback state"
);

assert.doesNotMatch(
  reportWorkspace,
  /<DemoPreviewBody|<DemoDeliveryHistory/,
  "Report workspace must not render demo preview components"
);

console.log("Frontend Reports Phase A data-safety regression tests passed.");
