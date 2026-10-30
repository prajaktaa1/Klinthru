import { createHash } from "node:crypto";
import { z } from "zod";

export const MISSING = "MISSING FIELD — APPROVAL NEEDED";
export const systemTypes = ["ICCP", "SACP", "Hybrid"] as const;
export const designStatuses = ["Draft", "In Review", "Approved", "Superseded", "Revision Required"] as const;
export class BasisError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") return "{" + Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",") + "}";
  return JSON.stringify(value) ?? "null";
}
export const digest = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
export function exactDecimal(value: string): string {
  const negative = value.startsWith("-"); const [whole, fraction = ""] = value.replace(/^-/, "").split(".");
  const normalizedWhole = whole.replace(/^0+(?=\d)/, ""); const normalizedFraction = fraction.replace(/0+$/, "");
  const normalized = normalizedWhole + (normalizedFraction ? `.${normalizedFraction}` : "");
  return normalized === "0" ? "0" : `${negative ? "-" : ""}${normalized}`;
}
export function assertMasterValue(a: { parameterKey: string; valueKind: string; numericValue: string | null; textValue: string | null; booleanValue: boolean | null; unit?: string | null }, source: Record<string, unknown>) {
  const value = source[a.parameterKey];
  if (!Object.prototype.hasOwnProperty.call(source, a.parameterKey) || value === null || value === undefined || typeof value === "object") throw new BasisError(422, `${MISSING}: exact scalar master field ${a.parameterKey}.`);
  const matches = a.valueKind === "NUMBER" ? typeof value === "number" && Number.isFinite(value) && a.numericValue !== null && /^-?\d+(\.\d+)?$/.test(String(value)) && exactDecimal(a.numericValue) === exactDecimal(String(value)) : a.valueKind === "TEXT" ? typeof value === "string" && a.textValue === value : a.valueKind === "BOOLEAN" && typeof value === "boolean" && a.booleanValue === value;
  if (!matches) throw new BasisError(422, "Master-sourced assumption differs from its exact source field; use a documented Engineering Assumption for a separately reviewed design value.");
  if (a.valueKind === "NUMBER") {
    const unitFields: Record<string, string> = { pipeInsideDiameter: "diameterUnit", pipeOutsideDiameter: "diameterUnit", wallThicknessInputValue: "wallThicknessUnit", operatingPressureInputValue: "operatingPressureUnit" };
    const sourceUnit = a.parameterKey === "pipeLengthKm" ? "km" : source[unitFields[a.parameterKey]];
    if (typeof sourceUnit !== "string" || !sourceUnit) throw new BasisError(422, `${MISSING}: verified master unit mapping for ${a.parameterKey}.`);
    if (a.unit !== sourceUnit) throw new BasisError(422, "Master-sourced assumption unit differs from its source; no conversion was assumed.");
  }
}
const text = z.string().trim().min(1).max(500);
const id = z.string().min(1).max(200);
const date = z.iso.datetime({ offset: true });
const decimal = z.string().regex(/^-?\d+(\.\d+)?$/, "Use an exact decimal string");
const snapshot = z.record(z.string(), z.unknown());
const requirementSchema = z.object({ checkKey: text, categoryKey: text, categoryLabel: text.optional(), required: z.boolean(), critical: z.boolean(), metric: z.enum(["soil", "coating", "standard", "evidence"]).nullable().optional(), subjectType: z.enum(["SEGMENT", "ASSET"]).nullable().optional(), subjectId: id.nullable().optional(), standardKey: text.nullable().optional() }).strict();
const checklistSnapshot = z.object({ sourceEvidenceId: id.nullable().optional(), requirements: z.array(requirementSchema).max(2000).optional() }).strict();
const metricPolicySnapshot = z.object({ sourceEvidenceId: id.nullable().optional(), definitionVersion: z.literal("cp-basis-v1").optional() }).strict();
export const assumptionSchema = z.object({
  parameterKey: text, parameterLabel: text, valueKind: z.enum(["NUMBER", "TEXT", "BOOLEAN"]),
  numericValue: decimal.nullable().default(null), textValue: z.string().max(10000).nullable().default(null), booleanValue: z.boolean().nullable().default(null),
  unit: text.nullable().default(null), rangeMin: decimal.nullable().default(null), rangeMax: decimal.nullable().default(null),
  sourceModule: text, sourceRecordId: id.nullable().default(null), sourceRevision: text.nullable().default(null),
  sourceEvidenceId: id.nullable().default(null), sourceSnapshot: snapshot, engineerId: id, rationale: z.string().max(5000).nullable().default(null)
}).strict().superRefine((a, ctx) => {
  const values = [a.numericValue !== null, a.textValue !== null, a.booleanValue !== null];
  if (values.filter(Boolean).length !== 1 || !values[["NUMBER", "TEXT", "BOOLEAN"].indexOf(a.valueKind)]) ctx.addIssue({ code: "custom", message: "Supply exactly the value matching valueKind" });
});
export const scopeSchema = z.object({ scopeType: z.enum(["PIPELINE", "SEGMENT", "ASSET"]), segmentId: id.nullable().default(null), assetId: id.nullable().default(null), sourceRevision: text.nullable().default(null), sourceSnapshot: snapshot.default({}) }).strict();
export const evidenceSchema = z.object({ documentId: id, documentVersionId: id, purpose: text }).strict();
export const standardSchema = z.object({ code: text, edition: text, displayCitation: text, sourceEvidenceId: id }).strict();
export const criteriaSchema = z.object({ criteriaSetId: id, criteriaVersionId: id }).strict();
export const checkSchema = z.object({ checkKey: text, categoryKey: text, categoryLabel: text, applicability: z.enum(["APPLICABLE", "NOT_APPLICABLE", "UNKNOWN"]), required: z.boolean(), critical: z.boolean(), outcome: z.enum(["SATISFIED", "UNSATISFIED", "UNKNOWN"]), reason: z.string().max(5000).nullable().default(null), evidenceId: id.nullable().default(null), assumptionId: id.nullable().default(null) }).strict();
// Client-provided IDs are draft-local handles, remapped to generated IDs on copy.
const local = <T extends z.ZodRawShape>(shape: T) => z.object({ id: id.optional(), ...shape }).strict();
export const draftSchema = z.object({
  revisionCode: text, title: text, categoryKey: text, categoryLabel: text, description: z.string().max(20000).nullable().default(null),
  systemType: z.enum(systemTypes).nullable().default(null), nextReviewDueAt: date.nullable().default(null),
  checklistVersion: text.nullable().default(null), checklistSnapshot: checklistSnapshot.default({}), metricPolicyVersion: text.nullable().default(null), metricPolicySnapshot: metricPolicySnapshot.default({}),
  assumptions: z.array(assumptionSchema.safeExtend({ id: id.optional() })).max(500).default([]),
  scope: z.array(local(scopeSchema.shape)).max(5000).default([]), evidence: z.array(local(evidenceSchema.shape)).max(500).default([]),
  standards: z.array(local(standardSchema.shape)).max(500).default([]), criteriaBindings: z.array(local(criteriaSchema.shape)).max(100).default([]), checks: z.array(local(checkSchema.shape)).max(2000).default([])
}).strict();
export type Draft = z.infer<typeof draftSchema>;
export const createSchema = z.object({ pipelineId: id, basisNumber: text, draft: draftSchema, idempotencyKey: id }).strict();
export const editSchema = z.object({ expectedRowVersion: z.number().int().positive(), draft: draftSchema, idempotencyKey: id }).strict();
export const revisionSchema = z.object({ predecessorRevisionId: id, revisionCode: text, idempotencyKey: id }).strict();
export const actionSchema = z.object({ idempotencyKey: id, expectedRowVersion: z.number().int().positive().optional(), contentHash: z.string().regex(/^[0-9a-f]{64}$/).optional(), decision: z.enum(["APPROVED", "RETURNED"]).optional(), reason: z.string().max(5000).optional(), effectiveAt: date.optional(), comment: z.string().trim().min(1).max(10000).optional() }).strict();
export type BasisEvent = { id: string; revisionId: string | null; eventType: string; occurredAt: string; effectiveAt: string | null; actorId: string; actorName?: string; comment?: string; reason?: string; contentHash?: string; after?: any };
export type BasisRecord = { id: string; basisNumber: string; pipelineId: string; pipelineCode: string; pipelineName: string; revisions: BasisRevision[]; events: BasisEvent[] };
export type BasisRevision = Draft & { id: string; basisId: string; lockState: "DRAFT" | "LOCKED"; rowVersion: number; contentHash: string | null; submittedById: string | null; lastContentUpdatedAt: string; sourceDocuments: any[]; createdAt: string };
export type Filters = { pipelineId?: string; segmentId?: string; systemType?: string; designStatus?: string; standardKey?: string; q?: string; page: number; pageSize: number; sort: string; asOf: string; includeDrafts: boolean };
export function parseFilters(query: Record<string, unknown>): Filters {
  const schema = z.object({ pipelineId: id.optional(), segmentId: id.optional(), systemType: z.enum(systemTypes).optional(), designStatus: z.enum(designStatuses).optional(), standardKey: text.optional(), q: z.string().max(200).optional(), page: z.coerce.number().int().min(1).max(100000).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(10), sort: z.enum(["basisNumber", "title", "lastContentUpdatedAt"]).default("basisNumber"), asOf: date.optional(), includeDrafts: z.enum(["true", "false"]).default("false") }).strict();
  const f = schema.parse(query); return { ...f, asOf: f.asOf ? new Date(f.asOf).toISOString() : new Date().toISOString(), includeDrafts: f.includeDrafts === "true" };
}
export function lifecycle(r: BasisRevision, events: BasisEvent[], at: string): string {
  const timeline = events.filter(e => new Date(e.occurredAt) <= new Date(at));
  const own = timeline.filter(e => e.revisionId === r.id);
  if (own.some(e => ["SUPERSEDED", "WITHDRAWN"].includes(e.eventType) && e.effectiveAt && e.effectiveAt <= at)) return "Superseded";
  if (own.some(e => e.eventType === "RETURNED" || e.eventType === "IMPACT_REVIEW_REQUIRED")) return "Revision Required";
  if (own.some(e => e.eventType === "APPROVED")) return "Approved";
  return own.some(e => e.eventType === "SUBMITTED") ? "In Review" : "Draft";
}
export function currentRevision(basis: BasisRecord, at: string, includeDrafts: boolean): BasisRevision | undefined {
  const time = new Date(at).getTime();
  const publications = basis.events.filter(e => e.eventType === "PUBLISHED" && e.effectiveAt && new Date(e.effectiveAt).getTime() <= time && new Date(e.occurredAt).getTime() <= time).sort((a, b) => new Date(b.effectiveAt!).getTime() - new Date(a.effectiveAt!).getTime());
  const last = publications[0];
  if (last) {
    const withdrawn = basis.events.some(e => e.revisionId === last.revisionId && e.eventType === "WITHDRAWN" && e.effectiveAt && new Date(e.effectiveAt).getTime() <= time && new Date(e.occurredAt).getTime() <= time);
    return withdrawn ? undefined : basis.revisions.find(r => r.id === last.revisionId);
  }
  return includeDrafts ? basis.revisions.filter(r => new Date(r.createdAt).getTime() <= time && new Date(r.lastContentUpdatedAt).getTime() <= time).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] : undefined;
}
export function revisionContent(r: BasisRevision) {
  const draft = Object.fromEntries(["revisionCode", "title", "categoryKey", "categoryLabel", "description", "systemType", "nextReviewDueAt", "checklistVersion", "checklistSnapshot", "metricPolicyVersion", "metricPolicySnapshot"].map(k => [k, (r as any)[k]]));
  const order = (rows: any[]) => [...rows].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return { hashFormat: "cp-basis-v1", ...draft, assumptions: order(r.assumptions), scope: order(r.scope), evidence: order(r.evidence), standards: order(r.standards), criteriaBindings: order(r.criteriaBindings), checks: order(r.checks) };
}
export function selectedRows(records: BasisRecord[], f: Filters) {
  return records.flatMap(b => {
    const r = currentRevision(b, f.asOf, f.includeDrafts); if (!r) return [];
    const status = lifecycle(r, b.events, f.asOf);
    if (f.pipelineId && b.pipelineId !== f.pipelineId || f.systemType && r.systemType !== f.systemType || f.designStatus && status !== f.designStatus) return [];
    if (f.segmentId && !r.scope.some(s => s.segmentId === f.segmentId || (s.sourceSnapshot as any).segmentIds?.includes(f.segmentId))) return [];
    if (f.standardKey && !r.standards.some(s => `${s.code}|${s.edition}` === f.standardKey)) return [];
    if (f.q && ![b.basisNumber, r.title, r.categoryLabel, ...r.standards.map(s => s.displayCitation)].join(" ").toLowerCase().includes(f.q.toLowerCase())) return [];
    const approval = b.events.find(e => e.revisionId === r.id && e.eventType === "APPROVED" && e.occurredAt <= f.asOf);
    return [{ ...r, basisNumber: b.basisNumber, pipeline: { id: b.pipelineId, pipelineCode: b.pipelineCode, pipelineName: b.pipelineName }, lifecycleStatus: status, reviewStatus: r.nextReviewDueAt && new Date(r.nextReviewDueAt) < new Date(f.asOf) ? "Overdue" : null, contentLocked: r.lockState === "LOCKED", approvedBy: approval?.actorName ?? null, approvedAt: approval?.occurredAt ?? null, events: b.events.filter(e => e.revisionId === r.id && e.occurredAt <= f.asOf) }];
  }).sort((a, b) => String((a as any)[f.sort]).localeCompare(String((b as any)[f.sort])) || a.id.localeCompare(b.id));
}
