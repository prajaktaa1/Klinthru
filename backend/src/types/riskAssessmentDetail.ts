import type { RiskResult } from "./riskAssessment";
import type { CentralAction } from "./riskTreatment";
import type { SourceReference, SourceMetadata } from "./riskRelatedData";

export type DetailRevision = {
  id: string; riskRecordId: string; assessmentId: string; revisionNumber: number; approvalStatus: string; concurrencyVersion: number;
  methodologyVersionId: string; matrixVersionId: string; assessmentDate: Date; assessorId: string; category: string;
  scopeScenarioSnapshot: unknown; likelihoodAssessment: unknown; consequenceAssessment: unknown; controls: unknown; assumptions: unknown; limitations: unknown;
  inherentResult: unknown; currentResult: unknown; residualResult: unknown; sourceSnapshot: unknown; confidence: string | null; dataSufficiency: string; submittedAt: Date | null; approvedAt: Date | null; contentHash: string | null;
  assessment: { id: string; riskRecordId: string; createdById: string; createdAt: Date };
  methodologyVersion: { id: string; name: string; methodologyId: string; version: string; approvalStatus: string; likelihoodRuleVersion: string; consequenceRuleVersion: string; matrixVersion: { id: string; matrixId: string; name: string; version: string; approvalStatus: string; cells: unknown; likelihoodDictionary: unknown; consequenceDictionary: unknown } };
  reviews: { id: string; riskRecordId: string; revisionId: string; dueDate: Date; purpose: string; reviewerId: string | null; completedAt: Date | null }[];
  approvals: { id: string; revisionId: string; reviewId: string | null; decision: string; actorId: string; justification: string; decidedAt: Date }[];
  events: { id: string; riskRecordId: string; revisionId: string | null; eventType: string; actorId: string | null; occurredAt: Date }[];
};
export type DetailRiskRecord = { id: string; riskId: string; pipelineId: string; currentApprovedRevisionId: string | null; ownerId: string | null; owner: { id: string; name: string } | null; pipeline: { id: string; pipelineName: string; pipelineCode: string; createdById: string | null }; sourceLinks: SourceReference[]; revisions: DetailRevision[]; treatments: { id: string; riskRecordId: string; currentApprovedRevisionId: string | null; currentApprovedRevision: null | { id: string; riskRecordId: string; treatmentId: string; baselineRevisionId: string; state: string; submittedAt: Date | null; contentHash: string | null; actionLinks: { riskRecordId: string; treatmentRevisionId: string; actionId: string }[] } }[] };
export type DetailReader = { findMany(args: unknown): Promise<DetailRiskRecord[]>; readUser(id: string): Promise<{ name: string } | null>; readTreatments?(riskRecordId: string): Promise<DetailRiskRecord["treatments"]> };
export type DetailScope = { pipelineId?: string; methodologyVersionId?: string; riskId: string; revisionId: string };
export type DetailOptions = { status: string; reason: string | null; items: { riskId: string; revisions: { revisionId: string; revisionNumber: number; status: string; assessmentDate: string }[] }[] };
export type AssessmentNarrative = { justification: string | null; basis: string | null; method: string | null; confidence: string | null; value: number | null; unit: string | null };
export type DetailControl = { id: string | null; name: string | null; type: string | null; effectiveness: string | null; ownerId: string | null; evidenceReferences: string[] | null };
export type DetailHistory = { id: string; kind: "Event" | "Decision"; label: string; actorId: string | null; actorName: string | null; at: string; justification: string | null; reviewId: string | null };
export type AssessmentDetail = { status: "available" | "unavailable" | "approval-needed" | "schema-unavailable"; reason: string | null; item: null | {
  riskId: string; assessmentId: string; revisionId: string; revisionNumber: number; approvalStatus: string; historical: boolean; concurrencyVersion: number; assessmentDate: string; assessorId: string;
  definition: { title: string | null; scenario: string | null; threatType: string | null; initiatingEvent: string | null; location: string | null; assetType: string | null; ownerId: string | null; category: string; liveOwnerName: string | null; pipelineName: string; pipelineCode: string; pipelineId: string };
  results: { inherent: RiskResult | null; current: RiskResult | null; residual: RiskResult | null }; resultReasons: { inherent: string | null; current: string | null; residual: string | null };
  likelihood: AssessmentNarrative | null; consequence: AssessmentNarrative | null; controls: DetailControl[] | null; assumptions: string | null; limitations: string | null;
  internalNotes: null; reviewerNotes: null; notesReason: string;
  sources: { linkId: string; module: string; recordType: string; recordId: string; version: string | null; relationship: string | null; contributionType: string | null; capturedAt: string; contentHash: string; status: "available" | "unavailable"; reason: string | null; live: SourceMetadata | null; versionVerified: boolean }[]; sourceReason: string | null;
  methodology: { id: string; methodologyId: string; name: string; version: string; likelihoodRuleVersion: string; consequenceRuleVersion: string }; matrix: { id: string; matrixId: string; name: string; version: string; cells: { likelihood: number; consequence: number; level: string }[] | null; likelihoodDictionary: { level: number; label: string }[] | null; consequenceDictionary: { level: number; label: string }[] | null };
  reviews: { id: string; purpose: string; dueDate: string; reviewerId: string | null; reviewerName: string | null; completedAt: string | null }[]; history: DetailHistory[]; actions: { status: string; reason: string | null; items: CentralAction[] };
  confidence: string | null; dataSufficiency: string; contentHash: string | null; submittedAt: string | null; approvedAt: string | null; missing: string[];
} };
