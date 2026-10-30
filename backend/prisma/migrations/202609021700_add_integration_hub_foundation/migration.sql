-- CreateEnum
CREATE TYPE "IntegrationConnectorType" AS ENUM ('REST');

-- CreateEnum
CREATE TYPE "IntegrationConnectorStatus" AS ENUM ('Ready', 'Degraded', 'Failed', 'Disabled');

-- CreateEnum
CREATE TYPE "IntegrationEventOperation" AS ENUM ('Test', 'MetadataPreview');

-- CreateEnum
CREATE TYPE "IntegrationEventOutcome" AS ENUM ('Success', 'Failure');

-- CreateTable
CREATE TABLE "IntegrationConnector" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "connectorType" "IntegrationConnectorType" NOT NULL DEFAULT 'REST',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "status" "IntegrationConnectorStatus" NOT NULL DEFAULT 'Ready',
  "endpoint" TEXT NOT NULL,
  "configuration" JSONB,
  "secretReference" TEXT,
  "secretConfigured" BOOLEAN NOT NULL DEFAULT false,
  "lastTestedAt" TIMESTAMP(3),
  "lastSuccessfulTestAt" TIMESTAMP(3),
  "lastFailureAt" TIMESTAMP(3),
  "lastFailureCode" TEXT,
  "lastFailureMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "authorId" TEXT,

  CONSTRAINT "IntegrationConnector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationEvent" (
  "id" TEXT NOT NULL,
  "connectorId" TEXT NOT NULL,
  "operation" "IntegrationEventOperation" NOT NULL,
  "outcome" "IntegrationEventOutcome" NOT NULL,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "durationMs" INTEGER,
  "itemCount" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "authorId" TEXT,

  CONSTRAINT "IntegrationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationConnector_authorId_name_key" ON "IntegrationConnector"("authorId", "name");
CREATE INDEX "IntegrationConnector_authorId_enabled_idx" ON "IntegrationConnector"("authorId", "enabled");
CREATE INDEX "IntegrationConnector_authorId_status_idx" ON "IntegrationConnector"("authorId", "status");
CREATE INDEX "IntegrationConnector_lastTestedAt_idx" ON "IntegrationConnector"("lastTestedAt");
CREATE INDEX "IntegrationEvent_connectorId_createdAt_idx" ON "IntegrationEvent"("connectorId", "createdAt");
CREATE INDEX "IntegrationEvent_authorId_createdAt_idx" ON "IntegrationEvent"("authorId", "createdAt");
CREATE INDEX "IntegrationEvent_outcome_createdAt_idx" ON "IntegrationEvent"("outcome", "createdAt");

-- AddForeignKey
ALTER TABLE "IntegrationConnector" ADD CONSTRAINT "IntegrationConnector_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IntegrationEvent" ADD CONSTRAINT "IntegrationEvent_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "IntegrationConnector"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntegrationEvent" ADD CONSTRAINT "IntegrationEvent_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
