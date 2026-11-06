import { auditStoreAvailable } from "../data/masterChangeEvents";
import { parseKp, validateAgainstPipelineLength } from "../coreEngine/chainage/ChainageAgent";
import { NextFunction, Router } from "express";

import { store } from "../data/store";
import { canModifyMasterData, ownerScope } from "../lib/access";
import { requireAuth } from "../middleware/auth";
import { validateAssetInput, validateSegmentInput } from "../validation/assetMasterValidation";
import { assertNoDangerousKeys, createValidationError } from "../validation/validationErrors";
import { env } from "../config/env";
import { getPrismaClient } from "../lib/prisma";

export const assetMasterRouter = Router();

assetMasterRouter.use(requireAuth);

assetMasterRouter.get("/change-log", async (request, response, next) => {
  try {
    if (request.user?.role !== "Admin") { response.status(403).json({ message: "Change Log access requires Admin access." }); return; }
    const pipelineId = queryText(request.query.pipelineId);
    if (!pipelineId || !await store.findPipelineById(pipelineId, ownerScope(request.user!))) { response.status(404).json({ message: "Pipeline not found." }); return; }
    const db = getPrismaClient();
    if (!db) { response.json({ events: [], contractStatus: "missing", missingFields: ["settings_audit_events"] }); return; }
    const ids = [pipelineId, ...(await store.listSegments({ pipelineId, ...ownerScope(request.user!) })).map((item) => item.id), ...(await store.listAssets({ pipelineId, ...ownerScope(request.user!) })).map((item) => item.id)];
    const prospective = await auditStoreAvailable(db);
    const [legacy] = await db.$queryRawUnsafe<Array<{ available: boolean }>>("SELECT to_regclass('public.settings_audit_events') IS NOT NULL AS available");
    const events = prospective ? await db.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT id,"userId","occurredAt",'Pipeline / Asset Master' AS "sourceModule",action,"objectType","objectId",'Success' AS result,'Info' AS severity,NULL AS details,"beforeValues","afterValues" FROM "MasterChangeEvent" WHERE "pipelineId"=$1 ORDER BY "occurredAt" DESC LIMIT 1000`, pipelineId) : [];
    if (legacy?.available) events.push(...await db.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT "Audit_Event_ID" AS id,"User_ID" AS "userId","Timestamp" AS "occurredAt","Module" AS "sourceModule",action,"Object_Type" AS "objectType","Object_ID" AS "objectId",result,severity,details,"Before_Values" AS "beforeValues","After_Values" AS "afterValues" FROM "settings_audit_events" WHERE "Object_ID"=ANY($1::text[]) ORDER BY "Timestamp" DESC LIMIT 1000`, ids));
    response.json({ events: events.sort((a,b) => Date.parse(String(b.occurredAt))-Date.parse(String(a.occurredAt))), contractStatus: prospective || legacy?.available ? "partial" : "missing", missingFields: ["Historical approval and evidence fields are unavailable; new master changes are recorded prospectively."] });
  } catch (error) {
    if (error instanceof Error && /settings_audit_events|relation .* does not exist/i.test(error.message)) { response.json({ events: [], contractStatus: "missing", missingFields: ["settings_audit_events"] }); return; }
    next(error);
  }
});

const assetTypes = new Set(["STATION", "VALVE", "TEST_POST", "RECTIFIER", "COMPRESSOR", "SENSOR", "PUMP", "METER", "PIG_LAUNCHER", "PIG_RECEIVER", "PIPELINE_FITTING", "FLANGE", "INSULATING_JOINT", "PIPELINE_CROSSING", "OTHER"]);
const physicalStatuses = new Set(["Active", "Inactive", "Maintenance", "Decommissioned", "Unknown"]);

function validateSegmentKpRange(segment: { startKp?: string; endKp?: string }, pipelineLengthKm: number | null | undefined) {
  const start = segment.startKp?.trim() ? parseKp(segment.startKp).kilometers : undefined;
  const end = segment.endKp?.trim() ? parseKp(segment.endKp).kilometers : undefined;
  if (start !== undefined && (!Number.isFinite(start) || start < 0)) throw createValidationError({ startKp: "From KP must be a non-negative numeric value." });
  if (end !== undefined && (!Number.isFinite(end) || end < 0)) throw createValidationError({ endKp: "To KP must be a non-negative numeric value." });
  if (start !== undefined && end !== undefined && end <= start) throw createValidationError({ endKp: "To KP must be greater than From KP." });
  if (pipelineLengthKm !== null && pipelineLengthKm !== undefined && Number.isFinite(pipelineLengthKm)) {
    if (start !== undefined && start > pipelineLengthKm) throw createValidationError({ startKp: `From KP must be within the parent pipeline range (0-${pipelineLengthKm}).` });
    if (end !== undefined && end > pipelineLengthKm) throw createValidationError({ endKp: `To KP must be within the parent pipeline range (0-${pipelineLengthKm}).` });
  }
}

assetMasterRouter.get("/segments", async (request, response, next) => {
  try {
    const pipelineId = queryText(request.query.pipelineId);
    if (!pipelineId) {
      throw createValidationError({ pipelineId: "Pipeline ID is required" });
    }

    response.json(await store.listSegments({ pipelineId, ...ownerScope(request.user!) }));
  } catch (error) {
    next(error);
  }
});

assetMasterRouter.get("/segments/:id", async (request, response, next) => {
  try {
    const segment = await store.findSegmentById(request.params.id, ownerScope(request.user!));
    if (!segment) {
      response.status(404).json({ message: "Segment not found." });
      return;
    }

    response.json(segment);
  } catch (error) {
    next(error);
  }
});

assetMasterRouter.post("/segments", async (request, response, next: NextFunction) => {
  try {
    if (!canModifyMasterData(request.user!)) {
      response.status(403).json({ message: "Only Admin and Engineer roles may modify Asset Master data." });
      return;
    }
    assertNoDangerousKeys(request.body);
    const segment = validateSegmentInput(request.body);
    const pipeline = await store.findPipelineById(segment.pipelineId, ownerScope(request.user!));
    if (!pipeline) {
      response.status(404).json({ message: "Pipeline not found." });
      return;
    }
    validateSegmentKpRange(segment, pipeline.pipeLengthKm);

    const created = await store.saveSegment({ segment, auditUserId: request.user!.id, companyId: request.user?.companyId });
    response.status(201).json(created);
  } catch (error) {
    handleAssetMasterError(error, response, next);
  }
});

assetMasterRouter.put("/segments/:id", async (request, response, next: NextFunction) => {
  try {
    if (!canModifyMasterData(request.user!)) {
      response.status(403).json({ message: "Only Admin and Engineer roles may modify Asset Master data." });
      return;
    }
    assertNoDangerousKeys(request.body);
    const existing = await store.findSegmentById(request.params.id, ownerScope(request.user!));
    if (!existing) {
      response.status(404).json({ message: "Segment not found." });
      return;
    }

    const segment = validateSegmentInput(request.body);
    const pipeline = await store.findPipelineById(segment.pipelineId, ownerScope(request.user!));
    if (!pipeline) {
      response.status(404).json({ message: "Pipeline not found." });
      return;
    }
    validateSegmentKpRange(segment, pipeline.pipeLengthKm);

    const updated = await store.saveSegment({ id: request.params.id, segment, auditUserId: request.user!.id, companyId: request.user?.companyId });
    response.json(updated);
  } catch (error) {
    handleAssetMasterError(error, response, next);
  }
});

assetMasterRouter.delete("/segments/:id", async (request, response, next: NextFunction) => {
  try {
    if (!canModifyMasterData(request.user!)) { response.status(403).json({ message: "Only Admin and Engineer roles may modify Asset Master data." }); return; }
    if (!env.masterMutationWritesEnabled) { response.status(423).json({ message: "Segment deletion is disabled until isolated security and database tests are approved." }); return; }
    if (!await store.deleteSegment(request.params.id, ownerScope(request.user!))) { response.status(404).json({ message: "Segment not found." }); return; }
    response.status(204).send();
  } catch (error) { handleAssetMasterError(error, response, next); }
});

assetMasterRouter.get("/assets", async (request, response, next) => {
  try {
    const pipelineId = queryText(request.query.pipelineId);
    if (!pipelineId) {
      throw createValidationError({ pipelineId: "Pipeline ID is required" });
    }

    const assetType = queryText(request.query.assetType);
    const physicalStatus = queryText(request.query.physicalStatus);
    if (assetType && !assetTypes.has(assetType)) {
      throw createValidationError({ assetType: "Unsupported asset type" });
    }

    if (physicalStatus && !physicalStatuses.has(physicalStatus)) {
      throw createValidationError({ physicalStatus: "Unsupported physical status" });
    }

    response.json(await store.listAssets({
      pipelineId,
      segmentId: queryText(request.query.segmentId),
      assetType: assetType as never,
      physicalStatus: physicalStatus as never,
      ...ownerScope(request.user!)
    }));
  } catch (error) {
    next(error);
  }
});

assetMasterRouter.get("/assets/:id", async (request, response, next) => {
  try {
    const asset = await store.findAssetById(request.params.id, ownerScope(request.user!));
    if (!asset) {
      response.status(404).json({ message: "Asset not found." });
      return;
    }

    response.json(asset);
  } catch (error) {
    next(error);
  }
});

assetMasterRouter.post("/assets", async (request, response, next: NextFunction) => {
  try {
    if (!canModifyMasterData(request.user!)) {
      response.status(403).json({ message: "Only Admin and Engineer roles may modify Asset Master data." });
      return;
    }
    assertNoDangerousKeys(request.body);
    const asset = validateAssetInput(request.body);
    const pipeline = await store.findPipelineById(asset.pipelineId, ownerScope(request.user!));
    if (!pipeline) {
      response.status(404).json({ message: "Pipeline not found." });
      return;
    }

    await validateAssetLocation(asset, pipeline.pipeLengthKm, ownerScope(request.user!));
    const created = await store.saveAsset({ asset, auditUserId: request.user!.id, companyId: request.user?.companyId });
    response.status(201).json(created);
  } catch (error) {
    handleAssetMasterError(error, response, next);
  }
});

assetMasterRouter.put("/assets/:id", async (request, response, next: NextFunction) => {
  try {
    if (!canModifyMasterData(request.user!)) {
      response.status(403).json({ message: "Only Admin and Engineer roles may modify Asset Master data." });
      return;
    }
    assertNoDangerousKeys(request.body);
    const existing = await store.findAssetById(request.params.id, ownerScope(request.user!));
    if (!existing) {
      response.status(404).json({ message: "Asset not found." });
      return;
    }

    const asset = validateAssetInput(request.body);
    const pipeline = await store.findPipelineById(asset.pipelineId, ownerScope(request.user!));
    if (!pipeline) {
      response.status(404).json({ message: "Pipeline not found." });
      return;
    }

    await validateAssetLocation(asset, pipeline.pipeLengthKm, ownerScope(request.user!));
    const updated = await store.saveAsset({ id: request.params.id, asset, auditUserId: request.user!.id, companyId: request.user?.companyId });
    response.json(updated);
  } catch (error) {
    handleAssetMasterError(error, response, next);
  }
});

assetMasterRouter.delete("/assets/:id", async (request, response, next: NextFunction) => {
  try {
    if (!canModifyMasterData(request.user!)) { response.status(403).json({ message: "Only Admin and Engineer roles may modify Asset Master data." }); return; }
    if (!env.masterMutationWritesEnabled) { response.status(423).json({ message: "Asset deletion is disabled until isolated security and database tests are approved." }); return; }
    if (!await store.deleteAsset(request.params.id, ownerScope(request.user!))) { response.status(404).json({ message: "Asset not found." }); return; }
    response.status(204).send();
  } catch (error) { handleAssetMasterError(error, response, next); }
});

function queryText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function handleAssetMasterError(error: unknown, response: { status: (code: number) => { json: (body: unknown) => void } }, next: NextFunction) {
  if (error instanceof Error) {
    const coded = error as Error & { code?: string };
    if (coded.code === "SEGMENT_DUPLICATE" || coded.code === "ASSET_DUPLICATE" || coded.code === "P2002") {
      response.status(409).json({ message: error.message });
      return;
    }

    if (coded.code === "SEGMENT_LINKED_RECORDS" || coded.code === "ASSET_LINKED_RECORDS") {
      response.status(409).json({ message: error.message });
      return;
    }

    if (coded.code === "P2003") {
      response.status(400).json({ message: "The selected pipeline, segment, or parent asset is no longer available." });
      return;
    }

    if (coded.code === "P2025") {
      response.status(404).json({ message: "Asset record was not found or was changed by another user." });
      return;
    }

    if (
      error.message === "Pipeline not found." ||
      error.message === "Segment not found for this pipeline." ||
      error.message === "Parent asset not found for this pipeline."
    ) {
      response.status(400).json({ message: error.message });
      return;
    }
  }

  next(error);
}

export async function validateAssetLocation(asset: { pipelineId: string; segmentId?: string; kp?: string }, length: number | undefined, scope: ReturnType<typeof ownerScope>) {
  const meters = asset.kp ? parseKp(asset.kp).meters : undefined;
  if (meters !== undefined) {
    try { validateAgainstPipelineLength(meters, { pipelineId: asset.pipelineId, lengthMeters: length === undefined ? undefined : length * 1000 }); }
    catch (error) { throw createValidationError({ kp: (error as Error).message }); }
  }
  if (asset.segmentId) {
    const segment = await store.findSegmentById(asset.segmentId, scope);
    if (!segment || segment.pipelineId !== asset.pipelineId) throw createValidationError({ segmentId: "Segment not found for this pipeline." });
    if (meters !== undefined && ((segment.startKp && meters < parseKp(segment.startKp).meters) || (segment.endKp && meters > parseKp(segment.endKp).meters))) throw createValidationError({ kp: "Asset chainage must be within the selected segment." });
  }
}
