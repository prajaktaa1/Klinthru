import { Router } from "express";
import { store, DatabaseUnavailableError } from "../data/store";
import { canModifyMasterData, ownerScope } from "../lib/access";
import { getPrismaClient } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { createId } from "../lib/ids";
import { validateInspectionRecord } from "../validation/inspectionRecordValidation";
import { createValidationError } from "../validation/validationErrors";
import { env } from "../config/env";

export const inspectionRecordsRouter = Router();
inspectionRecordsRouter.use(requireAuth);

function database() {
  const db = getPrismaClient();
  if (!db) throw new DatabaseUnavailableError();
  return db;
}

inspectionRecordsRouter.get("/", async (request, response, next) => {
  try {
    const pipelineId = typeof request.query.pipelineId === "string" ? request.query.pipelineId : "";
    if (!pipelineId) throw createValidationError({ pipelineId: "Pipeline ID is required" });
    if (!await store.findPipelineById(pipelineId, ownerScope(request.user!))) {
      response.status(404).json({ message: "Pipeline not found." }); return;
    }
    response.json(await database().$queryRawUnsafe(
      'SELECT * FROM "InspectionRecord" WHERE "pipelineId" = $1 ORDER BY "date" DESC, "createdAt" DESC', pipelineId
    ));
  } catch (error) { next(error); }
});

inspectionRecordsRouter.post("/", async (request, response, next) => {
  try {
    if (!canModifyMasterData(request.user!)) {
      response.status(403).json({ message: "Only Admin and Engineer roles may add inspection records." }); return;
    }
    const input = validateInspectionRecord(request.body);
    if (!await store.findPipelineById(input.pipelineId, ownerScope(request.user!))) {
      response.status(404).json({ message: "Pipeline not found." }); return;
    }
    if (input.segmentId) {
      const segment = await store.findSegmentById(input.segmentId, ownerScope(request.user!));
      if (!segment || segment.pipelineId !== input.pipelineId) {
        throw createValidationError({ segmentId: "Select a segment belonging to this pipeline" });
      }
    }
    // Bind every value; this also supports clients generated before the additive table migration.
    const records = await database().$queryRawUnsafe<unknown[]>(
      `INSERT INTO "InspectionRecord" ("id", "pipelineId", "reference", "type", "date", "segmentId", "vendor", "findings", "status", "nextDue", "risk", "authorId", "createdBy")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      createId("inspection"), input.pipelineId, input.reference, input.type, input.date, input.segmentId,
      input.vendor, input.findings, input.status, input.nextDue, input.risk, request.user!.id, request.user!.name
    );
    response.status(201).json(records[0]);
  } catch (error) { next(error); }
});

inspectionRecordsRouter.put("/:id", async (request, response, next) => {
  try {
    if (!canModifyMasterData(request.user!)) { response.status(403).json({ message: "Only Admin and Engineer roles may edit inspection records." }); return; }
    if (!env.masterMutationWritesEnabled) { response.status(423).json({ message: "Inspection editing is disabled until isolated security and database tests are approved." }); return; }
    const input = validateInspectionRecord(request.body);
    const db = database();
    const existing = await db.$queryRawUnsafe<Array<{ pipelineId: string }>>('SELECT "pipelineId" FROM "InspectionRecord" WHERE "id" = $1', request.params.id);
    if (!existing[0] || !await store.findPipelineById(existing[0].pipelineId, ownerScope(request.user!))) { response.status(404).json({ message: "Inspection record not found." }); return; }
    if (input.pipelineId !== existing[0].pipelineId || (input.segmentId && !(await store.findSegmentById(input.segmentId, ownerScope(request.user!))))) { response.status(400).json({ message: "The inspection record must remain within its owned pipeline and segment." }); return; }
    const records = await db.$queryRawUnsafe<unknown[]>(
      `UPDATE "InspectionRecord" SET "reference"=$1, "type"=$2, "date"=$3, "segmentId"=$4, "vendor"=$5, "findings"=$6, "status"=$7, "nextDue"=$8, "risk"=$9 WHERE "id"=$10 RETURNING *`,
      input.reference, input.type, input.date, input.segmentId, input.vendor, input.findings, input.status, input.nextDue, input.risk, request.params.id
    );
    response.json(records[0]);
  } catch (error) { next(error); }
});

inspectionRecordsRouter.delete("/:id", async (request, response, next) => {
  try {
    if (!canModifyMasterData(request.user!)) { response.status(403).json({ message: "Only Admin and Engineer roles may delete inspection records." }); return; }
    if (!env.masterMutationWritesEnabled) { response.status(423).json({ message: "Inspection deletion is disabled until isolated security and database tests are approved." }); return; }
    const db = database();
    const existing = await db.$queryRawUnsafe<Array<{ pipelineId: string }>>('SELECT "pipelineId" FROM "InspectionRecord" WHERE "id" = $1', request.params.id);
    if (!existing[0] || !await store.findPipelineById(existing[0].pipelineId, ownerScope(request.user!))) { response.status(404).json({ message: "Inspection record not found." }); return; }
    await db.$executeRawUnsafe('DELETE FROM "InspectionRecord" WHERE "id" = $1', request.params.id);
    response.status(204).send();
  } catch (error) { next(error); }
});
