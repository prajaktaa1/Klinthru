import { z } from "zod";
import type { AuthUser } from "../types/domain";
import type { MethodologyRecord, RiskReadClient, RiskRecord } from "../types/riskAssessment";
import { riskScopeSchema, riskPolicySchema } from "../validation/riskAssessmentValidation";
import { detailDictionarySchema } from "../validation/riskAssessmentDetailValidation";
import { buildOfficialOverview } from "../utils/riskAssessmentRules";
import { getRiskReader } from "./riskAssessmentRepository";

export const matrixScopeSchema = riskScopeSchema.extend({ category: z.string().trim().min(1).max(120).optional() }).strict();
export const matrixBases = ["inherent", "current", "residual"] as const;
const identity = z.string().trim().min(1);
const metadataSchema = z.object({
  id: identity, methodologyId: identity, name: identity, version: identity,
  likelihoodRuleVersion: identity, consequenceRuleVersion: identity,
  matrixVersion: z.object({ id: identity, matrixId: identity, name: identity, version: identity,
    likelihoodDictionary: z.unknown(), consequenceDictionary: z.unknown() })
});
const missing = ["Approved matrix colors and frequency-legend rules", "Criteria descriptions and quantitative PoF / CoF rules",
  "Historical date-range population rules", "Matrix update timestamp and updater provenance", "Selected-cell narrative", "Risk last-updated provenance"];
function unavailable(reason: string) {
  return { status: "unavailable" as const, reason, item: null };
}

/** Counts only saved results. No scoring, source copying, revision updates or write delegates. */
export function buildRiskMatrix(records: RiskRecord[], method: MethodologyRecord, category?: string, asOf = new Date()) {
  const metadata = metadataSchema.safeParse(method);
  if (!metadata.success) return unavailable("MISSING FIELD — APPROVAL NEEDED: exact methodology/matrix identity and rule versions.");
  const overview = buildOfficialOverview(records, method, asOf);
  if (overview.status !== "available") return unavailable(overview.reasons.join(" "));
  const policy = riskPolicySchema.parse(method.rules);
  if (category && !policy.categoryKeys.includes(category)) return unavailable("MISSING FIELD — APPROVAL NEEDED: category is outside the approved dictionary.");
  const rows = overview.latest.filter(row => !category || row.category === category);
  const scopedOverview = category ? buildOfficialOverview(records.filter(row => row.currentApprovedRevision?.category === category), method, asOf) : overview;
  if (scopedOverview.status !== "available") return unavailable(scopedOverview.reasons.join(" "));
  const dictionary = (value: unknown) => { const parsed = detailDictionarySchema.safeParse(value); return parsed.success ? parsed.data : null; };
  const meta = metadata.data;
  return { status: "available" as const, reason: null, item: {
    asOf: overview.asOf, population: overview.population, total: rows.length, category: category ?? null,
    categories: policy.categoryKeys, summary: scopedOverview.summary,
    methodology: { id: meta.id, methodologyId: meta.methodologyId, name: meta.name, version: meta.version,
      likelihoodRuleVersion: meta.likelihoodRuleVersion, consequenceRuleVersion: meta.consequenceRuleVersion },
    matrix: { id: meta.matrixVersion.id, matrixId: meta.matrixVersion.matrixId, name: meta.matrixVersion.name, version: meta.matrixVersion.version,
      likelihoodDictionary: dictionary(meta.matrixVersion.likelihoodDictionary), consequenceDictionary: dictionary(meta.matrixVersion.consequenceDictionary) },
    distributions: Object.fromEntries(matrixBases.map(basis => [basis, overview.matrix.map(cell => ({
      likelihood: cell.likelihood, consequence: cell.consequence, level: cell.level,
      count: rows.filter(row => row[basis].likelihood === cell.likelihood && row[basis].consequence === cell.consequence).length
    }))])) as Record<typeof matrixBases[number], typeof overview.matrix>,
    rows, missing
  } };
}

export function createRiskMatrixRepository(reader: () => RiskReadClient | null = getRiskReader) {
  return { async read(user: AuthUser, scope: z.infer<typeof matrixScopeSchema>) {
    try {
      const db = reader();
      if (!db) return unavailable("Risk schema/client deployment is unverified. Official counts are unavailable, not zero.");
      if (!scope.methodologyVersionId) return unavailable("Select an approved methodology version. No defaults are substituted.");
      const method = await db.riskMethodologyVersion.findFirst({ where: { id: scope.methodologyVersionId, approvalStatus: "Approved", matrixVersion: { approvalStatus: "Approved" } }, include: { matrixVersion: true } });
      if (!method || method.id !== scope.methodologyVersionId) return unavailable("Approved methodology and exact matrix version are unavailable.");
      const records = await db.risk.findMany({ where: { ...(scope.pipelineId ? { pipelineId: scope.pipelineId } : {}),
        ...(user.role === "Admin" ? {} : { pipeline: { createdById: user.id } }),
        currentApprovedRevision: { methodologyVersionId: method.id, approvalStatus: "Approved" } },
        include: { pipeline: { select: { pipelineName: true, pipelineCode: true, createdById: true } },
          currentApprovedRevision: true, reviews: { where: { completedAt: null }, select: { dueDate: true, completedAt: true, revisionId: true } } } });
      // Defence in depth: never publish a partially authorized or differently scoped population.
      if (records.some(row => (scope.pipelineId && row.pipelineId !== scope.pipelineId) || (user.role !== "Admin" && row.pipeline.createdById !== user.id))) return unavailable("Requested risk population could not be authorized.");
      return buildRiskMatrix(records, method, scope.category);
    } catch { return unavailable("Authoritative Risk Matrix storage could not be read. No fallback records are substituted."); }
  } };
}
export const riskMatrixRepository = createRiskMatrixRepository();
