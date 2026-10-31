-- Manual rollback companion for the prepared migration.
-- Do not execute against development or production. Review and run only on the
-- same disposable database after confirming the migration is the latest change.

DROP TABLE IF EXISTS "SensorAuditEvent";
DROP TABLE IF EXISTS "SensorConfigurationVersion";
DROP TABLE IF EXISTS "SensorHardwareEvent";
DROP TABLE IF EXISTS "SensorMaintenanceTask";
DROP TABLE IF EXISTS "SensorCalibrationRecord";
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_companyId_fkey";
ALTER TABLE "User" DROP COLUMN IF EXISTS "companyId";
DROP TABLE IF EXISTS "Company";
DROP TRIGGER IF EXISTS "SensorAuditEvent_immutable" ON "SensorAuditEvent";
DROP FUNCTION IF EXISTS "prevent_sensor_audit_mutation"();
