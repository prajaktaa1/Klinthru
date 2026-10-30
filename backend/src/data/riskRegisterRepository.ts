import { z } from "zod";
import { getPrismaClient } from "../lib/prisma";
import { riskMatrixRepository } from "./riskMatrixRepository";
import { officialContext, type MatrixReader } from "./riskRemainingRepository";
import type { AuthUser } from "../types/domain";
import type { RiskScope } from "../types/riskAssessment";
type MetaReader = (args: unknown) => Promise<unknown>;
const text = z.string().min(1);
const metadataSchema = z.array(z.object({ id: text, riskId: text, pipelineId: text, pipeline: z.object({ createdById: z.string().nullable() }), currentApprovedRevisionId: text,
  currentApprovedRevision: z.object({ id: text, riskRecordId: text, scopeScenarioSnapshot: z.unknown() }), owner: z.object({ name: text }).nullable(), segment: z.object({ pipelineId: text, segmentId: text, name: z.string().nullable() }).nullable(),
  reviews: z.array(z.object({ riskRecordId: text, revisionId: text, dueDate: z.date(), completedAt: z.date().nullable() })) }));
function reader(): MetaReader | null { const db = getPrismaClient(); return db?.risk ? args => db.risk!.findMany(args) : null; }
export function createRiskRegisterRepository(read: MatrixReader = riskMatrixRepository.read, metadataReader: () => MetaReader | null = reader) {
  return { async read(user: AuthUser, scope: RiskScope) {
    const tag = { pipelineId: scope.pipelineId ?? null, methodologyVersionId: scope.methodologyVersionId ?? null };
    try {
      const result = await read(user, scope);
      if (!result.item) return { scope: tag, status: "unavailable" as const, reason: result.reason, context: null, rows: [], metadataReason: null };
      const item = result.item;
      const meta = new Map<string, { ownerName: string | null; segmentLabel: string | null; nextReview: string | null }>();
      let metadataReason: string | null = null;
      try {
        const db = metadataReader(); if (!db) throw new Error("Metadata reader unavailable");
        const records = item.rows.length ? metadataSchema.parse(await db({ where: { riskId: { in: item.rows.map(r => r.riskId) }, ...(scope.pipelineId ? { pipelineId: scope.pipelineId } : {}), ...(user.role === "Admin" ? {} : { pipeline: { createdById: user.id } }), currentApprovedRevision: { methodologyVersionId: scope.methodologyVersionId, approvalStatus: "Approved" } },
          select: { id: true, riskId: true, pipelineId: true, pipeline: { select: { createdById: true } }, currentApprovedRevisionId: true, currentApprovedRevision: { select: { id: true, riskRecordId: true, scopeScenarioSnapshot: true } }, owner: { select: { name: true } }, segment: { select: { pipelineId: true, segmentId: true, name: true } }, reviews: { where: { completedAt: null }, select: { riskRecordId: true, revisionId: true, dueDate: true, completedAt: true } } } })) : [];
        for (const record of records) {
          const row = item.rows.find(r => r.riskId === record.riskId);
          if (!row || row.pipelineId !== record.pipelineId || (user.role !== "Admin" && record.pipeline.createdById !== user.id) || record.currentApprovedRevisionId !== row.revisionId || record.currentApprovedRevision.id !== row.revisionId || record.currentApprovedRevision.riskRecordId !== record.id || (record.segment && record.segment.pipelineId !== record.pipelineId) || record.reviews.some(r => r.riskRecordId !== record.id) || meta.has(record.riskId)) throw new Error("Metadata binding mismatch");
          const snapshot = record.currentApprovedRevision.scopeScenarioSnapshot as { location?: unknown } | null;
          const next = record.reviews.filter(r => !r.completedAt && r.revisionId === row.revisionId).sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];
          meta.set(record.riskId, { ownerName: record.owner?.name ?? null, segmentLabel: typeof snapshot?.location === "string" && snapshot.location ? snapshot.location : record.segment?.name || record.segment?.segmentId || null, nextReview: next?.dueDate.toISOString().slice(0, 10) ?? null });
        }
        if (meta.size !== item.rows.length) metadataReason = "Exact authorized owner/segment/review metadata is incomplete; missing fields remain unavailable and no other revision is substituted.";
      } catch { meta.clear(); metadataReason = "MISSING FIELD — APPROVAL NEEDED: authorized owner/segment/review metadata with exact current revision binding."; }
      return { scope: tag, status: "available" as const, reason: null, context: officialContext(item), metadataReason,
        rows: item.rows.map(row => ({ ...row, ownerName: meta.get(row.riskId)?.ownerName ?? null, segmentLabel: meta.get(row.riskId)?.segmentLabel ?? null, nextReview: meta.get(row.riskId)?.nextReview ?? null, linkedDefectId: null })) };
    } catch { return { scope: tag, status: "unavailable" as const, reason: "Authoritative official Risk register unavailable; no source assessments substituted.", context: null, rows: [], metadataReason: null }; }
  } };
}
export const riskRegisterRepository = createRiskRegisterRepository();
