export type RiskConfigurationData = { status: "available" | "unavailable"; reason: string | null; item: null | {
  scope: { pipelineId: string | null; methodologyVersionId: string }; verification: "incomplete";
  methodology: { id: string; methodologyId: string; name: string; version: string; approvedAt: string; likelihoodRuleVersion: string; consequenceRuleVersion: string };
  matrix: { id: string; matrixId: string; name: string; version: string; approvedAt: string; cells: { likelihood: number; consequence: number; level: string }[] | null;
    likelihoodDictionary: { level: number; label: string }[] | null; consequenceDictionary: { level: number; label: string }[] | null };
  categories: string[] | null; levels: string[] | null;
  reviews: { status: "available" | "unavailable"; reason: string | null; truncated: boolean; items: { reviewId: string; riskId: string; revisionId: string; purpose: string; dueDate: string }[] };
  integrations: { status: "available" | "unavailable"; reason: string | null; truncated: boolean; items: { id: string; name: string; enabled: boolean; status: "Ready" | "Degraded" | "Failed" | "Disabled"; lastTestedAt: string | null; lastSuccessfulTestAt: string | null }[] };
  checks: { label: string; verified: boolean; reason: string }[]; missing: string[];
} };
