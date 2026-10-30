import { z } from "zod";

const id = z.string().trim().min(1).max(120);
const text = (max = 500) => z.string().trim().min(1).max(max);
const nullableText = (max = 500) => text(max).nullable();
const timestamp = z.string().datetime();
const jsonObject = z.record(z.string(), z.unknown());

export const reportRunStatuses = ["Queued", "Running", "Completed", "Failed", "Cancelled", "Awaiting Approval", "Approved", "Published"] as const;
export const reportApprovalStatuses = ["Draft", "Review Required", "Approved", "Rejected", "Published"] as const;
export const reportDefinitionTypes = ["Standard", "Regulatory", "Custom"] as const;
export const reportScheduleStatuses = ["Active", "Paused", "Completed", "Cancelled", "Blocked"] as const;
export const reportJobStatuses = ["Requested", "Queued", "Processing", "Completed", "Failed", "Cancelled"] as const;
export const reportSourceRoles = ["Primary", "Supporting", "Aggregated"] as const;
export const reportFieldDataTypes = ["string", "number", "boolean", "date", "datetime", "enum"] as const;
export const reportOutputFormats = ["PDF", "Word", "XLSX", "CSV", "JSON"] as const;

export const reportDefinitionSchema = z.object({
  reportDefinitionId: id,
  name: text(255),
  description: nullableText(2000),
  reportType: z.enum(reportDefinitionTypes),
  category: nullableText(120),
  ownerId: id,
  approvalStatus: z.enum(reportApprovalStatuses),
  effectiveFrom: timestamp.nullable(),
  supersededAt: timestamp.nullable(),
  templateId: id.nullable(),
  templateVersionId: id.nullable(),
  allowedSourceModules: z.array(text(120)).max(100),
  defaultFilterDefinition: jsonObject,
  createdAt: timestamp,
  updatedAt: timestamp
}).strict();

export const reportDefinitionVersionSchema = z.object({
  reportDefinitionVersionId: id,
  reportDefinitionId: id,
  version: text(80),
  definitionSnapshot: jsonObject,
  approvalStatus: z.enum(reportApprovalStatuses),
  approvedById: id.nullable(),
  approvedAt: timestamp.nullable(),
  supersedesVersionId: id.nullable(),
  createdAt: timestamp,
  createdById: id
}).strict();

export const reportingFieldSchema = z.object({
  fieldId: id,
  ownerModule: text(120),
  sourceRecordType: text(160),
  sourceField: text(255),
  label: text(255),
  dataType: z.enum(reportFieldDataTypes),
  unit: nullableText(80),
  description: nullableText(1000),
  permission: text(120),
  joinKey: nullableText(120),
  enabled: z.boolean()
}).strict();

export const reportingJoinSchema = z.object({
  joinId: id,
  leftModule: text(120),
  leftField: text(255),
  rightModule: text(120),
  rightField: text(255),
  relationshipType: text(120),
  approved: z.boolean()
}).strict();

export const customReportDefinitionSchema = z.object({
  customReportDefinitionId: id,
  ownerId: id,
  name: text(255),
  sourceModules: z.array(text(120)).min(1).max(100),
  selectedFieldIds: z.array(id).min(1).max(500),
  filterDefinition: jsonObject,
  groupingDefinition: jsonObject,
  sortingDefinition: jsonObject,
  chartDefinition: jsonObject,
  layoutDefinition: jsonObject,
  outputFormats: z.array(z.enum(reportOutputFormats)).min(1),
  status: z.enum(["Draft", "Approved", "Archived"]),
  version: text(80),
  createdAt: timestamp,
  updatedAt: timestamp
}).strict();

export const reportInputSnapshotSchema = z.object({
  reportInputSnapshotId: id,
  reportRunId: id,
  dataCutoffTimestamp: timestamp,
  filterDefinition: jsonObject,
  parameterSet: jsonObject,
  sourceManifest: z.array(jsonObject).min(1).max(10000),
  snapshotHash: text(255),
  createdAt: timestamp,
  createdById: id,
  immutableAt: timestamp
}).strict();

export const reportSourceLinkSchema = z.object({
  reportSourceLinkId: id,
  reportRunId: id,
  sourceModule: text(120),
  sourceRecordType: text(160),
  sourceRecordId: id,
  sourceRecordVersion: nullableText(120),
  sourceTimestamp: timestamp.nullable(),
  role: z.enum(reportSourceRoles),
  sourceHash: text(255)
}).strict();

export const reportRunSchema = z.object({
  reportRunId: id,
  reportDefinitionId: id,
  reportDefinitionVersionId: id,
  templateVersionId: id.nullable(),
  requestedById: id,
  requestedAt: timestamp,
  pipelineId: id.nullable(),
  segmentId: id.nullable(),
  assetId: id.nullable(),
  dateRange: jsonObject,
  parameterSet: jsonObject,
  filterDefinition: jsonObject,
  reportInputSnapshotId: id.nullable(),
  outputFormat: z.enum(reportOutputFormats),
  status: z.enum(reportRunStatuses),
  startedAt: timestamp.nullable(),
  completedAt: timestamp.nullable(),
  approvalStatus: z.enum(reportApprovalStatuses),
  documentId: id.nullable(),
  failureCode: nullableText(120),
  failureMessage: nullableText(2000),
  createdAt: timestamp
}).strict();

export const reportDeliverySchema = z.object({
  reportDeliveryId: id,
  reportRunId: id,
  deliveryChannelId: id,
  destinationId: id,
  recipients: z.array(text(255)).max(500),
  status: z.enum(["Requested", "Queued", "Processing", "Delivered", "Failed", "Blocked", "Cancelled"]),
  attemptCount: z.number().int().min(0),
  lastError: nullableText(2000),
  createdAt: timestamp,
  updatedAt: timestamp
}).strict();

export const reportScheduleSchema = z.object({
  reportScheduleId: id,
  reportDefinitionId: id,
  ownerUserId: id,
  runAsPrincipalId: id,
  frequency: text(120),
  timezone: text(120),
  startDate: timestamp,
  endDate: timestamp.nullable(),
  nextRunAt: timestamp.nullable(),
  lastRunAt: timestamp.nullable(),
  recipients: z.array(text(255)).max(500),
  deliveryChannelId: id.nullable(),
  outputFormat: z.enum(reportOutputFormats),
  status: z.enum(reportScheduleStatuses),
  createdAt: timestamp,
  updatedAt: timestamp
}).strict();

export const exportJobSchema = z.object({
  exportJobId: id,
  sourceModule: text(120),
  datasetId: id,
  selectedFieldIds: z.array(id).min(1).max(500),
  filterDefinition: jsonObject,
  dateRange: jsonObject,
  outputFormat: z.enum(reportOutputFormats),
  requestedById: id,
  requestedAt: timestamp,
  status: z.enum(reportJobStatuses),
  recordCount: z.number().int().min(0).nullable(),
  dataSnapshotId: id.nullable(),
  documentId: id.nullable(),
  failureCode: nullableText(120),
  failureMessage: nullableText(2000),
  completedAt: timestamp.nullable()
}).strict();

export const exportTemplateSchema = z.object({
  exportTemplateId: id,
  ownerId: id,
  name: text(255),
  sourceModule: text(120),
  selectedFieldIds: z.array(id).min(1).max(500),
  filterDefinition: jsonObject,
  outputFormat: z.enum(reportOutputFormats),
  createdAt: timestamp,
  updatedAt: timestamp
}).strict();

export const reportTemplateSchema = z.object({
  reportTemplateId: id,
  name: text(255),
  description: nullableText(2000),
  category: nullableText(120),
  ownerId: id,
  status: z.enum(["Draft", "Approved", "Archived"]),
  createdAt: timestamp,
  updatedAt: timestamp
}).strict();

export const reportTemplateVersionSchema = z.object({
  reportTemplateVersionId: id,
  reportTemplateId: id,
  version: text(80),
  layoutDefinition: jsonObject,
  sectionDefinition: jsonObject,
  fieldBindings: z.array(id).max(500),
  chartDefinition: jsonObject,
  brandingProfileId: id.nullable(),
  watermarkRule: jsonObject,
  requiredSourceDatasets: z.array(text(160)).max(100),
  approvalStatus: z.enum(reportApprovalStatuses),
  approvedById: id.nullable(),
  approvedAt: timestamp.nullable(),
  supersedesVersionId: id.nullable(),
  createdAt: timestamp,
  createdById: id
}).strict();

export const reportConfigurationSchema = z.object({
  reportConfigurationId: id,
  ownerId: id,
  primaryFormat: z.enum(reportOutputFormats).nullable(),
  secondaryFormat: z.enum(reportOutputFormats).nullable(),
  includeVisualizations: z.boolean().nullable(),
  namingPattern: nullableText(255),
  approvalPolicy: jsonObject,
  watermarkPolicy: jsonObject,
  accessPolicy: jsonObject,
  brandingProfileId: id.nullable(),
  regulatoryFrameworkIds: z.array(id).max(100),
  notificationPolicy: jsonObject,
  auditPolicy: jsonObject,
  deliveryChannelId: id.nullable(),
  connectorId: id.nullable(),
  destinationId: id.nullable(),
  version: text(80),
  createdAt: timestamp,
  updatedAt: timestamp
}).strict();

export const reportAuditEventSchema = z.object({
  reportAuditEventId: id,
  eventType: text(120),
  reportRunId: id.nullable(),
  reportDefinitionId: id.nullable(),
  templateVersionId: id.nullable(),
  actorId: id,
  occurredAt: timestamp,
  durationMs: z.number().int().min(0).nullable(),
  status: nullableText(120),
  metadata: jsonObject
}).strict();

export const reportApiPaths = {
  definitions: "GET /api/reports/definitions",
  definition: "GET /api/reports/definitions/:id",
  runs: "GET /api/reports/runs",
  run: "GET /api/reports/runs/:id",
  schedules: "GET /api/reports/schedules",
  exports: "GET /api/reports/exports",
  templates: "GET /api/reports/templates",
  configuration: "GET /api/reports/configuration"
} as const;

export const reportDeliveryReferenceSchema = z.object({
  connectorId: id,
  destinationId: id,
  deliveryChannelId: id
}).strict();

export function assertImmutableRecordTransition(before: unknown, after: unknown) {
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    throw new Error("Immutable Reports history cannot be updated; create a new revision or run.");
  }
}

export function assertNoIntegrationSecrets(value: unknown, path = "payload") {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (/password|secret|token|privateKey|apiKey/i.test(key)) {
      throw new Error(`Integration credential field is not allowed in Reports payload: ${path}.${key}`);
    }
    assertNoIntegrationSecrets(child, `${path}.${key}`);
  }
}

export type ReportDefinitionContract = z.infer<typeof reportDefinitionSchema>;
export type ReportDefinitionVersionContract = z.infer<typeof reportDefinitionVersionSchema>;
export type ReportingFieldContract = z.infer<typeof reportingFieldSchema>;
export type ReportingJoinContract = z.infer<typeof reportingJoinSchema>;
export type CustomReportDefinitionContract = z.infer<typeof customReportDefinitionSchema>;
export type ReportInputSnapshotContract = z.infer<typeof reportInputSnapshotSchema>;
export type ReportSourceLinkContract = z.infer<typeof reportSourceLinkSchema>;
export type ReportRunContract = z.infer<typeof reportRunSchema>;
export type ReportDeliveryContract = z.infer<typeof reportDeliverySchema>;
export type ReportScheduleContract = z.infer<typeof reportScheduleSchema>;
export type ExportJobContract = z.infer<typeof exportJobSchema>;
export type ExportTemplateContract = z.infer<typeof exportTemplateSchema>;
export type ReportTemplateContract = z.infer<typeof reportTemplateSchema>;
export type ReportTemplateVersionContract = z.infer<typeof reportTemplateVersionSchema>;
export type ReportConfigurationContract = z.infer<typeof reportConfigurationSchema>;
export type ReportAuditEventContract = z.infer<typeof reportAuditEventSchema>;
