import type { CpMonitoringRealData, IliDataResponse, IliRunSummary, ReportRecord } from "@/lib/apiClient";
import type { PipelineHistory, StoredAssessment } from "@/lib/types";

export const inspectionUnavailable = "Not Available";
export function isSampleInspection(row: { reference?: string; vendor?: string | null; findings?: string | null }) {
  return [row.reference, row.vendor, row.findings].some(value => /\bDEMO DATA\b|(?:^|[-_])DEMO(?:[-_]|$)/i.test(value ?? ""));
}
export type InspectionHistoryRow = {
  key: string; id: string; reference: string; source: "Assessment" | "Report" | "ILI" | "CP Survey" | "Manual";
  type: string; date?: string; createdAt?: string; pipelineId: string;
  vendor?: string | null; createdBy?: string; risk?: string; status?: string;
  findings?: string | null; nextDue?: string; segmentId?: string; linkedDefects?: number;
  reports: ReportRecord[]; assessment?: StoredAssessment; run?: IliRunSummary;
};

// These APIs have no approved segment, next-due, linked-defect or ECDA mapping.
// Keep those fields absent instead of deriving engineering relationships.
export function inspectionRows(pipelineId: string, history: PipelineHistory | null, ili: IliDataResponse<IliRunSummary> | null, cp: CpMonitoringRealData | null): InspectionHistoryRow[] {
  const scoped = history?.pipeline?.id === pipelineId ? history : null;
  const assessments = [...(scoped?.externalAssessments ?? []), ...(scoped?.internalAssessments ?? [])].filter((item) => item.pipelineId === pipelineId);
  const reports = (scoped?.reports ?? []).filter((item) => item.pipelineId === pipelineId);
  const rows: InspectionHistoryRow[] = assessments.map((item) => ({
    key: `Assessment:${item.id}`, id: item.id, reference: item.id, source: "Assessment", type: `${item.type} Assessment`, pipelineId,
    date: item.inspectionDate, createdAt: item.createdAt, risk: item.riskLevel,
    findings: item.result?.majorModeOfFailure, assessment: item,
    reports: reports.filter((report) => (report.inspectionId ?? report.assessmentId) === item.id && report.assessmentType === item.type)
  }));
  rows.push(...reports.map((item): InspectionHistoryRow => {
    const assessment = assessments.find((candidate) => candidate.id === (item.inspectionId ?? item.assessmentId) && candidate.type === item.assessmentType);
    return { key: `Report:${item.id}`, id: item.id, reference: item.id, source: "Report", type: `${item.assessmentType} Report`, pipelineId,
      date: item.inspectionDate || assessment?.inspectionDate, createdAt: item.createdAt, createdBy: item.createdByName,
      risk: item.riskLevel, findings: typeof item.result?.majorModeOfFailure === "string" ? item.result.majorModeOfFailure : undefined,
      assessment, reports: [item] };
  }));
  if (ili?.pipelineId === pipelineId && ili.status === "available") rows.push(...ili.data.filter((item) => item.pipelineId === pipelineId).map((item): InspectionHistoryRow => ({
    key: `ILI:${item.id}`, id: item.id, reference: item.runReference || item.id, source: "ILI", type: "ILI", pipelineId,
    date: item.inspectionDate, createdAt: item.createdAt, vendor: item.vendor, status: item.status, findings: item.notes, run: item, reports: []
  })));
  if (cp?.pipelineId === pipelineId && cp.availability?.surveys?.available) rows.push(...cp.surveys.map((item): InspectionHistoryRow => ({
    key: `CP Survey:${item.id}`, id: item.id, reference: item.surveyName || item.id, source: "CP Survey", type: "CP Survey", pipelineId,
    date: item.surveyDate, status: item.status, reports: []
  })));
  return [...new Map(rows.map((row) => [row.key, row])).values()];
}

export function inspectionDate(value?: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return inspectionUnavailable;
  return value.slice(0, 10);
}

export type InspectionFilters = { kind: string; segment: string; status: string; from: string; to: string; query: string };
export const emptyInspectionFilters: InspectionFilters = { kind: "All Types", segment: "ALL", status: "ALL", from: "", to: "", query: "" };
export function filterInspections(rows: InspectionHistoryRow[], filters: InspectionFilters) {
  const query = filters.query.trim().toLowerCase();
  return rows.filter((row) => {
    const date = inspectionDate(row.date);
    return (filters.kind === "All Types" || row.source === filters.kind || row.type === filters.kind)
      && (filters.segment === "ALL" || (row.segmentId ?? "MISSING") === filters.segment)
      && (filters.status === "ALL" || (row.status ?? "MISSING") === filters.status)
      && (!filters.from || (date !== inspectionUnavailable && date >= filters.from))
      && (!filters.to || (date !== inspectionUnavailable && date <= filters.to))
      && (!query || [row.id, row.reference, row.type, row.vendor, row.findings, row.createdBy, row.risk, row.status].some((value) => value?.toLowerCase().includes(query)));
  });
}
