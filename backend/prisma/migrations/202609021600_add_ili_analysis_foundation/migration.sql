-- CreateEnum
CREATE TYPE "IliInspectionRunStatus" AS ENUM ('Draft', 'Imported', 'Reviewed', 'Archived');

-- CreateEnum
CREATE TYPE "IliAnomalyOrientation" AS ENUM ('Internal', 'External', 'Unknown');

-- CreateEnum
CREATE TYPE "IliAssessmentStatus" AS ENUM ('Repair', 'Monitor', 'Safe', 'Pending');

-- CreateTable
CREATE TABLE "IliInspectionRun" (
  "id" TEXT NOT NULL,
  "pipelineId" TEXT NOT NULL,
  "runReference" TEXT NOT NULL,
  "toolType" TEXT NOT NULL,
  "vendor" TEXT,
  "inspectionDate" TIMESTAMP(3) NOT NULL,
  "assessmentStandard" TEXT,
  "status" "IliInspectionRunStatus" NOT NULL DEFAULT 'Draft',
  "notes" TEXT,
  "sourceMetadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "authorId" TEXT,

  CONSTRAINT "IliInspectionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IliAnomaly" (
  "id" TEXT NOT NULL,
  "inspectionRunId" TEXT NOT NULL,
  "featureId" TEXT NOT NULL,
  "anomalyType" TEXT NOT NULL,
  "kpKm" DOUBLE PRECISION,
  "location" TEXT,
  "depthMm" DOUBLE PRECISION,
  "depthPercent" DOUBLE PRECISION,
  "lengthMm" DOUBLE PRECISION,
  "widthMm" DOUBLE PRECISION,
  "clockPosition" TEXT,
  "orientation" "IliAnomalyOrientation" NOT NULL DEFAULT 'Unknown',
  "measurementMetadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "authorId" TEXT,

  CONSTRAINT "IliAnomaly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IliAssessmentResult" (
  "id" TEXT NOT NULL,
  "anomalyId" TEXT NOT NULL,
  "methodology" TEXT NOT NULL,
  "methodologyVersion" TEXT NOT NULL,
  "status" "IliAssessmentStatus" NOT NULL DEFAULT 'Pending',
  "inputSnapshot" JSONB NOT NULL,
  "result" JSONB NOT NULL,
  "calculationSteps" JSONB NOT NULL,
  "calculatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "authorId" TEXT,

  CONSTRAINT "IliAssessmentResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IliInspectionRun_pipelineId_runReference_key" ON "IliInspectionRun"("pipelineId", "runReference");
CREATE INDEX "IliInspectionRun_pipelineId_inspectionDate_idx" ON "IliInspectionRun"("pipelineId", "inspectionDate");
CREATE INDEX "IliInspectionRun_authorId_idx" ON "IliInspectionRun"("authorId");
CREATE UNIQUE INDEX "IliAnomaly_inspectionRunId_featureId_key" ON "IliAnomaly"("inspectionRunId", "featureId");
CREATE INDEX "IliAnomaly_inspectionRunId_kpKm_idx" ON "IliAnomaly"("inspectionRunId", "kpKm");
CREATE INDEX "IliAnomaly_authorId_idx" ON "IliAnomaly"("authorId");
CREATE INDEX "IliAssessmentResult_anomalyId_calculatedAt_idx" ON "IliAssessmentResult"("anomalyId", "calculatedAt");
CREATE INDEX "IliAssessmentResult_status_idx" ON "IliAssessmentResult"("status");
CREATE INDEX "IliAssessmentResult_authorId_idx" ON "IliAssessmentResult"("authorId");

-- AddForeignKey
ALTER TABLE "IliInspectionRun" ADD CONSTRAINT "IliInspectionRun_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IliInspectionRun" ADD CONSTRAINT "IliInspectionRun_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IliAnomaly" ADD CONSTRAINT "IliAnomaly_inspectionRunId_fkey" FOREIGN KEY ("inspectionRunId") REFERENCES "IliInspectionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IliAnomaly" ADD CONSTRAINT "IliAnomaly_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IliAssessmentResult" ADD CONSTRAINT "IliAssessmentResult_anomalyId_fkey" FOREIGN KEY ("anomalyId") REFERENCES "IliAnomaly"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IliAssessmentResult" ADD CONSTRAINT "IliAssessmentResult_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
