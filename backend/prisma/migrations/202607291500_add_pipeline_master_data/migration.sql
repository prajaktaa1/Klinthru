-- Create Pipeline Master Data and CP calculation history without changing legacy snapshots.
CREATE TABLE "Pipeline" (
    "id" TEXT NOT NULL,
    "pipelineCode" TEXT NOT NULL,
    "normalizedPipelineCode" TEXT NOT NULL,
    "pipelineName" TEXT NOT NULL,
    "location" TEXT,
    "serviceOrProduct" TEXT,
    "pipeMaterial" TEXT,
    "pipeMaterialOther" TEXT,
    "pipeGrade" TEXT,
    "pipeGradeOther" TEXT,
    "pipeInsideDiameter" DOUBLE PRECISION,
    "pipeOutsideDiameter" DOUBLE PRECISION,
    "diameterUnit" TEXT,
    "nominalWallThickness" DOUBLE PRECISION,
    "designPressure" DOUBLE PRECISION,
    "operatingPressure" DOUBLE PRECISION,
    "installationYear" INTEGER,
    "installationDate" TIMESTAMP(3),
    "designLife" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pipeline_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CpCalculation" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "calculationType" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" TEXT,
    CONSTRAINT "CpCalculation_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Assessment" ADD COLUMN "pipelineId" TEXT;
ALTER TABLE "Report" ADD COLUMN "pipelineId" TEXT;
ALTER TABLE "ExternalPipeData" ADD COLUMN "pipelineId" TEXT;

CREATE UNIQUE INDEX "Pipeline_createdById_normalizedPipelineCode_key"
ON "Pipeline"("createdById", "normalizedPipelineCode");
CREATE INDEX "Pipeline_createdById_idx" ON "Pipeline"("createdById");
CREATE INDEX "Pipeline_pipelineName_idx" ON "Pipeline"("pipelineName");
CREATE INDEX "Pipeline_createdAt_idx" ON "Pipeline"("createdAt");
CREATE INDEX "Assessment_pipelineId_idx" ON "Assessment"("pipelineId");
CREATE INDEX "Report_pipelineId_idx" ON "Report"("pipelineId");
CREATE INDEX "ExternalPipeData_pipelineId_idx" ON "ExternalPipeData"("pipelineId");
CREATE INDEX "CpCalculation_pipelineId_idx" ON "CpCalculation"("pipelineId");
CREATE INDEX "CpCalculation_authorId_idx" ON "CpCalculation"("authorId");
CREATE INDEX "CpCalculation_createdAt_idx" ON "CpCalculation"("createdAt");

ALTER TABLE "Pipeline"
ADD CONSTRAINT "Pipeline_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Assessment"
ADD CONSTRAINT "Assessment_pipelineId_fkey"
FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Report"
ADD CONSTRAINT "Report_pipelineId_fkey"
FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ExternalPipeData"
ADD CONSTRAINT "ExternalPipeData_pipelineId_fkey"
FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CpCalculation"
ADD CONSTRAINT "CpCalculation_pipelineId_fkey"
FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CpCalculation"
ADD CONSTRAINT "CpCalculation_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Conservative legacy backfill:
-- Link only records whose owner and pipelineName match exactly one existing Pipeline.
-- This intentionally does not create Pipeline rows from pipelineName alone.
WITH unique_owner_pipeline AS (
    SELECT "createdById", "pipelineName", MIN("id") AS "pipelineId"
    FROM "Pipeline"
    WHERE "createdById" IS NOT NULL
    GROUP BY "createdById", "pipelineName"
    HAVING COUNT(*) = 1
)
UPDATE "Assessment" assessment
SET "pipelineId" = unique_owner_pipeline."pipelineId"
FROM unique_owner_pipeline
WHERE assessment."pipelineId" IS NULL
  AND assessment."authorId" = unique_owner_pipeline."createdById"
  AND assessment."pipelineName" = unique_owner_pipeline."pipelineName";

WITH unique_owner_pipeline AS (
    SELECT "createdById", "pipelineName", MIN("id") AS "pipelineId"
    FROM "Pipeline"
    WHERE "createdById" IS NOT NULL
    GROUP BY "createdById", "pipelineName"
    HAVING COUNT(*) = 1
)
UPDATE "Report" report
SET "pipelineId" = unique_owner_pipeline."pipelineId"
FROM unique_owner_pipeline
WHERE report."pipelineId" IS NULL
  AND report."authorId" = unique_owner_pipeline."createdById"
  AND report."pipelineName" = unique_owner_pipeline."pipelineName";

WITH unique_owner_pipeline AS (
    SELECT "createdById", "pipelineName", MIN("id") AS "pipelineId"
    FROM "Pipeline"
    WHERE "createdById" IS NOT NULL
    GROUP BY "createdById", "pipelineName"
    HAVING COUNT(*) = 1
)
UPDATE "ExternalPipeData" pipe_data
SET "pipelineId" = unique_owner_pipeline."pipelineId"
FROM unique_owner_pipeline
WHERE pipe_data."pipelineId" IS NULL
  AND pipe_data."authorId" = unique_owner_pipeline."createdById"
  AND pipe_data."pipelineName" = unique_owner_pipeline."pipelineName";

-- Optional read-only summary queries for deployment review:
-- SELECT 'Assessment' AS table_name, COUNT(*) FILTER (WHERE "pipelineId" IS NOT NULL) AS linked,
--        COUNT(*) FILTER (WHERE "pipelineId" IS NULL) AS left_unlinked FROM "Assessment";
-- SELECT 'Report' AS table_name, COUNT(*) FILTER (WHERE "pipelineId" IS NOT NULL) AS linked,
--        COUNT(*) FILTER (WHERE "pipelineId" IS NULL) AS left_unlinked FROM "Report";
-- SELECT 'ExternalPipeData' AS table_name, COUNT(*) FILTER (WHERE "pipelineId" IS NOT NULL) AS linked,
--        COUNT(*) FILTER (WHERE "pipelineId" IS NULL) AS left_unlinked FROM "ExternalPipeData";
-- SELECT "createdById", "pipelineName", COUNT(*) AS ambiguous_group_count
-- FROM "Pipeline" GROUP BY "createdById", "pipelineName" HAVING COUNT(*) > 1;
