const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

const assessmentForm = read("src/components/assessment-form.tsx");
const externalPage = read("src/app/external-corrosion-assessment/page.tsx");
const internalPage = read("src/app/internal-corrosion-assessment/page.tsx");
const types = read("src/lib/types.ts");
const apiClient = read("src/lib/apiClient.ts");
const sanitizeInputBlock = assessmentForm.match(/function sanitizeStoredAssessmentInput[\s\S]*?\n  \}/)?.[0] || "";

assert.match(
  assessmentForm,
  /Inspection Date/,
  "Shared assessment form should render the Inspection Date field"
);

assert.match(
  assessmentForm,
  /type="date"[\s\S]*value=\{inspectionDate\}/,
  "Inspection Date should use a native date input bound to dedicated form state"
);

assert.match(
  externalPage,
  /<AssessmentForm<ExternalCorrosionInput, ExternalCorrosionResult>/,
  "External assessment page should use the shared assessment form"
);

assert.match(
  internalPage,
  /<AssessmentForm<InternalCorrosionInput, InternalCorrosionResult>/,
  "Internal assessment page should use the shared assessment form"
);

assert.match(
  assessmentForm,
  /function getLocalDateInputValue\(date = new Date\(\)\)[\s\S]*date\.getFullYear\(\)[\s\S]*date\.getMonth\(\) \+ 1[\s\S]*date\.getDate\(\)/,
  "New assessments should default from the user's local calendar date"
);

assert.doesNotMatch(
  assessmentForm,
  /toISOString\(\)\.slice\(0,\s*10\)/,
  "Inspection Date default should avoid UTC ISO slicing"
);

assert.match(
  assessmentForm,
  /inspectionDate,[\s\S]*riskLevel: calculated\.riskLevel,[\s\S]*input: storedInput/s,
  "Stored assessment should send inspectionDate as a top-level field before input/result snapshots"
);

assert.match(
  types,
  /inspectionDate\?: string;/,
  "StoredAssessment type should keep inspectionDate optional for legacy compatibility"
);

assert.match(
  apiClient,
  /inspectionId\?: string;/,
  "Report response type should include optional inspectionId"
);

assert.match(
  assessmentForm,
  /errors\.inspectionDate = "Enter the inspection date\."/,
  "Missing Inspection Date should block submission with the existing field-error style"
);

assert.match(
  assessmentForm,
  /<form className=\{`\$\{title \|\| description \? "mt-8" : ""\} space-y-6`\} noValidate onSubmit=\{onSubmit\}>/,
  "Shared validation should render field errors instead of relying only on native browser validation"
);

assert.match(
  assessmentForm,
  /errors\.inspectionDate = "Enter a valid inspection date\."/,
  "Invalid Inspection Date should block submission with the existing field-error style"
);

assert.match(
  assessmentForm,
  /isValidDateInputValue\(inspectionDate\)/,
  "Inspection Date validation should reject impossible calendar dates"
);

assert.match(
  assessmentForm,
  /error instanceof ApiError && error\.fields\?\.inspectionDate/,
  "Backend inspectionDate validation errors should flow into frontend field errors"
);

assert.doesNotMatch(
  sanitizeInputBlock,
  /inspectionDate/,
  "Inspection Date should not be inserted into assessment input snapshots"
);

assert.match(
  assessmentForm,
  /await createAssessmentRecord\(storedAssessment\);[\s\S]*await createReportRecord\(storedAssessment\);/,
  "Existing assessment save then report-generation payload behavior should remain unchanged"
);

assert.match(
  externalPage,
  /inspectionDate: loadedRecord\.assessment\.inspectionDate/,
  "External loaded pipe data should restore inspectionDate when available"
);

assert.match(
  internalPage,
  /inspectionDate: loadedRecord\.assessment\.inspectionDate/,
  "Internal loaded pipe data should restore inspectionDate when available"
);

console.log("Frontend assessment inspection date tests passed.");
