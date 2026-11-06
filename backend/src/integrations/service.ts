import {localInboundPresentation} from "./localInbound";
import { ConnectorRecord, IntegrationEventRecord, IntegrationSummary, SanitizedEventInput } from "./types";
import { redactSensitive, redactText, redactUrl } from "./security";

export function canReadIntegrations(): boolean {
  return true;
}

export function canTestIntegrations(role: "Admin" | "Engineer" | "Viewer"): boolean {
  return role === "Admin" || role === "Engineer";
}

export function canManageIntegrations(role: "Admin" | "Engineer" | "Viewer"): boolean {
  return role === "Admin";
}

export function serializeConnector(connector: ConnectorRecord) {
  return {
    id: connector.id,
    name: connector.name,
    connectorType: connector.connectorType,
    enabled: connector.enabled,
    status: connector.status,
    endpoint: redactUrl(connector.endpoint),
    configuration: redactSensitive(connector.configuration),
    secretConfigured: connector.secretConfigured,
    lastTestedAt: connector.lastTestedAt?.toISOString() ?? null,
    lastSuccessfulTestAt: connector.lastSuccessfulTestAt?.toISOString() ?? null,
    lastFailureAt: connector.lastFailureAt?.toISOString() ?? null,
    lastFailureCode: connector.lastFailureCode,
    lastFailureMessage: connector.lastFailureMessage ? redactText(connector.lastFailureMessage) : null,
    createdAt: connector.createdAt.toISOString(),
    ...localInboundPresentation(connector),
    updatedAt: connector.updatedAt.toISOString()
  };
}

export function sanitizeEvent(input: SanitizedEventInput): SanitizedEventInput {
  return {
    ...input,
    errorCode: input.errorCode ? input.errorCode.slice(0, 80) : null,
    errorMessage: input.errorMessage ? redactText(input.errorMessage).slice(0, 500) : null,
    durationMs: input.durationMs === null ? null : Math.max(0, Math.min(Math.round(input.durationMs), 300_000)),
    itemCount: input.itemCount === null ? null : Math.max(0, Math.min(Math.round(input.itemCount), 1_000_000))
  };
}

export function calculateIntegrationSummary(connectors: ConnectorRecord[], events: IntegrationEventRecord[], now = new Date()): IntegrationSummary {
  const cutoff = now.getTime() - 24 * 60 * 60 * 1000;
  const latestSuccess = connectors.reduce<Date | null>((latest, connector) => {
    if (!connector.lastSuccessfulTestAt) return latest;
    return !latest || connector.lastSuccessfulTestAt > latest ? connector.lastSuccessfulTestAt : latest;
  }, null);

  return {
    activeConnectors: connectors.filter((connector) => connector.enabled && connector.status !== "Disabled").length,
    latestSuccessfulTestAt: latestSuccess?.toISOString() ?? null,
    failuresLast24Hours: events.filter((event) => event.outcome === "Failure" && event.createdAt.getTime() >= cutoff).length,
    uptime: null,
    throughput: null
  };
}
