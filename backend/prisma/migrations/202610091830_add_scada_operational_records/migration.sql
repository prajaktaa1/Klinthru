CREATE TABLE "ScadaEvent" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "pipelineId" TEXT NOT NULL,
  "tagId" TEXT,
  "eventType" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "value" DOUBLE PRECISION,
  "engineeringUnit" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Open',
  "sourceSystemId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScadaEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ScadaEvent_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ScadaEvent_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "ScadaTag"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ScadaEvent_eventId_key" ON "ScadaEvent"("eventId");
CREATE INDEX "ScadaEvent_pipelineId_occurredAt_idx" ON "ScadaEvent"("pipelineId", "occurredAt");
CREATE INDEX "ScadaEvent_tagId_occurredAt_idx" ON "ScadaEvent"("tagId", "occurredAt");

CREATE TABLE "ScadaAnomaly" (
  "id" TEXT NOT NULL,
  "anomalyId" TEXT NOT NULL,
  "pipelineId" TEXT NOT NULL,
  "tagId" TEXT,
  "anomalyType" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "detectedAt" TIMESTAMP(3) NOT NULL,
  "sourceReadingId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScadaAnomaly_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ScadaAnomaly_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ScadaAnomaly_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "ScadaTag"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ScadaAnomaly_anomalyId_key" ON "ScadaAnomaly"("anomalyId");
CREATE INDEX "ScadaAnomaly_pipelineId_detectedAt_idx" ON "ScadaAnomaly"("pipelineId", "detectedAt");
CREATE INDEX "ScadaAnomaly_tagId_detectedAt_idx" ON "ScadaAnomaly"("tagId", "detectedAt");

CREATE TABLE "ScadaIndicator" (
  "id" TEXT NOT NULL,
  "indicatorId" TEXT NOT NULL,
  "pipelineId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "value" DOUBLE PRECISION,
  "engineeringUnit" TEXT,
  "measuredAt" TIMESTAMP(3) NOT NULL,
  "sourceSystemId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScadaIndicator_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ScadaIndicator_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ScadaIndicator_indicatorId_key" ON "ScadaIndicator"("indicatorId");
CREATE INDEX "ScadaIndicator_pipelineId_measuredAt_idx" ON "ScadaIndicator"("pipelineId", "measuredAt");

CREATE TABLE "DataQualityRecord" (
  "id" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  "pipelineId" TEXT NOT NULL,
  "tagId" TEXT,
  "readingId" TEXT,
  "quality" TEXT NOT NULL,
  "reason" TEXT,
  "recordedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DataQualityRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DataQualityRecord_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DataQualityRecord_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "ScadaTag"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DataQualityRecord_recordId_key" ON "DataQualityRecord"("recordId");
CREATE INDEX "DataQualityRecord_pipelineId_recordedAt_idx" ON "DataQualityRecord"("pipelineId", "recordedAt");
CREATE INDEX "DataQualityRecord_tagId_recordedAt_idx" ON "DataQualityRecord"("tagId", "recordedAt");

CREATE TABLE "ScadaPollingConfig" (
  "id" TEXT NOT NULL,
  "pipelineId" TEXT NOT NULL,
  "globalScanSeconds" INTEGER,
  "slowScanMinutes" INTEGER,
  "connectionTimeoutSec" INTEGER,
  "retryAttempts" INTEGER,
  "failedScanBackoffMin" INTEGER,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScadaPollingConfig_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ScadaPollingConfig_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ScadaPollingConfig_pipelineId_key" ON "ScadaPollingConfig"("pipelineId");

CREATE TABLE "ScadaRoutingConfig" (
  "id" TEXT NOT NULL,
  "pipelineId" TEXT NOT NULL,
  "realtimeToPlatform" BOOLEAN NOT NULL DEFAULT true,
  "storeInHistorian" BOOLEAN NOT NULL DEFAULT true,
  "enableQualityChecks" BOOLEAN NOT NULL DEFAULT true,
  "forwardToAnalytics" BOOLEAN NOT NULL DEFAULT false,
  "publishExternalSystems" BOOLEAN NOT NULL DEFAULT false,
  "managedBy" TEXT NOT NULL DEFAULT 'Integration Hub',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScadaRoutingConfig_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ScadaRoutingConfig_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ScadaRoutingConfig_pipelineId_key" ON "ScadaRoutingConfig"("pipelineId");

CREATE TABLE "ScadaUnitMapping" (
  "id" TEXT NOT NULL,
  "pipelineId" TEXT NOT NULL,
  "sourceUnit" TEXT NOT NULL,
  "platformUnit" TEXT NOT NULL,
  "conversion" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScadaUnitMapping_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ScadaUnitMapping_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ScadaUnitMapping_pipelineId_sourceUnit_platformUnit_key" ON "ScadaUnitMapping"("pipelineId", "sourceUnit", "platformUnit");

CREATE TABLE "ScadaConfigChange" (
  "id" TEXT NOT NULL,
  "pipelineId" TEXT NOT NULL,
  "actorId" TEXT,
  "changeType" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "impact" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Applied',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScadaConfigChange_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ScadaConfigChange_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ScadaConfigChange_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "ScadaConfigChange_pipelineId_createdAt_idx" ON "ScadaConfigChange"("pipelineId", "createdAt");

CREATE TABLE "ScadaAlarmNote" (
  "id" TEXT NOT NULL,
  "alarmId" TEXT NOT NULL,
  "authorId" TEXT,
  "note" TEXT NOT NULL,
  "followUp" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScadaAlarmNote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ScadaAlarmNote_alarmId_fkey" FOREIGN KEY ("alarmId") REFERENCES "ScadaAlarm"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ScadaAlarmNote_alarmId_createdAt_idx" ON "ScadaAlarmNote"("alarmId", "createdAt");
