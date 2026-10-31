-- Prepared only. This migration is intentionally not applied by this change set.

CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "User" ADD COLUMN "companyId" TEXT;

CREATE TABLE "SensorCalibrationRecord" (
    "id" TEXT NOT NULL,
    "calibrationId" TEXT NOT NULL,
    "sensorId" TEXT NOT NULL,
    "channelId" TEXT,
    "calibratedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "provider" TEXT,
    "result" TEXT,
    "certificateDocumentId" TEXT,
    "notes" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SensorCalibrationRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SensorMaintenanceTask" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "sensorId" TEXT,
    "maintenanceType" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "plannedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "workOrder" TEXT,
    "assignedTo" TEXT,
    "notes" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SensorMaintenanceTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SensorHardwareEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sensorId" TEXT,
    "gatewayId" TEXT,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "message" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SensorHardwareEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SensorConfigurationVersion" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "companyId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SensorConfigurationVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SensorAuditEvent" (
    "id" TEXT NOT NULL,
    "auditEventId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "companyId" TEXT,
    "module" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SensorAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Company_companyId_key" ON "Company"("companyId");
CREATE INDEX "Company_name_idx" ON "Company"("name");
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

ALTER TABLE "SensorCalibrationRecord" ADD CONSTRAINT "SensorCalibrationRecord_status_check" CHECK ("status" IN ('Valid', 'Due Soon', 'Due', 'Overdue', 'Failed'));
ALTER TABLE "SensorMaintenanceTask" ADD CONSTRAINT "SensorMaintenanceTask_status_check" CHECK ("status" IN ('Completed', 'In Progress', 'Pending', 'Cancelled'));
ALTER TABLE "SensorHardwareEvent" ADD CONSTRAINT "SensorHardwareEvent_type_check" CHECK ("eventType" IN ('Offline', 'Weak Signal', 'Low Battery', 'Calibration', 'Stale', 'Hardware Fault'));
ALTER TABLE "SensorHardwareEvent" ADD CONSTRAINT "SensorHardwareEvent_severity_check" CHECK ("severity" IN ('Critical', 'Warning', 'Info'));
ALTER TABLE "SensorHardwareEvent" ADD CONSTRAINT "SensorHardwareEvent_status_check" CHECK ("status" IN ('Open', 'Acknowledged', 'Resolved'));
ALTER TABLE "SensorConfigurationVersion" ADD CONSTRAINT "SensorConfigurationVersion_status_check" CHECK ("status" IN ('Draft', 'Published', 'Archived'));

CREATE UNIQUE INDEX "SensorCalibrationRecord_calibrationId_key" ON "SensorCalibrationRecord"("calibrationId");
CREATE INDEX "SensorCalibrationRecord_ownerId_status_idx" ON "SensorCalibrationRecord"("ownerId", "status");
CREATE INDEX "SensorCalibrationRecord_companyId_status_idx" ON "SensorCalibrationRecord"("companyId", "status");
CREATE INDEX "SensorCalibrationRecord_sensorId_dueAt_idx" ON "SensorCalibrationRecord"("sensorId", "dueAt");
CREATE UNIQUE INDEX "SensorMaintenanceTask_taskId_key" ON "SensorMaintenanceTask"("taskId");
CREATE INDEX "SensorMaintenanceTask_ownerId_status_idx" ON "SensorMaintenanceTask"("ownerId", "status");
CREATE INDEX "SensorMaintenanceTask_companyId_status_idx" ON "SensorMaintenanceTask"("companyId", "status");
CREATE INDEX "SensorMaintenanceTask_sensorId_dueAt_idx" ON "SensorMaintenanceTask"("sensorId", "dueAt");
CREATE UNIQUE INDEX "SensorHardwareEvent_eventId_key" ON "SensorHardwareEvent"("eventId");
CREATE INDEX "SensorHardwareEvent_ownerId_status_occurredAt_idx" ON "SensorHardwareEvent"("ownerId", "status", "occurredAt");
CREATE INDEX "SensorHardwareEvent_companyId_status_occurredAt_idx" ON "SensorHardwareEvent"("companyId", "status", "occurredAt");
CREATE INDEX "SensorHardwareEvent_sensorId_occurredAt_idx" ON "SensorHardwareEvent"("sensorId", "occurredAt");
CREATE UNIQUE INDEX "SensorConfigurationVersion_versionId_key" ON "SensorConfigurationVersion"("versionId");
CREATE UNIQUE INDEX "SensorConfigurationVersion_ownerId_version_key" ON "SensorConfigurationVersion"("ownerId", "version");
CREATE INDEX "SensorConfigurationVersion_ownerId_status_idx" ON "SensorConfigurationVersion"("ownerId", "status");
CREATE INDEX "SensorConfigurationVersion_companyId_status_idx" ON "SensorConfigurationVersion"("companyId", "status");
CREATE UNIQUE INDEX "SensorAuditEvent_auditEventId_key" ON "SensorAuditEvent"("auditEventId");
CREATE INDEX "SensorAuditEvent_ownerId_occurredAt_idx" ON "SensorAuditEvent"("ownerId", "occurredAt");
CREATE INDEX "SensorAuditEvent_companyId_occurredAt_idx" ON "SensorAuditEvent"("companyId", "occurredAt");
CREATE INDEX "SensorAuditEvent_entityType_entityId_idx" ON "SensorAuditEvent"("entityType", "entityId");

CREATE FUNCTION "prevent_sensor_audit_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Sensor audit events are immutable';
END;
$$;
CREATE TRIGGER "SensorAuditEvent_immutable" BEFORE UPDATE OR DELETE ON "SensorAuditEvent" FOR EACH ROW EXECUTE FUNCTION "prevent_sensor_audit_mutation"();

ALTER TABLE "SensorCalibrationRecord" ADD CONSTRAINT "SensorCalibrationRecord_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "Sensor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SensorCalibrationRecord" ADD CONSTRAINT "SensorCalibrationRecord_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SensorCalibrationRecord" ADD CONSTRAINT "SensorCalibrationRecord_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SensorCalibrationRecord" ADD CONSTRAINT "SensorCalibrationRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SensorCalibrationRecord" ADD CONSTRAINT "SensorCalibrationRecord_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SensorMaintenanceTask" ADD CONSTRAINT "SensorMaintenanceTask_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "Sensor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SensorMaintenanceTask" ADD CONSTRAINT "SensorMaintenanceTask_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SensorMaintenanceTask" ADD CONSTRAINT "SensorMaintenanceTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SensorMaintenanceTask" ADD CONSTRAINT "SensorMaintenanceTask_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SensorHardwareEvent" ADD CONSTRAINT "SensorHardwareEvent_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "Sensor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SensorHardwareEvent" ADD CONSTRAINT "SensorHardwareEvent_gatewayId_fkey" FOREIGN KEY ("gatewayId") REFERENCES "Gateway"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SensorHardwareEvent" ADD CONSTRAINT "SensorHardwareEvent_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SensorHardwareEvent" ADD CONSTRAINT "SensorHardwareEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SensorHardwareEvent" ADD CONSTRAINT "SensorHardwareEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SensorConfigurationVersion" ADD CONSTRAINT "SensorConfigurationVersion_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SensorConfigurationVersion" ADD CONSTRAINT "SensorConfigurationVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SensorConfigurationVersion" ADD CONSTRAINT "SensorConfigurationVersion_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SensorAuditEvent" ADD CONSTRAINT "SensorAuditEvent_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SensorAuditEvent" ADD CONSTRAINT "SensorAuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SensorAuditEvent" ADD CONSTRAINT "SensorAuditEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
