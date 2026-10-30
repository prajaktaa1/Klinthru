CREATE TABLE "InspectionRecord" (
  "id" TEXT NOT NULL,
  "pipelineId" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "segmentId" TEXT NOT NULL DEFAULT '',
  "vendor" TEXT NOT NULL DEFAULT '',
  "findings" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL,
  "nextDue" TEXT NOT NULL DEFAULT '',
  "risk" TEXT NOT NULL DEFAULT '',
  "authorId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InspectionRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InspectionRecord_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "InspectionRecord_pipelineId_date_idx" ON "InspectionRecord"("pipelineId", "date");
