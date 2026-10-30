import { riskMatrixRepository } from "./riskMatrixRepository";
import { officialContext, type MatrixReader } from "./riskRemainingRepository";
import type { AuthUser } from "../types/domain";
import type { RiskScope } from "../types/riskAssessment";
/** Reports & Analytics owns runs/documents. Legacy Assessment reports are not official Risk runs. */
export function createRiskReportingRepository(read: MatrixReader = riskMatrixRepository.read) {
  return { async read(user: AuthUser, scope: RiskScope) {
    const tag = { pipelineId: scope.pipelineId ?? null, methodologyVersionId: scope.methodologyVersionId ?? null };
    const result = await read(user, scope).catch(() => null);
    return { scope: tag, status: result?.item ? "partial" as const : "unavailable" as const,
      reason: "MISSING FIELD — APPROVAL NEEDED: Reports & Analytics official Risk template, Report_Run_ID, Document_ID, preview, schedule and export contracts.",
      context: result?.item ? officialContext(result.item) : null, templates: null, categories: null, preview: null, schedules: null, recent: null,
      reportingRoute: "/report" as const, mutationsEnabled: false as const };
  } };
}
export const riskReportingRepository = createRiskReportingRepository();
