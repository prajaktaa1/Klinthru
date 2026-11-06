CREATE TABLE "PipelineProposedRoute" (
  "id" TEXT NOT NULL,
  "pipelineId" TEXT NOT NULL,
  "geometry" JSONB NOT NULL,
  "provenance" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "sourceMetadata" JSONB,
  "version" INTEGER NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PipelineProposedRoute_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PipelineProposedRoute_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PipelineProposedRoute_pipelineId_version_key" ON "PipelineProposedRoute"("pipelineId", "version");
CREATE UNIQUE INDEX "PipelineProposedRoute_one_active_per_pipeline" ON "PipelineProposedRoute"("pipelineId") WHERE "status" = 'ACTIVE';
CREATE INDEX "PipelineProposedRoute_pipelineId_status_idx" ON "PipelineProposedRoute"("pipelineId", "status");
ALTER TABLE "MasterChangeEvent" DROP CONSTRAINT IF EXISTS "MasterChangeEvent_objectType_check";
ALTER TABLE "MasterChangeEvent" ADD CONSTRAINT "MasterChangeEvent_objectType_check" CHECK ("objectType" IN ('Pipeline','Segment','Asset','PipelineProposedRoute'));
