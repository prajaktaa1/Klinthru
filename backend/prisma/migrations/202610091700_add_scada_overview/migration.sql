ALTER TABLE "Asset" ADD COLUMN "name" TEXT, ADD COLUMN "facilityType" TEXT, ADD COLUMN "equipmentType" TEXT;

CREATE TABLE "ScadaTag" (
 "id" TEXT PRIMARY KEY, "sourceTagName" TEXT NOT NULL, "displayName" TEXT NOT NULL,
 "description" TEXT, "measurementType" TEXT NOT NULL, "engineeringUnit" TEXT NOT NULL,
 "scanIntervalSeconds" INTEGER NOT NULL CHECK ("scanIntervalSeconds" > 0),
 "staleAfterSeconds" INTEGER NOT NULL CHECK ("staleAfterSeconds" >= "scanIntervalSeconds"),
 "pipelineId" TEXT NOT NULL REFERENCES "Pipeline"("id") ON DELETE RESTRICT,
 "assetId" TEXT NOT NULL REFERENCES "Asset"("id") ON DELETE RESTRICT,
 "connectorId" TEXT NOT NULL REFERENCES "IntegrationConnector"("id") ON DELETE RESTRICT,
 "sourceSystemId" TEXT NOT NULL, "sensorAssignmentId" TEXT REFERENCES "SensorAssignment"("id") ON DELETE RESTRICT,
 "documentIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
 "highHigh" DOUBLE PRECISION, "high" DOUBLE PRECISION, "low" DOUBLE PRECISION, "lowLow" DOUBLE PRECISION,
 "thresholdSource" TEXT, "active" BOOLEAN NOT NULL DEFAULT TRUE,
 "activeFrom" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
 UNIQUE ("connectorId", "sourceTagName")
);
CREATE INDEX "ScadaTag_pipelineId_active_idx" ON "ScadaTag"("pipelineId", "active");

CREATE TABLE "SharedTimeSeriesReading" (
 "id" TEXT PRIMARY KEY, "tagId" TEXT NOT NULL REFERENCES "ScadaTag"("id") ON DELETE RESTRICT,
 "sourceTimestamp" TIMESTAMP(3) NOT NULL, "sourceTimezone" TEXT NOT NULL,
 "normalizedUtcTimestamp" TIMESTAMP(3) NOT NULL, "receiveTimestamp" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
 "sequence" TEXT NOT NULL DEFAULT '', "value" DOUBLE PRECISION, "rawValue" JSONB, "state" TEXT,
 "engineeringUnit" TEXT NOT NULL, "quality" TEXT NOT NULL,
 UNIQUE ("tagId", "sourceTimestamp", "sequence")
);
CREATE INDEX "SharedTimeSeriesReading_tagId_sourceTimestamp_idx" ON "SharedTimeSeriesReading"("tagId", "sourceTimestamp");
CREATE INDEX "SharedTimeSeriesReading_receiveTimestamp_idx" ON "SharedTimeSeriesReading"("receiveTimestamp");

CREATE TABLE "ScadaAlarm" (
 "id" TEXT PRIMARY KEY, "tagId" TEXT NOT NULL REFERENCES "ScadaTag"("id") ON DELETE RESTRICT,
 "sourceAlarmId" TEXT NOT NULL, "description" TEXT NOT NULL, "sourcePriority" TEXT NOT NULL,
 "severity" TEXT NOT NULL, "measuredValue" DOUBLE PRECISION, "threshold" DOUBLE PRECISION,
 "comparator" TEXT, "raisedAt" TIMESTAMP(3) NOT NULL, "clearedAt" TIMESTAMP(3),
 "sourceStatus" TEXT NOT NULL, "klinthruStatus" TEXT NOT NULL DEFAULT 'New',
 "acknowledgedAt" TIMESTAMP(3), "acknowledgedBy" TEXT,
 UNIQUE ("tagId", "sourceAlarmId")
);
CREATE INDEX "ScadaAlarm_tagId_raisedAt_idx" ON "ScadaAlarm"("tagId", "raisedAt");
