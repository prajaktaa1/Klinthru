import { z } from "zod";
import type { AuthUser } from "../types/domain";
import { getPrismaClient } from "../lib/prisma";
import { riskScopeSchema, riskMatrixSchema, riskPolicySchema } from "../validation/riskAssessmentValidation";
import { detailDictionarySchema } from "../validation/riskAssessmentDetailValidation";

export const configurationScopeSchema = riskScopeSchema;
type Scope = z.infer<typeof configurationScopeSchema>;
/** Read capabilities only. No initialization, source adapters, tests, or persistence writes. */
export type ConfigurationReader = {
  method(args: unknown): Promise<unknown>;
  pipeline(args: unknown): Promise<unknown>;
  reviews?: (args: unknown) => Promise<unknown>;
  connectors?: (args: unknown) => Promise<unknown>;
};
function getReader(): ConfigurationReader | null {
  const db = getPrismaClient();
  if (!db?.riskMethodologyVersion) return null;
  return {
    method: args => db.riskMethodologyVersion!.findFirst(args), pipeline: args => db.pipeline.findFirst(args),
    reviews: db.risk ? args => db.risk!.findMany(args) : undefined,
    connectors: db.integrationConnector ? args => db.integrationConnector.findMany(args) : undefined
  };
}
const id = z.string().trim().min(1);
const identity = { id, name: id, version: id, approvalStatus: z.literal("Approved"), approvedAt: z.date() };
const methodSchema = z.object({ ...identity, methodologyId: id, matrixVersionId: id, likelihoodRuleVersion: id, consequenceRuleVersion: id,
  rules: z.unknown(), matrixVersion: z.object({ ...identity, matrixId: id, cells: z.unknown(), likelihoodDictionary: z.unknown(), consequenceDictionary: z.unknown() }) });
const pipelineSchema = z.object({ id, createdById: z.string().nullable() });
const reviewsSchema = z.array(z.object({ id, riskId: id, pipelineId: id, pipeline: z.object({ createdById: z.string().nullable() }), currentApprovedRevisionId: id,
  currentApprovedRevision: z.object({ id, riskRecordId: id, methodologyVersionId: id, matrixVersionId: id, approvalStatus: z.literal("Approved"), approvedAt: z.date() }),
  reviews: z.array(z.object({ id, riskRecordId: id, revisionId: id, dueDate: z.date(), purpose: id, completedAt: z.date().nullable() })) }));
const connectorsSchema = z.array(z.object({ id, name: id, authorId: z.string().nullable(), enabled: z.boolean(),
  status: z.enum(["Ready", "Degraded", "Failed", "Disabled"]), lastTestedAt: z.date().nullable(), lastSuccessfulTestAt: z.date().nullable() }));
const missing = ["Approved score bands, numeric severity identifiers and score formula configuration", "Approved classification colors",
  "Annual probability bands and consequence guidance", "Risk threshold predicates and actions", "Approval role/workflow policy",
  "Notification definitions, subscriptions and delivery policy", "Review intervals, anchors and group-level next-review rules",
  "Logical integration binding, purpose and synchronization evidence", "Global configuration change audit and update provenance",
  "Threat categories, barrier/residual rules, versioned ALARP criteria and Risk templates"];
function unavailable(reason: string) { return { status: "unavailable" as const, reason, item: null }; }
const optionalUnavailable = (reason: string) => ({ status: "unavailable" as const, reason, items: [], truncated: false });

export function createRiskConfigurationRepository(reader: () => ConfigurationReader | null = getReader) {
  return { async read(user: AuthUser, scope: Scope) {
    try {
      const db = reader();
      if (!db) return unavailable("Risk schema/client deployment is unverified. No configuration defaults are substituted.");
      if (!scope.methodologyVersionId) return unavailable("Select an approved methodology version.");
      if (scope.pipelineId) {
        const pipeline = pipelineSchema.safeParse(await db.pipeline({ where: { id: scope.pipelineId, ...(user.role === "Admin" ? {} : { createdById: user.id }) }, select: { id: true, createdById: true } }));
        if (!pipeline.success || pipeline.data.id !== scope.pipelineId || (user.role !== "Admin" && pipeline.data.createdById !== user.id)) return unavailable("Requested configuration scope is unavailable or unauthorized.");
      }
      const parsed = methodSchema.safeParse(await db.method({ where: { id: scope.methodologyVersionId, approvalStatus: "Approved", matrixVersion: { approvalStatus: "Approved" } }, include: { matrixVersion: true } }));
      if (!parsed.success || parsed.data.id !== scope.methodologyVersionId || parsed.data.matrixVersionId !== parsed.data.matrixVersion.id) return unavailable("Exact approved methodology/matrix identity, approval dates and rule versions are unavailable.");
      const method = parsed.data, matrix = method.matrixVersion;
      const cells = riskMatrixSchema.safeParse(matrix.cells), likelihood = detailDictionarySchema.safeParse(matrix.likelihoodDictionary), consequence = detailDictionarySchema.safeParse(matrix.consequenceDictionary), policy = riskPolicySchema.safeParse(method.rules);
      const readReviews = async () => {
        if (!db.reviews) return optionalUnavailable("Saved Risk review storage is unavailable.");
        try {
          const raw = await db.reviews({ where: { ...(scope.pipelineId ? { pipelineId: scope.pipelineId } : {}), ...(user.role === "Admin" ? {} : { pipeline: { createdById: user.id } }), currentApprovedRevision: { methodologyVersionId: method.id, matrixVersionId: matrix.id, approvalStatus: "Approved" } },
            select: { id: true, riskId: true, pipelineId: true, pipeline: { select: { createdById: true } }, currentApprovedRevisionId: true,
              currentApprovedRevision: { select: { id: true, riskRecordId: true, methodologyVersionId: true, matrixVersionId: true, approvalStatus: true, approvedAt: true } },
              reviews: { where: { completedAt: null }, select: { id: true, riskRecordId: true, revisionId: true, dueDate: true, purpose: true, completedAt: true } } }, orderBy: { riskId: "asc" }, take: 201 });
          const records = reviewsSchema.parse(raw), seen = new Set<string>();
          for (const record of records) {
            const rev = record.currentApprovedRevision;
            if ((scope.pipelineId && record.pipelineId !== scope.pipelineId) || (user.role !== "Admin" && record.pipeline.createdById !== user.id) || rev.id !== record.currentApprovedRevisionId || rev.riskRecordId !== record.id || rev.methodologyVersionId !== method.id || rev.matrixVersionId !== matrix.id || record.reviews.some(review => review.riskRecordId !== record.id)) throw new Error("Review scope/version mismatch");
            if (seen.has(record.riskId)) throw new Error("Duplicate official Risk_ID"); seen.add(record.riskId);
          }
          const items = records.slice(0, 200).flatMap(record => record.reviews.filter(review => review.revisionId === record.currentApprovedRevisionId && !review.completedAt)
            .map(review => ({ reviewId: review.id, riskId: record.riskId, revisionId: review.revisionId, purpose: review.purpose, dueDate: review.dueDate.toISOString().slice(0, 10) })))
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.reviewId.localeCompare(b.reviewId));
          return { status: "available" as const, reason: null, items, truncated: records.length > 200 };
        } catch { return optionalUnavailable("Authorized saved review dates and exact revision bindings could not be verified."); }
      };
      const readConnectors = async () => {
        if (!db.connectors) return optionalUnavailable("Integration Hub read storage is unavailable.");
        try {
          const records = connectorsSchema.parse(await db.connectors({ where: user.role === "Admin" ? {} : { authorId: user.id },
            select: { id: true, name: true, authorId: true, enabled: true, status: true, lastTestedAt: true, lastSuccessfulTestAt: true }, orderBy: { createdAt: "desc" }, take: 101 }));
          if (user.role !== "Admin" && records.some(row => row.authorId !== user.id)) throw new Error("Connector authorization mismatch");
          return { status: "available" as const, reason: null, truncated: records.length > 100, items: records.slice(0, 100).map(row => ({ id: row.id, name: row.name, enabled: row.enabled, status: row.status,
            lastTestedAt: row.lastTestedAt?.toISOString() ?? null, lastSuccessfulTestAt: row.lastSuccessfulTestAt?.toISOString() ?? null })) };
        } catch { return optionalUnavailable("Authorized Integration Hub connector metadata is unavailable."); }
      };
      const [reviews, integrations] = await Promise.all([readReviews(), readConnectors()]);
      const checks = [
        { label: "Risk matrix defined", verified: cells.success, reason: "Only the saved 25-coordinate classification mapping is checked." },
        { label: "Scoring rules complete", verified: false, reason: "Approved numeric bands and score formula configuration are unavailable." },
        { label: "Likelihood dictionary (5 levels)", verified: likelihood.success, reason: "Checks saved level/label structure; probability criteria remain unavailable." },
        { label: "Consequence dictionary (5 levels)", verified: consequence.success, reason: "Checks saved level/label structure; consequence guidance remains unavailable." },
        ...["Thresholds configured", "Approval workflow defined", "Notification rules active", "Review intervals set", "Templates available", "Integration settings valid"].map(label => ({ label, verified: false, reason: "MISSING FIELD — APPROVAL NEEDED: governed configuration definition and validation evidence." }))
      ];
      return { status: "available" as const, reason: null, item: {
        scope: { pipelineId: scope.pipelineId ?? null, methodologyVersionId: method.id }, verification: "incomplete" as const,
        methodology: { id: method.id, methodologyId: method.methodologyId, name: method.name, version: method.version, approvedAt: method.approvedAt.toISOString(), likelihoodRuleVersion: method.likelihoodRuleVersion, consequenceRuleVersion: method.consequenceRuleVersion },
        matrix: { id: matrix.id, matrixId: matrix.matrixId, name: matrix.name, version: matrix.version, approvedAt: matrix.approvedAt.toISOString(),
          cells: cells.success ? cells.data : null, likelihoodDictionary: likelihood.success ? likelihood.data : null, consequenceDictionary: consequence.success ? consequence.data : null },
        categories: policy.success ? policy.data.categoryKeys : null, levels: cells.success ? [...new Set(cells.data.map(cell => cell.level))] : null,
        reviews, integrations, checks, missing
      } };
    } catch { return unavailable("Authoritative Risk Configuration storage could not be read. No fallback configuration is used."); }
  } };
}
export const riskConfigurationRepository = createRiskConfigurationRepository();
