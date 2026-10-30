import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { BasisError, MISSING, designStatuses, lifecycle, parseFilters, selectedRows, systemTypes } from "../cpEngineering/designBasisDomain";
import { readSnapshot } from "../cpEngineering/designBasisRepository";
import { basisSummary } from "../cpEngineering/designBasisMetrics";
import { writeBasis, writesEnabled } from "../cpEngineering/designBasisService";
import { assertNoDangerousKeys, isRequestValidationError } from "../validation/validationErrors";

export const cpEngineeringDesignBasesRouter = Router();
cpEngineeringDesignBasesRouter.use(requireAuth);
function route(handler: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response) => {
    try { await handler(req, res); }
    catch (error) {
      if (error instanceof BasisError) { res.status(error.status).json({ message: error.message, availability: false }); return; }
      if (error instanceof z.ZodError) { res.status(400).json({ message: "Invalid Design Basis fields.", fields: error.flatten() }); return; }
      if (isRequestValidationError(error)) { res.status(400).json({ message: "Invalid Design Basis fields.", fields: error.fields }); return; }
      // Do not expose SQL, credentials, source hashes or database exception text.
      const code = (error as any)?.meta?.code ?? (error as any)?.code;
      if (["P2002", "23505", "P2034", "40001"].includes(code)) { res.status(409).json({ message: "Concurrent/conflicting Design Basis operation. Reload and retry with the same idempotency key." }); return; }
      if (["23503", "23514", "22P02"].includes(code)) { res.status(422).json({ message: "Design Basis references or field values do not satisfy the engineering constraints." }); return; }
      res.status(503).json({ message: "Design Basis storage or operation unavailable. No source data was substituted.", availability: false });
    }
  };
}
cpEngineeringDesignBasesRouter.get("/options", route(async (req, res) => {
  const result = await readSnapshot(req.user!, async (db, records) => {
    const pipelines = await db.$queryRawUnsafe<any[]>('SELECT id,"pipelineCode","pipelineName" FROM public."Pipeline" WHERE ($1::boolean OR "createdById"=$2) ORDER BY "pipelineName",id', req.user!.role === "Admin", req.user!.id);
    const segments = await db.$queryRawUnsafe<any[]>('SELECT s.id,s."pipelineId",s."segmentId",s.name FROM public."Segment" s JOIN public."Pipeline" p ON p.id=s."pipelineId" WHERE ($1::boolean OR p."createdById"=$2) ORDER BY s."segmentId"', req.user!.role === "Admin", req.user!.id);
    const assets = await db.$queryRawUnsafe<any[]>('SELECT a.id,a."pipelineId",a."segmentId",a."assetId",a.name FROM public."Asset" a JOIN public."Pipeline" p ON p.id=a."pipelineId" WHERE ($1::boolean OR p."createdById"=$2) ORDER BY a."assetId"', req.user!.role === "Admin", req.user!.id);
    const criteriaVersions = await db.$queryRawUnsafe<any[]>(`SELECT v.id,v."criteriaSetId",v.version,s.name,s."pipelineId" FROM public."CpCriteriaVersion" v JOIN public."CpCriteriaSet" s ON s.id=v."criteriaSetId" LEFT JOIN public."Pipeline" p ON p.id=s."pipelineId" WHERE v."approvalStatus"='Approved' AND (s."pipelineId" IS NULL OR $1::boolean OR p."createdById"=$2) ORDER BY s.name,v.version`, req.user!.role === "Admin", req.user!.id);
    const standards = [...new Map(records.flatMap(b => b.revisions.flatMap(r => r.standards)).map(s => [`${s.code}|${s.edition}`, { key: `${s.code}|${s.edition}`, label: s.displayCitation }])).values()];
    return { pipelines, segments, assets, criteriaVersions, standards, systemTypes, designStatuses, categories: [...new Map(records.flatMap(b => b.revisions).map(r => [r.categoryKey, { key: r.categoryKey, label: r.categoryLabel }])).values()], pageSizes: [10], writesEnabled: writesEnabled(), missingOptions: ["Advanced Filters", "Row menu options", ...(standards.length ? [] : ["Verified standard editions"])], source: "CP Engineering.docx and authorized persisted records", unavailableReason: MISSING };
  }); res.json(result);
}));
cpEngineeringDesignBasesRouter.get("/summary", route(async (req, res) => {
  const f = parseFilters(req.query); res.json(await readSnapshot(req.user!, async (_db, records) => basisSummary(records, f)));
}));
cpEngineeringDesignBasesRouter.get("/export", route(async (req, res) => {
  const f = parseFilters(req.query);
  // JSON preserves exact revisions, units, source IDs and metric provenance.
  // PDF/Word layouts remain blocked until their report format is approved.
  const result = await readSnapshot(req.user!, async (_db, records) => ({ format: "cp-design-basis-v1", filterScope: f, items: selectedRows(records, f), summary: basisSummary(records, f) }));
  res.setHeader("Content-Disposition", 'attachment; filename="cp-design-basis.json"'); res.json(result);
}));
cpEngineeringDesignBasesRouter.get("/", route(async (req, res) => {
  const f = parseFilters(req.query);
  res.json(await readSnapshot(req.user!, async (_db, records) => { const rows = selectedRows(records, f); return { items: rows.slice((f.page - 1) * f.pageSize, f.page * f.pageSize), total: rows.length, page: f.page, pageSize: f.pageSize, filterScope: f }; }));
}));
cpEngineeringDesignBasesRouter.get("/:basisId/history", route(async (req, res) => {
  const page = z.coerce.number().int().positive().default(1).parse(req.query.page);
  res.json(await readSnapshot(req.user!, async (_db, records) => { if (!records[0]) throw new BasisError(404, "Design Basis not found."); const events = [...records[0].events].reverse(); return { items: events.slice((page - 1) * 25, page * 25), total: events.length, page, pageSize: 25 }; }, String(req.params.basisId)));
}));
cpEngineeringDesignBasesRouter.get("/:basisId/revisions/:revisionId", route(async (req, res) => {
  res.json(await readSnapshot(req.user!, async (_db, records) => {
    const b = records[0]; const r = b?.revisions.find(x => x.id === String(req.params.revisionId)); if (!b || !r) throw new BasisError(404, "Revision not found.");
    const now = new Date().toISOString(); const events = b.events.filter(e => e.revisionId === r.id);
    const publish = events.find(e => e.eventType === "PUBLISHED"); const end = events.filter(e => ["SUPERSEDED", "WITHDRAWN"].includes(e.eventType) && e.effectiveAt).sort((a, c) => new Date(a.effectiveAt!).getTime() - new Date(c.effectiveAt!).getTime())[0];
    return { ...r, basisNumber: b.basisNumber, pipeline: { id: b.pipelineId, pipelineCode: b.pipelineCode, pipelineName: b.pipelineName }, lifecycleStatus: lifecycle(r, b.events, now), events, effectiveFrom: publish?.effectiveAt ?? null, effectiveTo: end?.effectiveAt ?? null, writesEnabled: writesEnabled() };
  }, String(req.params.basisId)));
}));
cpEngineeringDesignBasesRouter.get("/:basisId", route(async (req, res) => {
  res.json(await readSnapshot(req.user!, async (_db, records) => { if (!records[0]) throw new BasisError(404, "Design Basis not found."); return records[0]; }, String(req.params.basisId)));
}));
for (const [method, path, operation] of [["post", "/", "create"], ["post", "/:basisId/revisions", "revision"], ["patch", "/:basisId/revisions/:revisionId", "edit"], ["post", "/:basisId/revisions/:revisionId/submit", "submit"], ["post", "/:basisId/revisions/:revisionId/review-decisions", "review"], ["post", "/:basisId/revisions/:revisionId/publications", "publish"], ["post", "/:basisId/revisions/:revisionId/comments", "comment"]] as const) {
  cpEngineeringDesignBasesRouter[method](path, route(async (req, res) => { assertNoDangerousKeys(req.body); const result = await writeBasis(req.user!, operation, req.body, req.params.basisId ? String(req.params.basisId) : undefined, req.params.revisionId ? String(req.params.revisionId) : undefined); res.status(result.replayed ? 200 : 201).json(result); }));
}
