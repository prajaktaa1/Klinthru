CREATE TABLE "SensorAssignment" (
  "id" TEXT NOT NULL,
  "sensorId" TEXT NOT NULL,
  "sensorName" TEXT NOT NULL,
  "sensorCategory" TEXT NOT NULL,
  "sensorDeviceType" TEXT NOT NULL,
  "pipelineOrAsset" TEXT NOT NULL,
  "installationLocation" TEXT NOT NULL,
  "installationType" TEXT NOT NULL,
  "valuesMeasured" TEXT NOT NULL,
  "measurementUnit" TEXT NOT NULL,
  "installationDate" TIMESTAMP(3) NOT NULL,
  "dataSource" TEXT NOT NULL,
  "assignmentStatus" TEXT NOT NULL,
  "notes" TEXT,
  "activeFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activeTo" TIMESTAMP(3),
  "previousAssignmentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "authorId" TEXT,

  CONSTRAINT "SensorAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SensorAssignment_sensorId_idx" ON "SensorAssignment"("sensorId");
CREATE INDEX "SensorAssignment_sensorCategory_idx" ON "SensorAssignment"("sensorCategory");
CREATE INDEX "SensorAssignment_sensorDeviceType_idx" ON "SensorAssignment"("sensorDeviceType");
CREATE INDEX "SensorAssignment_pipelineOrAsset_idx" ON "SensorAssignment"("pipelineOrAsset");
CREATE INDEX "SensorAssignment_installationLocation_idx" ON "SensorAssignment"("installationLocation");
CREATE INDEX "SensorAssignment_assignmentStatus_idx" ON "SensorAssignment"("assignmentStatus");
CREATE INDEX "SensorAssignment_createdAt_idx" ON "SensorAssignment"("createdAt");

CREATE UNIQUE INDEX "SensorAssignment_one_active_per_sensor"
ON "SensorAssignment"("sensorId")
WHERE "activeTo" IS NULL AND "assignmentStatus" = 'Active';

ALTER TABLE "SensorAssignment"
ADD CONSTRAINT "SensorAssignment_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
