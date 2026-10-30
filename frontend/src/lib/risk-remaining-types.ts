import type { OfficialRiskResult } from "./risk-assessment-types";
import type { OfficialRiskRow } from "./risk-assessment-types";
export type RiskBasis = "inherent" | "current" | "residual";
export type OfficialContext = {
  asOf: string; population: string; total: number; basis: "Current approved risk";
  summary: { total: number; high: number; medium: number; low: number; overdueReviews: number } | null;
  methodology: { id: string; methodologyId: string; name: string; version: string; likelihoodRuleVersion: string; consequenceRuleVersion: string };
  matrix: { id: string; matrixId: string; name: string; version: string };
};
export type RiskEnvelope = { scope: { pipelineId: string | null; methodologyVersionId: string | null }; status: "available" | "partial" | "unavailable"; reason: string | null; context: OfficialContext | null };
export type DriversRead = RiskEnvelope & { contextReason: string | null; drivers: null };
export type SavedResult = OfficialRiskResult;
export type RegisterRow = OfficialRiskRow & { ownerName: string | null; segmentLabel: string | null; nextReview: string | null; linkedDefectId: null };
export type RegisterRead = RiskEnvelope & { rows: RegisterRow[]; metadataReason: string | null };
export type RegisterFilters = { q: string; pipeline: string; segment: string; category: string; statuses: string[] };
export function filterRegisterRows(rows: RegisterRow[], filter: RegisterFilters) {
  const q = filter.q.toLocaleLowerCase();
  return rows.filter(row => (!filter.pipeline || row.pipelineId === filter.pipeline) && (!filter.segment || row.segmentLabel === filter.segment) && (!filter.category || row.category === filter.category) && (!filter.statuses.length || filter.statuses.includes(row.status)) && (!q || [row.riskId, row.title, row.pipelineName, row.pipelineCode, row.sourceCategory].some(value => value.toLocaleLowerCase().includes(q))));
}
export type HistoryRead = RiskEnvelope & { options: import("./risk-assessment-detail-types").DetailOptions; selectedReason: string | null; selected: null | {
  riskId: string; revisionId: string; revisionNumber: number; approvalStatus: string; historical: boolean; assessmentDate: string;
  results: { inherent: SavedResult | null; current: SavedResult | null; residual: SavedResult | null };
  methodology: { id: string; methodologyId: string; name: string; version: string; likelihoodRuleVersion: string; consequenceRuleVersion: string };
  matrix: { id: string; matrixId: string; version: string };
  reviews: { id: string; purpose: string; dueDate: string; reviewerId: string | null; reviewerName: string | null; completedAt?: string | null }[];
  history: import("./risk-assessment-detail-types").DetailHistory[];
} };
export type ReportingRead = RiskEnvelope & { templates: null; categories: null; preview: null; schedules: null; recent: null; reportingRoute: "/report"; mutationsEnabled: false };
