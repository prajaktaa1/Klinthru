import {env} from "../config/env";
import {prepareLocalInbound,isLocalInbound,inboundHasRecentValidReading,localInboundPresentation} from "../integrations/localInbound";
import {scopedConnectorConfiguration} from "../integrations/scope";
import {ingestSensorMessage,sensorMessageSchema} from "../sensorIngestion/service";
import { NextFunction, Request, Response, Router } from "express";

import { DatabaseUnavailableError } from "../data/store";
import { getPrismaClient } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { calculateIntegrationSummary, canManageIntegrations, canTestIntegrations, sanitizeEvent, serializeConnector } from "../integrations/service";
import { RestConnectorAdapter } from "../integrations/connectorAdapter";
import { redactText } from "../integrations/security";
import { mergeConnectorConfiguration, validateConnectorInput, validateConnectorPatch } from "../integrations/validation";
import { AuthUser } from "../types/domain";
import { parseScada, ingestScadaBatch } from "../utils/scadaData";
import { manualModules, validateManualRecord } from "../integrations/manualRecords";
import { createValidationError } from "../validation/validationErrors";

export const integrationsRouter = Router();
const restConnectorAdapter = new RestConnectorAdapter();

integrationsRouter.use(requireAuth);

integrationsRouter.post("/connectors/:id/sensor-ingestion",async(request,response,next)=>{
 try{if(!requireManager(request,response))return;const message=parseScada(sensorMessageSchema,request.body);const result=await ingestSensorMessage("API",{connectorId:request.params.id,pipelineId:message.pipelineId,deviceId:message.deviceId,tagId:message.tagId},message,request.user!);response.status(result.rejectedReplay?409:200).json(result);}catch(error){next(error);}
});

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

async function serializeConnectorForRead(connector:Parameters<typeof serializeConnector>[0]){
 const view=serializeConnector(connector);
 return isLocalInbound(connector)?{...view,...localInboundPresentation(connector,await inboundHasRecentValidReading(getDatabase(),connector))}:view;
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
  return scopedConnectorConfiguration(getDatabase(),input,user,existing);
}

integrationsRouter.get("/connectors", async (request, response, next) => {
  try {
    const connectors = await getDatabase().integrationConnector.findMany({ where: ownerWhere(request.user!), orderBy: { createdAt: "desc" } });
    response.json(await Promise.all(connectors.map(serializeConnectorForRead)));
  } catch (error) {
    respondToError(error, response, next);
  }
});

integrationsRouter.post("/connectors", async (request, response, next) => {
  try {
    if (!requireManager(request, response)) return;
    const input = validateConnectorInput(request.body);
    const { scope,mode,deviceRecordId, ...connectorInput } = input;
    const configuration=await scopedConfiguration({configuration:connectorInput.configuration,scope},request.user!);
    const data=mode==="LOCAL_INBOUND_SENSOR_API"?await prepareLocalInbound(input,request.user!,configuration,env.nodeEnv):{...connectorInput,configuration:configuration??undefined,secretConfigured:Boolean(input.secretReference),authorId:request.user!.id};
    const created = await getDatabase().integrationConnector.create({
      data
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
    response.json(await serializeConnectorForRead(connector));
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
    if(isLocalInbound(existing)&&(input.endpoint!==undefined||input.scope!==undefined||input.secretReference!==undefined))throw createValidationError({mode:"Local inbound endpoint and device scope cannot be changed through connector edits."});
    const { scope, ...connectorInput } = input;
    const updated = await getDatabase().integrationConnector.update({
      where: { id: existing.id, ...(input.configuration !== undefined ? { updatedAt: existing.updatedAt } : {}) },
      data: { ...connectorInput, configuration: await scopedConfiguration({ configuration: connectorInput.configuration, scope }, request.user!, existing.configuration), ...(input.configuration !== undefined || scope ? { updatedAt: new Date(Math.max(Date.now(), existing.updatedAt.getTime() + 1)) } : {}), secretConfigured: input.secretReference === undefined ? undefined : Boolean(input.secretReference) }
    });
    response.json(await serializeConnectorForRead(updated));
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

    if(isLocalInbound(connector))return response.status(409).json({message:"Inbound connectors do not perform external URL tests. Connectivity requires actual valid received readings."});
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
