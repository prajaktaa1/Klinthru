import type { TreatmentRecord, TreatmentRevisionRecord, TreatmentListRow, TreatmentSummary, TreatmentScope } from "../types/riskTreatment";
import { validateTreatmentBaseline } from "../validation/riskTreatmentValidation";
import { riskScopeSnapshotSchema } from "../validation/riskAssessmentValidation";

export const treatmentMissing = "MISSING FIELD — APPROVAL NEEDED";
export function selectTreatmentRevision(record: TreatmentRecord, basis?: TreatmentScope["basis"], revisionId?: string) {
  if (revisionId) return record.revisions.find(revision => revision.id === revisionId) ?? null;
  if (basis === "verified") return null; // Completion alone must never select a verified outcome.
  if (basis === "approved") {
    const revision = record.revisions.find(value => value.id === record.currentApprovedRevisionId);
    return revision?.state === "Approved" && revision.contentHash && revision.submittedAt ? revision : null;
  }
  return [...record.revisions].sort((a, b) => b.revisionNumber - a.revisionNumber)[0] ?? null;
}
export function treatmentListRow(record: TreatmentRecord, revision: TreatmentRevisionRecord): TreatmentListRow {
  const result = validateTreatmentBaseline(record, revision);
  if (revision.actionLinks.some(link => link.riskRecordId !== record.riskRecordId || link.treatmentRevisionId !== revision.id) || new Set(revision.actionLinks.map(link => link.actionId)).size !== revision.actionLinks.length) throw new Error("Invalid/duplicate action link.");
  const benefit = revision.expectedBenefit as { label?: unknown } | null;
  return { treatmentId: record.treatmentId, revisionId: revision.id, revisionNumber: revision.revisionNumber, title: revision.title, state: revision.state,
    riskId: record.risk.riskId, riskTitle: riskScopeSnapshotSchema.parse(revision.baselineRevision.scopeScenarioSnapshot).title,
    pipelineId: record.risk.pipelineId, pipelineName: record.risk.pipeline.pipelineName, pipelineCode: record.risk.pipeline.pipelineCode,
    currentRiskLevel: result.current.level, controlType: revision.treatmentType, benefit: typeof benefit?.label === "string" ? benefit.label : null, actionIds: revision.actionLinks.map(link => link.actionId) };
}
export function blockedTreatmentSummary(status: TreatmentSummary["status"], reason: string, basis?: TreatmentScope["basis"]): TreatmentSummary {
  return { status, reason, basis: basis ?? null,
    actions: { status: "unavailable", reason, total: null, byStatus: [], overdue: null },
    cost: { status: "approval-needed", reason: `${treatmentMissing}: cost population, estimate/actual basis, currency and overlap policy.`, amount: null, currency: null },
    reduction: { status: "approval-needed", reason: `${treatmentMissing}: comparable revision population, metric, unit, denominator and rounding.`, before: null, after: null, percent: null, unit: null },
    alarp: { status: "approval-needed", reason: `${treatmentMissing}: versioned ALARP criteria, evidence and governed approval.`, outcome: null }, costReductionChart: [], residualProfile: [] };
}
