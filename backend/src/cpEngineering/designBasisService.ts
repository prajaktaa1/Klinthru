import { randomUUID } from "node:crypto";
import { AuthUser } from "../types/domain";
import { BasisError, BasisRevision, Draft, actionSchema, assertMasterValue, createSchema, digest, draftSchema, editSchema, revisionContent, revisionSchema } from "./designBasisDomain";
import { BasisDb, assertStorage, assertWriteGuards, authorizedBasis, contentTables, database, loadRecords } from "./designBasisRepository";

type Operation = "create" | "edit" | "revision" | "submit" | "review" | "publish" | "comment";
const fields = ["revisionCode", "title", "categoryKey", "categoryLabel", "description", "systemType", "nextReviewDueAt", "checklistVersion", "checklistSnapshot", "metricPolicyVersion", "metricPolicySnapshot"];
export function writesEnabled() { return process.env.CP_ENGINEERING_WRITES_ENABLED === "true"; }
export function assertWrites(user: AuthUser) {
  if (!writesEnabled()) throw new BasisError(503, "Design Basis writes are disabled until migration, backup and deployment approval gates are resolved.");
  if (!["Admin", "Engineer"].includes(user.role)) throw new BasisError(403, "Engineering write permission required.");
}
async function insert(db: BasisDb, table: string, data: Record<string, unknown>) {
  const keys = Object.keys(data);
  // Table/column names come exclusively from module-owned literal objects.
  const values = keys.map(k => data[k] !== null && typeof data[k] === "object" ? JSON.stringify(data[k]) : data[k]);
  await db.$queryRawUnsafe(`INSERT INTO public."${table}" (${keys.map(k => `"${k}"`).join(",")}) VALUES (${keys.map((key, i) => `$${i + 1}${cast(key)}`).join(",")}) RETURNING id`, ...values);
}
function cast(key: string) {
  if (["sourceSnapshot", "checklistSnapshot", "metricPolicySnapshot", "definitionSnapshot", "before", "after"].includes(key)) return "::jsonb";
  if (["numericValue", "rangeMin", "rangeMax"].includes(key)) return "::numeric";
  if (key.endsWith("At")) return "::timestamptz";
  return "";
}
async function event(db: BasisDb, user: AuthUser, basisId: string, revisionId: string, eventType: string, requestId: string, extra: Record<string, unknown> = {}) {
  await insert(db, "CpDesignBasisEvent", { id: randomUUID(), basisId, revisionId, eventType, actorId: user.id, requestId, ...extra });
}
async function sourcePipeline(db: BasisDb, user: AuthUser, pipelineId: string) {
  const rows = await db.$queryRawUnsafe<any[]>('SELECT * FROM public."Pipeline" WHERE id=$1 AND ($2::boolean OR "createdById"=$3)', pipelineId, user.role === "Admin", user.id);
  if (!rows[0]) throw new BasisError(404, "Pipeline is unavailable or not authorized."); return rows[0];
}
async function documentSource(db: BasisDb, user: AuthUser, documentId: string, versionId: string) {
  const rows = await db.$queryRawUnsafe<any[]>(`SELECT v."Document_Version_ID" AS id,v."Document_ID" AS "documentId",v."File_Name" AS "fileName",v."Document_Revision" AS revision,v."File_Hash_SHA256" AS "fileHash",v."Approval_Status"::text AS "approvalStatus",v."Review_Due_Date" AS "reviewDueDate",v."Issue_Date" AS "issueDate",v."Uploaded_At" AS "uploadedAt" FROM public."Document_Version" v JOIN public."Managed_Document" d ON d."Document_ID"=v."Document_ID" WHERE d."Document_ID"=$1 AND v."Document_Version_ID"=$2 AND ($3::boolean OR d."Owner_ID"=$4 OR EXISTS (SELECT 1 FROM public."Document_Link" l LEFT JOIN public."Segment" s ON s.id=l."Segment_ID" LEFT JOIN public."Asset" a ON a.id=l."Asset_ID" JOIN public."Pipeline" p ON p.id=COALESCE(l."Pipeline_ID",s."pipelineId",a."pipelineId") WHERE l."Document_ID"=d."Document_ID" AND p."createdById"=$4)) FOR SHARE OF v`, documentId, versionId, user.role === "Admin", user.id);
  if (!rows[0]) throw new BasisError(422, "Document_ID/version pair is unavailable or not authorized.");
  return JSON.parse(JSON.stringify(rows[0]));
}
async function criteriaSource(db: BasisDb, pipelineId: string, setId: string, versionId: string) {
  const versions = await db.$queryRawUnsafe<any[]>(`SELECT v.*,s."criteriaSetId" AS "setNumber",s."standardReference" FROM public."CpCriteriaVersion" v JOIN public."CpCriteriaSet" s ON s.id=v."criteriaSetId" WHERE v.id=$1 AND s.id=$2 AND (s."pipelineId" IS NULL OR s."pipelineId"=$3) AND v."approvalStatus"='Approved' FOR SHARE OF v,s`, versionId, setId, pipelineId);
  if (!versions[0]) throw new BasisError(422, "An approved applicable criteria set/version is required.");
  const definitions = await db.$queryRawUnsafe<any[]>('SELECT * FROM public."CpCriterionDefinition" WHERE "criteriaVersionId"=$1 ORDER BY id FOR SHARE', versionId);
  if (!definitions.length) throw new BasisError(422, "Criteria version has no verified definitions.");
  return JSON.parse(JSON.stringify({ ...versions[0], definitions }));
}
async function prepareChildren(db: BasisDb, user: AuthUser, pipelineId: string, draft: Draft) {
  const pipeline = await sourcePipeline(db, user, pipelineId);
  const idMap = new Map<string, string>();
  for (const key of Object.keys(contentTables) as (keyof typeof contentTables)[]) for (const row of draft[key]) {
    if (row.id && idMap.has(row.id)) throw new BasisError(422, "Duplicate draft-local identifier.");
    if (row.id) idMap.set(row.id, randomUUID());
  }
  const remap = (value: string | null) => value ? idMap.get(value) ?? (() => { throw new BasisError(422, "Reference must identify a child in this revision."); })() : null;
  const result: Record<keyof typeof contentTables, any[]> = { evidence: [], assumptions: [], scope: [], standards: [], criteriaBindings: [], checks: [] };
  for (const e of draft.evidence) {
    const source = await documentSource(db, user, e.documentId, e.documentVersionId);
    result.evidence.push({ id: e.id ? idMap.get(e.id) : randomUUID(), documentId: e.documentId, documentVersionId: e.documentVersionId, purpose: e.purpose, capturedFileName: source.fileName, capturedDocumentRevision: source.revision, capturedFileHash: source.fileHash, sourceSnapshot: source });
  }
  for (const s of draft.scope) {
    let source: any;
    if (s.scopeType === "PIPELINE") {
      if (s.segmentId || s.assetId) throw new BasisError(422, "Whole-pipeline scope cannot contain segment/asset fields.");
      const segments = await db.$queryRawUnsafe<any[]>('SELECT id,"segmentId",name,"updatedAt" FROM public."Segment" WHERE "pipelineId"=$1 ORDER BY id', pipelineId);
      const assets = await db.$queryRawUnsafe<any[]>('SELECT id,"assetId",name,"segmentId","updatedAt" FROM public."Asset" WHERE "pipelineId"=$1 ORDER BY id', pipelineId);
      source = { pipeline, segments, assets, segmentIds: segments.map(x => x.id), assetIds: assets.map(x => x.id) };
    } else {
      if (s.scopeType === "SEGMENT" && (!s.segmentId || s.assetId) || s.scopeType === "ASSET" && (!s.assetId || s.segmentId)) throw new BasisError(422, "Invalid scope identity.");
      const table = s.scopeType === "SEGMENT" ? "Segment" : "Asset";
      const rows = await db.$queryRawUnsafe<any[]>(`SELECT * FROM public."${table}" WHERE id=$1 AND "pipelineId"=$2`, s.segmentId ?? s.assetId, pipelineId);
      if (!rows[0]) throw new BasisError(422, "Scope is outside the selected pipeline.");
      source = { ...rows[0], segmentIds: s.segmentId ? [s.segmentId] : [], assetIds: s.assetId ? [s.assetId] : [] };
      if (s.segmentId) {
        const assets = await db.$queryRawUnsafe<any[]>('SELECT id,"assetId",name,"updatedAt" FROM public."Asset" WHERE "segmentId"=$1 AND "pipelineId"=$2 ORDER BY id', s.segmentId, pipelineId);
        source.assets = assets; source.assetIds = assets.map(x => x.id);
      }
    }
    result.scope.push({ id: s.id ? idMap.get(s.id) : randomUUID(), scopeType: s.scopeType, segmentId: s.segmentId, assetId: s.assetId, sourceRevision: null, sourceSnapshot: JSON.parse(JSON.stringify(source)) });
  }
  for (const a of draft.assumptions) {
    let source = a.sourceSnapshot;
    const sourceEvidenceId = remap(a.sourceEvidenceId);
    if (a.sourceModule === "Document Management") {
      const evidence = result.evidence.find(e => e.id === sourceEvidenceId);
      if (!evidence || a.sourceRecordId !== evidence.documentId) throw new BasisError(422, "Document assumption requires exact source evidence."); source = evidence.sourceSnapshot;
    } else if (a.sourceModule === "Pipeline / Asset Master") {
      if (a.sourceRecordId === pipelineId) source = JSON.parse(JSON.stringify(pipeline));
      else {
        const scope = result.scope.find(s => s.segmentId === a.sourceRecordId || s.assetId === a.sourceRecordId);
        if (!scope) throw new BasisError(422, "Master assumption source must be in the accepted scope."); source = scope.sourceSnapshot;
      }
      assertMasterValue(a, source);
    } else if (a.sourceModule !== "Engineering Assumption" || !a.rationale?.trim()) throw new BasisError(422, "Unsupported assumption source or missing engineering rationale.");
    if (a.engineerId !== user.id) throw new BasisError(422, "Draft assumption engineer must be the authenticated author.");
    const { id: oldId, ...content } = a;
    result.assumptions.push({ ...content, id: oldId ? idMap.get(oldId) : randomUUID(), sourceRevision: a.sourceModule === "Engineering Assumption" ? a.sourceRevision : null, sourceEvidenceId, sourceSnapshot: source });
  }
  for (const s of draft.standards) result.standards.push({ ...s, id: s.id ? idMap.get(s.id) : randomUUID(), sourceEvidenceId: remap(s.sourceEvidenceId) });
  for (const c of draft.criteriaBindings) {
    const source = await criteriaSource(db, pipelineId, c.criteriaSetId, c.criteriaVersionId);
    result.criteriaBindings.push({ ...c, id: c.id ? idMap.get(c.id) : randomUUID(), definitionSnapshot: source, definitionHash: digest(source) });
  }
  for (const c of draft.checks) result.checks.push({ ...c, id: c.id ? idMap.get(c.id) : randomUUID(), evidenceId: remap(c.evidenceId), assumptionId: remap(c.assumptionId), reviewerId: user.id, reviewedAt: new Date().toISOString() });
  if (draft.scope.some(s => s.scopeType === "PIPELINE") && draft.scope.some(s => s.scopeType !== "PIPELINE")) throw new BasisError(422, "Use either whole-pipeline scope or explicit segment/asset scope.");
  return result;
}
async function saveChildren(db: BasisDb, revisionId: string, children: Record<keyof typeof contentTables, any[]>) {
  for (const key of ["checks", "standards", "assumptions", "criteriaBindings", "scope", "evidence"] as const) await db.$queryRawUnsafe(`DELETE FROM public."${contentTables[key]}" WHERE "revisionId"=$1 RETURNING id`, revisionId);
  for (const key of ["evidence", "assumptions", "scope", "standards", "criteriaBindings", "checks"] as const) for (const child of children[key]) await insert(db, contentTables[key], { ...child, revisionId });
}
function scalar(draft: Draft) { return Object.fromEntries(fields.map(k => [k, (draft as any)[k]])); }
function copyDraft(r: BasisRevision): Draft {
  const clean = (rows: any[], schema: any) => rows.map(row => Object.fromEntries(Object.keys(schema.shape).filter(k => k in row).map(k => [k, row[k]])));
  return draftSchema.parse({ ...scalar(r), assumptions: clean(r.assumptions, assumptionDraft()), scope: clean(r.scope, scopeDraft()), evidence: clean(r.evidence, evidenceDraft()), standards: clean(r.standards, standardDraft()), criteriaBindings: clean(r.criteriaBindings, criteriaDraft()), checks: clean(r.checks, checkDraft()) });
}
// Read the already defined child schemas from the full draft contract.
function assumptionDraft() { return (draftSchema.shape.assumptions.unwrap() as any).element; }
function scopeDraft() { return (draftSchema.shape.scope.unwrap() as any).element; }
function evidenceDraft() { return (draftSchema.shape.evidence.unwrap() as any).element; }
function standardDraft() { return (draftSchema.shape.standards.unwrap() as any).element; }
function criteriaDraft() { return (draftSchema.shape.criteriaBindings.unwrap() as any).element; }
function checkDraft() { return (draftSchema.shape.checks.unwrap() as any).element; }
export function assertComplete(r: BasisRevision) {
  const requirements = (r.checklistSnapshot as any).requirements;
  if (!r.scope.length || !r.assumptions.length || !r.evidence.length || !r.checklistVersion || !r.metricPolicyVersion || !Array.isArray(requirements) || !requirements.length) throw new BasisError(422, "MISSING FIELD — APPROVAL NEEDED: controlled checklist, policy, assumptions, evidence and scope are required.");
  if (!(r.checklistSnapshot as any).sourceEvidenceId || !r.evidence.some(e => e.id === (r.checklistSnapshot as any).sourceEvidenceId)) throw new BasisError(422, "Checklist must reference its controlled evidence in this revision.");
  if (!(r.metricPolicySnapshot as any).sourceEvidenceId || !r.evidence.some(e => e.id === (r.metricPolicySnapshot as any).sourceEvidenceId)) throw new BasisError(422, "Metric policy must reference controlled evidence in this revision.");
  if (r.assumptions.some(a => a.valueKind === "NUMBER" && !a.unit?.trim())) throw new BasisError(422, "MISSING FIELD — APPROVAL NEEDED: numeric assumption unit (including explicit dimensionless units).");
  const keys = new Set<string>();
  const segmentIds = new Set(r.scope.flatMap(s => (s.sourceSnapshot as any).segmentIds ?? (s.segmentId ? [s.segmentId] : [])));
  const assetIds = new Set(r.scope.flatMap(s => (s.sourceSnapshot as any).assetIds ?? (s.assetId ? [s.assetId] : [])));
  for (const req of requirements) {
    if (typeof req.checkKey !== "string" || keys.has(req.checkKey)) throw new BasisError(422, "Invalid/duplicate requirement key."); keys.add(req.checkKey);
    const c = r.checks.find(x => x.checkKey === req.checkKey);
    if (!c || c.required !== req.required || c.critical !== req.critical || c.categoryKey !== req.categoryKey) throw new BasisError(422, "Checklist requirement and evaluated check do not match.");
    if (req.metric === "soil" && (req.subjectType !== "SEGMENT" || !segmentIds.has(req.subjectId))) throw new BasisError(422, "Soil requirement must identify a segment in the frozen scope.");
    if (req.metric === "coating" && (req.subjectType !== "ASSET" || !assetIds.has(req.subjectId))) throw new BasisError(422, "Coating requirement must identify an asset in the frozen scope.");
    if (req.metric === "standard" && !r.standards.some(s => `${s.code}|${s.edition}` === req.standardKey)) throw new BasisError(422, "Standard requirement must identify a verified edition in this revision.");
    if (req.metric && !["soil", "coating", "standard", "evidence"].includes(req.metric)) throw new BasisError(422, "Unknown metric classification.");
    if (c.applicability === "UNKNOWN" || (c.required || c.critical) && c.applicability !== "NOT_APPLICABLE" && c.outcome !== "SATISFIED") throw new BasisError(422, "Mandatory/critical checks or applicability remain unresolved.");
    if (c.applicability === "APPLICABLE" && c.outcome === "SATISFIED" && req.metric === "evidence" && !c.evidenceId) throw new BasisError(422, "Satisfied evidence requirement must reference exact document-version evidence.");
    if (c.applicability === "APPLICABLE" && c.outcome === "SATISFIED" && ["soil", "coating"].includes(req.metric) && !c.evidenceId && !c.assumptionId) throw new BasisError(422, "Satisfied soil/coating requirement must reference its evidence or assumption.");
    if (c.applicability === "NOT_APPLICABLE" && !c.reason?.trim()) throw new BasisError(422, "Applicability exclusion needs a reason.");
  }
  if (r.checks.some(c => !keys.has(c.checkKey))) throw new BasisError(422, "Check is not in the pinned checklist.");
}
async function verifySources(db: BasisDb, user: AuthUser, pipelineId: string, r: BasisRevision, effectiveAt = new Date().toISOString()) {
  await sourcePipeline(db, user, pipelineId);
  for (const e of r.evidence as any[]) {
    const source = await documentSource(db, user, e.documentId, e.documentVersionId);
    if (digest(source) !== digest(e.sourceSnapshot)) throw new BasisError(409, "Document source changed; create a reviewed revision.");
    if (!["Approved", "ApprovedWithComments"].includes(source.approvalStatus)) throw new BasisError(422, "Evidence must use accepted document versions before submission/publication.");
  }
  for (const c of r.criteriaBindings as any[]) {
    const source = await criteriaSource(db, pipelineId, c.criteriaSetId, c.criteriaVersionId);
    if (digest(source) !== c.definitionHash) throw new BasisError(409, "Criteria definitions changed; impact review required.");
    if (new Date(source.effectiveDate) > new Date(effectiveAt) || source.supersededDate && new Date(source.supersededDate) <= new Date(effectiveAt)) throw new BasisError(422, "Criteria version is not effective at publication time.");
  }
  // Frozen master membership is not expanded here. Verify identities/last accepted
  // source snapshots; newly added members require a separate impact review.
  for (const s of r.scope as any[]) {
    const table = s.scopeType === "PIPELINE" ? "Pipeline" : s.scopeType === "SEGMENT" ? "Segment" : "Asset";
    const sourceId = s.scopeType === "PIPELINE" ? pipelineId : s.segmentId ?? s.assetId;
    const rows = await db.$queryRawUnsafe<any[]>(`SELECT * FROM public."${table}" WHERE id=$1`, sourceId);
    if (!rows[0]) throw new BasisError(409, "Master scope source unavailable; impact review required.");
    const old = s.scopeType === "PIPELINE" ? s.sourceSnapshot.pipeline : s.sourceSnapshot;
    if (new Date(rows[0].updatedAt).toISOString() !== new Date(old.updatedAt).toISOString()) throw new BasisError(409, "Master source changed; impact review required.");
    for (const [memberTable, captured] of [["Segment", s.sourceSnapshot.segments ?? []], ["Asset", s.sourceSnapshot.assets ?? []]] as const) {
      for (const member of captured as any[]) {
        const current = await db.$queryRawUnsafe<any[]>(`SELECT "updatedAt","pipelineId" FROM public."${memberTable}" WHERE id=$1`, member.id);
        if (!current[0] || current[0].pipelineId !== pipelineId || new Date(current[0].updatedAt).toISOString() !== new Date(member.updatedAt).toISOString()) throw new BasisError(409, "A frozen scope member changed; impact review required.");
      }
    }
    if (s.scopeType === "PIPELINE" || s.scopeType === "SEGMENT") {
      const currentAssets = await db.$queryRawUnsafe<any[]>(`SELECT id FROM public."Asset" WHERE "pipelineId"=$1 ${s.scopeType === "SEGMENT" ? 'AND "segmentId"=$2' : ""} ORDER BY id`, pipelineId, ...(s.scopeType === "SEGMENT" ? [s.segmentId] : []));
      if (digest(currentAssets.map(x => x.id).sort()) !== digest([...(s.sourceSnapshot.assetIds ?? [])].sort())) throw new BasisError(409, "Scope membership changed; impact review required.");
      if (s.scopeType === "PIPELINE") {
        const currentSegments = await db.$queryRawUnsafe<any[]>('SELECT id FROM public."Segment" WHERE "pipelineId"=$1 ORDER BY id', pipelineId);
        if (digest(currentSegments.map(x => x.id).sort()) !== digest([...(s.sourceSnapshot.segmentIds ?? [])].sort())) throw new BasisError(409, "Pipeline membership changed; impact review required.");
      }
    }
  }
}
export async function writeBasis(user: AuthUser, operation: Operation, raw: unknown, basisId?: string, revisionId?: string) {
  assertWrites(user); // Fail before connecting while deployment gates are closed.
  const payload: any = operation === "create" ? createSchema.parse(raw) : operation === "edit" ? editSchema.parse(raw) : operation === "revision" ? revisionSchema.parse(raw) : actionSchema.parse(raw);
  const requestId = randomUUID(); const requestHash = digest({ operation, basisId: basisId ?? null, revisionId: revisionId ?? null, payload });
  return database().$transaction(async db => {
    await assertStorage(db);
    await assertWriteGuards(db);
    await db.$queryRawUnsafe("SELECT set_config('klinthru.cp_actor_id',$1,true),set_config('klinthru.cp_request_id',$2,true)", user.id, requestId);
    const retry = await db.$queryRawUnsafe<any[]>('SELECT * FROM public."CpDesignBasisEvent" WHERE "idempotencyKey"=$1', payload.idempotencyKey);
    if (retry[0]) {
      if (retry[0].actorId !== user.id || retry[0].after?.requestHash !== requestHash) throw new BasisError(409, "Idempotency key conflicts with an earlier operation.");
      await authorizedBasis(db, user, retry[0].basisId); return { basisId: retry[0].basisId, revisionId: retry[0].revisionId, replayed: true };
    }
    let basis: any;
    if (operation === "create") {
      await sourcePipeline(db, user, payload.pipelineId);
      basisId = randomUUID(); revisionId = randomUUID(); basis = { id: basisId, pipelineId: payload.pipelineId };
      await insert(db, "CpDesignBasis", { id: basisId, basisNumber: payload.basisNumber, pipelineId: payload.pipelineId, createdById: user.id });
      const children = await prepareChildren(db, user, basis.pipelineId, payload.draft);
      const draft = remapChecklist(payload.draft, children);
      await insert(db, "CpDesignBasisRevision", { id: revisionId, basisId, ...scalar(draft), createdById: user.id });
      await saveChildren(db, revisionId!, children);
    } else {
      basis = await authorizedBasis(db, user, basisId!, true);
      if (operation === "revision") revisionId = payload.predecessorRevisionId;
      const locked = await db.$queryRawUnsafe<any[]>('SELECT id FROM public."CpDesignBasisRevision" WHERE id=$1 AND "basisId"=$2 FOR UPDATE', revisionId, basisId);
      if (!locked.length) throw new BasisError(404, "Revision not found.");
      const record = (await loadRecords(db, user, basisId))[0]; const r = record.revisions.find(x => x.id === revisionId)!;
      const ownEvents = record.events.filter(e => e.revisionId === revisionId);
      if (operation === "revision") {
        const draft = copyDraft(r); draft.revisionCode = payload.revisionCode;
        // Copy approved source snapshots exactly; do not recapture latest sources.
        const children = copyChildren(r);
        const remapped = remapChecklist(draft, children);
        const newId = randomUUID();
        await insert(db, "CpDesignBasisRevision", { id: newId, basisId, predecessorRevisionId: revisionId, ...scalar(remapped), createdById: user.id });
        await saveChildren(db, newId, children); revisionId = newId;
      } else if (operation === "edit") {
        if (r.lockState !== "DRAFT" || r.rowVersion !== payload.expectedRowVersion) throw new BasisError(409, "Revision is locked or the draft changed. Reload before editing.");
        if (payload.draft.revisionCode !== r.revisionCode) throw new BasisError(422, "Revision identity cannot change.");
        const children = await prepareChildren(db, user, basis.pipelineId, payload.draft);
        const scalars = scalar(remapChecklist(payload.draft, children)); const keys = Object.keys(scalars);
        await db.$queryRawUnsafe(`UPDATE public."CpDesignBasisRevision" SET ${keys.map((k, i) => `"${k}"=$${i + 2}${cast(k)}`).join(",")} WHERE id=$1 RETURNING id`, revisionId, ...keys.map(k => typeof scalars[k] === "object" && scalars[k] !== null ? JSON.stringify(scalars[k]) : scalars[k]));
        await saveChildren(db, revisionId!, children);
      } else if (operation === "comment") {
        if (!payload.comment?.trim()) throw new BasisError(422, "Comment required.");
      } else if (operation === "submit") {
        if (r.lockState !== "DRAFT" || r.rowVersion !== payload.expectedRowVersion) throw new BasisError(409, "Draft changed or is already submitted.");
        assertComplete(r); await verifySources(db, user, basis.pipelineId, r);
        const hash = digest(revisionContent(r));
        await db.$queryRawUnsafe('UPDATE public."CpDesignBasisRevision" SET "lockState"=\'LOCKED\',"contentHash"=$2,"submittedAt"=clock_timestamp(),"submittedById"=$3 WHERE id=$1 RETURNING id', revisionId, hash, user.id);
        payload.contentHash = hash;
      } else {
        if (r.lockState !== "LOCKED" || !payload.contentHash || r.contentHash !== payload.contentHash || digest(revisionContent(r)) !== r.contentHash) throw new BasisError(409, "Exact submitted content hash is required.");
        if (operation === "review") {
          if (!payload.decision || !ownEvents.some(e => e.eventType === "SUBMITTED") || ownEvents.some(e => ["APPROVED", "RETURNED"].includes(e.eventType))) throw new BasisError(409, "Review is not available in this lifecycle state.");
          if (r.submittedById === user.id) throw new BasisError(403, "Submitter cannot approve or return their own revision.");
          if (payload.decision === "RETURNED" && !payload.reason?.trim()) throw new BasisError(422, "Return reason required.");
          if (payload.decision === "APPROVED") { assertComplete(r); await verifySources(db, user, basis.pipelineId, r); }
        } else {
          if (!ownEvents.some(e => e.eventType === "APPROVED") || ownEvents.some(e => e.eventType === "PUBLISHED")) throw new BasisError(409, "Publication requires an approved, unpublished revision.");
          const effectiveAt = payload.effectiveAt;
          if (!effectiveAt || new Date(effectiveAt).getTime() < Date.now()) throw new BasisError(422, "Publication must have a present/future effective time.");
          const previous = record.events.filter(e => e.eventType === "PUBLISHED").sort((a, b) => new Date(b.effectiveAt!).getTime() - new Date(a.effectiveAt!).getTime())[0];
          if (previous && new Date(previous.effectiveAt!).getTime() >= new Date(effectiveAt).getTime()) throw new BasisError(409, "Publication dates must increase without overlapping scheduled revisions.");
          assertComplete(r); await verifySources(db, user, basis.pipelineId, r, effectiveAt);
          if (previous) await event(db, user, basisId!, previous.revisionId!, "SUPERSEDED", requestId, { effectiveAt });
        }
      }
    }
    const eventType = operation === "submit" ? "SUBMITTED" : operation === "review" ? payload.decision : operation === "publish" ? "PUBLISHED" : operation === "comment" ? "COMMENT_ADDED" : "CONTENT_CHANGED";
    await event(db, user, basisId!, revisionId!, eventType, requestId, { idempotencyKey: payload.idempotencyKey, after: { requestHash, operation }, ...(payload.contentHash ? { contentHash: payload.contentHash } : {}), ...(payload.reason ? { reason: payload.reason } : {}), ...(operation === "comment" ? { comment: payload.comment } : {}), ...(operation === "publish" ? { effectiveAt: payload.effectiveAt } : {}) });
    return { basisId, revisionId, replayed: false };
  }, { isolationLevel: "Serializable", timeout: 30000 });
}
function remapChecklist(draft: Draft, children: Record<keyof typeof contentTables, any[]>): Draft {
  const snapshot = { ...draft.checklistSnapshot };
  const original = draft.evidence.find(e => e.id === snapshot.sourceEvidenceId);
  if (original) snapshot.sourceEvidenceId = children.evidence.find(e => e.documentVersionId === original.documentVersionId && e.purpose === original.purpose)?.id;
  const policy = { ...draft.metricPolicySnapshot };
  const policyEvidence = draft.evidence.find(e => e.id === policy.sourceEvidenceId);
  if (policyEvidence) policy.sourceEvidenceId = children.evidence.find(e => e.documentVersionId === policyEvidence.documentVersionId && e.purpose === policyEvidence.purpose)?.id;
  return { ...draft, checklistSnapshot: snapshot, metricPolicySnapshot: policy };
}
function copyChildren(r: BasisRevision): Record<keyof typeof contentTables, any[]> {
  const ids = new Map<string, string>();
  for (const key of Object.keys(contentTables) as (keyof typeof contentTables)[]) for (const row of r[key] as any[]) ids.set(row.id, randomUUID());
  const result = {} as Record<keyof typeof contentTables, any[]>;
  for (const key of Object.keys(contentTables) as (keyof typeof contentTables)[]) result[key] = (r[key] as any[]).map(row => {
    const { revisionId: _revisionId, ...copy } = row;
    copy.id = ids.get(row.id);
    for (const field of ["sourceEvidenceId", "evidenceId", "assumptionId"]) if (copy[field]) copy[field] = ids.get(copy[field]);
    return copy;
  });
  return result;
}
