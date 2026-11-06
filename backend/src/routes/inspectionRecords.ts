import { Router } from "express";
import { store, DatabaseUnavailableError } from "../data/store";
import { canModifyMasterData, ownerScope } from "../lib/access";
import { getPrismaClient } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { createId } from "../lib/ids";
import { validateInspectionRecord } from "../validation/inspectionRecordValidation";
import { createValidationError } from "../validation/validationErrors";
import { env } from "../config/env";
import fs from "node:fs";
import path from "node:path";

export const inspectionRecordsRouter = Router();
inspectionRecordsRouter.use(requireAuth);

function database() {
  const db = getPrismaClient();
  if (!db) throw new DatabaseUnavailableError();
  return db;
}

const PL001_DEMO_CLEANUP = new Map<string, { reference: string; segmentId: string }>([
  ["inspection-1793518398658-8tia1cwd", { reference: "PL001-DEMO-INSP-001", segmentId: "cmvjraedr0003ue3oxdxtjaar" }],
  ["inspection-1793518399187-9ufxrs3m", { reference: "PL001-DEMO-CP-002", segmentId: "cmvrzpxbw0001ue94fpvr6kxf" }],
  ["inspection-1793518399658-f6aly6pi", { reference: "PL001-DEMO-UT-003", segmentId: "cmvrztrpb0003ue944tpouk59" }]
] as const);
const PL001_DEMO_BACKUP = path.resolve(process.cwd(), "../artifacts/pl001-demo-inspection-backup-20261101.json");

function scopedPl001DemoCleanup(id: string, user: NonNullable<Express.Request["user"]>) {
  return env.nodeEnv === "development" && env.pl001DemoCleanupEnabled && !env.masterMutationWritesEnabled && user.role === "Admin" && PL001_DEMO_CLEANUP.has(id);
}

function verifiedPl001DemoBackup() {
  try {
    const backup = JSON.parse(fs.readFileSync(PL001_DEMO_BACKUP, "utf8")) as { environment?: string; readOnlyVerified?: boolean; pipeline?: { id?: string; pipelineCode?: string }; inspectionRecords?: Array<{ id?: string; reference?: string; pipelineId?: string; segmentId?: string }> };
    return backup.environment === "development" && backup.readOnlyVerified === true && backup.pipeline?.id === "cmvjof9320001uedorkyvb82o" && backup.pipeline.pipelineCode === "PL-001" && PL001_DEMO_CLEANUP.size === backup.inspectionRecords?.length && [...PL001_DEMO_CLEANUP].every(([id, expected]) => backup.inspectionRecords?.some(record => record.id === id && record.reference === expected.reference && record.pipelineId === backup.pipeline?.id && record.segmentId === expected.segmentId));
  } catch { return false; }
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
    const records = await database().$transaction(async tx => {
      // Serialize creates per pipeline so duplicate references cannot race.
      await tx.$queryRawUnsafe('SELECT id FROM "Pipeline" WHERE id=$1 FOR UPDATE', input.pipelineId);
      const existing = await tx.$queryRawUnsafe<Array<{ id: string }>>('SELECT id FROM "InspectionRecord" WHERE "pipelineId"=$1 AND lower("reference")=lower($2)', input.pipelineId, input.reference);
      if (existing.length) return null;
      return tx.$queryRawUnsafe<unknown[]>(
        `INSERT INTO "InspectionRecord" ("id", "pipelineId", "reference", "type", "date", "segmentId", "vendor", "findings", "status", "nextDue", "risk", "authorId", "createdBy")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
        createId("inspection"), input.pipelineId, input.reference, input.type, input.date, input.segmentId,
        input.vendor, input.findings, input.status, input.nextDue, input.risk, request.user!.id, request.user!.name);
    });
    if (!records) { response.status(409).json({ message: "This inspection reference already exists for this pipeline. Open the existing record instead of adding a duplicate." }); return; }
    response.status(201).json(records[0]);
  } catch (error) { next(error); }
});

inspectionRecordsRouter.put("/:id", async (request, response, next) => {
  try {
    if (!canModifyMasterData(request.user!)) { response.status(403).json({ message: "Only Admin and Engineer roles may edit inspection records." }); return; }
    if (!env.masterMutationWritesEnabled && env.nodeEnv !== "development") { response.status(423).json({ message: "Inspection editing is disabled until isolated security and database tests are approved." }); return; }
    const { expected, ...candidate } = request.body;
    const input = validateInspectionRecord(candidate);
    const original = expected === undefined ? undefined : validateInspectionRecord(expected);
    const db = database();
    const existing = await db.$queryRawUnsafe<Array<{ pipelineId: string }>>('SELECT "pipelineId" FROM "InspectionRecord" WHERE "id"=$1', request.params.id);
    if (!existing[0] || !await store.findPipelineById(existing[0].pipelineId, ownerScope(request.user!))) { response.status(404).json({ message: "Inspection record not found." }); return; }
    const segment = input.segmentId ? await store.findSegmentById(input.segmentId, ownerScope(request.user!)) : null;
    if (input.pipelineId !== existing[0].pipelineId || (input.segmentId && (!segment || segment.pipelineId !== existing[0].pipelineId))) { response.status(400).json({ message: "The inspection record must remain within its owned pipeline and segment." }); return; }
    const result = await db.$transaction(async tx => {
      await tx.$queryRawUnsafe('SELECT id FROM "Pipeline" WHERE id=$1 FOR UPDATE', input.pipelineId);
      const [current] = await tx.$queryRawUnsafe<Array<Record<string, unknown>>>('SELECT * FROM "InspectionRecord" WHERE "id"=$1 FOR UPDATE', request.params.id);
      if (!current) return { status: 404, body: { message: "Inspection record not found." } };
      if (original && Object.entries(original).some(([key, value]) => String(current[key] ?? "") !== String(value ?? ""))) return { status: 409, body: { message: "This record changed after you opened it. Reload the latest saved values before editing." } };
      const duplicate = await tx.$queryRawUnsafe<Array<{ id: string }>>('SELECT id FROM "InspectionRecord" WHERE "pipelineId"=$1 AND lower("reference")=lower($2) AND id<>$3', input.pipelineId, input.reference, request.params.id);
      if (duplicate.length) return { status: 409, body: { message: "This inspection reference already belongs to another record in this pipeline." } };
      const records = await tx.$queryRawUnsafe<unknown[]>(
        `UPDATE "InspectionRecord" SET "reference"=$1, "type"=$2, "date"=$3, "segmentId"=$4, "vendor"=$5, "findings"=$6, "status"=$7, "nextDue"=$8, "risk"=$9 WHERE "id"=$10 RETURNING *`,
        input.reference, input.type, input.date, input.segmentId, input.vendor, input.findings, input.status, input.nextDue, input.risk, request.params.id);
      return { status: 200, body: records[0] };
    });
    response.status(result.status).json(result.body);
  } catch (error) { next(error); }
});

inspectionRecordsRouter.delete("/:id", async (request, response, next) => {
  try {
    if (!canModifyMasterData(request.user!)) { response.status(403).json({ message: "Only Admin and Engineer roles may delete inspection records." }); return; }
    const scopedCleanup = scopedPl001DemoCleanup(request.params.id, request.user!);
    if (!env.masterMutationWritesEnabled && !scopedCleanup) { response.status(423).json({ message: "Inspection deletion is disabled until isolated security and database tests are approved." }); return; }
    if (scopedCleanup && !verifiedPl001DemoBackup()) { response.status(423).json({ message: "Verified PL-001 DEMO inspection backup is required before scoped cleanup." }); return; }
    const db = database();
    const existing = await db.$queryRawUnsafe<Array<{ id: string; pipelineId: string; reference: string; segmentId: string | null }>>('SELECT "id", "pipelineId", "reference", "segmentId" FROM "InspectionRecord" WHERE "id" = $1', request.params.id);
    if (!existing[0] || !await store.findPipelineById(existing[0].pipelineId, ownerScope(request.user!))) { response.status(404).json({ message: "Inspection record not found." }); return; }
    if (scopedCleanup) {
      const expected = PL001_DEMO_CLEANUP.get(request.params.id)!;
      const pipeline = await store.findPipelineById(existing[0].pipelineId, ownerScope(request.user!));
      if (!pipeline || pipeline.pipelineCode !== "PL-001" || existing[0].reference !== expected.reference || existing[0].segmentId !== expected.segmentId) {
        response.status(403).json({ message: "Scoped cleanup refused: exact PL-001 DEMO identity and ownership did not match." }); return;
      }
    }
    await db.$executeRawUnsafe('DELETE FROM "InspectionRecord" WHERE "id" = $1', request.params.id);
    response.status(204).send();
  } catch (error) { next(error); }
});
