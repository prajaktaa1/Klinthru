/** Official risk contracts. Corrosion StoredAssessment is deliberately separate. */
export const riskTabs = ["Overview", "Risk Register", "Risk Assessment", "Risk Matrix", "Risk Drivers", "Mitigation & ALARP", "Trends & Historical", "Reports", "Related Data", "Configuration"] as const;
export type RiskTab = typeof riskTabs[number];
export type RiskReadiness = "available" | "approval-needed" | "schema-unavailable" | "unavailable";
export type OfficialRiskResult = {
  likelihood: number;
  consequence: number;
  score: number;
  level: string;
};
export type OfficialRiskRow = {
  riskId: string;
  title: string;
  pipelineId: string;
  pipelineName: string;
  pipelineCode: string;
  category: string;
  sourceCategory: string;
  status: string;
  inherent: OfficialRiskResult;
  current: OfficialRiskResult;
  residual: OfficialRiskResult;
  revisionId: string;
  assessmentDate: string;
};
export type RiskDistribution = { label: string; count: number };
export type RiskOverview = {
  status: RiskReadiness;
  reasons: string[];
  asOf: string;
  methodologyVersionId: string | null;
  basis: "Current approved risk";
  population: "Active official Risk_ID records";
  summary: { total: number; high: number; medium: number; low: number; overdueReviews: number } | null;
  matrix: { likelihood: number; consequence: number; count: number; level: string }[];
  byPipeline: RiskDistribution[];
  byCategory: RiskDistribution[];
  bySource: RiskDistribution[];
  byStatus: RiskDistribution[];
  latest: OfficialRiskRow[];
  reviews: { riskId: string; title: string; dueDate: string; daysLeft: number }[];
  locationRecords: { riskId: string; assetName: string; latitude: number; longitude: number; level: string }[];
  comparisons: { status: "approval-needed"; reason: string };
};
export type RiskMethodologyOption = { id: string; methodologyId: string; version: string; name: string };
