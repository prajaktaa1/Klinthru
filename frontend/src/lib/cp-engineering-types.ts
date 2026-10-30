export const CP_BASIS_MISSING = "MISSING FIELD — APPROVAL NEEDED";
export type BasisChild = { id: string; [key: string]: any };
export type BasisEvent = { id: string; eventType: string; actorId: string; actorName?: string; occurredAt: string; effectiveAt?: string | null; comment?: string | null; reason?: string | null; before?: unknown; after?: unknown };
export type DesignBasisRevision = {
  id: string; basisId: string; basisNumber: string; revisionCode: string; title: string; categoryKey: string; categoryLabel: string; description: string | null; systemType: string | null;
  pipeline: { id: string; pipelineCode: string; pipelineName: string }; lockState: "DRAFT" | "LOCKED"; rowVersion: number; contentHash: string | null; submittedById: string | null;
  lifecycleStatus: string; reviewStatus?: string | null; lastContentUpdatedAt: string; nextReviewDueAt: string | null; approvedBy?: string | null; approvedAt?: string | null;
  checklistVersion: string | null; checklistSnapshot: Record<string, any>; metricPolicyVersion: string | null; metricPolicySnapshot: Record<string, any>;
  assumptions: BasisChild[]; scope: BasisChild[]; evidence: BasisChild[]; sourceDocuments: BasisChild[]; standards: BasisChild[]; criteriaBindings: BasisChild[]; checks: BasisChild[];
  events: BasisEvent[]; effectiveFrom?: string | null; effectiveTo?: string | null; writesEnabled?: boolean;
};
export type BasisFilters = { pipelineId: string; segmentId: string; systemType: string; designStatus: string; standardKey: string; q: string; sort: string; includeDrafts: string; page: number; pageSize: number; asOf?: string };
export type BasisMetric = { value: number | null; numerator: number | null; denominator: number | null; excludedCount: number; availability: boolean; unavailableReason: string | null };
export type BasisSummary = {
  kpis: Record<"designBasisDocuments" | "approvedStandards" | "soilDataAvailability" | "coatingDataCompleteness" | "designBasisReadiness", BasisMetric>;
  meetsMinimumRequirements: boolean; totalBasisItems: number; calculatedAt: string; definitionVersion: string; presentationConflicts: string[]; filterScope: BasisFilters;
  charts: { completenessByCategory: (BasisMetric & { key: string; label: string })[]; documentStatus: { label: string; count: number; percent: number | null }[]; documentStatusTotal: number; availability: boolean; unavailableReason: string | null };
};
export type BasisOptions = {
  pipelines: { id: string; pipelineCode: string; pipelineName: string }[];
  segments: { id: string; pipelineId: string; segmentId: string; name?: string }[];
  assets: { id: string; pipelineId: string; segmentId?: string; assetId: string; name?: string }[];
  criteriaVersions: { id: string; criteriaSetId: string; name: string; version: string; pipelineId: string | null }[];
  standards: { key: string; label: string }[]; categories: { key: string; label: string }[]; systemTypes: string[]; designStatuses: string[]; pageSizes: number[]; writesEnabled: boolean; missingOptions: string[];
};
export type BasisList = { items: DesignBasisRevision[]; total: number; page: number; pageSize: number };
