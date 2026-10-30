const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

const diagnostics = read("src/lib/saveDiagnostics.ts");
const apiClient = read("src/lib/apiClient.ts");
const assessmentForm = read("src/components/assessment-form.tsx");

function diagnosticCallBlocks(source) {
  return source.match(/logSaveDiagnostic\(\{[\s\S]*?\n\s*\}\);/g) || [];
}

assert.match(
  diagnostics,
  /process\.env\.NODE_ENV !== "production" && process\.env\.NEXT_PUBLIC_SAVE_DIAGNOSTICS === "true"/,
  "Frontend save diagnostics must be disabled by default and gated out of production"
);

assert.match(
  diagnostics,
  /console\.log\(\s*JSON\.stringify/,
  "Diagnostics should emit structured JSON only when enabled"
);

assert.doesNotMatch(
  [diagnostics, ...diagnosticCallBlocks(apiClient), ...diagnosticCallBlocks(assessmentForm)].join("\n"),
  /Authorization|Bearer|password|input:\s*|result:\s*|JSON\.stringify\(assessment\)|storedAssessment\s*[,\)]/,
  "Diagnostics must not log tokens, passwords, payloads, input JSON, or result JSON"
);

assert.match(
  diagnostics,
  /getSanitizedRequestPath\(path: string\)[\s\S]*path\.split\("\?"\)\[0\]/,
  "Request diagnostics should strip query strings before logging paths"
);

assert.match(
  apiClient,
  /event: "api_request_start"[\s\S]*apiBaseUrl: API_BASE_URL[\s\S]*authTokenExists: Boolean\(token\)[\s\S]*fetchStarted: true/,
  "API diagnostics should report base URL, path/method, token existence, and fetch start"
);

assert.match(
  apiClient,
  /event: "api_response"[\s\S]*responseStatus: response\.status/,
  "API diagnostics should report response status"
);

assert.match(
  apiClient,
  /event: "api_request_error"[\s\S]*errorName: getSanitizedErrorName\(error\)/,
  "API diagnostics should report sanitized request errors"
);

assert.match(
  assessmentForm,
  /event: "submit_handler_entered"[\s\S]*nativeFormValid: event\.currentTarget\.checkValidity\(\)/,
  "Assessment form should log submit entry and native form validity"
);

assert.match(
  assessmentForm,
  /event: "client_validation_completed"[\s\S]*validationFailureFields: latestValidationFailureFieldsRef\.current/,
  "Assessment form should log validation failure field names only"
);

assert.match(
  assessmentForm,
  /event: "stored_assessment_constructed"[\s\S]*storedAssessmentConstructed: true/,
  "Assessment form should log stored-assessment construction success"
);

assert.match(
  assessmentForm,
  /event: "stored_assessment_construction_failed"[\s\S]*storedAssessmentConstructed: false/,
  "Assessment form should log validation failure before fetch"
);

assert.match(
  assessmentForm,
  /event: "assessment_save_started"[\s\S]*await createAssessmentRecord\(storedAssessment\);[\s\S]*event: "assessment_save_completed"/,
  "Assessment save start/completion should be logged around the existing call"
);

assert.match(
  assessmentForm,
  /event: "report_save_started"[\s\S]*await createReportRecord\(storedAssessment\);[\s\S]*event: "report_save_completed"/,
  "Report save start/completion should be logged around the existing call"
);

assert.match(
  assessmentForm,
  /event: "save_flow_error"[\s\S]*errorName: getSanitizedErrorName\(error\)/,
  "Save request failures should log a sanitized error class"
);

assert.match(
  assessmentForm,
  /event: "navigation_to_report_attempted"[\s\S]*router\.push\("\/report"\)/,
  "Navigation to /report should be logged without changing behavior"
);

console.log("Frontend save diagnostics tests passed.");
