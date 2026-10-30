ALTER TABLE "Report"
ADD COLUMN IF NOT EXISTS "reportSubmissionKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Report_reportSubmissionKey_key" ON "Report"("reportSubmissionKey");
CREATE INDEX IF NOT EXISTS "Assessment_authorId_idx" ON "Assessment"("authorId");
CREATE INDEX IF NOT EXISTS "Assessment_createdAt_idx" ON "Assessment"("createdAt");
CREATE INDEX IF NOT EXISTS "Report_authorId_idx" ON "Report"("authorId");
CREATE INDEX IF NOT EXISTS "Report_assessmentId_idx" ON "Report"("assessmentId");
CREATE INDEX IF NOT EXISTS "Report_createdAt_idx" ON "Report"("createdAt");
CREATE INDEX IF NOT EXISTS "ExternalPipeData_authorId_idx" ON "ExternalPipeData"("authorId");
CREATE INDEX IF NOT EXISTS "DeviceRecord_authorId_idx" ON "DeviceRecord"("authorId");
CREATE INDEX IF NOT EXISTS "SensorAssignment_authorId_idx" ON "SensorAssignment"("authorId");
