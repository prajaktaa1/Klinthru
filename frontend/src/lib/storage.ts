import { StoredAssessment } from "@/lib/types";

const UNSAVED_DRAFT_KEY = "klinthru-unsaved-assessment-draft";

export function saveUnsavedAssessmentDraft(assessment: StoredAssessment) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(UNSAVED_DRAFT_KEY, JSON.stringify(assessment));
}

export function loadUnsavedAssessmentDraft(): StoredAssessment | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(UNSAVED_DRAFT_KEY);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as StoredAssessment;
  } catch {
    return null;
  }
}

export function clearUnsavedAssessmentDraft() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(UNSAVED_DRAFT_KEY);
}
