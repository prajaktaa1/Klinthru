-- Add nullable inspection/report foundation fields without changing existing snapshots.
ALTER TABLE "Assessment" ADD COLUMN "inspectionDate" TIMESTAMP(3);
ALTER TABLE "Report" ADD COLUMN "inspectionId" TEXT;

-- Preserve existing records by treating creation time as the initial inspection date.
UPDATE "Assessment"
SET "inspectionDate" = "createdAt"
WHERE "inspectionDate" IS NULL;

-- Connect reports to matching assessment records when the legacy string ID is valid.
UPDATE "Report" AS r
SET "inspectionId" = r."assessmentId"
FROM "Assessment" AS a
WHERE r."inspectionId" IS NULL
  AND r."assessmentId" = a."id";

-- Leave unmatched reports with inspectionId = NULL and keep legacy assessmentId intact.
ALTER TABLE "Report"
ADD CONSTRAINT "Report_inspectionId_fkey"
FOREIGN KEY ("inspectionId") REFERENCES "Assessment"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Assessment_pipelineId_inspectionDate_idx" ON "Assessment"("pipelineId", "inspectionDate");
CREATE INDEX "Assessment_type_inspectionDate_idx" ON "Assessment"("type", "inspectionDate");
CREATE INDEX "Report_inspectionId_idx" ON "Report"("inspectionId");