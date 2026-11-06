import { randomUUID } from "node:crypto";
import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { store } from "../data/store";
import { ownerScope } from "../lib/access";
import { validateTagDeviceLink, accessiblePipeline, getScadaConfiguration, getScadaHistory, getScadaOverview, getScadaQuality, parseScada, scadaDatabase, scadaTagSchema } from "../utils/scadaData";
import { z } from "zod";
import { createValidationError } from "../validation/validationErrors";

export const scadaRouter = Router();
scadaRouter.use(requireAuth);

scadaRouter.get("/overview", async (request, response, next) => {
  try {
    if (typeof request.query.pipelineId !== "string") throw createValidationError({ pipelineId: "Pipeline ID is required" });
    response.json(await getScadaOverview(request.query.pipelineId, request.user!));
  } catch (error) { next(error); }
});

scadaRouter.get("/configuration", async (request, response, next) => {
  try {
    if (typeof request.query.pipelineId !== "string") throw createValidationError({ pipelineId: "Pipeline ID is required" });
    response.json(await getScadaConfiguration(request.query.pipelineId, request.user!));
  } catch (error) { next(error); }
});

scadaRouter.get("/data-quality", async (request, response, next) => {
  try {
    if (typeof request.query.pipelineId !== "string") throw createValidationError({ pipelineId: "Pipeline ID is required" });
    response.json(await getScadaQuality(request.query.pipelineId, request.user!, Number(request.query.hours ?? 24)));
  } catch (error) { next(error); }
});

const logicalSettings = z.object({
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
  displayName: z.string().trim().min(1).max(500), description: z.string().max(1000),
  measurementType: z.string().trim().min(1).max(500),
  scanIntervalSeconds: z.number().int().min(1).max(86400), staleAfterSeconds: z.number().int().min(1).max(604800),
  highHigh: z.number().finite().nullable(), high: z.number().finite().nullable(), low: z.number().finite().nullable(), lowLow: z.number().finite().nullable(),
  thresholdSource: z.string().trim().max(500).nullable(), groupName: z.string().trim().max(500).nullable(),
  historianEnabled: z.boolean(), displayPrecision: z.number().int().min(0).max(8), active: z.boolean()
}).strict();

scadaRouter.patch("/tags/:id", async (request, response, next) => {
  try {
    if (request.user!.role !== "Admin") return response.status(403).json({ message: "Only Admin may edit logical SCADA configuration." });
    const input = parseScada(logicalSettings, request.body), db = scadaDatabase();
    const rows = await db.$queryRawUnsafe<any[]>(`SELECT * FROM "ScadaTag" WHERE id=$1`, request.params.id);
    const tag = rows[0];
    if (!tag) return response.status(404).json({ message: "Tag not found" });
    await accessiblePipeline(tag.pipelineId, request.user!);
    const connector = await db.integrationConnector.findFirst({ where: { id: tag.connectorId, authorId: request.user!.id } });
    if (!connector) return response.status(403).json({ message: "Connector access denied" });
    const limits = [input.lowLow, input.low, input.high, input.highHigh].filter((value): value is number => value !== null);
    if (input.staleAfterSeconds < input.scanIntervalSeconds || limits.some((value, index) => index > 0 && value <= limits[index - 1]) || (limits.length && !input.thresholdSource)) throw createValidationError({ settings: "Verify scan/stale intervals, increasing thresholds and threshold source" });
    // The tag change and its audit record are one PostgreSQL statement.
    const saved = await db.$queryRawUnsafe<any[]>(`WITH changed AS (
      UPDATE "ScadaTag" SET "displayName"=$3,description=$4,"measurementType"=$5,"scanIntervalSeconds"=$6,"staleAfterSeconds"=$7,
      "highHigh"=$8,high=$9,low=$10,"lowLow"=$11,"thresholdSource"=$12,"groupName"=$13,"historianEnabled"=$14,"displayPrecision"=$15,active=$16,
      "updatedAt"=GREATEST(CURRENT_TIMESTAMP AT TIME ZONE 'UTC',"updatedAt"+interval '1 millisecond')
      WHERE id=$1 AND "updatedAt"=$2::timestamp RETURNING *
    ), audit AS (INSERT INTO "ScadaConfigChange" (id,"pipelineId","actorId","changeType",description,impact)
      SELECT $17,"pipelineId",$18,'Logical tag settings',$19,'Operational configuration' FROM changed RETURNING id)
      SELECT changed.* FROM changed CROSS JOIN audit`, tag.id, input.expectedUpdatedAt, input.displayName, input.description, input.measurementType,
      input.scanIntervalSeconds, input.staleAfterSeconds, input.highHigh, input.high, input.low, input.lowLow, input.thresholdSource || null,
      input.groupName || null, input.historianEnabled, input.displayPrecision, input.active, randomUUID(), request.user!.id,
      JSON.stringify({ tagId: tag.id, before: tag, after: input }));
    if (!saved.length) return response.status(409).json({ message: "Configuration changed since loading. Refresh before saving." });
    response.json(saved[0]);
  } catch (error) { next(error); }
});

scadaRouter.get("/tags/:id/history", async (request, response, next) => {
  try {
    const start = typeof request.query.start === "string" ? new Date(request.query.start) : undefined;
    const end = typeof request.query.end === "string" ? new Date(request.query.end) : undefined;
    if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) throw createValidationError({ range: "Invalid historical date range" });
    response.json(await getScadaHistory(request.params.id, request.user!, request.query.hours === undefined ? 24 : Number(request.query.hours), start, end, request.query.resolutionMinutes === undefined ? undefined : Number(request.query.resolutionMinutes), String(request.query.aggregation ?? "Average")));
  } catch (error) { next(error); }
});

scadaRouter.post("/tags", async (request, response, next) => {
  try {
    if (request.user!.role !== "Admin") return response.status(403).json({ message: "Only Admin may register SCADA logical tags." });
    const tag = parseScada(scadaTagSchema, request.body);
    await accessiblePipeline(tag.pipelineId, request.user!);
    const asset = await store.findAssetById(tag.assetId, ownerScope(request.user!));
    if (!asset || asset.pipelineId !== tag.pipelineId) throw createValidationError({ assetId: "Asset must belong to the selected pipeline" });
    await validateTagDeviceLink(tag,request.user!);
    const db = scadaDatabase();
    const connector = await db.integrationConnector.findFirst({ where: { id: tag.connectorId, authorId: request.user!.id } });
    if (!connector) throw createValidationError({ connectorId: "Connector must be owned by the registering user" });
    if (tag.sensorAssignmentId) {
      const sensor = await db.sensorAssignment.findFirst({ where: { id: tag.sensorAssignmentId, authorId: request.user!.id } });
      if (!sensor) throw createValidationError({ sensorAssignmentId: "Sensor assignment not found or access denied" });
    }
    const rows = await db.$queryRawUnsafe<any[]>(`WITH registered AS (INSERT INTO "ScadaTag" (id,"sourceTagName","displayName",description,"measurementType","engineeringUnit","pipelineId","assetId","connectorId","sourceSystemId","scanIntervalSeconds","staleAfterSeconds","highHigh",high,low,"lowLow","thresholdSource","sensorAssignmentId",active)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *),
      audit AS (INSERT INTO "ScadaConfigChange" (id,"pipelineId","changeType",description,"actorId",impact)
      SELECT $20,$7,'Logical tag registration',row_to_json(registered)::text,$21,'Operational configuration' FROM registered RETURNING id)
      SELECT registered.* FROM registered CROSS JOIN audit`,
      tag.id, tag.sourceTagName, tag.displayName, tag.description ?? null, tag.measurementType, tag.engineeringUnit, tag.pipelineId, tag.assetId, tag.connectorId, tag.sourceSystemId, tag.scanIntervalSeconds, tag.staleAfterSeconds, tag.highHigh ?? null, tag.high ?? null, tag.low ?? null, tag.lowLow ?? null, tag.thresholdSource ?? null, tag.sensorAssignmentId ?? null, tag.active, randomUUID(), request.user!.id);
    response.status(201).json(rows[0]);
  } catch (error) {
    const code = error as { code?: string; meta?: { code?: string } };
    if (code.code === "P2002" || code.code === "23505" || code.meta?.code === "23505") return response.status(409).json({ message: "Logical tag ID or connector/source tag mapping already exists." });
    next(error);
  }
});

scadaRouter.patch("/alarms/:id/acknowledge", async (request, response, next) => {
  try {
    if (request.user!.role === "Viewer") return response.status(403).json({ message: "Only Admin or Engineer may acknowledge SCADA alarms." });
    const db = scadaDatabase();
    const alarm = await db.$queryRawUnsafe<Array<{ pipelineId: string }>>(`SELECT t."pipelineId" FROM "ScadaAlarm" a JOIN "ScadaTag" t ON t.id=a."tagId" JOIN "IntegrationConnector" c ON c.id=t."connectorId" WHERE a.id=$1 AND ($2 OR c."authorId"=$3)`, request.params.id, request.user!.role === "Admin", request.user!.id);
    if (!alarm.length) return response.status(404).json({ message: "Alarm not found or access denied." });
    await accessiblePipeline(alarm[0].pipelineId, request.user!);
    const rows = await db.$queryRawUnsafe<any[]>(`UPDATE "ScadaAlarm" a
      SET "klinthruStatus"='Acknowledged', "acknowledgedAt"=COALESCE(a."acknowledgedAt",CURRENT_TIMESTAMP), "acknowledgedBy"=COALESCE(a."acknowledgedBy",$2)
      WHERE a.id=$1 AND EXISTS (
        SELECT 1 FROM "ScadaTag" t JOIN "IntegrationConnector" c ON c.id=t."connectorId"
        WHERE t.id=a."tagId" AND ($3 OR c."authorId"=$2)
      ) RETURNING a.*`, request.params.id, request.user!.id, request.user!.role === "Admin");
    if (!rows.length) return response.status(404).json({ message: "Alarm not found or access denied." });
    response.json(rows[0]);
  } catch (error) { next(error); }
});

scadaRouter.post("/alarms/:id/notes", async (request, response, next) => {
  try {
    if (request.user!.role === "Viewer") return response.status(403).json({ message: "Only Admin or Engineer may add SCADA alarm notes." });
    const note = typeof request.body?.note === "string" ? request.body.note.trim() : "";
    const followUp = request.body?.followUp == null ? null : String(request.body.followUp).trim();
    if (!note || note.length > 2000 || (followUp && followUp.length > 2000)) throw createValidationError({ note: "A note up to 2000 characters is required" });
    const db = scadaDatabase();
    const alarm = await db.$queryRawUnsafe<any[]>(`SELECT a.id,t."pipelineId" FROM "ScadaAlarm" a JOIN "ScadaTag" t ON t.id=a."tagId" JOIN "IntegrationConnector" c ON c.id=t."connectorId" WHERE a.id=$1 AND ($2 OR c."authorId"=$3)`, request.params.id, request.user!.role === "Admin", request.user!.id);
    if (!alarm.length) return response.status(404).json({ message: "Alarm not found or access denied." });
    await accessiblePipeline(alarm[0].pipelineId, request.user!);
    const rows = await db.$queryRawUnsafe<any[]>(`INSERT INTO "ScadaAlarmNote" (id,"alarmId","authorId",note,"followUp") VALUES ($1,$2,$3,$4,$5) RETURNING id,note,"followUp","createdAt"`, randomUUID(), request.params.id, request.user!.id, note, followUp || null);
    response.status(201).json(rows[0]);
  } catch (error) { next(error); }
});
