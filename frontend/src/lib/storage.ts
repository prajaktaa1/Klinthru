import { StoredAssessment } from "@/lib/types";

export const STORAGE_KEY = "klinthur-assessments";
export const REPORT_KEY = "klinthur-active-report";

const legacySeedIds = new Set(["seed-ext-1", "seed-int-1", "seed-ext-2"]);
const legacyPipelineNames = new Set([
  "North Loop Segment A",
  "Central Gas Trunkline",
  "East Distribution Header"
]);

function isLegacyDemoAssessment(assessment: StoredAssessment) {
  return legacySeedIds.has(assessment.id) || legacyPipelineNames.has(assessment.pipelineName);
}

function sanitizeAssessments(assessments: StoredAssessment[]) {
  return assessments.filter((assessment) => !isLegacyDemoAssessment(assessment));
}

function readStoredAssessments() {
  if (typeof window === "undefined") {
    return [];
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return [];
  }

  try {
    return sanitizeAssessments(JSON.parse(stored) as StoredAssessment[]);
  } catch {
    return [];
  }
}

export function clearDemoFallbackData() {
  if (typeof window === "undefined") {
    return;
  }

  const assessments = readStoredAssessments();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(assessments));

  const activeReport = window.localStorage.getItem(REPORT_KEY);
  if (!activeReport) {
    return;
  }

  try {
    const parsed = JSON.parse(activeReport) as StoredAssessment;
    if (isLegacyDemoAssessment(parsed)) {
      window.localStorage.removeItem(REPORT_KEY);
    }
  } catch {
    window.localStorage.removeItem(REPORT_KEY);
  }
}

export function loadAssessments(): StoredAssessment[] {
  const assessments = readStoredAssessments();

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(assessments));
  }

  return assessments;
}

export function saveAssessment(assessment: StoredAssessment) {
  const current = loadAssessments();
  const next = [assessment, ...current].slice(0, 12);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.localStorage.setItem(REPORT_KEY, JSON.stringify(assessment));
}

export function replaceAssessmentsCache(assessments: StoredAssessment[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeAssessments(assessments)));
}

export function setActiveReport(assessment: StoredAssessment) {
  if (typeof window === "undefined" || isLegacyDemoAssessment(assessment)) {
    return;
  }

  window.localStorage.setItem(REPORT_KEY, JSON.stringify(assessment));
}

export function loadActiveReport(): StoredAssessment | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(REPORT_KEY);
  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored) as StoredAssessment;
    return isLegacyDemoAssessment(parsed) ? null : parsed;
  } catch {
    return null;
  }
}
