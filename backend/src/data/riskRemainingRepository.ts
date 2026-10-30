import { riskMatrixRepository } from "./riskMatrixRepository";
import type { AuthUser } from "../types/domain";
import type { RiskScope } from "../types/riskAssessment";

export type MatrixReader = typeof riskMatrixRepository.read;
export function officialContext(item: NonNullable<Awaited<ReturnType<MatrixReader>>["item"]>) {
  return { asOf: item.asOf, population: item.population, total: item.total, summary: item.summary,
    basis: "Current approved risk" as const, methodology: item.methodology,
    matrix: { id: item.matrix.id, matrixId: item.matrix.matrixId, name: item.matrix.name, version: item.matrix.version } };
}
/** Attribution is deliberately unavailable; categories and source counts are not Drivers. */
export function createRiskDriversRepository(read: MatrixReader = riskMatrixRepository.read) {
  return { async read(user: AuthUser, scope: RiskScope) {
    const scopeTag = { pipelineId: scope.pipelineId ?? null, methodologyVersionId: scope.methodologyVersionId ?? null };
    try {
      const result = await read(user, scope);
      return { scope: scopeTag, status: result.item ? "partial" as const : "unavailable" as const,
        reason: "MISSING FIELD — APPROVAL NEEDED: versioned Driver attribution, evidence classification, denominators, rankings, averages and historical calculation rules.",
        context: result.item ? officialContext(result.item) : null, contextReason: result.reason, drivers: null };
    } catch { return { scope: scopeTag, status: "unavailable" as const, reason: "Official Risk context is unavailable. No Driver records or defaults are substituted.", context: null, contextReason: null, drivers: null }; }
  } };
}
export const riskDriversRepository = createRiskDriversRepository();
