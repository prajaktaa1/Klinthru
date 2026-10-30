ALTER TABLE "ExternalPipeData"
ADD COLUMN IF NOT EXISTS "assessmentId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "ExternalPipeData_assessmentId_key"
ON "ExternalPipeData"("assessmentId");
