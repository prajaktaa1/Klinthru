-- REVIEW ONLY: not a deployed migration. Do not execute before user SQL approval.
-- Additive nullable columns. Backfill touches only newly added numeric fields.
-- Existing columns, GPS, timestamps and engineering configuration remain unchanged.
BEGIN;
CREATE TYPE "ChainageDirection" AS ENUM ('INCREASING_DOWNSTREAM', 'INCREASING_UPSTREAM');
CREATE TYPE "ChainageBoundaryPolicy" AS ENUM ('REJECT', 'WARN');
ALTER TABLE "Pipeline"
  ADD COLUMN "chainageOriginMeters" DECIMAL(24,9),
  ADD COLUMN "chainageOriginName" TEXT,
  ADD COLUMN "chainageOriginDescription" TEXT,
  ADD COLUMN "chainageOriginReference" TEXT,
  ADD COLUMN "chainageOriginLatitude" DOUBLE PRECISION,
  ADD COLUMN "chainageOriginLongitude" DOUBLE PRECISION,
  ADD COLUMN "chainageDirection" "ChainageDirection",
  ADD COLUMN "chainagePrecision" INTEGER,
  ADD COLUMN "allowNegativeChainage" BOOLEAN,
  ADD COLUMN "chainageMatchToleranceMeters" DECIMAL(24,9),
  ADD COLUMN "chainageBoundaryPolicy" "ChainageBoundaryPolicy",
  ADD COLUMN "parentPipelineId" TEXT,
  ADD COLUMN "parentTieInChainageMeters" DECIMAL(24,9),
  ADD COLUMN "chainageCalibration" JSONB,
  ADD COLUMN "chainageCoordinateSystem" TEXT;
ALTER TABLE "Pipeline" ADD CONSTRAINT "Pipeline_parentPipelineId_fkey"
  FOREIGN KEY ("parentPipelineId") REFERENCES "Pipeline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Pipeline_parentPipelineId_idx" ON "Pipeline"("parentPipelineId");
ALTER TABLE "Segment"
  ADD COLUMN "startChainageMeters" DECIMAL(24,9),
  ADD COLUMN "endChainageMeters" DECIMAL(24,9);
CREATE INDEX "Segment_pipelineId_startChainageMeters_idx" ON "Segment"("pipelineId", "startChainageMeters");
ALTER TABLE "Asset"
  ADD COLUMN "chainageMeters" DECIMAL(24,9),
  ADD COLUMN "startChainageMeters" DECIMAL(24,9),
  ADD COLUMN "endChainageMeters" DECIMAL(24,9);
CREATE INDEX "Asset_pipelineId_chainageMeters_idx" ON "Asset"("pipelineId", "chainageMeters");
CREATE INDEX "Asset_pipelineId_assetType_chainageMeters_idx" ON "Asset"("pipelineId", "assetType", "chainageMeters");

-- Existing bare KP values are kilometres. Only unambiguous numeric strings qualify.
-- No physical datum, direction, calibration, asset range or branch relationship is inferred.
UPDATE "Asset" SET "chainageMeters" = "kp"::numeric * 1000
WHERE "chainageMeters" IS NULL AND "kp" ~ '^[0-9]+([.][0-9]+)?$';
UPDATE "Segment" SET "startChainageMeters" = "startKp"::numeric * 1000
WHERE "startChainageMeters" IS NULL AND "startKp" ~ '^[0-9]+([.][0-9]+)?$';
UPDATE "Segment" SET "endChainageMeters" = "endKp"::numeric * 1000
WHERE "endChainageMeters" IS NULL AND "endKp" ~ '^[0-9]+([.][0-9]+)?$';

-- Review any unconverted values in the deployment output before enabling writes.
SELECT "id", "pipelineId", "kp" FROM "Asset"
WHERE "kp" IS NOT NULL AND trim("kp") <> '' AND "chainageMeters" IS NULL;
SELECT "id", "pipelineId", "startKp", "endKp" FROM "Segment"
WHERE ("startKp" IS NOT NULL AND trim("startKp") <> '' AND "startChainageMeters" IS NULL)
   OR ("endKp" IS NOT NULL AND trim("endKp") <> '' AND "endChainageMeters" IS NULL);
COMMIT;
