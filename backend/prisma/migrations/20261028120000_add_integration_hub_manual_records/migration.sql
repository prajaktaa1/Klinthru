CREATE TABLE "IntegrationHubRecord" (
  "id" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Active',
  "details" JSONB NOT NULL DEFAULT '{}',
  "connectorId" TEXT,
  "authorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntegrationHubRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "IntegrationHubRecord_module_name_key" ON "IntegrationHubRecord"("module", "name");
CREATE INDEX "IntegrationHubRecord_module_updatedAt_idx" ON "IntegrationHubRecord"("module", "updatedAt");
CREATE INDEX "IntegrationHubRecord_authorId_module_idx" ON "IntegrationHubRecord"("authorId", "module");
ALTER TABLE "IntegrationHubRecord" ADD CONSTRAINT "IntegrationHubRecord_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "IntegrationConnector"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IntegrationHubRecord" ADD CONSTRAINT "IntegrationHubRecord_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
