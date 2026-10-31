import { Router } from "express";

import { DatabaseUnavailableError } from "../data/store";
import { env } from "../config/env";
import { getPrismaClient } from "../lib/prisma";
import { createId } from "../lib/ids";
import { canModifySensors } from "../lib/access";
import { requireAuth } from "../middleware/auth";
import { assertNoDangerousKeys, createValidationErrorFromZod } from "../validation/validationErrors";
import {
  calibrationInputSchema,
  configurationInputSchema,
  hardwareEventInputSchema,
  maintenanceInputSchema,
  type LifecycleResource
} from "../validation/sensorLifecycleValidation";
import { assertValidLifecycleTransition } from "../validation/sensorLifecycleValidation";

export const sensorLifecycleRouter = Router();
sensorLifecycleRouter.use(requireAuth);

const tableNames: Record<LifecycleResource, string> = {
  calibrations: '"SensorCalibrationRecord"',
  maintenance: '"SensorMaintenanceTask"',
  events: '"SensorHardwareEvent"',
  configuration: '"SensorConfigurationVersion"'
};

const resourceMeta: Record<LifecycleResource, { idColumn: string; businessId: string; entityType: string; kind: "calibration" | "maintenance" | "event" | "configuration" }> = {
  calibrations: { idColumn: "id", businessId: "calibrationId", entityType: "SensorCalibrationRecord", kind: "calibration" },
  maintenance: { idColumn: "id", businessId: "taskId", entityType: "SensorMaintenanceTask", kind: "maintenance" },
  events: { idColumn: "id", businessId: "eventId", entityType: "SensorHardwareEvent", kind: "event" },
  configuration: { idColumn: "id", businessId: "versionId", entityType: "SensorConfigurationVersion", kind: "configuration" }
};

function lifecycleDb() {
  const db = getPrismaClient();
  if (!db) throw new DatabaseUnavailableError();
  return db;
}

function ownerClause(user: Express.Request["user"]): { sql: string; values: unknown[] } {
  if (user?.companyId) return { sql: ' WHERE "companyId" = $1', values: [user.companyId] };
  return { sql: ' WHERE "ownerId" = $1', values: [user?.id] };
}

async function listResource(resource: LifecycleResource, user: Express.Request["user"]) {
  const db = lifecycleDb();
  const scope = ownerClause(user);
  return db.$queryRawUnsafe(`SELECT * FROM ${tableNames[resource]}${scope.sql} ORDER BY "createdAt" DESC LIMIT 500`, ...scope.values);
}

function unavailableForWrites(response: Parameters<import("express").RequestHandler>[1]) {
  response.status(423).json({
    error: "Sensor lifecycle writes are disabled",
    message: "Apply the prepared migration and explicitly approve lifecycle writes before enabling CRUD mutations."
  });
}

function lifecycleStatus(resource: LifecycleResource, body: Record<string, unknown>): string | undefined {
  return typeof body.status === "string" ? body.status : undefined;
}

function auditJson(value: unknown): string | null {
  return value === undefined ? null : JSON.stringify(value);
}

async function writeAudit(tx: { $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number> }, user: Express.Request["user"], resource: LifecycleResource, entityId: string, action: string, before: unknown, after: unknown) {
  await tx.$executeRawUnsafe(
    'INSERT INTO "SensorAuditEvent" ("id", "auditEventId", "ownerId", "actorId", "companyId", "module", "entityType", "entityId", "action", "before", "after") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb)',
    createId("audit"), createId("audit-event"), user!.id, user!.id, user!.companyId ?? null,
    "Sensors", resourceMeta[resource].entityType, entityId, action, auditJson(before), auditJson(after)
  );
}

function buildInsert(resource: LifecycleResource, body: Record<string, unknown>, user: Express.Request["user"]) {
  const meta = resourceMeta[resource];
  const businessId = createId(meta.businessId.replace("Id", ""));
  const fields: Record<string, unknown> = {
    id: createId(meta.entityType.replace("Sensor", "").replace("Record", "").toLowerCase()),
    [meta.businessId]: businessId,
    ownerId: user!.id,
    createdById: user!.id,
    companyId: user!.companyId ?? null
  };
  const allowed = resource === "calibrations"
    ? ["sensorId", "channelId", "calibratedAt", "dueAt", "status", "provider", "result", "certificateDocumentId", "notes"]
    : resource === "maintenance"
      ? ["sensorId", "maintenanceType", "priority", "plannedAt", "dueAt", "completedAt", "status", "workOrder", "assignedTo", "notes"]
      : resource === "events"
        ? ["sensorId", "gatewayId", "eventType", "severity", "status", "occurredAt", "message", "source"]
        : ["version", "status", "payload"];
  for (const key of allowed) if (body[key] !== undefined) fields[key] = key === "payload" ? JSON.stringify(body[key]) : body[key];
  return { fields, businessId };
}

async function createResource(resource: LifecycleResource, body: Record<string, unknown>, user: Express.Request["user"]) {
  const db = lifecycleDb();
  return db.$transaction(async (tx) => {
    const { fields, businessId } = buildInsert(resource, body, user);
    const keys = Object.keys(fields);
    const values = keys.map((key) => fields[key]);
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(", ");
    const jsonIndex = keys.indexOf("payload");
    const valueSql = keys.map((key, index) => key === "payload" ? `$${index + 1}::jsonb` : `$${index + 1}`).join(", ");
    await tx.$executeRawUnsafe(`INSERT INTO ${tableNames[resource]} (${keys.map((key) => `"${key}"`).join(", ")}) VALUES (${jsonIndex >= 0 ? valueSql : placeholders})`, ...values);
    const rows = await tx.$queryRawUnsafe<any[]>(`SELECT * FROM ${tableNames[resource]} WHERE "${resourceMeta[resource].businessId}" = $1`, businessId);
    await writeAudit(tx, user, resource, rows[0].id, "CREATE", null, rows[0]);
    return rows[0];
  });
}

async function updateResource(resource: LifecycleResource, id: string, body: Record<string, unknown>, user: Express.Request["user"]) {
  const db = lifecycleDb();
  return db.$transaction(async (tx) => {
    const scope = ownerClause(user);
    const rows = await tx.$queryRawUnsafe<any[]>(`SELECT * FROM ${tableNames[resource]} WHERE "id" = $1${scope.sql ? ` AND ${scope.sql.slice(7)}` : ""}`, id, ...scope.values);
    const current = rows[0];
    if (!current) return null;
    const nextStatus = lifecycleStatus(resource, body);
    if (nextStatus && nextStatus !== current.status) assertValidLifecycleTransition(resourceMeta[resource].kind, current.status, nextStatus);
    const allowed = ["status", "notes", "provider", "result", "certificateDocumentId", "plannedAt", "dueAt", "completedAt", "workOrder", "assignedTo", "message", "source", "severity", "acknowledgedAt", "acknowledgedBy", "resolvedAt", "resolvedBy", "publishedAt"];
    const keys = allowed.filter((key) => body[key] !== undefined);
    if (keys.length === 0) return current;
    const values = keys.map((key) => body[key]);
    const assignments = keys.map((key, index) => `"${key}" = $${index + 2}`).join(", ");
    await tx.$executeRawUnsafe(`UPDATE ${tableNames[resource]} SET ${assignments}, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`, id, ...values);
    const updated = (await tx.$queryRawUnsafe<any[]>(`SELECT * FROM ${tableNames[resource]} WHERE "id" = $1`, id))[0];
    await writeAudit(tx, user, resource, id, "UPDATE", current, updated);
    return updated;
  });
}

async function deleteResource(resource: LifecycleResource, id: string, user: Express.Request["user"]) {
  const db = lifecycleDb();
  return db.$transaction(async (tx) => {
    const scope = ownerClause(user);
    const rows = await tx.$queryRawUnsafe<any[]>(`SELECT * FROM ${tableNames[resource]} WHERE "id" = $1${scope.sql ? ` AND ${scope.sql.slice(7)}` : ""}`, id, ...scope.values);
    if (!rows[0]) return null;
    await tx.$executeRawUnsafe(`DELETE FROM ${tableNames[resource]} WHERE "id" = $1`, id);
    await writeAudit(tx, user, resource, id, "DELETE", rows[0], null);
    return rows[0];
  });
}

sensorLifecycleRouter.get("/:resource", async (request, response, next) => {
  try {
    const resource = request.params.resource as LifecycleResource;
    if (!(resource in tableNames)) {
      response.status(404).json({ message: "Sensor lifecycle resource not found." });
      return;
    }
    response.json(await listResource(resource, request.user));
  } catch (error) {
    next(error);
  }
});

sensorLifecycleRouter.get("/:resource/:id", async (request, response, next) => {
  try {
    const resource = request.params.resource as LifecycleResource;
    if (!(resource in tableNames)) {
      response.status(404).json({ message: "Sensor lifecycle resource not found." });
      return;
    }
    const db = lifecycleDb();
    const scope = ownerClause(request.user);
    const values = [request.params.id, ...scope.values];
    const row = await db.$queryRawUnsafe(`SELECT * FROM ${tableNames[resource]} WHERE "id" = $1${scope.sql ? ` AND ${scope.sql.slice(7)}` : ""}`, ...values);
    if (!Array.isArray(row) || row.length === 0) {
      response.status(404).json({ message: "Sensor lifecycle record not found." });
      return;
    }
    response.json(row[0]);
  } catch (error) {
    next(error);
  }
});

sensorLifecycleRouter.post("/:resource", async (request, response, next) => {
  try {
    if (!canModifySensors(request.user!)) {
      response.status(403).json({ message: "Only Admin and Engineer roles may modify sensor lifecycle records." });
      return;
    }
    assertNoDangerousKeys(request.body);
    const resource = request.params.resource as LifecycleResource;
    const schemas = { calibrations: calibrationInputSchema, maintenance: maintenanceInputSchema, events: hardwareEventInputSchema, configuration: configurationInputSchema };
    const schema = schemas[resource];
    if (!schema) {
      response.status(404).json({ message: "Sensor lifecycle resource not found." });
      return;
    }
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) throw createValidationErrorFromZod(parsed.error);
    if (!env.sensorLifecycleWritesEnabled) { unavailableForWrites(response); return; }
    response.status(201).json(await createResource(resource, parsed.data as Record<string, unknown>, request.user));
  } catch (error) {
    next(error);
  }
});

sensorLifecycleRouter.patch("/:resource/:id", async (request, response, next) => {
  try {
    if (!canModifySensors(request.user!)) {
      response.status(403).json({ message: "Only Admin and Engineer roles may modify sensor lifecycle records." });
      return;
    }
    const resource = request.params.resource as LifecycleResource;
    if (!(resource in tableNames)) { response.status(404).json({ message: "Sensor lifecycle resource not found." }); return; }
    assertNoDangerousKeys(request.body);
    if (!env.sensorLifecycleWritesEnabled) { unavailableForWrites(response); return; }
    const updated = await updateResource(resource, request.params.id, request.body, request.user);
    if (!updated) { response.status(404).json({ message: "Sensor lifecycle record not found." }); return; }
    response.json(updated);
  } catch (error) { next(error); }
});

sensorLifecycleRouter.delete("/:resource/:id", async (request, response, next) => {
  try {
    if (!canModifySensors(request.user!)) { response.status(403).json({ message: "Only Admin and Engineer roles may modify sensor lifecycle records." }); return; }
    const resource = request.params.resource as LifecycleResource;
    if (!(resource in tableNames)) { response.status(404).json({ message: "Sensor lifecycle resource not found." }); return; }
    if (!env.sensorLifecycleWritesEnabled) { unavailableForWrites(response); return; }
    const deleted = await deleteResource(resource, request.params.id, request.user);
    if (!deleted) { response.status(404).json({ message: "Sensor lifecycle record not found." }); return; }
    response.status(204).send();
  } catch (error) { next(error); }
});
