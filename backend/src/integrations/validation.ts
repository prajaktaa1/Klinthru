import { z } from "zod";

import { ConnectorInput, ConnectorPatch, ConnectorScopeInput } from "./types";
import { validateRestUrl } from "./security";
import { assertNoDangerousKeys, createValidationError, createValidationErrorFromZod } from "../validation/validationErrors";

const name = z.string().trim().min(1, "Connector name is required.").max(120);
const endpoint = z.string().trim().max(2_048).superRefine((value, context) => {
  try {
    validateRestUrl(value);
  } catch (error) {
    context.addIssue({ code: "custom", message: error instanceof Error ? error.message : "Invalid endpoint." });
  }
});
const configuration = z.record(z.string(), z.unknown()).nullable().optional();
const metadataText = z.string().trim().min(1).max(200).nullable().optional();
const metadataList = z.array(z.string().trim().min(1).max(120)).max(30).refine(values => new Set(values).size === values.length, "Duplicate values are not allowed.").nullable().optional();
export const connectorMetadataSchema = z.object({
  sourceSystem: metadataText,
  description: z.string().trim().min(1).max(1000).nullable().optional(),
  sourceType: z.enum(["SCADA", "Historian", "PLC-RTU", "IoT Platform", "CP System", "Laboratory-LIMS", "ILI Vendor", "GIS", "SAP-ERP", "CMMS-Maximo", "External DMS", "Regulatory", "File-SFTP", "Database", "Other"]).nullable().optional(),
  direction: z.enum(["Inbound", "Outbound", "Bidirectional"]).nullable().optional(),
  protocol: z.literal("REST").nullable().optional(),
  environment: z.enum(["Development", "Test-UAT", "Production", "DR"]).nullable().optional(),
  dataDomains: metadataList,
  targetModules: metadataList,
  syncMode: z.enum(["Streaming", "Near Real-Time", "Polling", "Scheduled Batch", "Event Driven", "Manual", "On Demand"]).nullable().optional(),
  owner: metadataText,
  criticality: metadataText
}).strict();
const secretReference = z.string().trim().min(1).max(255).nullable().optional();
const connectorScope = z.object({ pipelineId: z.string().trim().min(1).max(100), assetId: z.string().trim().min(1).max(100).nullable().optional() }).strict();

const createSchema = z.object({
  name,
  endpoint,
  enabled: z.boolean().optional(),
  configuration,
  secretReference,
  scope: connectorScope.optional()
}).strict();

const patchSchema = createSchema.partial().refine((value) => Object.keys(value).length > 0, "At least one field is required.");

function assertNoConfigurationSecrets(value: unknown, path = "configuration"): void {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (/authorization|token|secret|password|api[-_]?key|credential/i.test(key)) {
      throw createValidationError({ [`${path}.${key}`]: "Use secretReference instead of storing secrets in configuration." });
    }
    assertNoConfigurationSecrets(child, `${path}.${key}`);
  }
}

function parse<T extends { configuration?: unknown }>(schema: z.ZodType<T>, body: unknown): T {
  assertNoDangerousKeys(body);
  const result = schema.safeParse(body);
  if (!result.success) throw createValidationErrorFromZod(result.error);
  const config = result.data.configuration as Record<string, unknown> | null | undefined;
  if (config && Object.prototype.hasOwnProperty.call(config, "integrationMetadata")) {
    const metadata = connectorMetadataSchema.safeParse(config.integrationMetadata);
    if (!metadata.success) throw createValidationErrorFromZod(metadata.error);
    config.integrationMetadata = metadata.data;
  }
  assertNoConfigurationSecrets(result.data.configuration);
  return result.data;
}

export function validateConnectorInput(body: unknown): ConnectorInput {
  return parse(createSchema, body);
}

export function validateConnectorPatch(body: unknown): ConnectorPatch {
  return parse(patchSchema, body);
}

export type ConnectorScopeContext = {
  userId: string;
  role: "Admin" | "Engineer" | "Viewer";
  companyId?: string;
  pipeline: { id: string; createdById: string | null; companyId: string | null };
  asset?: { id: string; pipelineId: string };
};

export function validateConnectorScope(scope: ConnectorScopeInput, context: ConnectorScopeContext): { companyId: string; pipelineId: string; assetId: string | null } {
  if (!context.companyId || context.pipeline.companyId !== context.companyId) {
    throw createValidationError({ scope: "Pipeline is not available in the authenticated company." });
  }
  if (context.pipeline.id !== scope.pipelineId || (context.role !== "Admin" && context.pipeline.createdById !== context.userId)) {
    throw createValidationError({ scope: "Pipeline is not authorized for this account." });
  }
  if (scope.assetId && (!context.asset || context.asset.id !== scope.assetId || context.asset.pipelineId !== scope.pipelineId)) {
    throw createValidationError({ scope: "Asset must belong to the selected pipeline." });
  }
  return { companyId: context.companyId, pipelineId: scope.pipelineId, assetId: scope.assetId ?? null };
}

export function mergeConnectorConfiguration(existing: unknown, input: Record<string, unknown> | null | undefined): Record<string, unknown> | null | undefined {
  if (input === undefined || input === null) return input;
  if (existing != null && (typeof existing !== "object" || Array.isArray(existing))) {
    throw createValidationError({ configuration: "Legacy configuration is not an object; metadata editing requires review." });
  }
  const previous = (existing ?? {}) as Record<string, unknown>;
  const merged = { ...previous, ...input };
  if (Object.prototype.hasOwnProperty.call(input, "integrationMetadata")) {
    const old = previous.integrationMetadata;
    if (old != null && (typeof old !== "object" || Array.isArray(old))) {
      throw createValidationError({ configuration: "Legacy integrationMetadata conflicts with the metadata contract; review before editing." });
    }
    const prior = (old ?? {}) as Record<string, unknown>;
    const next = { ...prior, ...(input.integrationMetadata as Record<string, unknown>) };
    const changed = Object.entries(input.integrationMetadata as Record<string, unknown>).some(([key, value]) => JSON.stringify(prior[key]) !== JSON.stringify(value));
    const revision = prior.configurationVersion;
    if (revision !== undefined && (!Number.isSafeInteger(revision) || (revision as number) < 1 || (changed && revision === Number.MAX_SAFE_INTEGER))) {
      throw createValidationError({ configuration: "Invalid legacy metadata version; review before editing." });
    }
    next.configurationVersion = old == null ? 1 : changed ? ((revision as number | undefined) ?? 0) + 1 : revision ?? 1;
    merged.integrationMetadata = next;
  }
  return merged;
}
