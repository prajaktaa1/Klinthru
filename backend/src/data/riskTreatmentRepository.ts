import { getPrismaClient } from "../lib/prisma";
import { canAccessOwner } from "../lib/access";
import type { AuthUser } from "../types/domain";
import type { CentralActionGateway, TreatmentActionPage, TreatmentActionRow, TreatmentDetail, TreatmentPage, TreatmentReadClient, TreatmentRecord, TreatmentScope } from "../types/riskTreatment";
import { blockedTreatmentSummary, selectTreatmentRevision, treatmentListRow, treatmentMissing } from "../utils/riskTreatmentRules";
import { readCentralActionReferences } from "../utils/riskTreatmentActionReferences";
import { validateTreatmentBaseline } from "../validation/riskTreatmentValidation";

export function getTreatmentReader(): TreatmentReadClient | null {
  const prisma = getPrismaClient();
  return prisma?.riskTreatment ? { riskTreatment: prisma.riskTreatment, readUser: id => prisma.user.findUnique({ where: { id }, select: { name: true } }) } : null;
}
const include = { risk: { include: { pipeline: true } }, revisions: { include: {
  baselineRevision: { include: { methodologyVersion: { include: { matrixVersion: true } } } }, actionLinks: true, alarpAssessments: true, events: true
} } };
function emptyActions(scope: TreatmentScope, reason: string): TreatmentActionPage {
  return { status: "unavailable", reason, items: [], total: null, page: scope.page, pageSize: scope.pageSize, statuses: [] };
}
function emptyPage(scope: TreatmentScope, status: TreatmentPage["status"], reason: string): TreatmentPage {
  return { status, reason, items: [], total: null, page: scope.page, pageSize: scope.pageSize, actions: emptyActions(scope, reason), riskLevels: [], pipelines: [] };
}
function whereRisk(user: AuthUser, pipelineId?: string, riskId?: string) {
  return { ...(pipelineId ? { pipelineId } : {}), ...(riskId ? { riskId } : {}), ...(user.role === "Admin" ? {} : { pipeline: { createdById: user.id } }) };
}
function checkAccess(record: TreatmentRecord, user: AuthUser) {
  if (!canAccessOwner(user, record.risk.pipeline.createdById) || record.risk.pipelineId !== record.risk.pipeline.id) throw new Error("Inaccessible treatment scope.");
}

export function createRiskTreatmentRepository(reader: () => TreatmentReadClient | null = getTreatmentReader, gateway?: CentralActionGateway) {
  return {
    async list(user: AuthUser, scope: TreatmentScope): Promise<TreatmentPage> {
      try {
        const db = reader();
        if (!db) return emptyPage(scope, "schema-unavailable", `${treatmentMissing}: Risk Treatment schema/client deployment is not verified.`);
        if (!scope.methodologyVersionId) return emptyPage(scope, "approval-needed", `${treatmentMissing}: select an approved methodology version.`);
        if (scope.basis === "verified") return emptyPage(scope, "approval-needed", `${treatmentMissing}: effectiveness verification and approved reassessment outcome policy.`);
        const records = await db.riskTreatment.findMany({ where: { risk: whereRisk(user, scope.pipelineId, scope.riskId) }, include, orderBy: { treatmentId: "asc" } });
        const rows = records.flatMap(record => {
          checkAccess(record, user);
          const scoped = { ...record, revisions: record.revisions.filter(revision => revision.baselineRevision.methodologyVersionId === scope.methodologyVersionId) };
          const revision = selectTreatmentRevision(scoped, scope.basis);
          return revision ? [treatmentListRow(scoped, revision)] : [];
        });
        const levels = [...new Set(rows.map(row => row.currentRiskLevel))];
        const pipelines = [...new Map(rows.map(row => [row.pipelineId, { id: row.pipelineId, name: `${row.pipelineName} (${row.pipelineCode})` }])).values()];
        const levelRows = rows.filter(row => !scope.riskLevel || row.currentRiskLevel === scope.riskLevel);
        const source = await readCentralActionReferences(levelRows.flatMap(row => row.actionIds), user, gateway);
        let actions = emptyActions(scope, source.reason ?? `${treatmentMissing}: Central Action Register.`);
        if (source.status === "available" && source.actions) {
          const all: TreatmentActionRow[] = source.actions.map(action => ({ ...action, treatmentLinks: levelRows.filter(row => row.actionIds.includes(action.actionId)) }));
          const statuses = [...new Set(all.map(action => action.status))];
          const filtered = all.filter(action => (!scope.status || action.status === scope.status) && (!scope.q || [action.actionId, action.title, action.ownerName ?? "", ...action.treatmentLinks.map(link => link.riskTitle)].join(" ").toLowerCase().includes(scope.q.toLowerCase())));
          actions = { status: "available", reason: null, items: filtered.slice((scope.page - 1) * scope.pageSize, scope.page * scope.pageSize), total: filtered.length, page: scope.page, pageSize: scope.pageSize, statuses };
        }
        return { status: "available", reason: null, items: levelRows.slice((scope.page - 1) * scope.pageSize, scope.page * scope.pageSize), total: levelRows.length, page: scope.page, pageSize: scope.pageSize, actions, riskLevels: levels, pipelines };
      } catch { return emptyPage(scope, "unavailable", "Authoritative treatment records/baseline references could not be verified. No source or task data is substituted."); }
    },
    async summary(user: AuthUser, scope: TreatmentScope) {
      const list = await this.list(user, { ...scope, page: 1, pageSize: 100 });
      const result = blockedTreatmentSummary(list.status, list.reason ?? `${treatmentMissing}: aggregation and ALARP policies.`, scope.basis);
      if (list.actions.status === "available") {
        // A full filtered source population is required; never total a truncated page.
        if (list.actions.total === list.actions.items.length) {
          const counts = new Map<string, number>();
          for (const action of list.actions.items) counts.set(action.status, (counts.get(action.status) ?? 0) + 1);
          result.actions = { status: "available", reason: null, total: list.actions.total, byStatus: [...counts].map(([label, count]) => ({ label, count })),
            overdue: list.actions.items.every(action => action.overdue !== null) ? list.actions.items.filter(action => action.overdue).length : null };
        } else result.actions.reason = `${treatmentMissing}: complete central-action aggregation response beyond the read page.`;
      }
      return result;
    },
    async detail(user: AuthUser, treatmentId: string, revisionId?: string): Promise<TreatmentDetail> {
      try {
        const db = reader();
        if (!db) return { status: "schema-unavailable", reason: `${treatmentMissing}: Risk Treatment schema/client deployment.`, item: null };
        const record = await db.riskTreatment.findFirst({ where: { treatmentId, risk: whereRisk(user) }, include });
        if (!record) return { status: "unavailable", reason: "Treatment not found or inaccessible.", item: null };
        checkAccess(record, user);
        const revision = selectTreatmentRevision(record, undefined, revisionId);
        if (!revision) return { status: "unavailable", reason: "Treatment revision not found or inaccessible.", item: null };
        const row = treatmentListRow(record, revision), result = validateTreatmentBaseline(record, revision);
        const approved = selectTreatmentRevision(record, "approved");
        // Different methodology versions are never silently compared as one outcome.
        const approvedResidual = approved && approved.baselineRevision.methodologyVersionId === revision.baselineRevision.methodologyVersionId && approved.baselineRevision.matrixVersionId === revision.baselineRevision.matrixVersionId
          ? validateTreatmentBaseline(record, approved).proposed : null;
        if (revision.alarpAssessments.some(value => value.riskRecordId !== record.riskRecordId || value.treatmentRevisionId !== revision.id)) throw new Error("ALARP subject mismatch.");
        if (revision.events.some(value => value.riskRecordId !== record.riskRecordId || value.riskTreatmentRevisionId !== revision.id || (value.riskAlarpAssessmentId !== null && !revision.alarpAssessments.some(alarp => alarp.id === value.riskAlarpAssessmentId)))) throw new Error("Workflow subject mismatch.");
        // DOCX section 51 names these two events. Other stage contracts are unavailable.
        const stageEvents = [null, null, "RiskTreatmentApproved", "RiskMitigationCompleted", null];
        const stageLabels = ["Prepared by", "Reviewed by", "Approved by", "Implementation", "Effectiveness Review"];
        const workflow = await Promise.all(stageLabels.map(async (stage, index) => {
          const event = revision.events.filter(value => value.riskRecordId === record.riskRecordId && value.riskTreatmentRevisionId === revision.id && value.eventType === stageEvents[index]).sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())[0];
          const actorId = event?.actorId ?? (index === 0 ? revision.createdById : null);
          const actor = actorId ? await db.readUser(actorId) : null;
          return { stage, status: event || index === 0 ? "Recorded" : "Unavailable", actorId, actorName: actor?.name ?? null, date: event?.occurredAt.toISOString() ?? (index === 0 ? revision.createdAt.toISOString() : null) };
        }));
        return { status: "available", reason: null, item: {
          treatmentId: record.treatmentId, revisionId: revision.id, revisionNumber: revision.revisionNumber, title: revision.title, state: revision.state, description: revision.description, controlType: revision.treatmentType,
          riskId: row.riskId, riskTitle: row.riskTitle, pipelineName: row.pipelineName, baselineRevisionId: revision.baselineRevisionId, methodologyVersionId: revision.baselineRevision.methodologyVersionId, matrixVersionId: revision.baselineRevision.matrixVersionId,
          inherent: result.inherent, current: result.current, residual: { proposed: result.proposed, approved: approvedResidual, verified: null, reason: `${treatmentMissing}: verified outcome requires effectiveness evidence, approved reassessment and explicit result-basis/approval policy. Task completion is insufficient.` },
          estimatedCost: { amount: revision.costAmount?.toString() ?? null, currency: revision.currency, basis: revision.costBasis, estimateDate: revision.costEstimateDate?.toISOString().slice(0, 10) ?? null },
          implementationStart: revision.implementationStart?.toISOString().slice(0, 10) ?? null, implementationEnd: revision.implementationEnd?.toISOString().slice(0, 10) ?? null, benefit: row.benefit,
          alarpAssessments: revision.alarpAssessments.map(value => ({ alarpId: value.alarpId, version: value.version, state: value.state, outcome: value.outcome, justification: value.justification, criteriaId: value.criteriaId, criteriaVersion: value.criteriaVersion, evidenceAvailable: Array.isArray(value.evidenceReferences) && value.evidenceReferences.length > 0 })), workflow
        } };
      } catch { return { status: "unavailable", reason: "Treatment/evidence/version bindings could not be verified.", item: null }; }
    },
    async references(user: AuthUser, treatmentId: string, revisionId?: string) {
      const detail = await this.detail(user, treatmentId, revisionId);
      if (!detail.item) return { status: detail.status, reason: detail.reason, actions: null };
      const db = reader()!;
      try {
        const record = await db.riskTreatment.findFirst({ where: { treatmentId, risk: whereRisk(user) }, include });
        if (!record) return { status: "unavailable", reason: "Treatment not found or inaccessible.", actions: null };
        checkAccess(record, user);
        const revision = record.revisions.find(value => value.id === detail.item!.revisionId);
        if (!revision) return { status: "unavailable", reason: "Treatment revision no longer accessible.", actions: null };
        const row = treatmentListRow(record, revision);
        return readCentralActionReferences(row.actionIds, user, gateway);
      } catch { return { status: "unavailable", reason: "Central action references unavailable.", actions: null }; }
    }
  };
}
export const riskTreatmentRepository = createRiskTreatmentRepository();
