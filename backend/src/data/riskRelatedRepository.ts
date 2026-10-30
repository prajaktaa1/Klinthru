import { z } from "zod";
import { getPrismaClient } from "../lib/prisma";
import { canAccessOwner } from "../lib/access";
import type { AuthUser } from "../types/domain";
import { relatedGroups, type RelatedData, type RelatedReader, type RelatedRiskRecord, type RelatedRow, type RelatedScope, type SourceResolver } from "../types/riskRelatedData";
import { riskMatrixSchema, riskResultSchema, riskScopeSnapshotSchema, riskSourceSnapshotSchema } from "../validation/riskAssessmentValidation";
import { createAuthoritativeRelatedResolver, relatedGroup, relatedMissing } from "../utils/riskRelatedSources";

const id = z.string().trim().min(1).max(200);
export const relatedOptionsScope = z.object({ pipelineId: id.optional(), methodologyVersionId: id.optional() }).strict();
export const relatedScopeSchema = relatedOptionsScope.extend({ riskId: id, revisionId: id.optional(), module: z.enum([...relatedGroups, "Other"]).optional(), status: id.optional(), q: z.string().trim().max(200).optional(), page: z.coerce.number().int().min(1).max(100000).default(1), pageSize: z.coerce.number().int().min(1).max(50).default(8) }).strict();
const metadataSchema = z.object({ canonicalId: id, displayId: id, title: z.string().min(1), location: z.string().nullable(), status: z.string().nullable(), date: z.string().datetime().nullable(), dateLabel: z.string(), updatedAt: z.string().datetime().nullable(), result: z.string().nullable(), version: z.string().nullable(), navigation: z.null() }).strict();
const getReader = (): RelatedReader | null => {
  const db = getPrismaClient();
  // Existing optional Risk delegate only. No schema/client generation or fallback storage.
  return db?.risk ? db.risk as unknown as RelatedReader : null;
};
const scopeWhere = (user: AuthUser, scope: { pipelineId?: string }) => ({ ...(scope.pipelineId ? { pipelineId: scope.pipelineId } : {}), ...(user.role === "Admin" ? {} : { pipeline: { createdById: user.id } }) });
function assertScope(record: RelatedRiskRecord, user: AuthUser, pipelineId?: string) {
  if (!canAccessOwner(user, record.pipeline.createdById) || record.pipelineId !== record.pipeline.id || (pipelineId && record.pipelineId !== pipelineId)) throw new Error("Invalid risk scope");
}
function blocked(status: RelatedData["status"], reason: string, scope: Pick<RelatedScope, "page" | "pageSize">): RelatedData {
  return { status, reason, asOf: new Date().toISOString(), risk: null, counts: relatedGroups.map(group => ({ group, count: null, resolvedCount: 0, reason })), items: [], total: null, referenceTotal: null, resolvedTotal: null, page: scope.page, pageSize: scope.pageSize, modules: [], statuses: [] };
}
export function createRiskRelatedRepository(reader: () => RelatedReader | null = getReader, resolverFactory: () => SourceResolver = createAuthoritativeRelatedResolver) {
  return {
    async options(user: AuthUser, scope: { pipelineId?: string; methodologyVersionId?: string }) {
      try {
        const db = reader();
        if (!db) return { status: "schema-unavailable", reason: `${relatedMissing}: official Risk storage/client deployment`, items: [] };
        if (!scope.methodologyVersionId) return { status: "approval-needed", reason: `${relatedMissing}: select approved methodology`, items: [] };
        const rows = await db.findMany({ where: { ...scopeWhere(user, scope), currentApprovedRevision: { approvalStatus: "Approved", methodologyVersionId: scope.methodologyVersionId, methodologyVersion: { approvalStatus: "Approved", matrixVersion: { approvalStatus: "Approved" } } } }, include: { pipeline: true, currentApprovedRevision: { include: { methodologyVersion: { include: { matrixVersion: true } } } } }, orderBy: { riskId: "asc" }, take: 201 });
        const items = rows.slice(0, 200).map(row => {
          assertScope(row, user, scope.pipelineId);
          const revision = row.currentApprovedRevision;
          if (!revision || revision.id !== row.currentApprovedRevisionId || revision.riskRecordId !== row.id || revision.approvalStatus !== "Approved" || !revision.approvedAt || revision.methodologyVersionId !== scope.methodologyVersionId || revision.methodologyVersion.id !== revision.methodologyVersionId || revision.methodologyVersion.matrixVersion.id !== revision.matrixVersionId || revision.methodologyVersion.approvalStatus !== "Approved" || revision.methodologyVersion.matrixVersion.approvalStatus !== "Approved") throw new Error("Invalid approved selection");
          return { riskId: row.riskId, title: riskScopeSnapshotSchema.parse(revision.scopeScenarioSnapshot).title };
        });
        return { status: "available", reason: rows.length > 200 ? "Risk selector limited to 200 authorized records. Narrow pipeline scope; this is not an official Risk count." : null, items };
      } catch { return { status: "unavailable", reason: "Approved Risk selection unavailable; no source records substituted.", items: [] }; }
    },
    async read(user: AuthUser, scope: RelatedScope): Promise<RelatedData> {
      try {
        const db = reader();
        if (!db) return blocked("schema-unavailable", `${relatedMissing}: official Risk storage/client deployment`, scope);
        if (!scope.methodologyVersionId) return blocked("approval-needed", `${relatedMissing}: select approved methodology`, scope);
        const revisionInclude = { include: { methodologyVersion: { include: { matrixVersion: true } } } };
        const rows = await db.findMany({ where: { ...scopeWhere(user, scope), riskId: scope.riskId }, include: { pipeline: true, sourceLinks: true, currentApprovedRevision: revisionInclude, revisions: { where: { id: scope.revisionId ?? "", approvalStatus: "Approved" }, ...revisionInclude } }, take: 2 });
        if (rows.length !== 1) return blocked("unavailable", "Risk not found or inaccessible.", scope);
        const record = rows[0]; assertScope(record, user, scope.pipelineId);
        if (record.riskId !== scope.riskId) throw new Error("Risk ID mismatch");
        const revision = scope.revisionId ? record.revisions.find(r => r.id === scope.revisionId) : record.currentApprovedRevision;
        if (!revision || (!scope.revisionId && revision.id !== record.currentApprovedRevisionId) || revision.riskRecordId !== record.id || revision.approvalStatus !== "Approved" || !revision.approvedAt || revision.methodologyVersionId !== scope.methodologyVersionId || revision.methodologyVersion.id !== revision.methodologyVersionId || revision.matrixVersionId !== revision.methodologyVersion.matrixVersion.id || revision.methodologyVersion.approvalStatus !== "Approved" || revision.methodologyVersion.matrixVersion.approvalStatus !== "Approved") throw new Error("Invalid approved revision");
        const cells = riskMatrixSchema.parse(revision.methodologyVersion.matrixVersion.cells);
        const result = (value: unknown) => { const r = riskResultSchema.parse(value); if (!cells.some(c => c.likelihood === r.likelihood && c.consequence === r.consequence && c.level === r.level)) throw new Error("Matrix mismatch"); return r; };
        const snapshot = riskScopeSnapshotSchema.parse(revision.scopeScenarioSnapshot);
        const frozen = riskSourceSnapshotSchema.parse(revision.sourceSnapshot);
        if (new Set(frozen.map(s => s.sourceLinkId)).size !== frozen.length) throw new Error("Duplicate frozen reference");
        const resolver = resolverFactory();
        const grouped = new Map<string, { row: RelatedRow; link: typeof record.sourceLinks[number] }>();
        for (const input of frozen) {
          const candidates = record.sourceLinks.filter(l => l.id === input.sourceLinkId && l.riskRecordId === record.id);
          if (candidates.length !== 1) throw new Error("Missing or ambiguous link binding");
          const link = candidates[0];
          if (link.sourceModule !== input.sourceModule || link.sourceRecordType !== input.sourceRecordType || link.sourceRecordId !== input.sourceRecordId || link.sourceVersion !== input.sourceVersion) throw new Error("Snapshot/link mismatch");
          // Several contributions to one native source/version produce one row/node count.
          const key = JSON.stringify([link.sourceModule, link.sourceRecordType, link.sourceRecordId, link.sourceVersion]);
          if (!grouped.has(key)) grouped.set(key, { link, row: { key, sourceModule: link.sourceModule, sourceRecordType: link.sourceRecordType, sourceRecordId: link.sourceRecordId, sourceVersion: link.sourceVersion, group: relatedGroup(link), links: [], status: "unavailable", reason: null, source: null, versionStatus: "unverified", freshness: "Unverified" } });
          grouped.get(key)!.row.links.push({ linkId: link.id, relationship: link.relationship, contributionType: link.contributionType, confidence: link.confidence, linkedById: link.linkedById, linkedAt: link.linkedAt.toISOString(), retiredAt: link.retiredAt?.toISOString() ?? null, retirementReason: link.retirementReason, capturedAt: input.capturedAt, contentHash: input.contentHash });
        }
        const resolved = await Promise.all([...grouped.values()].map(async ({ row, link }) => {
          try {
            const response = await resolver(link, { pipelineId: record.pipelineId, user });
            if (response.status !== "available") return { ...row, reason: response.reason };
            const source = metadataSchema.parse(response.metadata);
            if (source.canonicalId !== link.sourceRecordId) throw new Error("Source identity mismatch");
            return { ...row, source, status: "available" as const, reason: null, versionStatus: link.sourceVersion !== null && source.version === link.sourceVersion ? "matched" as const : "unverified" as const };
          } catch { return { ...row, reason: `${relatedMissing}: source identity/access or metadata could not be verified` }; }
        }));
        resolved.sort((a, b) => a.key.localeCompare(b.key));
        const groups = [...relatedGroups, ...(resolved.some(r => r.group === "Other") ? ["Other" as const] : [])];
        const distinct = (refs: RelatedRow[]) => new Set(refs.map(r => JSON.stringify([r.group === "Other" ? r.sourceModule : r.group, r.sourceRecordType, r.sourceRecordId]))).size;
        const counts = groups.map(group => { const refs = resolved.filter(r => r.group === group); const good = refs.filter(r => r.status === "available"); const complete = refs.length > 0 && good.length === refs.length; return { group, count: complete ? distinct(good) : null, resolvedCount: distinct(good), reason: complete ? null : `${relatedMissing}: complete authorized source resolution; no zero inferred from unavailable or unprobed integrations` }; });
        const filtered = resolved.filter(row => (!scope.module || row.group === scope.module) && (!scope.status || row.source?.status === scope.status) && (!scope.q || [row.sourceRecordId, row.source?.displayId ?? "", row.source?.title ?? "", row.source?.location ?? "", row.sourceModule].join(" ").toLowerCase().includes(scope.q.toLowerCase())));
        // Missing source titles/statuses cannot establish a verified zero after search.
        const scopedReferences = resolved.filter(row => !scope.module || row.group === scope.module);
        const allResolved = scopedReferences.length > 0 && scopedReferences.every(r => r.status === "available");
        return { status: "available", reason: null, asOf: new Date().toISOString(), risk: { riskId: record.riskId, title: snapshot.title, pipelineId: record.pipelineId, pipelineName: record.pipeline.pipelineName, pipelineCode: record.pipeline.pipelineCode, location: typeof snapshot.location === "string" ? snapshot.location : null, threatType: typeof snapshot.threatType === "string" ? snapshot.threatType : null, category: revision.category, status: record.status, revisionId: revision.id, historical: revision.id !== record.currentApprovedRevisionId, methodologyVersionId: revision.methodologyVersionId, matrixVersionId: revision.matrixVersionId, inherent: result(revision.inherentResult), current: result(revision.currentResult), residual: result(revision.residualResult) }, counts, items: filtered.slice((scope.page - 1) * scope.pageSize, scope.page * scope.pageSize), total: allResolved && resolved.length > 0 ? distinct(filtered) : null, referenceTotal: filtered.length, resolvedTotal: distinct(resolved.filter(r => r.status === "available")), page: scope.page, pageSize: scope.pageSize, statuses: [...new Set(resolved.flatMap(r => r.source?.status ? [r.source.status] : []))].sort(), modules: [...new Set(resolved.map(r => r.group))] };
      } catch { return blocked("unavailable", `${relatedMissing}: exact Risk/link/snapshot/version/methodology bindings could not be verified. Historical results are not rewritten.`, scope); }
    }
  };
}
export const riskRelatedRepository = createRiskRelatedRepository();
