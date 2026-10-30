import { getPrismaClient } from "../lib/prisma";
import { canAccessOwner } from "../lib/access";
import type { AuthUser } from "../types/domain";
import type { AssessmentDetail, AssessmentNarrative, DetailOptions, DetailReader, DetailRevision, DetailRiskRecord, DetailScope } from "../types/riskAssessmentDetail";
import type { CentralActionGateway } from "../types/riskTreatment";
import type { SourceResolver } from "../types/riskRelatedData";
import { detailControlsSchema, detailDictionarySchema, detailNarrativeSchema, detailScopeSnapshot, detailTextSchema, detailSourceMetadataSchema } from "../validation/riskAssessmentDetailValidation";
import { riskMatrixSchema, riskResultSchema, riskSourceSnapshotSchema } from "../validation/riskAssessmentValidation";
import { createAuthoritativeRelatedResolver, relatedMissing } from "../utils/riskRelatedSources";
import { readCentralActionReferences } from "../utils/riskTreatmentActionReferences";

const getReader = (): DetailReader | null => { const db = getPrismaClient(); return db?.risk ? {
  findMany: args => (db.risk! as unknown as Pick<DetailReader, "findMany">).findMany(args),
  readUser: id => db.user.findUnique({ where: { id }, select: { name: true } }),
  readTreatments: db.riskTreatment ? riskRecordId => (db.riskTreatment! as unknown as { findMany(args: unknown): Promise<DetailRiskRecord["treatments"]> }).findMany({ where: { riskRecordId }, include: { currentApprovedRevision: { include: { actionLinks: true } } } }) : undefined
} : null; };
const whereScope = (user: AuthUser, scope: { pipelineId?: string }) => ({ ...(scope.pipelineId ? { pipelineId: scope.pipelineId } : {}), ...(user.role === "Admin" ? {} : { pipeline: { createdById: user.id } }) });
const revisionInclude = { assessment: { select: { id: true, riskRecordId: true, createdById: true, createdAt: true } }, methodologyVersion: { include: { matrixVersion: true } }, reviews: true, approvals: true, events: true };
function checkScope(record: DetailRiskRecord, user: AuthUser, pipelineId?: string) { if (!canAccessOwner(user, record.pipeline.createdById) || record.pipelineId !== record.pipeline.id || (pipelineId && record.pipelineId !== pipelineId)) throw new Error("Scope mismatch"); }
function checkRevision(record: DetailRiskRecord, rev: DetailRevision, method: string) {
  if (rev.riskRecordId !== record.id || rev.assessment.riskRecordId !== record.id || rev.assessmentId !== rev.assessment.id || rev.methodologyVersionId !== method || rev.methodologyVersion.id !== method || rev.matrixVersionId !== rev.methodologyVersion.matrixVersion.id || rev.methodologyVersion.approvalStatus !== "Approved" || rev.methodologyVersion.matrixVersion.approvalStatus !== "Approved" || (rev.approvalStatus === "Approved" && !rev.approvedAt)) throw new Error("Revision/methodology binding mismatch");
}
const unavailable = (status: AssessmentDetail["status"], reason: string): AssessmentDetail => ({ status, reason, item: null });
const projectNarrative = (input: unknown): AssessmentNarrative | null => { const p = detailNarrativeSchema.safeParse(input); if (!p.success || !Object.keys(p.data).some(key => ["justification", "basis", "method", "confidence", "value", "unit"].includes(key))) return null; return { justification: p.data.justification ?? null, basis: p.data.basis ?? null, method: p.data.method ?? null, confidence: p.data.confidence ?? null, value: p.data.value ?? null, unit: p.data.unit ?? null }; };
const projectText = (input: unknown) => { const p = detailTextSchema.safeParse(input); return p.success ? typeof p.data === "string" ? p.data : p.data.join("\n") : null; };

export function createAssessmentDetailRepository(reader: () => DetailReader | null = getReader, resolverFactory: () => SourceResolver = createAuthoritativeRelatedResolver, actions?: CentralActionGateway) {
  return {
    async options(user: AuthUser, scope: { pipelineId?: string; methodologyVersionId?: string }): Promise<DetailOptions> {
      try {
        const db = reader(); if (!db) return { status: "schema-unavailable", reason: `${relatedMissing}: Risk schema/client deployment`, items: [] };
        if (!scope.methodologyVersionId) return { status: "approval-needed", reason: `${relatedMissing}: select approved methodology`, items: [] };
        const rows = await db.findMany({ where: { ...whereScope(user, scope), revisions: { some: { methodologyVersionId: scope.methodologyVersionId, methodologyVersion: { approvalStatus: "Approved", matrixVersion: { approvalStatus: "Approved" } } } } }, include: { pipeline: true, revisions: { where: { methodologyVersionId: scope.methodologyVersionId }, include: revisionInclude, orderBy: { revisionNumber: "desc" } } }, orderBy: { riskId: "asc" }, take: 201 });
        return { status: "available", reason: rows.length > 200 ? "Selector limited to 200 authorized Risks; narrow pipeline scope. This is not a Risk count." : null, items: rows.slice(0, 200).map(record => { checkScope(record, user, scope.pipelineId); return { riskId: record.riskId, revisions: record.revisions.map(rev => { checkRevision(record, rev, scope.methodologyVersionId!); return { revisionId: rev.id, revisionNumber: rev.revisionNumber, status: rev.approvalStatus, assessmentDate: rev.assessmentDate.toISOString() }; }) }; }) };
      } catch { return { status: "unavailable", reason: `${relatedMissing}: authorized saved revision selection`, items: [] }; }
    },
    async detail(user: AuthUser, scope: DetailScope): Promise<AssessmentDetail> {
      try {
        const db = reader(); if (!db) return unavailable("schema-unavailable", `${relatedMissing}: Risk schema/client deployment`);
        if (!scope.methodologyVersionId) return unavailable("approval-needed", `${relatedMissing}: select approved methodology`);
        const rows = await db.findMany({ where: { ...whereScope(user, scope), riskId: scope.riskId }, include: { pipeline: true, owner: { select: { id: true, name: true } }, sourceLinks: true, revisions: { where: { id: scope.revisionId }, include: revisionInclude } }, take: 2 });
        if (rows.length !== 1) return unavailable("unavailable", "Risk not found or inaccessible.");
        const record = rows[0]; checkScope(record, user, scope.pipelineId);
        if (record.riskId !== scope.riskId) throw new Error("Risk mismatch");
        const matches = record.revisions.filter(rev => rev.id === scope.revisionId);
        if (matches.length !== 1) return unavailable("unavailable", "Assessment revision not found or inaccessible.");
        const rev = matches[0]; checkRevision(record, rev, scope.methodologyVersionId);
        const missing: string[] = [];
        const snap = detailScopeSnapshot.safeParse(rev.scopeScenarioSnapshot);
        if (!snap.success) missing.push("Validated scope/scenario JSON projection");
        const s = snap.success ? snap.data : {};
        for (const field of ["title", "scenario", "threatType", "initiatingEvent", "location", "assetType", "ownerId"] as const) if (!s[field]) missing.push(`Saved revision scope field: ${field}`);
        const rawMatrix = rev.methodologyVersion.matrixVersion;
        const matrix = riskMatrixSchema.safeParse(rawMatrix.cells);
        if (!matrix.success) missing.push("Validated saved 5×5 matrix cells");
        if (!detailDictionarySchema.safeParse(rawMatrix.likelihoodDictionary).success || !detailDictionarySchema.safeParse(rawMatrix.consequenceDictionary).success) missing.push("Validated saved likelihood/consequence dictionaries");
        const classify = (value: unknown, basis: string) => { const p = riskResultSchema.safeParse(value); if (!p.success || !matrix.success || !matrix.data.some(c => c.likelihood === p.data.likelihood && c.consequence === p.data.consequence && c.level === p.data.level)) { missing.push(`${basis} saved result/matrix validation`); return null; } return p.data; };
        const inherent = classify(rev.inherentResult, "Inherent"), current = classify(rev.currentResult, "Current"), residual = classify(rev.residualResult, "Residual");
        const dict = (input: unknown) => { const p = detailDictionarySchema.safeParse(input); return p.success ? p.data : null; };
        const controls = detailControlsSchema.safeParse(rev.controls);
        if (!controls.success) missing.push("Validated controls JSON, identities, evidence and owners");
        const likelihood = projectNarrative(rev.likelihoodAssessment), consequence = projectNarrative(rev.consequenceAssessment);
        if (!likelihood) missing.push("Likelihood assessment JSON projection"); if (!consequence) missing.push("Consequence assessment JSON projection");
        const resolve = resolverFactory();
        const frozen = riskSourceSnapshotSchema.safeParse(rev.sourceSnapshot);
        const sources: NonNullable<AssessmentDetail["item"]>["sources"] = [];
        if (!frozen.success || new Set(frozen.data.map(x => x.sourceLinkId)).size !== frozen.data.length) missing.push("Validated immutable source snapshot references");
        else await Promise.all(frozen.data.map(async input => {
          const boundLinks = record.sourceLinks.filter(l => l.id === input.sourceLinkId && l.riskRecordId === record.id);
          const link = boundLinks.length === 1 ? boundLinks[0] : undefined;
          const item: NonNullable<AssessmentDetail["item"]>["sources"][number] = { linkId: input.sourceLinkId, module: input.sourceModule, recordType: input.sourceRecordType, recordId: input.sourceRecordId, version: input.sourceVersion, relationship: null, contributionType: null, capturedAt: input.capturedAt, contentHash: input.contentHash, status: "unavailable", reason: `${relatedMissing}: source link identity/version/access binding`, live: null, versionVerified: false };
          if (link && link.sourceModule === input.sourceModule && link.sourceRecordType === input.sourceRecordType && link.sourceRecordId === input.sourceRecordId && link.sourceVersion === input.sourceVersion) {
            item.relationship = link.relationship; item.contributionType = link.contributionType;
            try { const response = await resolve(link, { pipelineId: record.pipelineId, user }); if (response.status === "available") { const parsed = detailSourceMetadataSchema.safeParse(response.metadata); if (parsed.success && parsed.data.canonicalId === input.sourceRecordId) { item.live = { ...parsed.data, navigation: null }; item.status = "available"; item.reason = null; item.versionVerified = input.sourceVersion !== null && parsed.data.version === input.sourceVersion; } } else item.reason = response.reason; } catch { item.reason = `${relatedMissing}: authoritative source temporarily unavailable`; }
          }
          sources.push(item);
        }));
        sources.sort((a, b) => a.linkId.localeCompare(b.linkId));
        const actors = new Map<string, Promise<{ name: string } | null>>();
        const actorName = async (id: string | null) => { if (!id) return null; if (!actors.has(id)) actors.set(id, db.readUser(id).catch(() => null)); return (await actors.get(id))?.name ?? null; };
        if (rev.reviews.some(r => r.riskRecordId !== record.id || r.revisionId !== rev.id) || rev.approvals.some(a => a.revisionId !== rev.id || (a.reviewId !== null && !rev.reviews.some(r => r.id === a.reviewId))) || rev.events.some(e => e.riskRecordId !== record.id || e.revisionId !== rev.id)) throw new Error("Review/history subject mismatch");
        const reviews = await Promise.all(rev.reviews.map(async r => ({ id: r.id, purpose: r.purpose, dueDate: r.dueDate.toISOString().slice(0, 10), reviewerId: r.reviewerId, reviewerName: await actorName(r.reviewerId), completedAt: r.completedAt?.toISOString() ?? null })));
        const history = await Promise.all([
          ...rev.events.map(async e => ({ id: `event:${e.id}`, kind: "Event" as const, label: e.eventType, actorId: e.actorId, actorName: await actorName(e.actorId), at: e.occurredAt.toISOString(), justification: null, reviewId: null })),
          ...rev.approvals.map(async a => ({ id: `decision:${a.id}`, kind: "Decision" as const, label: a.decision, actorId: a.actorId, actorName: await actorName(a.actorId), at: a.decidedAt.toISOString(), justification: a.justification, reviewId: a.reviewId }))
        ]); history.sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
        const actionIds: string[] = [];
        let actionReason: string | null = rev.approvalStatus !== "Approved" ? `${relatedMissing}: approved treatment baseline for assessment action references` : !db.readTreatments ? `${relatedMissing}: optional treatment read storage/client` : null;
        let treatmentRows: DetailRiskRecord["treatments"] = [];
        if (!actionReason) try { treatmentRows = await db.readTreatments!(record.id); } catch { actionReason = `${relatedMissing}: optional treatment storage unavailable`; }
        for (const treatment of treatmentRows) {
          const tr = treatment.currentApprovedRevision;
          if (!tr || tr.baselineRevisionId !== rev.id) continue;
          if (treatment.riskRecordId !== record.id || tr.riskRecordId !== record.id || tr.treatmentId !== treatment.id || treatment.currentApprovedRevisionId !== tr.id || tr.state !== "Approved" || !tr.contentHash || !tr.submittedAt || tr.actionLinks.some(l => l.riskRecordId !== record.id || l.treatmentRevisionId !== tr.id)) { actionReason = `${relatedMissing}: treatment baseline/action subject mismatch`; break; }
          actionIds.push(...tr.actionLinks.map(l => l.actionId));
        }
        const central = actionReason ? { status: "unavailable" as const, reason: actionReason, actions: null } : await readCentralActionReferences(actionIds, user, actions);
        missing.push("Governed note fields/visibility", "Review purpose selection and due-date policy", "Risk_ID allocation and deduplication workflow remain locked", "Residual forecast versus verified outcome policy");
        return { status: "available", reason: null, item: {
          riskId: record.riskId, assessmentId: rev.assessmentId, revisionId: rev.id, revisionNumber: rev.revisionNumber, approvalStatus: rev.approvalStatus, historical: rev.approvalStatus === "Approved" && record.currentApprovedRevisionId !== rev.id, concurrencyVersion: rev.concurrencyVersion, assessmentDate: rev.assessmentDate.toISOString(), assessorId: rev.assessorId,
          definition: { title: s.title ?? null, scenario: s.scenario ?? null, threatType: s.threatType ?? null, initiatingEvent: s.initiatingEvent ?? null, location: s.location ?? null, assetType: s.assetType ?? null, ownerId: s.ownerId ?? null, category: rev.category, liveOwnerName: record.owner && record.owner.id === record.ownerId ? record.owner.name : null, pipelineName: record.pipeline.pipelineName, pipelineCode: record.pipeline.pipelineCode, pipelineId: record.pipelineId },
          results: { inherent, current, residual }, resultReasons: { inherent: inherent ? null : `${relatedMissing}: valid saved Inherent Risk`, current: current ? null : `${relatedMissing}: valid saved Current Risk`, residual: residual ? null : `${relatedMissing}: valid saved Residual Risk` },
          likelihood, consequence, controls: controls.success ? controls.data.map(c => ({ id: c.id ?? null, name: c.name ?? null, type: c.type ?? null, effectiveness: c.effectiveness ?? null, ownerId: c.ownerId ?? null, evidenceReferences: c.evidenceReferences ?? null })) : null, assumptions: projectText(rev.assumptions), limitations: projectText(rev.limitations), internalNotes: null, reviewerNotes: null, notesReason: `${relatedMissing}: governed assessment note fields and visibility; decision justifications remain in approval history`, sources, sourceReason: frozen.success ? null : `${relatedMissing}: source snapshot structure`,
          methodology: { id: rev.methodologyVersionId, methodologyId: rev.methodologyVersion.methodologyId, name: rev.methodologyVersion.name, version: rev.methodologyVersion.version, likelihoodRuleVersion: rev.methodologyVersion.likelihoodRuleVersion, consequenceRuleVersion: rev.methodologyVersion.consequenceRuleVersion }, matrix: { id: rev.matrixVersionId, matrixId: rawMatrix.matrixId, name: rawMatrix.name, version: rawMatrix.version, cells: matrix.success ? matrix.data : null, likelihoodDictionary: dict(rawMatrix.likelihoodDictionary), consequenceDictionary: dict(rawMatrix.consequenceDictionary) }, reviews, history, actions: { status: central.status, reason: central.reason, items: central.actions ?? [] }, confidence: rev.confidence, dataSufficiency: rev.dataSufficiency, contentHash: rev.contentHash, submittedAt: rev.submittedAt?.toISOString() ?? null, approvedAt: rev.approvedAt?.toISOString() ?? null, missing
        } };
      } catch { return unavailable("unavailable", `${relatedMissing}: exact authorized Risk/revision/methodology/history bindings could not be verified. No saved results were changed.`); }
    }
  };
}
export const assessmentDetailRepository = createAssessmentDetailRepository();
