-- GUARDED REVIEW COPY ONLY. Separate final approval is required before any execution.
-- Same additive schema/backfill as chainage-agent.sql; no existing column assignments.
-- Run only against a positively verified target after a recoverable backup is checked.
-- REVIEW ONLY: not a deployed migration. Do not execute before user SQL approval.
-- Additive nullable columns. Backfill touches only newly added numeric fields.
-- Existing columns, GPS, timestamps and engineering configuration remain unchanged.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';
SET LOCAL search_path = public, pg_catalog;
SET LOCAL TIME ZONE 'UTC';
LOCK TABLE "Pipeline", "Segment", "Asset" IN ACCESS EXCLUSIVE MODE;
CREATE TEMP TABLE chainage_preservation_before ON COMMIT DROP AS
SELECT 'Pipeline'::text AS kind, p.id, to_jsonb(p) AS row_value FROM "Pipeline" p
UNION ALL SELECT 'Segment', s.id, to_jsonb(s) FROM "Segment" s
UNION ALL SELECT 'Asset', a.id, to_jsonb(a) FROM "Asset" a;

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

-- Abort rather than commit if original rows/values changed or backfill is incomplete/inexact.
DO $chainage_guard$
DECLARE changed_rows bigint; invalid_backfills bigint;
BEGIN
  WITH after_rows AS (
SELECT 'Pipeline'::text AS kind, t.id, to_jsonb(t) - ARRAY['chainageOriginMeters', 'chainageOriginName', 'chainageOriginDescription', 'chainageOriginReference', 'chainageOriginLatitude', 'chainageOriginLongitude', 'chainageDirection', 'chainagePrecision', 'allowNegativeChainage', 'chainageMatchToleranceMeters', 'chainageBoundaryPolicy', 'parentPipelineId', 'parentTieInChainageMeters', 'chainageCalibration', 'chainageCoordinateSystem']::text[] AS row_value FROM "Pipeline" t
UNION ALL
SELECT 'Segment'::text AS kind, t.id, to_jsonb(t) - ARRAY['startChainageMeters', 'endChainageMeters']::text[] AS row_value FROM "Segment" t
UNION ALL
SELECT 'Asset'::text AS kind, t.id, to_jsonb(t) - ARRAY['chainageMeters', 'startChainageMeters', 'endChainageMeters']::text[] AS row_value FROM "Asset" t
  ), differences AS (
    (SELECT * FROM chainage_preservation_before EXCEPT SELECT * FROM after_rows)
    UNION ALL
    (SELECT * FROM after_rows EXCEPT SELECT * FROM chainage_preservation_before)
  ) SELECT count(*) INTO changed_rows FROM differences;
  IF changed_rows <> 0 THEN
    RAISE EXCEPTION 'Chainage migration rejected: original rows or values changed (% differences).', changed_rows;
  END IF;
  SELECT count(*) INTO invalid_backfills FROM (
SELECT id FROM "Asset" WHERE COALESCE(trim("kp"), '') <> '' AND (
"chainageMeters" IS NULL OR CASE WHEN "kp" ~ '^[0-9]+([.][0-9]+)?$' THEN "chainageMeters" <> "kp"::numeric * 1000 ELSE true END)
UNION ALL
SELECT id FROM "Segment" WHERE COALESCE(trim("startKp"), '') <> '' AND (
"startChainageMeters" IS NULL OR CASE WHEN "startKp" ~ '^[0-9]+([.][0-9]+)?$' THEN "startChainageMeters" <> "startKp"::numeric * 1000 ELSE true END)
UNION ALL
SELECT id FROM "Segment" WHERE COALESCE(trim("endKp"), '') <> '' AND (
"endChainageMeters" IS NULL OR CASE WHEN "endKp" ~ '^[0-9]+([.][0-9]+)?$' THEN "endChainageMeters" <> "endKp"::numeric * 1000 ELSE true END)
  ) invalid;
  IF invalid_backfills <> 0 THEN
    RAISE EXCEPTION 'Chainage migration rejected: % unconverted or inexact backfills.', invalid_backfills;
  END IF;
END;
$chainage_guard$;
COMMIT;
