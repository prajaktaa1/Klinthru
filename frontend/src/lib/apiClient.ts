import { getStoredAuthToken } from "@/lib/authStorage";
import {
  AssessmentKind,
  AssessmentPipeDataRecord,
  AssessmentPipeDataSummary,
  AuthUser,
  DeviceRecord,
  StoredAssessment
} from "@/lib/types";

export type ReportRecord = {
  id: string;
  assessmentId: string;
  assessmentType: "External" | "Internal";
  pipelineName: string;
  riskLevel: "High" | "Medium" | "Low";
  input: Record<string, string | number>;
  result: Record<string, string | number>;
  generatedAt: string;
  createdAt: string;
  authorId?: string;
  createdByName?: string;
  createdByEmail?: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4002";
const API_REQUEST_TIMEOUT_MS = 5000;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export class BackendUnavailableError extends Error {
  constructor() {
    super("Backend is not running. Please start backend on port 4002.");
    this.name = "BackendUnavailableError";
  }
}

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredAuthToken();
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers || {})
      },
      cache: "no-store",
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof TypeError || (error instanceof DOMException && error.name === "AbortError")) {
      throw new BackendUnavailableError();
    }

    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
  }

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event("klinthru:unauthorized"));
    }

    throw new ApiError(`API request failed: ${response.status}`, response.status);
  }

  return response.json() as Promise<T>;
}

export function isUnauthorizedError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 401;
}

export function isBackendUnavailableError(error: unknown): error is BackendUnavailableError {
  return error instanceof BackendUnavailableError;
}

export function login(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export function logout(): Promise<{ message: string }> {
  return request<{ message: string }>("/api/auth/logout", {
    method: "POST"
  });
}

export function fetchCurrentUser(): Promise<AuthUser> {
  return request<AuthUser>("/api/auth/me");
}

export function fetchDeviceRecords(search?: {
  deviceType?: string;
  status?: string;
}): Promise<DeviceRecord[]> {
  const params = new URLSearchParams();

  if (search?.deviceType?.trim()) {
    params.set("deviceType", search.deviceType.trim());
  }

  if (search?.status?.trim()) {
    params.set("status", search.status.trim());
  }

  const query = params.toString();
  return request<DeviceRecord[]>(`/api/devices${query ? `?${query}` : ""}`);
}

export function fetchAssessments(): Promise<StoredAssessment[]> {
  return request<StoredAssessment[]>("/api/assessments");
}

export function createAssessment(assessment: StoredAssessment): Promise<StoredAssessment> {
  return request<StoredAssessment>("/api/assessments", {
    method: "POST",
    body: JSON.stringify(assessment)
  });
}

export function fetchReports(): Promise<ReportRecord[]> {
  return request<ReportRecord[]>("/api/reports");
}

export function searchReports(search?: {
  pipelineName?: string;
  reportId?: string;
}): Promise<ReportRecord[]> {
  const params = new URLSearchParams();

  if (search?.pipelineName?.trim()) {
    params.set("pipelineName", search.pipelineName.trim());
  }

  if (search?.reportId?.trim()) {
    params.set("reportId", search.reportId.trim());
  }

  const query = params.toString();
  return request<ReportRecord[]>(`/api/reports${query ? `?${query}` : ""}`);
}

export function fetchReportById(id: string): Promise<ReportRecord> {
  return request<ReportRecord>(`/api/reports/${id}`);
}

export function createReport(assessment: StoredAssessment): Promise<ReportRecord> {
  return request<ReportRecord>("/api/reports", {
    method: "POST",
    body: JSON.stringify({
      assessmentId: assessment.id,
      assessment
    })
  });
}

export async function downloadReportFile(id: string, format: "pdf" | "word") {
  const token = getStoredAuthToken();
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/reports/${id}/download/${format}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      cache: "no-store",
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof TypeError || (error instanceof DOMException && error.name === "AbortError")) {
      throw new BackendUnavailableError();
    }

    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
  }

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event("klinthru:unauthorized"));
    }

    throw new ApiError(`API request failed: ${response.status}`, response.status);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const filenameMatch = disposition.match(/filename="([^"]+)"/i);

  return {
    blob,
    filename: filenameMatch?.[1] || `assessment-report.${format === "pdf" ? "pdf" : "doc"}`
  };
}

export function fetchAssessmentPipeDataHistory(search?: {
  assessmentType?: AssessmentKind | "All";
  pipelineName?: string;
  pipeId?: string;
  locationId?: string;
  savedDate?: string;
}): Promise<AssessmentPipeDataSummary[]> {
  const params = new URLSearchParams();

  if (search?.assessmentType?.trim()) {
    params.set("assessmentType", search.assessmentType.trim());
  }

  if (search?.pipelineName?.trim()) {
    params.set("pipelineName", search.pipelineName.trim());
  }

  if (search?.pipeId?.trim()) {
    params.set("pipeId", search.pipeId.trim());
  }

  if (search?.locationId?.trim()) {
    params.set("locationId", search.locationId.trim());
  }

  if (search?.savedDate?.trim()) {
    params.set("savedDate", search.savedDate.trim());
  }

  const query = params.toString();
  return request<AssessmentPipeDataSummary[]>(`/api/external-pipe-data${query ? `?${query}` : ""}`);
}

export function fetchAssessmentPipeDataRecord(id: string): Promise<AssessmentPipeDataRecord> {
  return request<AssessmentPipeDataRecord>(`/api/external-pipe-data/${id}`);
}

export function createAssessmentPipeDataRecord(assessment: StoredAssessment): Promise<AssessmentPipeDataRecord> {
  return request<AssessmentPipeDataRecord>("/api/external-pipe-data", {
    method: "POST",
    body: JSON.stringify(assessment)
  });
}

export function updateAssessmentPipeDataRecord(
  id: string,
  assessment: StoredAssessment
): Promise<AssessmentPipeDataRecord> {
  return request<AssessmentPipeDataRecord>(`/api/external-pipe-data/${id}`, {
    method: "PUT",
    body: JSON.stringify(assessment)
  });
}

export async function downloadAssessmentPipeDataFile(id: string, format: "pdf" | "word") {
  const token = getStoredAuthToken();
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/external-pipe-data/${id}/download/${format}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      cache: "no-store",
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof TypeError || (error instanceof DOMException && error.name === "AbortError")) {
      throw new BackendUnavailableError();
    }

    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
  }

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event("klinthru:unauthorized"));
    }

    throw new ApiError(`API request failed: ${response.status}`, response.status);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const filenameMatch = disposition.match(/filename="([^"]+)"/i);

  return {
    blob,
    filename: filenameMatch?.[1] || `assessment-pipe-data.${format === "pdf" ? "pdf" : "doc"}`
  };
}
