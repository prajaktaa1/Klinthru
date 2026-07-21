CREATE TABLE "DeviceRecord" (
  "id" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "deviceType" TEXT NOT NULL,
  "pipelineOrLocation" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "latestReadingOrState" TEXT NOT NULL,
  "unit" TEXT,
  "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
  "isDemoData" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "authorId" TEXT,

  CONSTRAINT "DeviceRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeviceRecord_deviceId_key" ON "DeviceRecord"("deviceId");
CREATE INDEX "DeviceRecord_deviceType_idx" ON "DeviceRecord"("deviceType");
CREATE INDEX "DeviceRecord_status_idx" ON "DeviceRecord"("status");
CREATE INDEX "DeviceRecord_pipelineOrLocation_idx" ON "DeviceRecord"("pipelineOrLocation");
CREATE INDEX "DeviceRecord_lastUpdatedAt_idx" ON "DeviceRecord"("lastUpdatedAt");

ALTER TABLE "DeviceRecord"
ADD CONSTRAINT "DeviceRecord_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
