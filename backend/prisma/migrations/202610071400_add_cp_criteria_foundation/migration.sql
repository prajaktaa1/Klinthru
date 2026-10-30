-- CP criteria foundation only.
-- No legacy CpProtectionRule migration, no evaluation backfill, and no CP reading ID changes.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReferenceElectrode') THEN
    CREATE TYPE "ReferenceElectrode" AS ENUM ('CSE', 'AgAgCl', 'CuCuSO4');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CpMeasurementType') THEN
    CREATE TYPE "CpMeasurementType" AS ENUM ('ON_POTENTIAL', 'INSTANT_OFF_POTENTIAL', 'PIPE_TO_SOIL_POTENTIAL', 'STRAY_CURRENT');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CpCriteriaApprovalStatus') THEN
    CREATE TYPE "CpCriteriaApprovalStatus" AS ENUM ('Draft', 'Approved', 'Superseded', 'Retired');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CpOperationalStatus') THEN
    CREATE TYPE "CpOperationalStatus" AS ENUM ('WithinCriteria', 'Marginal', 'OutOfCriteria', 'NotAssessed', 'Stale', 'Invalid', 'Unknown');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "CpCriteriaSet" (
  "id" TEXT NOT NULL,
  "criteriaSetId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "standardReference" TEXT,
  "companyReference" TEXT,
  "applicableAssetType" "AssetType",
  "applicablePipelineType" TEXT,
  "pipelineId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CpCriteriaSet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CpCriteriaVersion" (
  "id" TEXT NOT NULL,
  "criteriaVersionId" TEXT NOT NULL,
  "criteriaSetId" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "effectiveDate" TIMESTAMP(3) NOT NULL,
  "supersededDate" TIMESTAMP(3),
  "approvalStatus" "CpCriteriaApprovalStatus" NOT NULL DEFAULT 'Draft',
  "approvedAt" TIMESTAMP(3),
  "approvedById" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CpCriteriaVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CpCriterionDefinition" (
  "id" TEXT NOT NULL,
  "criteriaVersionId" TEXT NOT NULL,
  "measurementType" "CpMeasurementType" NOT NULL,
  "referenceElectrode" "ReferenceElectrode",
  "protectionThresholdMv" DOUBLE PRECISION,
  "overProtectionThresholdMv" DOUBLE PRECISION,
  "marginalThresholdMv" DOUBLE PRECISION,
  "unit" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CpCriterionDefinition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CpCriteriaSet_criteriaSetId_key" ON "CpCriteriaSet"("criteriaSetId");
CREATE INDEX IF NOT EXISTS "CpCriteriaSet_pipelineId_idx" ON "CpCriteriaSet"("pipelineId");
CREATE INDEX IF NOT EXISTS "CpCriteriaSet_applicableAssetType_idx" ON "CpCriteriaSet"("applicableAssetType");

CREATE UNIQUE INDEX IF NOT EXISTS "CpCriteriaVersion_criteriaVersionId_key" ON "CpCriteriaVersion"("criteriaVersionId");
CREATE UNIQUE INDEX IF NOT EXISTS "CpCriteriaVersion_criteriaSetId_version_key" ON "CpCriteriaVersion"("criteriaSetId", "version");
CREATE INDEX IF NOT EXISTS "CpCriteriaVersion_criteriaSetId_approvalStatus_idx" ON "CpCriteriaVersion"("criteriaSetId", "approvalStatus");
CREATE INDEX IF NOT EXISTS "CpCriteriaVersion_effectiveDate_idx" ON "CpCriteriaVersion"("effectiveDate");
CREATE INDEX IF NOT EXISTS "CpCriteriaVersion_approvedById_idx" ON "CpCriteriaVersion"("approvedById");

CREATE INDEX IF NOT EXISTS "CpCriterionDefinition_criteriaVersionId_measurementType_referenceElectrode_idx"
  ON "CpCriterionDefinition"("criteriaVersionId", "measurementType", "referenceElectrode");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CpCriteriaSet_pipelineId_fkey') THEN
    ALTER TABLE "CpCriteriaSet"
      ADD CONSTRAINT "CpCriteriaSet_pipelineId_fkey"
      FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CpCriteriaVersion_criteriaSetId_fkey') THEN
    ALTER TABLE "CpCriteriaVersion"
      ADD CONSTRAINT "CpCriteriaVersion_criteriaSetId_fkey"
      FOREIGN KEY ("criteriaSetId") REFERENCES "CpCriteriaSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CpCriteriaVersion_approvedById_fkey') THEN
    ALTER TABLE "CpCriteriaVersion"
      ADD CONSTRAINT "CpCriteriaVersion_approvedById_fkey"
      FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CpCriterionDefinition_criteriaVersionId_fkey') THEN
    ALTER TABLE "CpCriterionDefinition"
      ADD CONSTRAINT "CpCriterionDefinition_criteriaVersionId_fkey"
      FOREIGN KEY ("criteriaVersionId") REFERENCES "CpCriteriaVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- CpReadingHistory exists in the Prisma schema, but earlier migration history may not create it.
-- Create the evaluation foundation only when the reading table exists in the target database.
DO $$
BEGIN
  IF to_regclass('public."CpReadingHistory"') IS NOT NULL THEN
    CREATE TABLE IF NOT EXISTS "CpReadingEvaluation" (
      "id" TEXT NOT NULL,
      "readingId" TEXT NOT NULL,
      "criteriaSetId" TEXT NOT NULL,
      "criteriaVersionId" TEXT NOT NULL,
      "status" "CpOperationalStatus" NOT NULL,
      "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "evaluationMethod" TEXT NOT NULL,
      "evaluationMethodVersion" TEXT NOT NULL,
      "reasonCode" TEXT,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "CpReadingEvaluation_pkey" PRIMARY KEY ("id")
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "CpReadingEvaluation_readingId_criteriaVersionId_evaluationMethod_evaluationMethodVersion_key"
      ON "CpReadingEvaluation"("readingId", "criteriaVersionId", "evaluationMethod", "evaluationMethodVersion");
    CREATE INDEX IF NOT EXISTS "CpReadingEvaluation_criteriaSetId_idx" ON "CpReadingEvaluation"("criteriaSetId");
    CREATE INDEX IF NOT EXISTS "CpReadingEvaluation_criteriaVersionId_idx" ON "CpReadingEvaluation"("criteriaVersionId");
    CREATE INDEX IF NOT EXISTS "CpReadingEvaluation_status_evaluatedAt_idx" ON "CpReadingEvaluation"("status", "evaluatedAt");

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CpReadingEvaluation_readingId_fkey') THEN
      ALTER TABLE "CpReadingEvaluation"
        ADD CONSTRAINT "CpReadingEvaluation_readingId_fkey"
        FOREIGN KEY ("readingId") REFERENCES "CpReadingHistory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CpReadingEvaluation_criteriaSetId_fkey') THEN
      ALTER TABLE "CpReadingEvaluation"
        ADD CONSTRAINT "CpReadingEvaluation_criteriaSetId_fkey"
        FOREIGN KEY ("criteriaSetId") REFERENCES "CpCriteriaSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CpReadingEvaluation_criteriaVersionId_fkey') THEN
      ALTER TABLE "CpReadingEvaluation"
        ADD CONSTRAINT "CpReadingEvaluation_criteriaVersionId_fkey"
        FOREIGN KEY ("criteriaVersionId") REFERENCES "CpCriteriaVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;
