CREATE TABLE "MonitoringPoint" (
  "id" TEXT NOT NULL,
  "monitoringPointId" TEXT NOT NULL,
  "pipelineId" TEXT,
  "segmentId" TEXT,
  "assetId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MonitoringPoint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Sensor" (
  "id" TEXT NOT NULL,
  "sensorId" TEXT NOT NULL,
  "monitoringPointId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Sensor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Channel" (
  "id" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "sensorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Gateway" (
  "id" TEXT NOT NULL,
  "gatewayId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Gateway_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GatewayLink" (
  "id" TEXT NOT NULL,
  "gatewayLinkId" TEXT NOT NULL,
  "gatewayId" TEXT NOT NULL,
  "sensorId" TEXT NOT NULL,
  "connectorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GatewayLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MonitoringPoint_monitoringPointId_key" ON "MonitoringPoint"("monitoringPointId");
CREATE UNIQUE INDEX "Sensor_sensorId_key" ON "Sensor"("sensorId");
CREATE UNIQUE INDEX "Channel_channelId_key" ON "Channel"("channelId");
CREATE UNIQUE INDEX "Gateway_gatewayId_key" ON "Gateway"("gatewayId");
CREATE UNIQUE INDEX "GatewayLink_gatewayLinkId_key" ON "GatewayLink"("gatewayLinkId");
CREATE UNIQUE INDEX "GatewayLink_gatewayId_sensorId_key" ON "GatewayLink"("gatewayId", "sensorId");

CREATE INDEX "MonitoringPoint_pipelineId_idx" ON "MonitoringPoint"("pipelineId");
CREATE INDEX "MonitoringPoint_segmentId_idx" ON "MonitoringPoint"("segmentId");
CREATE INDEX "MonitoringPoint_assetId_idx" ON "MonitoringPoint"("assetId");
CREATE INDEX "Sensor_monitoringPointId_idx" ON "Sensor"("monitoringPointId");
CREATE INDEX "Channel_sensorId_idx" ON "Channel"("sensorId");
CREATE INDEX "GatewayLink_gatewayId_idx" ON "GatewayLink"("gatewayId");
CREATE INDEX "GatewayLink_sensorId_idx" ON "GatewayLink"("sensorId");
CREATE INDEX "GatewayLink_connectorId_idx" ON "GatewayLink"("connectorId");

ALTER TABLE "MonitoringPoint"
  ADD CONSTRAINT "MonitoringPoint_pipelineId_fkey"
  FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MonitoringPoint"
  ADD CONSTRAINT "MonitoringPoint_segmentId_fkey"
  FOREIGN KEY ("segmentId") REFERENCES "Segment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MonitoringPoint"
  ADD CONSTRAINT "MonitoringPoint_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Sensor"
  ADD CONSTRAINT "Sensor_monitoringPointId_fkey"
  FOREIGN KEY ("monitoringPointId") REFERENCES "MonitoringPoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Channel"
  ADD CONSTRAINT "Channel_sensorId_fkey"
  FOREIGN KEY ("sensorId") REFERENCES "Sensor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GatewayLink"
  ADD CONSTRAINT "GatewayLink_gatewayId_fkey"
  FOREIGN KEY ("gatewayId") REFERENCES "Gateway"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GatewayLink"
  ADD CONSTRAINT "GatewayLink_sensorId_fkey"
  FOREIGN KEY ("sensorId") REFERENCES "Sensor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GatewayLink"
  ADD CONSTRAINT "GatewayLink_connectorId_fkey"
  FOREIGN KEY ("connectorId") REFERENCES "IntegrationConnector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
