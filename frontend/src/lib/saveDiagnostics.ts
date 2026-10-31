import { AssessmentKind } from "@/lib/types";

type SaveDiagnosticEvent = {
  event: string;
  assessmentKind?: AssessmentKind;
  submitHandlerEntered?: boolean;
  submitLock?: "acquired" | "already_locked";
  nativeFormValid?: boolean;
  validationFailureFields?: string[];
  storedAssessmentConstructed?: boolean;
  apiBaseUrl?: string;
  requestMethod?: string;
  requestPath?: string;
  requestBodyBytes?: number;
  requestTimeoutMs?: number;
  authTokenExists?: boolean;
  fetchStarted?: boolean;
  responseStatus?: number;
  errorName?: string;
  assessmentSaveCompleted?: boolean;
  reportSaveStarted?: boolean;
  reportSaveCompleted?: boolean;
  navigationAttempted?: boolean;
};

export function isFrontendSaveDiagnosticsEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_SAVE_DIAGNOSTICS === "true";
}

export function getCurrentBrowserOrigin() {
  return typeof window === "undefined" ? null : window.location.origin;
}

export function getSanitizedErrorName(error: unknown) {
  if (error instanceof Error) {
    return error.name || error.constructor.name || "Error";
  }

  return typeof error;
}

export function getSanitizedRequestPath(path: string) {
  return path.split("?")[0];
}

export function logSaveDiagnostic(event: SaveDiagnosticEvent) {
  if (!isFrontendSaveDiagnosticsEnabled()) {
    return;
  }

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      currentBrowserOrigin: getCurrentBrowserOrigin(),
      ...event
    })
  );
}
