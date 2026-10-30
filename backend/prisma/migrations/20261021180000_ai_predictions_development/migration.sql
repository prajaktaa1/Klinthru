BEGIN;
-- CreateTable
CREATE TABLE "AiModel" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "useCase" TEXT NOT NULL,

    CONSTRAINT "AiModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiModelVersion" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "artifactDocumentVersionId" TEXT NOT NULL,
    "artifactHash" TEXT NOT NULL,
    "featureSchemaVersion" TEXT NOT NULL,
    "inputSchema" JSONB NOT NULL,
    "outputSchema" JSONB NOT NULL,
    "supportedHorizons" JSONB NOT NULL,
    "missingInputPolicy" JSONB NOT NULL,

    CONSTRAINT "AiModelVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiConfigurationRevision" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "modelVersionId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "settings" JSONB NOT NULL,
    "settingsSchemaVersion" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "supersedesId" TEXT,

    CONSTRAINT "AiConfigurationRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiInputSnapshot" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "cutoffAt" TIMESTAMPTZ(6) NOT NULL,
    "capturedAt" TIMESTAMPTZ(6) NOT NULL,
    "featureSetVersion" TEXT NOT NULL,
    "featureSchemaVersion" TEXT NOT NULL,
    "featureValues" JSONB NOT NULL,
    "modelVersionId" TEXT NOT NULL,
    "configurationRevisionId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "captureManifest" JSONB NOT NULL,

    CONSTRAINT "AiInputSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiSnapshotSource" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "sourceModule" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "sourceRevision" TEXT NOT NULL,
    "observedAt" TIMESTAMPTZ(6) NOT NULL,
    "availableAt" TIMESTAMPTZ(6) NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "unitMetadata" JSONB NOT NULL,
    "qualityMetadata" JSONB NOT NULL,

    CONSTRAINT "AiSnapshotSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRunRequest" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "leaseOwner" TEXT,
    "leaseUntil" TIMESTAMPTZ(6),
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "lastErrorCode" TEXT,

    CONSTRAINT "AiRunRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRunKey" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,

    CONSTRAINT "AiRunKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiModelRun" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "modelVersionId" TEXT NOT NULL,
    "configurationRevisionId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "predictionType" TEXT NOT NULL,
    "horizon" JSONB NOT NULL,
    "parameterManifest" JSONB NOT NULL,
    "executionManifest" JSONB NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,

    CONSTRAINT "AiModelRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiPrediction" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "outputKey" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "segmentId" TEXT,
    "assetId" TEXT,
    "locationScope" JSONB NOT NULL,
    "predictionType" TEXT NOT NULL,
    "predictedOutcome" TEXT NOT NULL,
    "predictionAt" TIMESTAMPTZ(6) NOT NULL,
    "horizon" JSONB NOT NULL,
    "value" DOUBLE PRECISION,
    "probability" DOUBLE PRECISION,
    "unit" TEXT,
    "confidence" DOUBLE PRECISION,
    "confidenceDefinitionVersion" TEXT,
    "explanation" JSONB NOT NULL,
    "contentHash" TEXT NOT NULL,

    CONSTRAINT "AiPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiForecast" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "predictionId" TEXT,
    "outputKey" TEXT NOT NULL,
    "sourceMetric" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "horizon" JSONB NOT NULL,
    "forecastStartAt" TIMESTAMPTZ(6) NOT NULL,
    "points" JSONB NOT NULL,
    "contentHash" TEXT NOT NULL,

    CONSTRAINT "AiForecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRecommendation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "outputKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "locationScope" JSONB NOT NULL,
    "concern" TEXT NOT NULL,
    "priorityValue" DOUBLE PRECISION,
    "priorityMethodVersion" TEXT,
    "inspectionWindow" JSONB,
    "inspectionMethod" TEXT,
    "lifeEstimate" DOUBLE PRECISION,
    "lifeUnit" TEXT,
    "confidence" DOUBLE PRECISION,
    "evidence" JSONB NOT NULL,
    "contentHash" TEXT NOT NULL,

    CONSTRAINT "AiRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRecommendationPrediction" (
    "recommendationId" TEXT NOT NULL,
    "predictionId" TEXT NOT NULL,

    CONSTRAINT "AiRecommendationPrediction_pkey" PRIMARY KEY ("recommendationId","predictionId")
);

-- CreateTable
CREATE TABLE "AiScenario" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "baseSnapshotId" TEXT NOT NULL,
    "hypotheticalSnapshotId" TEXT NOT NULL,
    "parameterSchemaVersion" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "baselineRunId" TEXT NOT NULL,
    "scenarioRunId" TEXT NOT NULL,
    "comparisonDefinitionVersion" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,

    CONSTRAINT "AiScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiModelValidation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "modelVersionId" TEXT NOT NULL,
    "evaluationRunId" TEXT NOT NULL,
    "datasetSnapshotId" TEXT NOT NULL,
    "datasetHash" TEXT NOT NULL,
    "cohortDefinitionVersion" TEXT NOT NULL,
    "metricDefinitionVersion" TEXT NOT NULL,
    "metrics" JSONB NOT NULL,
    "qualityResults" JSONB NOT NULL,
    "benchmarkVersion" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "artifactDocumentVersionId" TEXT NOT NULL,

    CONSTRAINT "AiModelValidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiPredictionOutcomeLink" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "predictionId" TEXT NOT NULL,
    "sourceModule" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "sourceRevision" TEXT NOT NULL,
    "observedAt" TIMESTAMPTZ(6) NOT NULL,
    "observationWindow" JSONB NOT NULL,
    "outcome" TEXT NOT NULL,
    "evaluationStatus" TEXT NOT NULL,
    "adjudicatedById" TEXT NOT NULL,
    "supersedesId" TEXT,

    CONSTRAINT "AiPredictionOutcomeLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiGovernanceEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "validationId" TEXT,
    "reason" TEXT NOT NULL,
    "evidenceDocumentVersionId" TEXT,
    "payload" JSONB NOT NULL,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL,
    "contentHash" TEXT NOT NULL,

    CONSTRAINT "AiGovernanceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiOutboxEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadSchemaVersion" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AiOutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiEventDelivery" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "consumer" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "deliveredAt" TIMESTAMPTZ(6),

    CONSTRAINT "AiEventDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiModel_ownerId_createdAt_id_idx" ON "AiModel"("ownerId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "AiModel_id_ownerId_key" ON "AiModel"("id", "ownerId");

-- CreateIndex
CREATE INDEX "AiModelVersion_ownerId_createdAt_id_idx" ON "AiModelVersion"("ownerId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "AiModelVersion_modelId_version_key" ON "AiModelVersion"("modelId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "AiModelVersion_id_ownerId_key" ON "AiModelVersion"("id", "ownerId");

-- CreateIndex
CREATE INDEX "AiConfigurationRevision_ownerId_createdAt_id_idx" ON "AiConfigurationRevision"("ownerId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "AiConfigurationRevision_modelVersionId_revision_key" ON "AiConfigurationRevision"("modelVersionId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "AiConfigurationRevision_id_modelVersionId_ownerId_key" ON "AiConfigurationRevision"("id", "modelVersionId", "ownerId");

-- CreateIndex
CREATE INDEX "AiInputSnapshot_ownerId_pipelineId_createdAt_id_idx" ON "AiInputSnapshot"("ownerId", "pipelineId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "AiInputSnapshot_id_pipelineId_ownerId_key" ON "AiInputSnapshot"("id", "pipelineId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "AiInputSnapshot_id_modelVersionId_configurationRevisionId_p_key" ON "AiInputSnapshot"("id", "modelVersionId", "configurationRevisionId", "pipelineId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "AiInputSnapshot_id_ownerId_key" ON "AiInputSnapshot"("id", "ownerId");

-- CreateIndex
CREATE INDEX "AiSnapshotSource_sourceModule_sourceType_sourceRecordId_sou_idx" ON "AiSnapshotSource"("sourceModule", "sourceType", "sourceRecordId", "sourceRevision");

-- CreateIndex
CREATE INDEX "AiSnapshotSource_ownerId_createdAt_id_idx" ON "AiSnapshotSource"("ownerId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "AiSnapshotSource_snapshotId_sourceModule_sourceType_sourceR_key" ON "AiSnapshotSource"("snapshotId", "sourceModule", "sourceType", "sourceRecordId", "sourceRevision");

-- CreateIndex
CREATE INDEX "AiRunRequest_ownerId_pipelineId_createdAt_id_idx" ON "AiRunRequest"("ownerId", "pipelineId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "AiRunRequest_ownerId_requestKey_key" ON "AiRunRequest"("ownerId", "requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "AiRunRequest_ownerId_fingerprint_key" ON "AiRunRequest"("ownerId", "fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "AiRunRequest_id_pipelineId_ownerId_key" ON "AiRunRequest"("id", "pipelineId", "ownerId");

-- CreateIndex
CREATE INDEX "AiRunKey_ownerId_pipelineId_createdAt_id_idx" ON "AiRunKey"("ownerId", "pipelineId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "AiRunKey_ownerId_requestKey_key" ON "AiRunKey"("ownerId", "requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "AiModelRun_requestId_key" ON "AiModelRun"("requestId");

-- CreateIndex
CREATE INDEX "AiModelRun_snapshotId_idx" ON "AiModelRun"("snapshotId");

-- CreateIndex
CREATE INDEX "AiModelRun_modelVersionId_idx" ON "AiModelRun"("modelVersionId");

-- CreateIndex
CREATE INDEX "AiModelRun_ownerId_pipelineId_createdAt_id_idx" ON "AiModelRun"("ownerId", "pipelineId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "AiModelRun_id_pipelineId_ownerId_key" ON "AiModelRun"("id", "pipelineId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "AiModelRun_id_modelVersionId_ownerId_key" ON "AiModelRun"("id", "modelVersionId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "AiModelRun_requestId_pipelineId_ownerId_key" ON "AiModelRun"("requestId", "pipelineId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "AiModelRun_id_snapshotId_pipelineId_ownerId_key" ON "AiModelRun"("id", "snapshotId", "pipelineId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "AiModelRun_id_modelVersionId_snapshotId_pipelineId_ownerId_key" ON "AiModelRun"("id", "modelVersionId", "snapshotId", "pipelineId", "ownerId");

-- CreateIndex
CREATE INDEX "AiPrediction_ownerId_pipelineId_createdAt_id_idx" ON "AiPrediction"("ownerId", "pipelineId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "AiPrediction_runId_outputKey_key" ON "AiPrediction"("runId", "outputKey");

-- CreateIndex
CREATE UNIQUE INDEX "AiPrediction_id_runId_pipelineId_ownerId_key" ON "AiPrediction"("id", "runId", "pipelineId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "AiPrediction_id_pipelineId_ownerId_key" ON "AiPrediction"("id", "pipelineId", "ownerId");

-- CreateIndex
CREATE INDEX "AiForecast_ownerId_pipelineId_createdAt_id_idx" ON "AiForecast"("ownerId", "pipelineId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "AiForecast_runId_outputKey_key" ON "AiForecast"("runId", "outputKey");

-- CreateIndex
CREATE INDEX "AiRecommendation_ownerId_pipelineId_createdAt_id_idx" ON "AiRecommendation"("ownerId", "pipelineId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "AiRecommendation_runId_outputKey_key" ON "AiRecommendation"("runId", "outputKey");

-- CreateIndex
CREATE UNIQUE INDEX "AiRecommendation_id_runId_pipelineId_ownerId_key" ON "AiRecommendation"("id", "runId", "pipelineId", "ownerId");

-- CreateIndex
CREATE INDEX "AiScenario_ownerId_pipelineId_createdAt_id_idx" ON "AiScenario"("ownerId", "pipelineId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "AiModelValidation_ownerId_pipelineId_createdAt_id_idx" ON "AiModelValidation"("ownerId", "pipelineId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "AiModelValidation_id_ownerId_key" ON "AiModelValidation"("id", "ownerId");

-- CreateIndex
CREATE INDEX "AiPredictionOutcomeLink_sourceModule_sourceType_sourceRecor_idx" ON "AiPredictionOutcomeLink"("sourceModule", "sourceType", "sourceRecordId", "sourceRevision");

-- CreateIndex
CREATE INDEX "AiPredictionOutcomeLink_ownerId_pipelineId_createdAt_id_idx" ON "AiPredictionOutcomeLink"("ownerId", "pipelineId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "AiPredictionOutcomeLink_id_predictionId_pipelineId_ownerId_key" ON "AiPredictionOutcomeLink"("id", "predictionId", "pipelineId", "ownerId");

-- CreateIndex
CREATE INDEX "AiGovernanceEvent_ownerId_createdAt_id_idx" ON "AiGovernanceEvent"("ownerId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "AiGovernanceEvent_aggregateType_aggregateId_sequence_key" ON "AiGovernanceEvent"("aggregateType", "aggregateId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "AiOutboxEvent_eventKey_key" ON "AiOutboxEvent"("eventKey");

-- CreateIndex
CREATE INDEX "AiOutboxEvent_ownerId_createdAt_id_idx" ON "AiOutboxEvent"("ownerId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "AiOutboxEvent_id_ownerId_key" ON "AiOutboxEvent"("id", "ownerId");

-- CreateIndex
CREATE INDEX "AiEventDelivery_ownerId_createdAt_id_idx" ON "AiEventDelivery"("ownerId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "AiEventDelivery_eventId_consumer_key" ON "AiEventDelivery"("eventId", "consumer");

-- AddForeignKey
ALTER TABLE "AiModel" ADD CONSTRAINT "AiModel_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiModel" ADD CONSTRAINT "AiModel_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiModelVersion" ADD CONSTRAINT "AiModelVersion_modelId_ownerId_fkey" FOREIGN KEY ("modelId", "ownerId") REFERENCES "AiModel"("id", "ownerId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiModelVersion" ADD CONSTRAINT "AiModelVersion_artifactDocumentVersionId_fkey" FOREIGN KEY ("artifactDocumentVersionId") REFERENCES "Document_Version"("Document_Version_ID") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiModelVersion" ADD CONSTRAINT "AiModelVersion_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiModelVersion" ADD CONSTRAINT "AiModelVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiConfigurationRevision" ADD CONSTRAINT "AiConfigurationRevision_modelVersionId_ownerId_fkey" FOREIGN KEY ("modelVersionId", "ownerId") REFERENCES "AiModelVersion"("id", "ownerId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiConfigurationRevision" ADD CONSTRAINT "AiConfigurationRevision_supersedesId_modelVersionId_ownerI_fkey" FOREIGN KEY ("supersedesId", "modelVersionId", "ownerId") REFERENCES "AiConfigurationRevision"("id", "modelVersionId", "ownerId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiConfigurationRevision" ADD CONSTRAINT "AiConfigurationRevision_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiConfigurationRevision" ADD CONSTRAINT "AiConfigurationRevision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiInputSnapshot" ADD CONSTRAINT "AiInputSnapshot_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiInputSnapshot" ADD CONSTRAINT "AiInputSnapshot_modelVersionId_ownerId_fkey" FOREIGN KEY ("modelVersionId", "ownerId") REFERENCES "AiModelVersion"("id", "ownerId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiInputSnapshot" ADD CONSTRAINT "AiInputSnapshot_configurationRevisionId_modelVersionId_own_fkey" FOREIGN KEY ("configurationRevisionId", "modelVersionId", "ownerId") REFERENCES "AiConfigurationRevision"("id", "modelVersionId", "ownerId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiInputSnapshot" ADD CONSTRAINT "AiInputSnapshot_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiInputSnapshot" ADD CONSTRAINT "AiInputSnapshot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiSnapshotSource" ADD CONSTRAINT "AiSnapshotSource_snapshotId_ownerId_fkey" FOREIGN KEY ("snapshotId", "ownerId") REFERENCES "AiInputSnapshot"("id", "ownerId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiSnapshotSource" ADD CONSTRAINT "AiSnapshotSource_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiSnapshotSource" ADD CONSTRAINT "AiSnapshotSource_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiRunRequest" ADD CONSTRAINT "AiRunRequest_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiRunRequest" ADD CONSTRAINT "AiRunRequest_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiRunRequest" ADD CONSTRAINT "AiRunRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiRunKey" ADD CONSTRAINT "AiRunKey_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiRunKey" ADD CONSTRAINT "AiRunKey_requestId_pipelineId_ownerId_fkey" FOREIGN KEY ("requestId", "pipelineId", "ownerId") REFERENCES "AiRunRequest"("id", "pipelineId", "ownerId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiRunKey" ADD CONSTRAINT "AiRunKey_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiRunKey" ADD CONSTRAINT "AiRunKey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiModelRun" ADD CONSTRAINT "AiModelRun_requestId_pipelineId_ownerId_fkey" FOREIGN KEY ("requestId", "pipelineId", "ownerId") REFERENCES "AiRunRequest"("id", "pipelineId", "ownerId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiModelRun" ADD CONSTRAINT "AiModelRun_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiModelRun" ADD CONSTRAINT "AiModelRun_modelVersionId_ownerId_fkey" FOREIGN KEY ("modelVersionId", "ownerId") REFERENCES "AiModelVersion"("id", "ownerId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiModelRun" ADD CONSTRAINT "AiModelRun_configurationRevisionId_modelVersionId_ownerId_fkey" FOREIGN KEY ("configurationRevisionId", "modelVersionId", "ownerId") REFERENCES "AiConfigurationRevision"("id", "modelVersionId", "ownerId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiModelRun" ADD CONSTRAINT "AiModelRun_snapshotId_modelVersionId_configurationRevision_fkey" FOREIGN KEY ("snapshotId", "modelVersionId", "configurationRevisionId", "pipelineId", "ownerId") REFERENCES "AiInputSnapshot"("id", "modelVersionId", "configurationRevisionId", "pipelineId", "ownerId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiModelRun" ADD CONSTRAINT "AiModelRun_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiModelRun" ADD CONSTRAINT "AiModelRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiPrediction" ADD CONSTRAINT "AiPrediction_runId_pipelineId_ownerId_fkey" FOREIGN KEY ("runId", "pipelineId", "ownerId") REFERENCES "AiModelRun"("id", "pipelineId", "ownerId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiPrediction" ADD CONSTRAINT "AiPrediction_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiPrediction" ADD CONSTRAINT "AiPrediction_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "Segment"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiPrediction" ADD CONSTRAINT "AiPrediction_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiPrediction" ADD CONSTRAINT "AiPrediction_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiPrediction" ADD CONSTRAINT "AiPrediction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiForecast" ADD CONSTRAINT "AiForecast_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiForecast" ADD CONSTRAINT "AiForecast_runId_pipelineId_ownerId_fkey" FOREIGN KEY ("runId", "pipelineId", "ownerId") REFERENCES "AiModelRun"("id", "pipelineId", "ownerId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiForecast" ADD CONSTRAINT "AiForecast_predictionId_runId_pipelineId_ownerId_fkey" FOREIGN KEY ("predictionId", "runId", "pipelineId", "ownerId") REFERENCES "AiPrediction"("id", "runId", "pipelineId", "ownerId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiForecast" ADD CONSTRAINT "AiForecast_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiForecast" ADD CONSTRAINT "AiForecast_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiRecommendation" ADD CONSTRAINT "AiRecommendation_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiRecommendation" ADD CONSTRAINT "AiRecommendation_runId_pipelineId_ownerId_fkey" FOREIGN KEY ("runId", "pipelineId", "ownerId") REFERENCES "AiModelRun"("id", "pipelineId", "ownerId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiRecommendation" ADD CONSTRAINT "AiRecommendation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiRecommendation" ADD CONSTRAINT "AiRecommendation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiRecommendationPrediction" ADD CONSTRAINT "AiRecommendationPrediction_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "AiRecommendation"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiRecommendationPrediction" ADD CONSTRAINT "AiRecommendationPrediction_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "AiPrediction"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiScenario" ADD CONSTRAINT "AiScenario_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiScenario" ADD CONSTRAINT "AiScenario_baseSnapshotId_pipelineId_ownerId_fkey" FOREIGN KEY ("baseSnapshotId", "pipelineId", "ownerId") REFERENCES "AiInputSnapshot"("id", "pipelineId", "ownerId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiScenario" ADD CONSTRAINT "AiScenario_hypotheticalSnapshotId_pipelineId_ownerId_fkey" FOREIGN KEY ("hypotheticalSnapshotId", "pipelineId", "ownerId") REFERENCES "AiInputSnapshot"("id", "pipelineId", "ownerId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiScenario" ADD CONSTRAINT "AiScenario_baselineRunId_baseSnapshotId_pipelineId_ownerId_fkey" FOREIGN KEY ("baselineRunId", "baseSnapshotId", "pipelineId", "ownerId") REFERENCES "AiModelRun"("id", "snapshotId", "pipelineId", "ownerId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiScenario" ADD CONSTRAINT "AiScenario_scenarioRunId_hypotheticalSnapshotId_pipelineId_fkey" FOREIGN KEY ("scenarioRunId", "hypotheticalSnapshotId", "pipelineId", "ownerId") REFERENCES "AiModelRun"("id", "snapshotId", "pipelineId", "ownerId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiScenario" ADD CONSTRAINT "AiScenario_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiScenario" ADD CONSTRAINT "AiScenario_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiModelValidation" ADD CONSTRAINT "AiModelValidation_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiModelValidation" ADD CONSTRAINT "AiModelValidation_modelVersionId_ownerId_fkey" FOREIGN KEY ("modelVersionId", "ownerId") REFERENCES "AiModelVersion"("id", "ownerId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiModelValidation" ADD CONSTRAINT "AiModelValidation_evaluationRunId_modelVersionId_datasetSn_fkey" FOREIGN KEY ("evaluationRunId", "modelVersionId", "datasetSnapshotId", "pipelineId", "ownerId") REFERENCES "AiModelRun"("id", "modelVersionId", "snapshotId", "pipelineId", "ownerId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiModelValidation" ADD CONSTRAINT "AiModelValidation_datasetSnapshotId_pipelineId_ownerId_fkey" FOREIGN KEY ("datasetSnapshotId", "pipelineId", "ownerId") REFERENCES "AiInputSnapshot"("id", "pipelineId", "ownerId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiModelValidation" ADD CONSTRAINT "AiModelValidation_artifactDocumentVersionId_fkey" FOREIGN KEY ("artifactDocumentVersionId") REFERENCES "Document_Version"("Document_Version_ID") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiModelValidation" ADD CONSTRAINT "AiModelValidation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiModelValidation" ADD CONSTRAINT "AiModelValidation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiPredictionOutcomeLink" ADD CONSTRAINT "AiPredictionOutcomeLink_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiPredictionOutcomeLink" ADD CONSTRAINT "AiPredictionOutcomeLink_predictionId_pipelineId_ownerId_fkey" FOREIGN KEY ("predictionId", "pipelineId", "ownerId") REFERENCES "AiPrediction"("id", "pipelineId", "ownerId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiPredictionOutcomeLink" ADD CONSTRAINT "AiPredictionOutcomeLink_adjudicatedById_fkey" FOREIGN KEY ("adjudicatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiPredictionOutcomeLink" ADD CONSTRAINT "AiPredictionOutcomeLink_supersedesId_predictionId_pipeline_fkey" FOREIGN KEY ("supersedesId", "predictionId", "pipelineId", "ownerId") REFERENCES "AiPredictionOutcomeLink"("id", "predictionId", "pipelineId", "ownerId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiPredictionOutcomeLink" ADD CONSTRAINT "AiPredictionOutcomeLink_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiPredictionOutcomeLink" ADD CONSTRAINT "AiPredictionOutcomeLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiGovernanceEvent" ADD CONSTRAINT "AiGovernanceEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiGovernanceEvent" ADD CONSTRAINT "AiGovernanceEvent_validationId_ownerId_fkey" FOREIGN KEY ("validationId", "ownerId") REFERENCES "AiModelValidation"("id", "ownerId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiGovernanceEvent" ADD CONSTRAINT "AiGovernanceEvent_evidenceDocumentVersionId_fkey" FOREIGN KEY ("evidenceDocumentVersionId") REFERENCES "Document_Version"("Document_Version_ID") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiGovernanceEvent" ADD CONSTRAINT "AiGovernanceEvent_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiGovernanceEvent" ADD CONSTRAINT "AiGovernanceEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiOutboxEvent" ADD CONSTRAINT "AiOutboxEvent_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiOutboxEvent" ADD CONSTRAINT "AiOutboxEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiEventDelivery" ADD CONSTRAINT "AiEventDelivery_eventId_ownerId_fkey" FOREIGN KEY ("eventId", "ownerId") REFERENCES "AiOutboxEvent"("id", "ownerId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiEventDelivery" ADD CONSTRAINT "AiEventDelivery_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AiEventDelivery" ADD CONSTRAINT "AiEventDelivery_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Development-only protections. PREPARED, NOT APPLIED. No source-module table is altered.
-- No runtime role/policy is invented: forced RLS remains default-deny until separately reviewed grants/policies.
CREATE FUNCTION "AiRejectMutation"() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN RAISE EXCEPTION 'AI history is append-only; create a new revision/event' USING ERRCODE = '55000'; END; $$;
CREATE FUNCTION "AiProtectQueueIdentity"() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF (to_jsonb(NEW) - ARRAY['leaseOwner','leaseUntil','attempt','lastErrorCode','deliveredAt'])
     IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['leaseOwner','leaseUntil','attempt','lastErrorCode','deliveredAt']) THEN
    RAISE EXCEPTION 'AI queue identity/manifest cannot change' USING ERRCODE = '55000';
  END IF;
  IF NEW."attempt" < OLD."attempt" THEN RAISE EXCEPTION 'AI attempt count cannot decrease'; END IF;
  RETURN NEW;
END; $$;

ALTER TABLE "AiModel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiModel" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AiModel" FROM PUBLIC;
CREATE TRIGGER "AiModel_no_truncate" BEFORE TRUNCATE ON "AiModel" FOR EACH STATEMENT EXECUTE FUNCTION "AiRejectMutation"();
CREATE TRIGGER "AiModel_append_only" BEFORE UPDATE OR DELETE ON "AiModel" FOR EACH ROW EXECUTE FUNCTION "AiRejectMutation"();

ALTER TABLE "AiModelVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiModelVersion" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AiModelVersion" FROM PUBLIC;
CREATE TRIGGER "AiModelVersion_no_truncate" BEFORE TRUNCATE ON "AiModelVersion" FOR EACH STATEMENT EXECUTE FUNCTION "AiRejectMutation"();
CREATE TRIGGER "AiModelVersion_append_only" BEFORE UPDATE OR DELETE ON "AiModelVersion" FOR EACH ROW EXECUTE FUNCTION "AiRejectMutation"();

ALTER TABLE "AiConfigurationRevision" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiConfigurationRevision" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AiConfigurationRevision" FROM PUBLIC;
CREATE TRIGGER "AiConfigurationRevision_no_truncate" BEFORE TRUNCATE ON "AiConfigurationRevision" FOR EACH STATEMENT EXECUTE FUNCTION "AiRejectMutation"();
CREATE TRIGGER "AiConfigurationRevision_append_only" BEFORE UPDATE OR DELETE ON "AiConfigurationRevision" FOR EACH ROW EXECUTE FUNCTION "AiRejectMutation"();

ALTER TABLE "AiInputSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiInputSnapshot" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AiInputSnapshot" FROM PUBLIC;
CREATE TRIGGER "AiInputSnapshot_no_truncate" BEFORE TRUNCATE ON "AiInputSnapshot" FOR EACH STATEMENT EXECUTE FUNCTION "AiRejectMutation"();
CREATE TRIGGER "AiInputSnapshot_append_only" BEFORE UPDATE OR DELETE ON "AiInputSnapshot" FOR EACH ROW EXECUTE FUNCTION "AiRejectMutation"();

ALTER TABLE "AiSnapshotSource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiSnapshotSource" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AiSnapshotSource" FROM PUBLIC;
CREATE TRIGGER "AiSnapshotSource_no_truncate" BEFORE TRUNCATE ON "AiSnapshotSource" FOR EACH STATEMENT EXECUTE FUNCTION "AiRejectMutation"();
CREATE TRIGGER "AiSnapshotSource_append_only" BEFORE UPDATE OR DELETE ON "AiSnapshotSource" FOR EACH ROW EXECUTE FUNCTION "AiRejectMutation"();

ALTER TABLE "AiRunRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiRunRequest" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AiRunRequest" FROM PUBLIC;
CREATE TRIGGER "AiRunRequest_no_truncate" BEFORE TRUNCATE ON "AiRunRequest" FOR EACH STATEMENT EXECUTE FUNCTION "AiRejectMutation"();
CREATE TRIGGER "AiRunRequest_identity" BEFORE UPDATE ON "AiRunRequest" FOR EACH ROW EXECUTE FUNCTION "AiProtectQueueIdentity"();
CREATE TRIGGER "AiRunRequest_no_delete" BEFORE DELETE ON "AiRunRequest" FOR EACH ROW EXECUTE FUNCTION "AiRejectMutation"();
ALTER TABLE "AiRunRequest" ADD CONSTRAINT "AiRunRequest_attempt_valid" CHECK ("attempt" >= 0);

ALTER TABLE "AiRunKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiRunKey" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AiRunKey" FROM PUBLIC;
CREATE TRIGGER "AiRunKey_no_truncate" BEFORE TRUNCATE ON "AiRunKey" FOR EACH STATEMENT EXECUTE FUNCTION "AiRejectMutation"();
CREATE TRIGGER "AiRunKey_append_only" BEFORE UPDATE OR DELETE ON "AiRunKey" FOR EACH ROW EXECUTE FUNCTION "AiRejectMutation"();

ALTER TABLE "AiModelRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiModelRun" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AiModelRun" FROM PUBLIC;
CREATE TRIGGER "AiModelRun_no_truncate" BEFORE TRUNCATE ON "AiModelRun" FOR EACH STATEMENT EXECUTE FUNCTION "AiRejectMutation"();
CREATE TRIGGER "AiModelRun_append_only" BEFORE UPDATE OR DELETE ON "AiModelRun" FOR EACH ROW EXECUTE FUNCTION "AiRejectMutation"();

ALTER TABLE "AiPrediction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiPrediction" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AiPrediction" FROM PUBLIC;
CREATE TRIGGER "AiPrediction_no_truncate" BEFORE TRUNCATE ON "AiPrediction" FOR EACH STATEMENT EXECUTE FUNCTION "AiRejectMutation"();
CREATE TRIGGER "AiPrediction_append_only" BEFORE UPDATE OR DELETE ON "AiPrediction" FOR EACH ROW EXECUTE FUNCTION "AiRejectMutation"();

ALTER TABLE "AiForecast" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiForecast" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AiForecast" FROM PUBLIC;
CREATE TRIGGER "AiForecast_no_truncate" BEFORE TRUNCATE ON "AiForecast" FOR EACH STATEMENT EXECUTE FUNCTION "AiRejectMutation"();
CREATE TRIGGER "AiForecast_append_only" BEFORE UPDATE OR DELETE ON "AiForecast" FOR EACH ROW EXECUTE FUNCTION "AiRejectMutation"();

ALTER TABLE "AiRecommendation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiRecommendation" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AiRecommendation" FROM PUBLIC;
CREATE TRIGGER "AiRecommendation_no_truncate" BEFORE TRUNCATE ON "AiRecommendation" FOR EACH STATEMENT EXECUTE FUNCTION "AiRejectMutation"();
CREATE TRIGGER "AiRecommendation_append_only" BEFORE UPDATE OR DELETE ON "AiRecommendation" FOR EACH ROW EXECUTE FUNCTION "AiRejectMutation"();

ALTER TABLE "AiRecommendationPrediction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiRecommendationPrediction" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AiRecommendationPrediction" FROM PUBLIC;
CREATE TRIGGER "AiRecommendationPrediction_no_truncate" BEFORE TRUNCATE ON "AiRecommendationPrediction" FOR EACH STATEMENT EXECUTE FUNCTION "AiRejectMutation"();
CREATE TRIGGER "AiRecommendationPrediction_append_only" BEFORE UPDATE OR DELETE ON "AiRecommendationPrediction" FOR EACH ROW EXECUTE FUNCTION "AiRejectMutation"();

ALTER TABLE "AiScenario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiScenario" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AiScenario" FROM PUBLIC;
CREATE TRIGGER "AiScenario_no_truncate" BEFORE TRUNCATE ON "AiScenario" FOR EACH STATEMENT EXECUTE FUNCTION "AiRejectMutation"();
CREATE TRIGGER "AiScenario_append_only" BEFORE UPDATE OR DELETE ON "AiScenario" FOR EACH ROW EXECUTE FUNCTION "AiRejectMutation"();

ALTER TABLE "AiModelValidation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiModelValidation" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AiModelValidation" FROM PUBLIC;
CREATE TRIGGER "AiModelValidation_no_truncate" BEFORE TRUNCATE ON "AiModelValidation" FOR EACH STATEMENT EXECUTE FUNCTION "AiRejectMutation"();
CREATE TRIGGER "AiModelValidation_append_only" BEFORE UPDATE OR DELETE ON "AiModelValidation" FOR EACH ROW EXECUTE FUNCTION "AiRejectMutation"();

ALTER TABLE "AiPredictionOutcomeLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiPredictionOutcomeLink" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AiPredictionOutcomeLink" FROM PUBLIC;
CREATE TRIGGER "AiPredictionOutcomeLink_no_truncate" BEFORE TRUNCATE ON "AiPredictionOutcomeLink" FOR EACH STATEMENT EXECUTE FUNCTION "AiRejectMutation"();
CREATE TRIGGER "AiPredictionOutcomeLink_append_only" BEFORE UPDATE OR DELETE ON "AiPredictionOutcomeLink" FOR EACH ROW EXECUTE FUNCTION "AiRejectMutation"();

ALTER TABLE "AiGovernanceEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiGovernanceEvent" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AiGovernanceEvent" FROM PUBLIC;
CREATE TRIGGER "AiGovernanceEvent_no_truncate" BEFORE TRUNCATE ON "AiGovernanceEvent" FOR EACH STATEMENT EXECUTE FUNCTION "AiRejectMutation"();
CREATE TRIGGER "AiGovernanceEvent_append_only" BEFORE UPDATE OR DELETE ON "AiGovernanceEvent" FOR EACH ROW EXECUTE FUNCTION "AiRejectMutation"();

ALTER TABLE "AiOutboxEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiOutboxEvent" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AiOutboxEvent" FROM PUBLIC;
CREATE TRIGGER "AiOutboxEvent_no_truncate" BEFORE TRUNCATE ON "AiOutboxEvent" FOR EACH STATEMENT EXECUTE FUNCTION "AiRejectMutation"();
CREATE TRIGGER "AiOutboxEvent_append_only" BEFORE UPDATE OR DELETE ON "AiOutboxEvent" FOR EACH ROW EXECUTE FUNCTION "AiRejectMutation"();

ALTER TABLE "AiEventDelivery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiEventDelivery" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AiEventDelivery" FROM PUBLIC;
CREATE TRIGGER "AiEventDelivery_no_truncate" BEFORE TRUNCATE ON "AiEventDelivery" FOR EACH STATEMENT EXECUTE FUNCTION "AiRejectMutation"();
CREATE TRIGGER "AiEventDelivery_identity" BEFORE UPDATE ON "AiEventDelivery" FOR EACH ROW EXECUTE FUNCTION "AiProtectQueueIdentity"();
CREATE TRIGGER "AiEventDelivery_no_delete" BEFORE DELETE ON "AiEventDelivery" FOR EACH ROW EXECUTE FUNCTION "AiRejectMutation"();
ALTER TABLE "AiEventDelivery" ADD CONSTRAINT "AiEventDelivery_attempt_valid" CHECK ("attempt" >= 0);
ALTER TABLE "AiScenario" ADD CONSTRAINT "AiScenario_distinct_clone" CHECK ("baseSnapshotId" <> "hypotheticalSnapshotId");

CREATE FUNCTION "AiCheckSourceCutoff"() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE parent_record "AiInputSnapshot"%ROWTYPE;
BEGIN
  SELECT * INTO parent_record FROM "AiInputSnapshot" WHERE id = NEW."snapshotId";
  IF NOT FOUND OR parent_record."ownerId" <> NEW."ownerId" OR EXISTS (SELECT 1 FROM "AiModelRun" WHERE "snapshotId" = NEW."snapshotId") OR NEW."observedAt" > parent_record."cutoffAt" OR NEW."availableAt" > parent_record."cutoffAt" OR length(trim(NEW."sourceRevision")) = 0 THEN
    RAISE EXCEPTION 'Exact authorized revision known at snapshot cutoff is required';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER "AiSnapshotSource_cutoff" BEFORE INSERT ON "AiSnapshotSource" FOR EACH ROW EXECUTE FUNCTION "AiCheckSourceCutoff"();
ALTER TABLE "AiInputSnapshot" ADD CONSTRAINT "AiInputSnapshot_cutoff_valid" CHECK ("cutoffAt" <= "capturedAt");
CREATE FUNCTION "AiCheckRecommendationLink"() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "AiRecommendation" r JOIN "AiPrediction" p ON p.id = NEW."predictionId" WHERE r.id = NEW."recommendationId" AND r."ownerId" = p."ownerId" AND r."pipelineId" = p."pipelineId" AND r."runId" = p."runId") THEN
    RAISE EXCEPTION 'Recommendation/prediction must share exact authorized run and scope';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER "AiRecommendationPrediction_scope" BEFORE INSERT ON "AiRecommendationPrediction" FOR EACH ROW EXECUTE FUNCTION "AiCheckRecommendationLink"();
CREATE FUNCTION "AiCheckScenarioBaseline"() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE baseline "AiModelRun"%ROWTYPE; hypothetical "AiModelRun"%ROWTYPE;
BEGIN
  SELECT * INTO baseline FROM "AiModelRun" WHERE id = NEW."baselineRunId";
  IF NOT FOUND THEN RAISE EXCEPTION 'Baseline run unavailable'; END IF;
  SELECT * INTO hypothetical FROM "AiModelRun" WHERE id = NEW."scenarioRunId";
  IF NOT FOUND OR baseline."modelVersionId" <> hypothetical."modelVersionId" OR baseline."configurationRevisionId" <> hypothetical."configurationRevisionId" OR baseline.horizon <> hypothetical.horizon OR hypothetical.purpose <> 'scenario' THEN
    RAISE EXCEPTION 'Scenario comparison requires common approved model/config/horizon and isolated scenario execution';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER "AiScenario_comparison" BEFORE INSERT ON "AiScenario" FOR EACH ROW EXECUTE FUNCTION "AiCheckScenarioBaseline"();
-- No RLS policies, operator grants, model artifacts, criteria, defaults, seeds or engineering records are inserted.

COMMIT;
