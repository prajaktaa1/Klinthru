-- CreateTable
CREATE TABLE "ExternalPipeData" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'External',
    "pipelineName" TEXT NOT NULL,
    "pipeId" TEXT,
    "locationId" TEXT,
    "input" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT,

    CONSTRAINT "ExternalPipeData_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExternalPipeData_type_idx" ON "ExternalPipeData"("type");

-- CreateIndex
CREATE INDEX "ExternalPipeData_pipelineName_idx" ON "ExternalPipeData"("pipelineName");

-- CreateIndex
CREATE INDEX "ExternalPipeData_pipeId_idx" ON "ExternalPipeData"("pipeId");

-- CreateIndex
CREATE INDEX "ExternalPipeData_locationId_idx" ON "ExternalPipeData"("locationId");

-- CreateIndex
CREATE INDEX "ExternalPipeData_createdAt_idx" ON "ExternalPipeData"("createdAt");

-- AddForeignKey
ALTER TABLE "ExternalPipeData" ADD CONSTRAINT "ExternalPipeData_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
