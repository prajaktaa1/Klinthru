import { parseKp } from "../coreEngine/chainage/ChainageAgent";
import { createValidationError } from "../validation/validationErrors";
import { NextFunction, Response, Router } from "express";

import { store } from "../data/store";
import { ownerScope, canModifyMasterData } from "../lib/access";
import { requireAuth } from "../middleware/auth";
import { routeGeometryMatchesSaved, validatePipelineInput } from "../validation/pipelineValidation";
import { assertNoDangerousKeys } from "../validation/validationErrors";
import { getPrismaClient } from "../lib/prisma";
import { proposedRouteInput } from "../validation/proposedRoute";
import { proposedRouteReview, proposedRouteSubmission, type ProposedRouteWorkflow } from "../validation/proposedRoute";
import { alignmentLength, alignmentReadiness } from "../coreEngine/chainage/ChainageAgent";
import { randomUUID } from "node:crypto";

export const pipelinesRouter = Router();

function workflowError(error: unknown, response: Response, next: NextFunction) {
  const message = error instanceof Error ? error.message : "Verified GIS workflow failed.";
  if (/evidence|calibrat|geometry|draft proposed|already under review|only submitted/i.test(message)) { response.status(400).json({ message }); return; }
  if (/independent review|submitter cannot/i.test(message)) { response.status(403).json({ message }); return; }
  next(error);
}

async function hasRouteVersionColumn(tx: { $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T> }): Promise<boolean> {
  const [row] = await tx.$queryRawUnsafe<Array<{ present: boolean }>>(`SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='PipelineProposedRoute' AND column_name='version') AS present`);
  return row?.present === true;
}

pipelinesRouter.use(requireAuth);

pipelinesRouter.get("/", async (request, response) => {
  const archivedOnly = request.query.archived === "true";
  if (archivedOnly && request.user!.role !== "Admin") { response.status(403).json({ message: "Archived pipelines are available to Admin users only." }); return; }
  const pipelines = await store.listPipelines({
    search: typeof request.query.search === "string" ? request.query.search : undefined,
    archivedOnly,
    ...ownerScope(request.user!)
  });
  response.json(pipelines);
});

pipelinesRouter.post("/:id/archive", async (request, response, next: NextFunction) => {
  try {
    if (request.user!.role !== "Admin") { response.status(403).json({ message: "Pipeline archiving requires Admin permission." }); return; }
    const existing = await store.findPipelineById(request.params.id, ownerScope(request.user!));
    if (!existing) { response.status(404).json({ message: "Pipeline not found." }); return; }
    const archived = await store.updatePipeline(existing.id, { pipeline: { ...existing, status: "Inactive" }, auditUserId: request.user!.id, createdById: existing.createdById });
    response.json(archived);
  } catch (error) { next(error); }
});

pipelinesRouter.post("/:id/restore", async (request, response, next: NextFunction) => {
  try {
    if (request.user!.role !== "Admin") { response.status(403).json({ message: "Pipeline restoration requires Admin permission." }); return; }
    const existing = await store.findPipelineById(request.params.id, ownerScope(request.user!));
    if (!existing || existing.status !== "Inactive") { response.status(404).json({ message: "Archived pipeline not found." }); return; }
    const restored = await store.updatePipeline(existing.id, { pipeline: { ...existing, status: "Active" }, auditUserId: request.user!.id, createdById: existing.createdById });
    response.json(restored);
  } catch (error) { next(error); }
});

pipelinesRouter.post("/", async (request, response, next: NextFunction) => {
  try {
    assertNoDangerousKeys(request.body);
    const input = validatePipelineInput(request.body);
    if (input.routeGeometry && !canModifyMasterData(request.user!)) { response.status(403).json({ message: "Route import requires Admin or Engineer permission." }); return; }
    const created = await store.createPipeline({
      pipeline: input,
      auditUserId: request.user?.id,
      createdById: request.user?.id
    });
    response.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

// Proposed routes are deliberately separate from Pipeline.routeGeometry. They are never chainage or approval input.
pipelinesRouter.get("/:id/proposed-route", async (request, response, next: NextFunction) => {
  try {
    const pipeline = await store.findPipelineById(request.params.id, ownerScope(request.user!));
    if (!pipeline) { response.status(404).json({ message: "Pipeline not found." }); return; }
    const db = getPrismaClient(); if (!db) { response.status(503).json({ message: "Database is unavailable." }); return; }
    const rows = await db.$queryRawUnsafe<any[]>(`SELECT * FROM "PipelineProposedRoute" WHERE "pipelineId"=$1 AND status='ACTIVE'`, pipeline.id);
    response.json(rows[0] ?? null);
  } catch (error) { next(error); }
});

pipelinesRouter.put("/:id/proposed-route", async (request, response, next: NextFunction) => {
  try {
    assertNoDangerousKeys(request.body);
    if (!canModifyMasterData(request.user!)) { response.status(403).json({ message: "Proposed route editing requires Admin or Engineer permission." }); return; }
    const pipeline = await store.findPipelineById(request.params.id, ownerScope(request.user!));
    if (!pipeline) { response.status(404).json({ message: "Pipeline not found." }); return; }
    const input = proposedRouteInput.parse(request.body);
    const db = getPrismaClient(); if (!db) { response.status(503).json({ message: "Database is unavailable." }); return; }
    const saved = await db.$transaction(async tx => {
      const existing = await tx.$queryRawUnsafe<any[]>(`SELECT * FROM "PipelineProposedRoute" WHERE "pipelineId"=$1 AND status='ACTIVE' FOR UPDATE`, pipeline.id);
      const current = existing[0];
      const versionColumn = await hasRouteVersionColumn(tx);
      const currentWorkflow = (current?.sourceMetadata?.workflow ?? { status: "DRAFT", evidence: [] }) as ProposedRouteWorkflow;
      if (["SUBMITTED", "APPROVED"].includes(currentWorkflow.status)) throw new Error("Submitted or approved proposed routes cannot be edited; reject or create a new review cycle.");
      // One active proposed route per pipeline: update the same record rather
      // than creating route-history records. The partial unique index is the
      // database-level guard for concurrent requests.
      const id = current?.id ?? randomUUID();
      const version = Number(current?.version ?? current?.sourceMetadata?.workflow?.revision ?? 0) + 1;
      const { workflow: _untrustedWorkflow, ...safeSourceMetadata } = input.sourceMetadata ?? {};
      const metadata = { ...safeSourceMetadata, workflow: { status: "DRAFT", evidence: [] } };
      if (current) {
        if (versionColumn) await tx.$executeRawUnsafe(`UPDATE "PipelineProposedRoute" SET geometry=$1::jsonb, provenance=$2, status='ACTIVE', version=$3, "sourceMetadata"=$4::jsonb, "updatedAt"=CURRENT_TIMESTAMP WHERE id=$5`, JSON.stringify(input.geometry), input.provenance, version, JSON.stringify(metadata), id);
        else await tx.$executeRawUnsafe(`UPDATE "PipelineProposedRoute" SET geometry=$1::jsonb, provenance=$2, status='ACTIVE', "sourceMetadata"=$3::jsonb, "updatedAt"=CURRENT_TIMESTAMP WHERE id=$4`, JSON.stringify(input.geometry), input.provenance, JSON.stringify({ ...metadata, workflow: { ...metadata.workflow, revision: version } }), id);
      } else {
        if (versionColumn) await tx.$executeRawUnsafe(`INSERT INTO "PipelineProposedRoute" (id,"pipelineId",geometry,provenance,status,version,"sourceMetadata","createdAt","updatedAt") VALUES ($1,$2,$3::jsonb,$4,'ACTIVE',$5,$6::jsonb,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`, id, pipeline.id, JSON.stringify(input.geometry), input.provenance, version, JSON.stringify(metadata));
        else await tx.$executeRawUnsafe(`INSERT INTO "PipelineProposedRoute" (id,"pipelineId",geometry,provenance,status,"sourceMetadata","createdAt","updatedAt") VALUES ($1,$2,$3::jsonb,$4,'ACTIVE',$5::jsonb,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`, id, pipeline.id, JSON.stringify(input.geometry), input.provenance, JSON.stringify({ ...metadata, workflow: { ...metadata.workflow, revision: version } }));
      }
      const rows = await tx.$queryRawUnsafe<any[]>(`SELECT * FROM "PipelineProposedRoute" WHERE id=$1`,id);
      await tx.$executeRawUnsafe(`INSERT INTO "MasterChangeEvent" (id,"pipelineId","objectType","objectId","userId",action,"occurredAt","beforeValues","afterValues") VALUES ($1,$2,'PipelineProposedRoute',$3,$4,$5,CURRENT_TIMESTAMP,$6::jsonb,$7::jsonb)`, `proposed-route-${randomUUID()}`,pipeline.id,id,request.user!.id,existing[0]?'UPDATE':'CREATE',JSON.stringify(existing[0] ?? null),JSON.stringify(rows[0]));
      return rows[0];
    });
    response.json(saved);
  } catch (error) { workflowError(error, response, next); }
});

pipelinesRouter.post("/:id/proposed-route/submit", async (request, response, next: NextFunction) => {
  try {
    if (!canModifyMasterData(request.user!)) { response.status(403).json({ message: "Verified GIS submission requires Admin or Engineer permission." }); return; }
    const pipeline = await store.findPipelineById(request.params.id, ownerScope(request.user!));
    if (!pipeline) { response.status(404).json({ message: "Pipeline not found." }); return; }
    if (!pipeline.pipeLengthKm || pipeline.pipeLengthKm <= 0) { response.status(400).json({ message: "A positive configured pipeline length is required for chainage calibration." }); return; }
    const input = proposedRouteSubmission.parse(request.body);
    const configuredLengthMeters = pipeline.pipeLengthKm * 1000;
    const calibration = alignmentReadiness(input.geometry, configuredLengthMeters);
    if (!calibration.ready) { response.status(400).json({ message: calibration.reason ?? "Proposed route is not chainage-calibrated to the pipeline length." }); return; }
    const db = getPrismaClient(); if (!db) { response.status(503).json({ message: "Database is unavailable." }); return; }
    const saved = await db.$transaction(async tx => {
      const [route] = await tx.$queryRawUnsafe<any[]>(`SELECT * FROM "PipelineProposedRoute" WHERE "pipelineId"=$1 AND status='ACTIVE' FOR UPDATE`, pipeline.id);
      const versionColumn = await hasRouteVersionColumn(tx);
      if (!route) throw new Error("A draft proposed route must be saved before submission.");
      const workflow = route.sourceMetadata?.workflow as ProposedRouteWorkflow | undefined;
      if (workflow?.status === "SUBMITTED" || workflow?.status === "APPROVED") throw new Error("This proposed route is already under review or approved.");
      if (JSON.stringify(route.geometry) !== JSON.stringify(input.geometry)) throw new Error("Submitted geometry must match the saved draft exactly.");
      const evidence = await tx.$queryRawUnsafe<any[]>(`SELECT v."Document_ID" AS "documentId", v."Document_Version_ID" AS "documentVersionId", v."Approval_Status"::text AS "approvalStatus", v."Validity_Review_Status"::text AS "validityStatus" FROM "Document_Version" v JOIN "Managed_Document" d ON d."Document_ID"=v."Document_ID" JOIN "Document_Link" l ON l."Document_Version_ID"=v."Document_Version_ID" AND l."Document_ID"=v."Document_ID" WHERE l."Pipeline_ID"=$1 AND v."Document_ID"=ANY($2::text[]) AND v."Document_Version_ID"=ANY($3::text[])`, pipeline.id, input.evidence.map(e => e.documentId), input.evidence.map(e => e.documentVersionId));
      if (evidence.length !== input.evidence.length || evidence.some(e => e.approvalStatus !== "Approved" || e.validityStatus === "Expired")) throw new Error("Every evidence item must be an approved, non-expired survey document version linked to this pipeline.");
      const routeLengthMeters = alignmentLength(input.geometry), toleranceMeters = Math.max(5, configuredLengthMeters * 0.01);
      const metadata = { ...(route.sourceMetadata ?? {}), workflow: { status: "SUBMITTED", submittedById: request.user!.id, submittedAt: new Date().toISOString(), evidence: input.evidence, calibration: { routeLengthMeters, configuredLengthMeters, toleranceMeters } } };
      if (versionColumn) await tx.$executeRawUnsafe(`UPDATE "PipelineProposedRoute" SET provenance=$1, "sourceMetadata"=$2::jsonb, version=version+1, "updatedAt"=CURRENT_TIMESTAMP WHERE id=$3`, input.provenance, JSON.stringify(metadata), route.id);
      else await tx.$executeRawUnsafe(`UPDATE "PipelineProposedRoute" SET provenance=$1, "sourceMetadata"=$2::jsonb, "updatedAt"=CURRENT_TIMESTAMP WHERE id=$3`, input.provenance, JSON.stringify({ ...metadata, workflow: { ...metadata.workflow, revision: Number(route.sourceMetadata?.workflow?.revision ?? route.sourceMetadata?.revision ?? 0) + 1 } }), route.id);
      const [updated] = await tx.$queryRawUnsafe<any[]>(`SELECT * FROM "PipelineProposedRoute" WHERE id=$1`, route.id);
      await tx.$executeRawUnsafe(`INSERT INTO "MasterChangeEvent" (id,"pipelineId","objectType","objectId","userId",action,"occurredAt","beforeValues","afterValues") VALUES ($1,$2,'PipelineProposedRoute',$3,$4,'SUBMIT',CURRENT_TIMESTAMP,$5::jsonb,$6::jsonb)`, `proposed-route-${randomUUID()}`, pipeline.id, route.id, request.user!.id, JSON.stringify(route), JSON.stringify(updated));
      return updated;
    });
    response.json(saved);
  } catch (error) { workflowError(error, response, next); }
});

pipelinesRouter.post("/:id/proposed-route/review", async (request, response, next: NextFunction) => {
  try {
    if (!canModifyMasterData(request.user!)) { response.status(403).json({ message: "Verified GIS review requires Admin or Engineer permission." }); return; }
    const input = proposedRouteReview.parse(request.body), pipeline = await store.findPipelineById(request.params.id, ownerScope(request.user!));
    if (!pipeline) { response.status(404).json({ message: "Pipeline not found." }); return; }
    const db = getPrismaClient(); if (!db) { response.status(503).json({ message: "Database is unavailable." }); return; }
    const result = await db.$transaction(async tx => {
      const [route] = await tx.$queryRawUnsafe<any[]>(`SELECT * FROM "PipelineProposedRoute" WHERE "pipelineId"=$1 AND status='ACTIVE' FOR UPDATE`, pipeline.id);
      const versionColumn = await hasRouteVersionColumn(tx);
      const workflow = route?.sourceMetadata?.workflow as ProposedRouteWorkflow | undefined;
      if (!route || !workflow || workflow.status !== "SUBMITTED") throw new Error("Only submitted proposed routes can be reviewed.");
      if (workflow.submittedById === request.user!.id) throw new Error("Independent review is required; the submitter cannot review their own route.");
      const status = input.decision === "APPROVE" ? "APPROVED" : "REJECTED";
      const metadata = { ...(route.sourceMetadata ?? {}), workflow: { ...workflow, status, reviewedById: request.user!.id, reviewedAt: new Date().toISOString(), reviewReason: input.reason } };
      if (versionColumn) await tx.$executeRawUnsafe(`UPDATE "PipelineProposedRoute" SET "sourceMetadata"=$1::jsonb, version=version+1, "updatedAt"=CURRENT_TIMESTAMP WHERE id=$2`, JSON.stringify(metadata), route.id);
      else await tx.$executeRawUnsafe(`UPDATE "PipelineProposedRoute" SET "sourceMetadata"=$1::jsonb, "updatedAt"=CURRENT_TIMESTAMP WHERE id=$2`, JSON.stringify({ ...metadata, workflow: { ...metadata.workflow, revision: Number(route.sourceMetadata?.workflow?.revision ?? route.sourceMetadata?.revision ?? 0) + 1 } }), route.id);
      const [updated] = await tx.$queryRawUnsafe<any[]>(`SELECT * FROM "PipelineProposedRoute" WHERE id=$1`, route.id);
      await tx.$executeRawUnsafe(`INSERT INTO "MasterChangeEvent" (id,"pipelineId","objectType","objectId","userId",action,"occurredAt","beforeValues","afterValues") VALUES ($1,$2,'PipelineProposedRoute',$3,$4,$5,CURRENT_TIMESTAMP,$6::jsonb,$7::jsonb)`, `proposed-route-${randomUUID()}`, pipeline.id, route.id, request.user!.id, status === "APPROVED" ? "APPROVE" : "REJECT", JSON.stringify(route), JSON.stringify(updated));
      return updated;
    });
    response.json(result);
  } catch (error) { workflowError(error, response, next); }
});

// Retain the original route row and its audit trail. Only the active visual
// overlay is deactivated; verified Pipeline.routeGeometry is never touched.
pipelinesRouter.delete("/:id/proposed-route", async (request, response, next: NextFunction) => {
  try {
    if (!canModifyMasterData(request.user!)) { response.status(403).json({ message: "Proposed route removal requires Admin or Engineer permission." }); return; }
    const pipeline = await store.findPipelineById(request.params.id, ownerScope(request.user!));
    if (!pipeline) { response.status(404).json({ message: "Pipeline not found." }); return; }
    const db = getPrismaClient(); if (!db) { response.status(503).json({ message: "Database is unavailable." }); return; }
    const deactivated = await db.$transaction(async tx => {
      const existing = await tx.$queryRawUnsafe<any[]>(`SELECT * FROM "PipelineProposedRoute" WHERE "pipelineId"=$1 AND status='ACTIVE' FOR UPDATE`, pipeline.id);
      if (!existing[0]) return null;
      await tx.$executeRawUnsafe(`UPDATE "PipelineProposedRoute" SET status='INACTIVE', "updatedAt"=CURRENT_TIMESTAMP WHERE id=$1`, existing[0].id);
      const rows = await tx.$queryRawUnsafe<any[]>(`SELECT * FROM "PipelineProposedRoute" WHERE id=$1`, existing[0].id);
      await tx.$executeRawUnsafe(`INSERT INTO "MasterChangeEvent" (id,"pipelineId","objectType","objectId","userId",action,"occurredAt","beforeValues","afterValues") VALUES ($1,$2,'PipelineProposedRoute',$3,$4,'DEACTIVATE',CURRENT_TIMESTAMP,$5::jsonb,$6::jsonb)`, `proposed-route-${randomUUID()}`, pipeline.id, existing[0].id, request.user!.id, JSON.stringify(existing[0]), JSON.stringify(rows[0]));
      return rows[0];
    });
    if (!deactivated) { response.status(404).json({ message: "No active proposed route was found for this pipeline." }); return; }
    response.status(204).send();
  } catch (error) { next(error); }
});

pipelinesRouter.get("/:id", async (request, response) => {
  const pipeline = await store.findPipelineById(request.params.id, ownerScope(request.user!));
  if (!pipeline) {
    response.status(404).json({ message: "Pipeline not found." });
    return;
  }

  response.json(pipeline);
});

pipelinesRouter.put("/:id", async (request, response, next: NextFunction) => {
  try {
    assertNoDangerousKeys(request.body);
    const existing = await store.findPipelineById(request.params.id, ownerScope(request.user!));
    if (!existing) {
      response.status(404).json({ message: "Pipeline not found." });
      return;
    }

    const routeWasSubmitted = Object.prototype.hasOwnProperty.call(request.body, "routeGeometry");
    const routeIsUnchanged = routeWasSubmitted && routeGeometryMatchesSaved(request.body.routeGeometry, existing.routeGeometry);
    const input = validatePipelineInput(routeIsUnchanged ? { ...request.body, routeGeometry: undefined } : request.body);
    if (input.routeGeometry !== undefined && JSON.stringify(input.routeGeometry?.coordinates ?? null) !== JSON.stringify(existing.routeGeometry?.coordinates ?? null) && !canModifyMasterData(request.user!)) { response.status(403).json({ message: "Route editing requires Admin or Engineer permission." }); return; }
    if (input.pipeLengthKm !== undefined && input.pipeLengthKm !== existing.pipeLengthKm) {
      const scope = ownerScope(request.user!);
      const [assets, segments] = await Promise.all([store.listAssets({ pipelineId: existing.id, ...scope }), store.listSegments({ pipelineId: existing.id, ...scope })]);
      const locations = [...assets.map(asset => asset.kp), ...segments.flatMap(segment => [segment.startKp, segment.endKp])].filter((value): value is string => Boolean(value?.trim()));
      if (locations.some(value => parseKp(value).kilometers > input.pipeLengthKm!)) throw createValidationError({ pipeLengthKm: "Pipeline length cannot exclude saved segment or asset chainages." });
    }
    const updated = await store.updatePipeline(request.params.id, {
      pipeline: input,
      auditUserId: request.user?.id,
      createdById: existing.createdById
    });
    response.json(updated);
  } catch (error) {
    next(error);
  }
});

pipelinesRouter.delete("/:id", async (request, response, next: NextFunction) => {
  try {
    const existing = await store.findPipelineById(request.params.id, ownerScope(request.user!));
    if (!existing) {
      response.status(404).json({ message: "Pipeline not found." });
      return;
    }
    await store.deletePipeline(request.params.id, ownerScope(request.user!));
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

pipelinesRouter.get("/:id/history", async (request, response) => {
  const history = await store.getPipelineHistory(request.params.id, ownerScope(request.user!));
  if (!history) {
    response.status(404).json({ message: "Pipeline not found." });
    return;
  }

  response.json(history);
});
