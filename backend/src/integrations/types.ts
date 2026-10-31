export type IntegrationRole = "Admin" | "Engineer" | "Viewer";

export type ConnectorStatus = "Ready" | "Degraded" | "Failed" | "Disabled";
export type EventOutcome = "Success" | "Failure";

export type ConnectorRecord = {
  id: string;
  name: string;
  connectorType: "REST";
  enabled: boolean;
  status: ConnectorStatus;
  endpoint: string;
  configuration: unknown;
  secretReference: string | null;
  secretConfigured: boolean;
  lastTestedAt: Date | null;
  lastSuccessfulTestAt: Date | null;
  lastFailureAt: Date | null;
  lastFailureCode: string | null;
  lastFailureMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  authorId: string | null;
};

export type IntegrationEventRecord = {
  id: string;
  connectorId: string;
  operation: "Test" | "MetadataPreview";
  outcome: EventOutcome;
  errorCode: string | null;
  errorMessage: string | null;
  durationMs: number | null;
  itemCount: number | null;
  createdAt: Date;
  authorId: string | null;
};

export type ConnectorInput = {
  name: string;
  endpoint: string;
  enabled?: boolean;
  configuration?: Record<string, unknown> | null;
  secretReference?: string | null;
  scope?: ConnectorScopeInput;
};

export type ConnectorPatch = Partial<ConnectorInput>;

export type ConnectorScopeInput = { pipelineId: string; assetId?: string | null };

export type SanitizedEventInput = Omit<IntegrationEventRecord, "id" | "createdAt">;

export type IntegrationSummary = {
  activeConnectors: number;
  latestSuccessfulTestAt: string | null;
  failuresLast24Hours: number;
  uptime: null;
  throughput: null;
};
