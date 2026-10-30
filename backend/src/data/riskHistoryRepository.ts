import { z } from "zod";
import { riskScopeSchema } from "../validation/riskAssessmentValidation";
import { riskMatrixRepository } from "./riskMatrixRepository";
import { assessmentDetailRepository } from "./riskAssessmentDetailRepository";
import { officialContext, type MatrixReader } from "./riskRemainingRepository";
import type { AuthUser } from "../types/domain";
export const historyScopeSchema = riskScopeSchema.extend({ riskId: z.string().min(1).max(200).optional(), revisionId: z.string().min(1).max(200).optional() }).strict().refine(s => Boolean(s.riskId) === Boolean(s.revisionId), "Select an exact Risk/revision pair");
type Detail = Pick<typeof assessmentDetailRepository, "options" | "detail">;
export function createRiskHistoryRepository(read: MatrixReader = riskMatrixRepository.read, details: Detail = assessmentDetailRepository) {
  return { async read(user: AuthUser, scope: z.infer<typeof historyScopeSchema>) {
    const tag = { pipelineId: scope.pipelineId ?? null, methodologyVersionId: scope.methodologyVersionId ?? null };
    const contextRead = await read(user, { pipelineId: scope.pipelineId, methodologyVersionId: scope.methodologyVersionId }).catch(() => null);
    const options = await details.options(user, { pipelineId: scope.pipelineId, methodologyVersionId: scope.methodologyVersionId }).catch(() => ({ status: "unavailable", reason: "Saved revision options unavailable.", items: [] }));
    let selected = null, selectedReason: string | null = null;
    if (scope.riskId && scope.revisionId && scope.methodologyVersionId) {
      const result = await details.detail(user, { pipelineId: scope.pipelineId, methodologyVersionId: scope.methodologyVersionId, riskId: scope.riskId, revisionId: scope.revisionId }).catch(() => null);
      const item = result?.item;
      if (item && item.riskId === scope.riskId && item.revisionId === scope.revisionId && item.methodology.id === scope.methodologyVersionId) selected = {
        riskId: item.riskId, revisionId: item.revisionId, revisionNumber: item.revisionNumber, approvalStatus: item.approvalStatus, historical: item.historical, assessmentDate: item.assessmentDate,
        results: item.results, methodology: item.methodology, matrix: { id: item.matrix.id, matrixId: item.matrix.matrixId, version: item.matrix.version }, reviews: item.reviews, history: item.history };
      else selectedReason = "Exact authorized saved Risk/revision detail unavailable; no other revision substituted.";
    }
    return { scope: tag, status: options.status === "available" || contextRead?.item ? "partial" as const : "unavailable" as const,
      reason: "MISSING FIELD — APPROVAL NEEDED: historical population/as-of rules, comparable versions, time buckets, movement metrics, review cadence and baseline calculations.",
      context: contextRead?.item ? officialContext(contextRead.item) : null, options, selected, selectedReason };
  } };
}
export const riskHistoryRepository = createRiskHistoryRepository();
