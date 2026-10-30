-- DRAFT ONLY. DO NOT APPLY.
-- Prepared for explicit approval, backup, migration review and deployment.
-- Additive only: no legacy Report rows are altered, copied, deleted or backfilled.
-- Neon production/staging must remain untouched.

CREATE TABLE IF NOT EXISTS "report_definitions" (
  "id" TEXT PRIMARY KEY, "ownerId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "description" TEXT, "definitionType" TEXT NOT NULL, "sourceModule" TEXT,
  "status" TEXT NOT NULL, "currentVersionId" TEXT, "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "report_definition_versions" (
  "id" TEXT PRIMARY KEY, "definitionId" TEXT NOT NULL, "ownerId" TEXT NOT NULL,
  "version" INTEGER NOT NULL, "specification" JSONB NOT NULL, "contentHash" TEXT NOT NULL,
  "createdById" TEXT NOT NULL, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  UNIQUE ("definitionId", "version")
);
CREATE TABLE IF NOT EXISTS "reporting_fields" (
  "id" TEXT PRIMARY KEY, "ownerId" TEXT NOT NULL, "fieldKey" TEXT NOT NULL,
  "label" TEXT NOT NULL, "dataType" TEXT NOT NULL, "sourceModule" TEXT NOT NULL,
  "sourceTable" TEXT NOT NULL, "sourceColumn" TEXT NOT NULL, "unit" TEXT,
  "permissionScope" TEXT, "isAvailable" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(), UNIQUE ("ownerId", "fieldKey")
);
CREATE TABLE IF NOT EXISTS "reporting_joins" (
  "id" TEXT PRIMARY KEY, "ownerId" TEXT NOT NULL, "joinKey" TEXT NOT NULL,
  "leftModule" TEXT NOT NULL, "leftTable" TEXT NOT NULL, "leftColumn" TEXT NOT NULL,
  "rightModule" TEXT NOT NULL, "rightTable" TEXT NOT NULL, "rightColumn" TEXT NOT NULL,
  "permissionScope" TEXT, "isAvailable" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(), UNIQUE ("ownerId", "joinKey")
);
CREATE TABLE IF NOT EXISTS "custom_report_definitions" (
  "id" TEXT PRIMARY KEY, "ownerId" TEXT NOT NULL, "definitionId" TEXT NOT NULL,
  "name" TEXT NOT NULL, "specification" JSONB NOT NULL, "approvalStatus" TEXT NOT NULL,
  "createdById" TEXT NOT NULL, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "report_input_snapshots" (
  "id" TEXT PRIMARY KEY, "ownerId" TEXT NOT NULL, "reportDefinitionVersionId" TEXT NOT NULL,
  "snapshotHash" TEXT NOT NULL, "capturedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "sourceManifest" JSONB NOT NULL, "immutable" BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE ("reportDefinitionVersionId", "snapshotHash")
);
CREATE TABLE IF NOT EXISTS "report_source_links" (
  "id" TEXT PRIMARY KEY, "ownerId" TEXT NOT NULL, "snapshotId" TEXT NOT NULL,
  "sourceModule" TEXT NOT NULL, "sourceTable" TEXT NOT NULL, "sourceRecordId" TEXT NOT NULL,
  "sourceRevision" TEXT, "sourceDocumentVersionId" TEXT, "sourceRole" TEXT NOT NULL,
  "observedAt" TIMESTAMPTZ(6) NOT NULL
);
CREATE TABLE IF NOT EXISTS "report_runs" (
  "id" TEXT PRIMARY KEY, "ownerId" TEXT NOT NULL, "definitionId" TEXT NOT NULL,
  "definitionVersionId" TEXT NOT NULL, "inputSnapshotId" TEXT NOT NULL, "pipelineId" TEXT,
  "requestedById" TEXT NOT NULL, "status" TEXT NOT NULL, "outputDocumentId" TEXT,
  "outputDocumentVersionId" TEXT, "startedAt" TIMESTAMPTZ(6), "completedAt" TIMESTAMPTZ(6),
  "failureCode" TEXT, "failureMessage" TEXT, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "report_run_events" (
  "id" TEXT PRIMARY KEY, "ownerId" TEXT NOT NULL, "runId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL, "eventType" TEXT NOT NULL, "payload" JSONB NOT NULL,
  "occurredAt" TIMESTAMPTZ(6) NOT NULL, "contentHash" TEXT NOT NULL, UNIQUE ("runId", "sequence")
);
CREATE TABLE IF NOT EXISTS "report_schedules" (
  "id" TEXT PRIMARY KEY, "ownerId" TEXT NOT NULL, "definitionId" TEXT NOT NULL,
  "status" TEXT NOT NULL, "timezone" TEXT NOT NULL, "recurrence" JSONB NOT NULL,
  "nextRunAt" TIMESTAMPTZ(6), "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "report_deliveries" (
  "id" TEXT PRIMARY KEY, "ownerId" TEXT NOT NULL, "scheduleId" TEXT NOT NULL,
  "integrationConnectorId" TEXT, "documentId" TEXT, "recipientRefs" JSONB NOT NULL,
  "deliveryStatus" TEXT NOT NULL, "deliveredAt" TIMESTAMPTZ(6), "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "report_export_jobs" (
  "id" TEXT PRIMARY KEY, "ownerId" TEXT NOT NULL, "requestedById" TEXT NOT NULL,
  "sourceModule" TEXT NOT NULL, "fieldKeys" JSONB NOT NULL, "filters" JSONB NOT NULL,
  "outputFormat" TEXT NOT NULL, "status" TEXT NOT NULL, "documentId" TEXT,
  "documentVersionId" TEXT, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(), "completedAt" TIMESTAMPTZ(6)
);
CREATE TABLE IF NOT EXISTS "report_export_templates" (
  "id" TEXT PRIMARY KEY, "ownerId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "sourceModule" TEXT NOT NULL, "fieldKeys" JSONB NOT NULL, "filters" JSONB NOT NULL,
  "outputFormat" TEXT NOT NULL, "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "report_templates" (
  "id" TEXT PRIMARY KEY, "ownerId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "category" TEXT NOT NULL, "description" TEXT, "status" TEXT NOT NULL,
  "createdById" TEXT NOT NULL, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "report_template_versions" (
  "id" TEXT PRIMARY KEY, "templateId" TEXT NOT NULL, "ownerId" TEXT NOT NULL,
  "version" INTEGER NOT NULL, "specification" JSONB NOT NULL, "contentHash" TEXT NOT NULL,
  "createdById" TEXT NOT NULL, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(), UNIQUE ("templateId", "version")
);
CREATE TABLE IF NOT EXISTS "report_configurations" (
  "id" TEXT PRIMARY KEY, "ownerId" TEXT NOT NULL, "settings" JSONB NOT NULL,
  "version" INTEGER NOT NULL, "updatedById" TEXT NOT NULL, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(), UNIQUE ("ownerId", "version")
);
CREATE TABLE IF NOT EXISTS "report_audit_events" (
  "id" TEXT PRIMARY KEY, "ownerId" TEXT NOT NULL, "actorId" TEXT NOT NULL,
  "aggregateType" TEXT NOT NULL, "aggregateId" TEXT NOT NULL, "action" TEXT NOT NULL,
  "payload" JSONB NOT NULL, "occurredAt" TIMESTAMPTZ(6) NOT NULL, "contentHash" TEXT NOT NULL
);

-- Required follow-up before any application: explicit FK/ownership review,
-- immutable trigger policy, Document Management and Integration Hub contracts,
-- field-catalog approval, and generated-client verification.
