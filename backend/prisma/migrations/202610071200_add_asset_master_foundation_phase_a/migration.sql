-- Phase A only: create Asset Master / Segment foundation and nullable CP links.
-- No data backfill, demo import, ID rewrite, or CP reading relationship change.

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('TEST_POST', 'RECTIFIER', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetPhysicalStatus" AS ENUM ('Active', 'Inactive', 'Maintenance', 'Decommissioned', 'Unknown');

-- CreateTable
CREATE TABLE "Segment" (
  "id" TEXT NOT NULL,
  "pipelineId" TEXT NOT NULL,
  "segmentId" TEXT NOT NULL,
  "name" TEXT,
  "description" TEXT,
  "startKp" TEXT,
  "endKp" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Segment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
  "id" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "assetType" "AssetType" NOT NULL,
  "pipelineId" TEXT NOT NULL,
  "segmentId" TEXT,
  "kp" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "coordinates" TEXT,
  "installationDate" TIMESTAMP(3),
  "manufacturer" TEXT,
  "model" TEXT,
  "physicalStatus" "AssetPhysicalStatus" NOT NULL DEFAULT 'Unknown',
  "parentAssetId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Segment_pipelineId_segmentId_key" ON "Segment"("pipelineId", "segmentId");
CREATE INDEX "Segment_pipelineId_idx" ON "Segment"("pipelineId");

CREATE UNIQUE INDEX "Asset_pipelineId_assetId_key" ON "Asset"("pipelineId", "assetId");
CREATE INDEX "Asset_pipelineId_assetType_idx" ON "Asset"("pipelineId", "assetType");
CREATE INDEX "Asset_segmentId_idx" ON "Asset"("segmentId");
CREATE INDEX "Asset_parentAssetId_idx" ON "Asset"("parentAssetId");
CREATE INDEX "Asset_physicalStatus_idx" ON "Asset"("physicalStatus");

-- AddForeignKey
ALTER TABLE "Segment" ADD CONSTRAINT "Segment_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "Segment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_parentAssetId_fkey" FOREIGN KEY ("parentAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add nullable CP links only when the CP tables exist in the target database.
DO $$
BEGIN
  IF to_regclass('public."CpTestPoint"') IS NOT NULL THEN
    ALTER TABLE "CpTestPoint" ADD COLUMN IF NOT EXISTS "assetMasterId" TEXT;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'CpTestPoint_assetMasterId_key'
    ) THEN
      CREATE UNIQUE INDEX "CpTestPoint_assetMasterId_key" ON "CpTestPoint"("assetMasterId");
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'CpTestPoint_assetMasterId_fkey'
    ) THEN
      ALTER TABLE "CpTestPoint"
        ADD CONSTRAINT "CpTestPoint_assetMasterId_fkey"
        FOREIGN KEY ("assetMasterId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public."CpRectifier"') IS NOT NULL THEN
    ALTER TABLE "CpRectifier" ADD COLUMN IF NOT EXISTS "assetMasterId" TEXT;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'CpRectifier_assetMasterId_key'
    ) THEN
      CREATE UNIQUE INDEX "CpRectifier_assetMasterId_key" ON "CpRectifier"("assetMasterId");
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'CpRectifier_assetMasterId_fkey'
    ) THEN
      ALTER TABLE "CpRectifier"
        ADD CONSTRAINT "CpRectifier_assetMasterId_fkey"
        FOREIGN KEY ("assetMasterId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;
