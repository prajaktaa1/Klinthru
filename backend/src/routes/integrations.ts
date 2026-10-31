import { NextFunction, Request, Response, Router } from "express";

import { DatabaseUnavailableError } from "../data/store";
import { getPrismaClient } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { calculateIntegrationSummary, canManageIntegrations, canTestIntegrations, sanitizeEvent, serializeConnector } from "../integrations/service";
import { RestConnectorAdapter } from "../integrations/connectorAdapter";
import { redactText } from "../integrations/security";
import { mergeConnectorConfiguration, validateConnectorInput, validateConnectorPatch, validateConnectorScope } from "../integrations/validation";
import { AuthUser } from "../types/domain";
import { ingestScadaBatch } from "../utils/scadaData";
import { manualModules, validateManualRecord } from "../integrations/manualRecords";
import { createValidationError } from "../validation/validationErrors";

export const integrationsRouter = Router();
const restConnectorAdapter = new RestConnectorAdapter();

integrationsRouter.use(requireAuth);

integrationsRouter.post("/connectors/:id/scada-ingestion", async (request, response, next) => {
  try {
    if (!requireManager(request, response)) return;
    response.json(await ingestScadaBatch(request.params.id, request.body, request.user!));
  } catch (error) { next(error); }
});

function getDatabase() {
  const prisma = getPrismaClient();
  if (!prisma) throw new DatabaseUnavailableError();
  return prisma;
}

function ownerWhere(user: AuthUser) {
  return user.role === "Admin" ? {} : { authorId: user.id };
}

function isPendingIntegrationSchema(error: unknown): boolean {
  const coded = error as { code?: string; message?: string };
  return coded.code === "P2021" || Boolean(coded.message?.includes("IntegrationConnector") || coded.message?.includes("IntegrationEvent") || coded.message?.includes("IntegrationHubRecord"));
}

function requireManager(request: Request, response: Response): boolean {
  if (!canManageIntegrations(request.user!.role)) {
    response.status(403).json({ message: "Only Admin may create, edit, or delete integration connectors." });
    return false;
  }
  return true;
}

async function findConnector(id: string, user: AuthUser) {
  return getDatabase().integrationConnector.findFirst({ where: { id, ...ownerWhere(user) } });
}

function respondToError(error: unknown, response: Response, next: NextFunction) {
  if (isPendingIntegrationSchema(error)) {
    response.status(503).json({ message: "Integration Hub persistence is unavailable until the pending database migration is applied." });
    return;
  }
  next(error);
}

async function scopedConfiguration(input: { configuration?: Record<string, unknown> | null; scope?: { pipelineId: string; assetId?: string | null } }, user: AuthUser, existing: unknown = null) {
  if (!input.scope) return mergeConnectorConfiguration(existing, input.configuration);
  if (!user.companyId) throw createValidationError({ scope: "A company-scoped account is required to link a connector." });
  const db = getDatabase();
  const pipeline = await db.pipeline.findFirst({ where: { id: input.scope.pipelineId }, select: { id: true, createdById: true, createdBy: { select: { companyId: true } } } });
  if (!pipeline) throw createValidationError({ scope: "Pipeline not found." });
  const asset = input.scope.assetId ? await db.asset.findFirst({ where: { id: input.scope.assetId, pipelineId: input.scope.pipelineId }, select: { id: true, pipelineId: true } }) : undefined;
  const scope = validateConnectorScope(input.scope, { userId: user.id, role: user.role, companyId: user.companyId, pipeline: { id: pipeline.id, createdById: pipeline.createdById, companyId: pipeline.createdBy?.companyId ?? null }, asset });
  return mergeConnectorConfiguration(existing, { ...(input.configuration ?? {}), integrationScope: scope });
}

integrationsRouter.get("/connectors", async (request, response, next) => {
  try {
    const connectors = await getDatabase().integrationConnector.findMany({ where: ownerWhere(request.user!), orderBy: { createdAt: "desc" } });
    response.json(connectors.map(serializeConnector));
  } catch (error) {
    respondToError(error, response, next);
  }
});

integrationsRouter.post("/connectors", async (request, response, next) => {
  try {
    if (!requireManager(request, response)) return;
    const input = validateConnectorInput(request.body);
    const { scope, ...connectorInput } = input;
    const created = await getDatabase().integrationConnector.create({
      data: { ...connectorInput, configuration: await scopedConfiguration({ configuration: connectorInput.configuration, scope }, request.user!) ?? undefined, secretConfigured: Boolean(input.secretReference), authorId: request.user!.id }
    });
    response.status(201).json(serializeConnector(created));
  } catch (error) {
    respondToError(error, response, next);
  }
});

integrationsRouter.get("/connectors/:id", async (request, response, next) => {
  try {
    const connector = await findConnector(request.params.id, request.user!);
    if (!connector) return response.status(404).json({ message: "Connector not found." });
    response.json(serializeConnector(connector));
  } catch (error) {
    respondToError(error, response, next);
  }
});

integrationsRouter.patch("/connectors/:id", async (request, response, next) => {
  try {
    if (!requireManager(request, response)) return;
    const existing = await findConnector(request.params.id, request.user!);
    if (!existing) return response.status(404).json({ message: "Connector not found." });
    const input = validateConnectorPatch(request.body);
    const { scope, ...connectorInput } = input;
    const updated = await getDatabase().integrationConnector.update({
      where: { id: existing.id, ...(input.configuration !== undefined ? { updatedAt: existing.updatedAt } : {}) },
      data: { ...connectorInput, configuration: scope ? await scopedConfiguration({ configuration: connectorInput.configuration, scope }, request.user!, existing.configuration) : mergeConnectorConfiguration(existing.configuration, connectorInput.configuration), ...(input.configuration !== undefined || scope ? { updatedAt: new Date(Math.max(Date.now(), existing.updatedAt.getTime() + 1)) } : {}), secretConfigured: input.secretReference === undefined ? undefined : Boolean(input.secretReference) }
    });
    response.json(serializeConnector(updated));
  } catch (error) {
    if ((error as { code?: string }).code === "P2025") { response.status(409).json({ message: "Connector configuration changed; refresh before editing again." }); return; }
    respondToError(error, response, next);
  }
});

integrationsRouter.delete("/connectors/:id", async (request, response, next) => {
  try {
    if (!requireManager(request, response)) return;
    const existing = await findConnector(request.params.id, request.user!);
    if (!existing) return response.status(404).json({ message: "Connector not found." });
    await getDatabase().integrationConnector.delete({ where: { id: existing.id } });
    response.status(204).send();
  } catch (error) {
    respondToError(error, response, next);
  }
});

integrationsRouter.post("/connectors/:id/test", async (request, response, next) => {
  try {
    if (!canTestIntegrations(request.user!.role)) return response.status(403).json({ message: "Only Admin and Engineer may test integration connectors." });
    const connector = await findConnector(request.params.id, request.user!);
    if (!connector) return response.status(404).json({ message: "Connector not found." });
    if (!connector.enabled) return response.status(409).json({ message: "Disabled connectors cannot be tested." });

    const result = await restConnectorAdapter.test({ connectorType: "REST", endpoint: connector.endpoint });
    const testedAt = new Date();
    const event = sanitizeEvent({
      connectorId: connector.id,
      operation: "Test",
      outcome: result.ok ? "Success" : "Failure",
      errorCode: result.errorCode ?? null,
      errorMessage: result.errorMessage ?? null,
      durationMs: result.durationMs,
      itemCount: null,
      authorId: request.user!.id
    });
    await getDatabase().integrationEvent.create({ data: event });
    const updated = await getDatabase().integrationConnector.update({
      where: { id: connector.id },
      data: result.ok
        ? { status: "Ready", lastTestedAt: testedAt, lastSuccessfulTestAt: testedAt, lastFailureAt: null, lastFailureCode: null, lastFailureMessage: null }
        : { status: "Failed", lastTestedAt: testedAt, lastFailureAt: testedAt, lastFailureCode: event.errorCode, lastFailureMessage: event.errorMessage }
    });
    response.json({ connector: serializeConnector(updated), test: { ok: result.ok, statusCode: result.statusCode, durationMs: event.durationMs, rawDurationMs: result.durationMs } });
  } catch (error) {
    respondToError(error, response, next);
  }
});

integrationsRouter.get("/events", async (request, response, next) => {
  try {
    const events = await getDatabase().integrationEvent.findMany({
      where: request.user!.role === "Admin" ? {} : { connector: { authorId: request.user!.id } },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    response.json(events.map((event: any) => ({ ...event, errorMessage: event.errorMessage ? redactText(String(event.errorMessage)) : null })));
  } catch (error) {
    respondToError(error, response, next);
  }
});

integrationsRouter.get("/summary", async (request, response, next) => {
  try {
    const where = ownerWhere(request.user!);
    const connectors = await getDatabase().integrationConnector.findMany({ where });
    const events = await getDatabase().integrationEvent.findMany({ where: request.user!.role === "Admin" ? {} : { connector: { authorId: request.user!.id } } });
    response.json(calculateIntegrationSummary(connectors, events));
  } catch (error) {
    respondToError(error, response, next);
  }
});

// User-entered operational records are stored separately from connector-generated events.
// They never imply that a scheduler or an external data transport has executed.
integrationsRouter.get("/manual-records", async (request, response, next) => {
  try {
    const module = request.query.module;
    if (module !== undefined && (typeof module !== "string" || !manualModules.includes(module as any))) return response.status(400).json({ message: "Unknown Integration Hub module." });
    const records = await getDatabase().integrationHubRecord.findMany({ where: { ...ownerWhere(request.user!), ...(module ? { module } : {}) }, orderBy: { updatedAt: "desc" }, take: 500 });
    response.json(records);
  } catch (error) { respondToError(error, response, next); }
});

integrationsRouter.post("/manual-records", async (request, response, next) => {
  try {
    if (!requireManager(request, response)) return;
    const input = validateManualRecord(request.body);
    if (input.connectorId && !await findConnector(input.connectorId, request.user!)) return response.status(400).json({ message: "Selected connector was not found." });
    const record = await getDatabase().integrationHubRecord.create({ data: { ...input, authorId: request.user!.id } });
    response.status(201).json(record);
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return response.status(409).json({ message: "A record with this name already exists in this module." });
    respondToError(error, response, next);
  }
});

integrationsRouter.put("/manual-records/:id", async (request, response, next) => {
  try {
    if (!requireManager(request, response)) return;
    const existing = await getDatabase().integrationHubRecord.findFirst({ where: { id: request.params.id, ...ownerWhere(request.user!) } });
    if (!existing) return response.status(404).json({ message: "Record not found." });
    const input = validateManualRecord(request.body);
    if (input.module !== existing.module) return response.status(400).json({ message: "The record module cannot be changed." });
    if (input.connectorId && !await findConnector(input.connectorId, request.user!)) return response.status(400).json({ message: "Selected connector was not found." });
    response.json(await getDatabase().integrationHubRecord.update({ where: { id: existing.id }, data: input }));
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return response.status(409).json({ message: "A record with this name already exists in this module." });
    respondToError(error, response, next);
  }
});

integrationsRouter.delete("/manual-records/:id", async (request, response, next) => {
  try {
    if (!requireManager(request, response)) return;
    const existing = await getDatabase().integrationHubRecord.findFirst({ where: { id: request.params.id, ...ownerWhere(request.user!) } });
    if (!existing) return response.status(404).json({ message: "Record not found." });
    await getDatabase().integrationHubRecord.delete({ where: { id: existing.id } });
    response.status(204).send();
  } catch (error) { respondToError(error, response, next); }
});
