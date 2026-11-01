
import { getStoredAuthToken } from "@/lib/authStorage";
import type { RiskMethodologyOption, RiskOverview } from "@/lib/risk-assessment-types";
import type { TreatmentActionRow, TreatmentDetail, TreatmentFilters, TreatmentPage, TreatmentSummary } from "@/lib/risk-treatment-types";
import type { RelatedData, RelatedOptions, RelatedScope } from "@/lib/risk-related-types";
import type { AssessmentDetail, DetailOptions, DetailScope } from "@/lib/risk-assessment-detail-types";
import type { BasisFilters, BasisList, BasisOptions, BasisSummary, DesignBasisRevision, BasisEvent } from "@/lib/cp-engineering-types";
import { getSanitizedErrorName, getSanitizedRequestPath, logSaveDiagnostic } from "@/lib/saveDiagnostics";
import {
  AssessmentKind,
  AiPredictionsReadiness,
  AssessmentPipeDataRecord,
  AssessmentPipeDataSummary,
  AssetMasterAssetRecord,
  AssetMasterSegmentRecord,
  AuthUser,
  CpCalculationInput,
  CpCalculationRecord,
  DeviceInput,
  DeviceRecord,
  PipelineHistory,
  PipelineInput,
  PipelineRecord,
  SensorAssignmentInput,
  SensorAssignmentRecord,
  StoredAssessment
} from "@/lib/types";
import type { SettingsAuditLogResponse, SettingsDictionariesResponse, SettingsNotificationsResponse, SettingsRolesResponse, SettingsSystemConfigurationResponse, SettingsThresholdsResponse, SettingsUnitsResponse, SettingsUsersResponse, SettingsWorkflowsResponse } from "@/lib/settings-types";

export type SensorCalibrationRecord = { id: string; calibrationId: string; sensorId: string; channelId: string | null; calibratedAt: string | null; dueAt: string | null; status: string; provider: string | null; result: string | null; certificateDocumentId: string | null; notes: string | null; ownerId: string; createdById: string; createdAt: string; updatedAt: string };
export type SensorMaintenanceTask = { id: string; taskId: string; sensorId: string | null; maintenanceType: string; priority: string; plannedAt: string | null; dueAt: string | null; completedAt: string | null; status: string; workOrder: string | null; assignedTo: string | null; notes: string | null; ownerId: string; createdById: string; createdAt: string; updatedAt: string };
export type SensorHardwareEvent = { id: string; eventId: string; sensorId: string | null; gatewayId: string | null; eventType: string; severity: string; status: string; occurredAt: string; acknowledgedAt: string | null; resolvedAt: string | null; message: string; source: string; ownerId: string; createdAt: string; updatedAt: string };
export type SensorConfigurationVersion = { id: string; versionId: string; version: number; status: string; payload: Record<string, unknown>; ownerId: string; createdById: string; publishedAt: string | null; createdAt: string; updatedAt: string };
export type SensorLifecycleWriteBlocked = { error: "Sensor lifecycle writes are disabled"; message: string };

export type CorrosionGrowthResultPayload = {
  status: string;
  methodology: string;
  sourceType: string;
  pipelineId: string;
  featureId: string | null;
  earlierInspectionDate: string | null;
  laterInspectionDate: string | null;
  earlierDepth: number | null;
  laterDepth: number | null;
  growthRate: number | null;
  growthRateUnit: string | null;
  rul: number | null;
  rulUnit: "years" | null;
  failureCriterion: string | null;
  reason: string;
  dataQuality: string[];
};

export type CorrosionGrowthEndpointResponse = {
  pipelineId: string;
  featureId: string | null;
  growth: CorrosionGrowthResultPayload;
  rul: CorrosionGrowthResultPayload & {
    criterion: {
      status: string;
      criterionType: string | null;
      threshold: number | null;
      unit: string | null;
      methodology: string;
      methodologyVersion: string;
      source: string;
      reason: string;
    };
  };
};

export type IntegrationConnectorRecord = {
  id: string;
  name: string;
  connectorType: "REST";
  enabled: boolean;
  status: "Ready" | "Degraded" | "Failed" | "Disabled";
  endpoint: string;
  configuration: unknown;
  secretConfigured: boolean;
  lastTestedAt: string | null;
  lastSuccessfulTestAt: string | null;
  lastFailureAt: string | null;
  lastFailureCode: string | null;
  lastFailureMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ScadaReading = {
  id: string; tagId: string; sourceTimestamp: string; sourceTimezone: string;
  normalizedUtcTimestamp: string; receiveTimestamp: string; value: number | null;
  state: string | null; engineeringUnit: string; quality: string;
};
export type ScadaTag = {
  groupName: string | null; historianEnabled: boolean; displayPrecision: number; updatedAt: string; active: boolean;
  id: string; sourceTagName: string; displayName: string; description: string | null;
  measurementType: string; engineeringUnit: string; pipelineId: string; assetId: string;
  connectorId: string; sourceSystemId: string; scanIntervalSeconds: number; staleAfterSeconds: number;
  highHigh: number | null; high: number | null; low: number | null; lowLow: number | null;
  thresholdSource: string | null; documentIds: string[]; sensorAssignmentId: string | null;
  reading: ScadaReading | null; freshness: string; processStatus: string;
};
export type ScadaAlarm = {
  id: string; tagId: string; sourceAlarmId: string; description: string;
  sourcePriority: string; severity: string; measuredValue: number | null; threshold: number | null;
  comparator: string | null; raisedAt: string; clearedAt: string | null;
  sourceStatus: string; klinthruStatus: string; acknowledgedAt?: string | null; acknowledgedBy?: string | null; engineeringUnit: string;
  notes?: Array<{ id: string; note: string; followUp: string | null; createdAt: string }>;
};
export type ScadaEvent = { id: string; eventId: string; pipelineId: string; tagId: string | null; eventType: string; severity: string; description: string; value: number | null; engineeringUnit: string | null; occurredAt: string; status: string; sourceSystemId: string };
export type ScadaAnomaly = { id: string; anomalyId: string; pipelineId: string; tagId: string | null; anomalyType: string; severity: string; description: string; detectedAt: string; sourceReadingId: string | null };
export type ScadaIndicator = { id: string; indicatorId: string; name: string; value: number | null; engineeringUnit: string | null; measuredAt: string; sourceSystemId: string };
export type ScadaOverview = {
  pipeline: PipelineRecord;
  segments: Array<{ id: string; segmentId: string; name?: string; startKp?: string; endKp?: string }>;
  assets: Array<{ id: string; assetId: string; name?: string; facilityType?: string; equipmentType?: string; kp?: string; latitude?: number; longitude?: number; coordinates?: string; parentAssetId?: string; segmentId?: string; physicalStatus: string }>;
  tags: ScadaTag[]; alarms: ScadaAlarm[];
  sources: Array<{ id: string; name: string; connectorType: string; status: string; enabled: boolean; lastSuccessfulTestAt: string | null }>;
  fetchedAt: string; lastUpdated: string | null; status: string;
  kpis: { stationsOnline: number | null; stationsExpected: number | null; totalTags: number;
    healthyTagsPercent: number | null; activeAlarms: number | null; alarmSeverityCounts: Array<{ severity: string; count: number }>;
    equipmentIssues: number | null; readingsPerMinute: number | null; dataAvailabilityPercent: number | null; availabilityReason: string };
  dataQuality: { totalReadings: number; valid: number; suspect: number; invalid: number; missing: number; staleReadings: number; staleTags: number; totalTags: number; exceptions: Array<{ readingId: string; tagId: string; tagName: string; assetId: string; assetName: string | null; station: string | null; sourceTimestamp: string; value: number | null; engineeringUnit: string; quality: string }>; trend: Array<{ bucket: string; total: number; valid: number; missing: number }>; heatmap: Array<{ tagId: string; bucket: string; quality: string | null }> };
  events: ScadaEvent[]; anomalies: ScadaAnomaly[]; indicators: ScadaIndicator[];
  limitations: string[];
};
export type ScadaConfiguration = {
  tags: ScadaTag[]; unitDictionaryAvailable: boolean;
  polling: { globalScanSeconds: number | null; slowScanMinutes: number | null; connectionTimeoutSec: number | null; retryAttempts: number | null; failedScanBackoffMin: number | null } | null;
  routing: { realtimeToPlatform: boolean; storeInHistorian: boolean; enableQualityChecks: boolean; forwardToAnalytics: boolean; publishExternalSystems: boolean; managedBy: string } | null;
  units: Array<{ id: string; sourceUnit: string; platformUnit: string; conversion: string }>;
  changes: Array<{ id: string; actorName: string | null; changeType: string; description: string; impact: string | null; status: string; createdAt: string }>;
};
export type ScadaHistory = {
  summary: { min: number | null; max: number | null; average: number | null; samples: number; validSamples: number; observedSlots: number; expectedSlots: number; completenessPercent: number | null };
  tagId: string; engineeringUnit: string; start: string; end: string; resolutionSeconds: number;
  aggregation: string; points: Array<{ timestamp: string; value: number | null; min: number | null; max: number | null; samples: number; flaggedSamples: number }>;
};

export function fetchScadaOverview(pipelineId: string): Promise<ScadaOverview> {
  return request(`/api/scada/overview?pipelineId=${encodeURIComponent(pipelineId)}`);
}
export function fetchScadaConfiguration(pipelineId: string): Promise<ScadaConfiguration> {
  return request(`/api/scada/configuration?pipelineId=${encodeURIComponent(pipelineId)}`);
}
export function updateScadaTag(id: string, input: Record<string, unknown>): Promise<ScadaTag> {
  return request(`/api/scada/tags/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) });
}
export type ScadaQuality = {
  deltas: { availability: number | null; valid: number | null; suspect: number | null; invalid: number | null; stale: number | null };
  hours: number; start: string; end: string; totalReadings: number; valid: number; suspect: number; invalid: number; staleReadings: number; missing: number;
  expected: number; observed: number; availabilityPercent: number | null; missingPercent: number | null;
  trend: Array<{ bucket: string; expected: number; observed: number; availabilityPercent: number | null; missingPercent: number | null }>;
  heatmap: Array<{ tagId: string; bucket: string; quality: string }>;
  exceptions: Array<{ readingId: string; tagId: string; tagName: string; assetId: string; assetName: string | null; station: string | null; connectorId: string; sourceTimestamp: string; value: number | null; engineeringUnit: string | null; quality: string; severity: string; details: string | null }>;
  sources: Array<ScadaOverview["sources"][number] & { availabilityPercent: number | null; availabilityDelta: number | null; expected: number; observed: number }>;
  limitations: string[];
};
export function fetchScadaQuality(pipelineId: string, hours: number): Promise<ScadaQuality> {
  return request(`/api/scada/data-quality?pipelineId=${encodeURIComponent(pipelineId)}&hours=${hours}`);
}
export function fetchMasterAsset(id: string): Promise<AssetMasterAssetRecord> {
  return request(`/api/asset-master/assets/${encodeURIComponent(id)}`);
}

export function fetchMasterSegments(pipelineId: string): Promise<AssetMasterSegmentRecord[]> {
  return request(`/api/asset-master/segments?pipelineId=${encodeURIComponent(pipelineId)}`);
}
export function fetchMasterChangeLog(pipelineId: string): Promise<SettingsAuditLogResponse> {
  return request<SettingsAuditLogResponse>(`/api/asset-master/change-log?pipelineId=${encodeURIComponent(pipelineId)}`);
}

export function createMasterSegment(segment: Omit<AssetMasterSegmentRecord, "id" | "createdAt" | "updatedAt">): Promise<AssetMasterSegmentRecord> {
  return request<AssetMasterSegmentRecord>("/api/asset-master/segments", { method: "POST", body: JSON.stringify(segment) });
}

export function updateMasterSegment(id: string, segment: Omit<AssetMasterSegmentRecord, "id" | "createdAt" | "updatedAt">): Promise<AssetMasterSegmentRecord> {
  return request<AssetMasterSegmentRecord>(`/api/asset-master/segments/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(segment) });
}
export function deleteMasterSegment(id: string): Promise<void> {
  return request<void>(`/api/asset-master/segments/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function fetchMasterAssets(pipelineId: string, segmentId?: string): Promise<AssetMasterAssetRecord[]> {
  const params = new URLSearchParams({ pipelineId });
  if (segmentId) params.set("segmentId", segmentId);
  return request(`/api/asset-master/assets?${params.toString()}`);
}

export function createMasterAsset(asset: Omit<AssetMasterAssetRecord, "id" | "createdAt" | "updatedAt">): Promise<AssetMasterAssetRecord> {
  return request<AssetMasterAssetRecord>("/api/asset-master/assets", { method: "POST", body: JSON.stringify(asset) });
}

export function updateMasterAsset(id: string, asset: Omit<AssetMasterAssetRecord, "id" | "createdAt" | "updatedAt">): Promise<AssetMasterAssetRecord> {
  return request<AssetMasterAssetRecord>(`/api/asset-master/assets/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(asset) });
}
export function deleteMasterAsset(id: string): Promise<void> {
  return request<void>(`/api/asset-master/assets/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function fetchScadaHistory(tagId: string, hours = 24, start?: string, end?: string, resolutionMinutes?: number, aggregation = "Average"): Promise<ScadaHistory> {
  const params = new URLSearchParams({ hours: String(hours), aggregation });
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  if (resolutionMinutes) params.set("resolutionMinutes", String(resolutionMinutes));
  return request(`/api/scada/tags/${encodeURIComponent(tagId)}/history?${params.toString()}`);
}
export function registerScadaTag(input: Record<string, unknown>): Promise<ScadaTag> {
  return request("/api/scada/tags", { method: "POST", body: JSON.stringify(input) });
}
export function acknowledgeScadaAlarm(id: string): Promise<ScadaAlarm> {
  return request(`/api/scada/alarms/${encodeURIComponent(id)}/acknowledge`, { method: "PATCH" });
}
export function addScadaAlarmNote(id: string, note: string, followUp?: string): Promise<{ id: string; note: string; followUp: string | null; createdAt: string }> {
  return request(`/api/scada/alarms/${encodeURIComponent(id)}/notes`, { method: "POST", body: JSON.stringify({ note, followUp }) });
}
export function downloadScadaReport(pipelineId: string, options?: { tagIds: string[]; hours: number; start?: string; end?: string; resolutionMinutes: number; aggregation?: string }): Promise<Blob> {
  const params = new URLSearchParams({ pipelineId });
  if (options) {
    params.set("format", "csv"); params.set("tagIds", options.tagIds.join(",")); params.set("hours", String(options.hours));
    params.set("resolutionMinutes", String(options.resolutionMinutes));
    if (options.aggregation) params.set("aggregation", options.aggregation);
    if (options.start) params.set("start", options.start);
    if (options.end) params.set("end", options.end);
  }
  return requestBlob(`/api/reports/scada-export?${params}`);
}

export type IntegrationEventRecord = {
  id: string;
  connectorId: string;
  operation: "Test" | "MetadataPreview";
  outcome: "Success" | "Failure";
  errorCode: string | null;
  errorMessage: string | null;
  durationMs: number | null;
  itemCount: number | null;
  createdAt: string;
  authorId: string | null;
};

export type IntegrationSummary = {
  activeConnectors: number;
  latestSuccessfulTestAt: string | null;
  failuresLast24Hours: number;
  uptime: null;
  throughput: null;
};

export type IntegrationHubRealData = {
  connectors: IntegrationConnectorRecord[];
  summary: IntegrationSummary;
  events: IntegrationEventRecord[];
  manualRecords: IntegrationManualRecord[];
  manualRecordsError?: string;
};

export type IntegrationManualModule = "Data Mapping" | "Validation Rules" | "Processing Logs" | "Data Quality" | "Scheduler" | "Notifications";
export type IntegrationManualRecordInput = { module: IntegrationManualModule; name: string; status: string; connectorId: string | null; details: Record<string, string | number | boolean | null> };
export type IntegrationManualRecord = IntegrationManualRecordInput & { id: string; authorId: string; createdAt: string; updatedAt: string };

export type ReportRecord = {
  id: string;
  assessmentId: string;
  inspectionId?: string;
  inspectionDate?: string;
  assessmentType: "External" | "Internal";
  pipelineId?: string;
  pipelineCode?: string;
  pipelineName: string;
  riskLevel: "High" | "Medium" | "Low";
  input: Record<string, string | number>;
  result: Record<string, string | number>;
  generatedAt: string;
  createdAt: string;
  authorId?: string;
  createdByName?: string;
  createdByEmail?: string;
};


export type DashboardAggregation = {
  pipeline: {
    id: string;
    pipelineCode: string;
    pipelineName: string;
    location: string | null;
    serviceOrProduct: string | null;
    pipeMaterial: string | null;
    pipeMaterialOther: string | null;
    pipeGrade: string | null;
    pipeGradeOther: string | null;
    pipeLengthKm: number | null;
    diameter: { inside: number | null; outside: number | null; unit: string | null };
    wallThickness: { value: number | null; unit: string | null };
    maopBar: number | null;
    operatingPressure: number | null;
    operatingPressureUnit: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  summary: {
    pipelineCount: number;
    assessmentCount: number;
    riskCounts: { high: number; medium: number; low: number; unknown: number };
    pipelineHealth: { status: string; value: number | null; reason: string };
    maopUtilisation: { status: string; value: number | null; unit: string; reason: string };
  };
  latestAssessment: { id: string; type: string; riskLevel: string; riskScore: number; inspectionDate: string | null; createdAt: string; routeLink: string } | { status: string; reason: string };
  latestReport: { id: string; assessmentId: string; assessmentType: string; riskLevel: string; generatedAt: string; createdAt: string; routeLink: string } | { status: string; reason: string };
  activityTimeline: Array<{ id: string; type: string; title: string; timestamp: string; pipelineId: string; routeLink?: string; riskLevel?: string; status: string }>;
  modules: {
    scada: { status: string; reason: string; telemetry: string };
    cpMonitoring: { status: string; reason: string; readingCount: number; calculationCount: number };
    iliAnalysis: { status: string; reason: string; inspectionRunCount: number; anomalyCount: number };
    alerts: { status: string; reason: string };
    aiPredictions: { status: string; readyCapabilities: number; blockedCapabilities: number; reason: string; capabilities: AiPredictionsReadiness["capabilities"] };
  };
};


export type IliRunSummary = {
  id: string;
  pipelineId: string;
  runReference: string;
  toolType: string;
  vendor: string | null;
  inspectionDate: string;
  assessmentStandard: string | null;
  status: string;
  notes: string | null;
  sourceMetadata: unknown;
  createdAt: string;
  updatedAt: string;
  authorId: string | null;
};

export type IliAnomalySummary = {
  id: string;
  inspectionRunId: string;
  pipelineId: string;
  runReference: string;
  inspectionDate: string;
  featureId: string;
  anomalyType: string;
  kpKm: number | null;
  location: string | null;
  depthMm: number | null;
  depthPercent: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  clockPosition: string | null;
  orientation: string;
  measurementMetadata: unknown;
  createdAt: string;
  updatedAt: string;
  authorId: string | null;
};

export type IliDataResponse<T> = {
  pipelineId: string;
  status: "available" | "unavailable";
  tableAvailable: boolean;
  count: number;
  reason: string;
  data: T[];
};

export type IliReadiness = {
  pipelineId: string;
  status: string;
  ready: boolean;
  reason: string;
  tables: {
    available: boolean;
    inspectionRuns: boolean;
    anomalies: boolean;
    assessmentResults: boolean;
  };
  counts: {
    inspectionRuns: number;
    anomalies: number;
    assessmentResults: number;
  };
  services: {
    b31gCalculation: { available: boolean; status: string; reason: string };
    corrosionGrowthSource: { available: boolean; status: string; reason: string };
    remainingUsefulLife: { available: boolean; status: string; reason: string };
  };
  blockers: string[];
};

export type CpMonitoringRealData = {
  pipeline: { id: string; pipelineCode: string; pipelineName: string };
  pipelineId: string;
  availability: Record<"surveys" | "testPoints" | "rectifiers" | "protectionRule" | "approvedCriteria" | "strayCurrent", { available: boolean; reason: string }>;
  summary: {
    protectedCount: number;
    monitoredCount: number;
    protectionCoveragePercent: number | null;
    underProtectedCount: number;
    underProtectedCodes: string[];
    activeRectifierCount: number;
    rectifierCount: number;
    totalCurrentA: number;
    lastSurveyAt: string | null;
  };
  criterion: null | { valueMv: number; referenceElectrode: string; measurementType: string };
  approvedCriteria: Array<{
    criteriaSetId: string;
    criteriaSetName: string;
    criteriaVersionId: string;
    version: string;
    standardReference: string | null;
    measurementType: string;
    referenceElectrode: string | null;
    protectionThresholdMv: number | null;
    marginalThresholdMv: number | null;
    overProtectionThresholdMv: number | null;
    unit: string;
  }>;
  surveys: Array<{ id: string; surveyDate: string; surveyName: string | null; status: string }>;
  testPoints: Array<{
    id: string; code: string; name: string | null; location: string | null; kp: string | null; assetStatus: string;
    readingId: string | null; readingAt: string | null; measurementType: string | null; referenceElectrode: string | null;
    valueMv: number | null; valueV: number | null; strayCurrentMa: number | null; protectionStatus: string | null; interferenceStatus: string | null;
    eOnMv: number | null; eOnAt: string | null; eOffMv: number | null; eOffAt: string | null; irDropMv: number | null;
    polarizationMv: number | null; polarizationReason: string;
  }>;
  trend: Array<{ id: string; testPointId: string; readingAt: string; measurementType: string; referenceElectrode: string; valueMv: number | null; valueV: number | null; protectionStatus: string }>;
  rectifiers: Array<{ id: string; rectifierCode: string; name: string | null; location: string | null; kp: string | null; assetStatus: string; readingAt: string | null; readingStatus: string | null; outputVoltageV: number | null; outputCurrentA: number | null }>;
  strayCurrent: Array<{ testPointId: string; code: string; location: string | null; readingAt: string | null; strayCurrentMa: number | null; interferenceStatus: string | null }>;
};

export type CpAssetMasterRecord = {
  id: string;
  assetId: string;
  assetType: "STATION" | "VALVE" | "TEST_POST" | "RECTIFIER" | "COMPRESSOR" | "SENSOR" | "PUMP" | "METER" | "PIG_LAUNCHER" | "PIG_RECEIVER" | "PIPELINE_FITTING" | "FLANGE" | "INSULATING_JOINT" | "PIPELINE_CROSSING" | "OTHER";
  pipelineId: string;
  segmentId?: string;
  kp?: string;
  latitude?: number;
  longitude?: number;
  coordinates?: string;
  side?: "LHS" | "RHS";
  installationDate?: string;
  manufacturer?: string;
  model?: string;
  physicalStatus: "Active" | "Inactive" | "Maintenance" | "Decommissioned" | "Unknown";
  parentAssetId?: string;
  createdAt: string;
  updatedAt: string;
};

export type CpLinkedTestPointRecord = {
  asset: CpAssetMasterRecord | null;
  cp: {
    id: string;
    pipelineId: string;
    assetMasterId: string;
    code: string;
    name?: string;
    location?: string;
    kp?: string;
    assetStatus: "Active" | "Inactive" | "Maintenance";
    notes?: string;
    createdAt: string;
    updatedAt: string;
  };
  readings: null | {
    onPotential?: { readingId: string; readingAt: string; valueMv?: number; valueV?: number; referenceElectrode: string; source?: string; quality?: string };
    offPotential?: { readingId: string; readingAt: string; valueMv?: number; valueV?: number; referenceElectrode: string; source?: string; quality?: string };
    lastReadingAt?: string;
  };
};

export type CpLinkedRectifierRecord = {
  asset: CpAssetMasterRecord | null;
  cp: {
    id: string;
    pipelineId: string;
    assetMasterId: string;
    rectifierCode: string;
    name?: string;
    location?: string;
    kp?: string;
    status: "Active" | "Standby" | "Fault" | "Offline" | "Maintenance";
    notes?: string;
    createdAt: string;
    updatedAt: string;
  };
};
export type ReportWorkspaceStatus = "available" | "partial" | "unavailable" | "blocked";

export type ReportWorkspaceData = {
  pipeline: {
    status: "available";
    source: "Pipeline";
    data: {
      id: string;
      pipelineCode: string;
      pipelineName: string;
      location: string | null;
      serviceOrProduct: string | null;
      pipeLengthKm: number | null;
      pipeInsideDiameter: number | null;
      pipeOutsideDiameter: number | null;
      diameterUnit: string | null;
      pipeMaterial: string | null;
      pipeMaterialOther: string | null;
      pipeGrade: string | null;
      pipeGradeOther: string | null;
      smysMpa: number | null;
      maopBar: number | null;
      nominalWallThickness: number | null;
      wallThicknessInputValue: number | null;
      wallThicknessUnit: string | null;
      designPressure: number | null;
      operatingPressure: number | null;
      operatingPressureInputValue: number | null;
      operatingPressureUnit: string | null;
      installationYear: number | null;
      inspectionYear: number | null;
      installationDate: string | null;
      designLife: number | null;
      status: string;
      createdAt: string;
      updatedAt: string;
    };
  };
  risk: {
    status: ReportWorkspaceStatus;
    source: "Assessment";
    reason: string | null;
    assessmentCount: number;
    counts: { high: number; medium: number; low: number; unknown: number };
    latestAssessment: null | { id: string; type: string; riskScore: number; riskLevel: string | null; inspectionDate: string | null; createdAt: string };
    peakRisk: null | { score: number; riskLevel: string | null; assessmentId: string; semantics: string };
  };
  existingReports: {
    status: "available";
    source: "Report";
    count: number;
    recent: Array<{ id: string; assessmentId: string; inspectionId: string | null; assessmentType: string; pipelineId: string | null; pipelineName: string; riskLevel: string; generatedAt: string; createdAt: string; createdByName: string | null }>;
  };
  cpCalculations: {
    status: "available";
    source: "CpCalculation";
    count: number;
    recent: Array<{ id: string; pipelineId: string; calculationType: string; createdAt: string; createdByName: string | null }>;
    note: string;
  };
  aiReadiness: AiPredictionsReadiness & { status: "available"; source: "AIPredictionsReadiness" };
  health: { status: ReportWorkspaceStatus; reason: string };
  defects: { status: ReportWorkspaceStatus; reason: string };
  ili: { status: ReportWorkspaceStatus; reason: string };
  cpMonitoring: { status: ReportWorkspaceStatus; reason: string };
  scada: { status: ReportWorkspaceStatus; reason: string };
  aiPredictions: {
    status: ReportWorkspaceStatus;
    source: "AIPredictionsReadiness";
    reason: string;
    readiness: {
      corrosionGrowth: string;
      remainingUsefulLife: string;
      cpDrift: string;
      scadaAnomaly: string;
      defectPrediction: string;
      modelConfidence: string;
    };
  };
  actions: { status: ReportWorkspaceStatus; reason: string };
  delivery: { status: ReportWorkspaceStatus; reason: string };
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4002";
const API_REQUEST_TIMEOUT_MS = 30000;
const API_TRANSFER_TIMEOUT_MS = 180000;
// Large document bodies are base64 JSON (about 4/3 the PDF size). Keep the
// server's 25 MiB file limit unchanged, but give the upload transaction time
// to finish so a slow response cannot cause an unsafe blind retry.
const API_UPLOAD_TIMEOUT_MS = 180000;

function requestBodyBytes(init?: RequestInit) {
  return typeof init?.body === "string" ? new TextEncoder().encode(init.body).byteLength : 0;
}

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;

  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

export class BackendUnavailableError extends Error {
  constructor() {
    super("Cannot connect to the backend. Check your connection and try Refresh.");
    this.name = "BackendUnavailableError";
  }
}

export class ApiTimeoutError extends Error {
  constructor() {
    super("The server took too long to respond. Refresh to check whether your changes were saved before trying again.");
    this.name = "ApiTimeoutError";
  }
}

function throwRequestError(error: unknown, signal: AbortSignal): never {
  if (signal.aborted || (error instanceof DOMException && error.name === "AbortError")) {
    throw new ApiTimeoutError();
  }
  if (error instanceof TypeError) throw new BackendUnavailableError();
  throw error;
}

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

export type OtpRequestResponse = {
  message: string;
  expiresInSeconds: number;
  retryAfterSeconds: number;
};

export type SignupOtpInput = {
  companyName: string;
  adminName: string;
  mobileNumber: string;
  email: string;
};

export type LetterHeadRecord = {
  fileName: string;
  fileSize: number;
  fileHash?: string | null;
  fileType: string;
  fileData: string;
  uploadedAt: string;
  ownerId: string;
};

export type DocumentVersionRecord = {
  documentVersionId: string;
  documentId?: string;
  revision: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileHash?: string | null;
  approvalStatus: string;
  validityStatus: string | null;
  processingStatus: string | null;
  uploadedAt: string;
  uploadedById?: string;
  issueDate?: string | null;
  reviewDueDate?: string | null;
  expiryDate?: string | null;
};

export type DocumentRepositoryItem = {
  documentId: string;
  documentFamilyId: string;
  documentNumber: string | null;
  title: string;
  documentType: string;
  category: string;
  description: string | null;
  isGlobal: boolean;
  ownerId: string;
  owner?: { id: string; name: string } | null;
  updatedAt: string;
  versions: DocumentVersionRecord[];
  links: Array<{ documentLinkId: string; documentVersionId: string | null; pipeline: { id: string; pipelineCode: string; pipelineName: string } | null; segment: { id: string; segmentId: string; name: string | null } | null; asset: { id: string; assetId: string; name: string | null } | null }>;
};

export type DocumentTargets = {
  pipelines: Array<{ id: string; pipelineCode: string; pipelineName: string }>;
  segments: Array<{ id: string; segmentId: string; name: string | null; pipelineId: string }>;
  assets: Array<{ id: string; assetId: string; name: string | null; pipelineId: string; segmentId: string | null }>;
};

export type DocumentRepositoryOverview = {
  totalDocuments: number;
  unlinkedDocuments: number;
  totalStorageBytes: number | null;
  approved: number | null;
  underReview: number | null;
  expired: number | null;
  expiringSoon: number | null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredAuthToken();
  const controller = new AbortController();
  let response: Response;
  const method = init?.method ?? "GET";
  const diagnosticPath = getSanitizedRequestPath(path);
  const bodyBytes = requestBodyBytes(init);
  const requestTimeoutMs = bodyBytes > 1024 * 1024 ? API_UPLOAD_TIMEOUT_MS : API_REQUEST_TIMEOUT_MS;
  const timeout = globalThis.setTimeout(() => controller.abort(), requestTimeoutMs);

  logSaveDiagnostic({
    event: "api_request_start",
    apiBaseUrl: API_BASE_URL,
    requestMethod: method,
    requestPath: diagnosticPath,
    requestBodyBytes: bodyBytes,
    requestTimeoutMs,
    authTokenExists: Boolean(token),
    fetchStarted: true
  });

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers || {})
      },
      cache: "no-store",
      signal: controller.signal
    });

    logSaveDiagnostic({
      event: "api_response",
      apiBaseUrl: API_BASE_URL,
      requestMethod: method,
      requestPath: diagnosticPath,
      requestBodyBytes: bodyBytes,
      requestTimeoutMs,
      authTokenExists: Boolean(token),
      fetchStarted: true,
      responseStatus: response.status
    });

    if (!response.ok) {
      if (response.status === 401 && typeof window !== "undefined") {
        window.dispatchEvent(new Event("klinthru:unauthorized"));
      }

      let message = `API request failed: ${response.status}`;
      let fields: Record<string, string> | undefined;
      try {
        const body = (await response.clone().json()) as { message?: string; error?: string; fields?: Record<string, string> };
        message = body.message || body.error || message;
        fields = body.fields;
        if (fields && Object.keys(fields).length > 0) {
          const details = Object.entries(fields).map(([field, detail]) => `${field}: ${detail}`).join("; ");
          message = `${message} (${details})`;
        }
      } catch {
        // Keep the status-only fallback when the backend does not return JSON.
      }

      throw new ApiError(message, response.status, fields);
    }

    if (init?.method && !["GET", "HEAD"].includes(init.method.toUpperCase()) && /^\/api\/(pipelines|asset-master)(\/|$)/.test(path)) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("klinthru-master-map-data-changed"));
        try { window.localStorage.setItem("klinthru-master-map-revision", String(Date.now())); } catch { /* Storage may be unavailable. */ }
      }
    }
    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    logSaveDiagnostic({
      event: "api_request_error",
      apiBaseUrl: API_BASE_URL,
      requestMethod: method,
      requestPath: diagnosticPath,
      requestBodyBytes: bodyBytes,
      requestTimeoutMs,
      authTokenExists: Boolean(token),
      fetchStarted: true,
      errorName: getSanitizedErrorName(error)
    });

    throwRequestError(error, controller.signal);
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

async function requestUpload<T>(path: string, input: Record<string, unknown>, onProgress?: (percent: number) => void): Promise<T> {
  const token = getStoredAuthToken();
  const body = JSON.stringify(input);
  const bodyBytes = requestBodyBytes({ body });
  const diagnosticPath = getSanitizedRequestPath(path);
  logSaveDiagnostic({ event: "api_request_start", apiBaseUrl: API_BASE_URL, requestMethod: "POST", requestPath: diagnosticPath, requestBodyBytes: bodyBytes, requestTimeoutMs: API_UPLOAD_TIMEOUT_MS, authTokenExists: Boolean(token), fetchStarted: true });
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}${path}`);
    xhr.timeout = API_UPLOAD_TIMEOUT_MS;
    xhr.setRequestHeader("Content-Type", "application/json");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) onProgress?.(Math.min(99, Math.round((event.loaded / event.total) * 100))); };
    xhr.onload = () => {
      logSaveDiagnostic({ event: "api_response", apiBaseUrl: API_BASE_URL, requestMethod: "POST", requestPath: diagnosticPath, requestBodyBytes: bodyBytes, requestTimeoutMs: API_UPLOAD_TIMEOUT_MS, authTokenExists: Boolean(token), fetchStarted: true, responseStatus: xhr.status });
      let parsed: unknown = undefined;
      try { parsed = xhr.responseText ? JSON.parse(xhr.responseText) : undefined; } catch { /* status fallback below */ }
      if (xhr.status < 200 || xhr.status >= 300) {
        const bodyData = parsed as { message?: string; error?: string; fields?: Record<string, string> } | undefined;
        let message = bodyData?.message || bodyData?.error || `API request failed: ${xhr.status}`;
        if (bodyData?.fields && Object.keys(bodyData.fields).length) message = `${message} (${Object.entries(bodyData.fields).map(([field, detail]) => `${field}: ${detail}`).join("; ")})`;
        reject(new ApiError(message, xhr.status, bodyData?.fields));
        return;
      }
      onProgress?.(100);
      resolve(parsed as T);
    };
    xhr.onerror = () => reject(new BackendUnavailableError());
    xhr.ontimeout = () => reject(new ApiTimeoutError());
    xhr.onabort = () => reject(new ApiTimeoutError());
    try { xhr.send(body); } catch (error) { reject(error); }
  });
}

async function requestBlob(path: string, init?: RequestInit): Promise<Blob> {
  const token = getStoredAuthToken();
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), API_TRANSFER_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: "application/octet-stream",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers || {})
      },
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      if (response.status === 401 && typeof window !== "undefined") {
        window.dispatchEvent(new Event("klinthru:unauthorized"));
      }

      let message = `API request failed: ${response.status}`;
      try {
        const body = (await response.clone().json()) as { message?: string; error?: string };
        message = body.message || body.error || message;
      } catch {
        // Keep the status-only fallback for non-JSON responses.
      }
      throw new ApiError(message, response.status);
    }

    return response.blob();
  } catch (error) {
    throwRequestError(error, controller.signal);
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

export function isUnauthorizedError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 401;
}

export function isBackendUnavailableError(error: unknown): error is BackendUnavailableError {
  return error instanceof BackendUnavailableError;
}

export function login(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export function requestLoginOtp(email: string): Promise<OtpRequestResponse> {
  return request<OtpRequestResponse>("/api/auth/login/request-otp", {
    method: "POST",
    body: JSON.stringify({ email })
  });
}

export function verifyLoginOtp(email: string, otp: string): Promise<LoginResponse> {
  return request<LoginResponse>("/api/auth/login/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp })
  });
}

export function requestSignupOtp(input: SignupOtpInput): Promise<OtpRequestResponse> {
  return request<OtpRequestResponse>("/api/auth/signup/request-otp", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function verifySignupOtp(email: string, otp: string): Promise<LoginResponse> {
  return request<LoginResponse>("/api/auth/signup/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp })
  });
}

export function logout(): Promise<{ message: string }> {
  return request<{ message: string }>("/api/auth/logout", {
    method: "POST"
  });
}

export function fetchCurrentUser(): Promise<AuthUser> {
  return request<AuthUser>("/api/auth/me");
}

export function fetchSettingsUsers(): Promise<SettingsUsersResponse> {
  return request<SettingsUsersResponse>("/api/settings/users");
}

export function fetchSettingsRoles(): Promise<SettingsRolesResponse> {
  return request<SettingsRolesResponse>("/api/settings/roles");
}

export function fetchSettingsDictionaries(): Promise<SettingsDictionariesResponse> {
  return request<SettingsDictionariesResponse>("/api/settings/dictionaries");
}

export function fetchSettingsUnits(): Promise<SettingsUnitsResponse> {
  return request<SettingsUnitsResponse>("/api/settings/units");
}

export function fetchSettingsWorkflows(): Promise<SettingsWorkflowsResponse> {
  return request<SettingsWorkflowsResponse>("/api/settings/workflows");
}

export function fetchSettingsThresholds(): Promise<SettingsThresholdsResponse> {
  return request<SettingsThresholdsResponse>("/api/settings/thresholds");
}

export function fetchSettingsNotifications(): Promise<SettingsNotificationsResponse> {
  return request<SettingsNotificationsResponse>("/api/settings/notifications");
}

export function fetchSettingsSystemConfiguration(): Promise<SettingsSystemConfigurationResponse> {
  return request<SettingsSystemConfigurationResponse>("/api/settings/system-configuration");
}

export function fetchSettingsAuditLog(): Promise<SettingsAuditLogResponse> {
  return request<SettingsAuditLogResponse>("/api/settings/audit-log");
}

export function fetchAiPredictionsReadiness(): Promise<AiPredictionsReadiness> {
  return request<AiPredictionsReadiness>("/api/ai-predictions/readiness");
}

export function fetchCorrosionGrowth(pipelineId: string): Promise<CorrosionGrowthEndpointResponse> {
  return request<CorrosionGrowthEndpointResponse>(`/api/ai-predictions/corrosion-growth/${encodeURIComponent(pipelineId)}`);
}

export function fetchReportWorkspaceData(pipelineId: string): Promise<ReportWorkspaceData> {
  return request<ReportWorkspaceData>(`/api/reports/workspace-data/${encodeURIComponent(pipelineId)}`);
}

export function fetchDashboardAggregation(pipelineId: string): Promise<DashboardAggregation> {
  return request<DashboardAggregation>(`/api/dashboard/${encodeURIComponent(pipelineId)}`);
}

export function fetchIliReadiness(pipelineId: string): Promise<IliReadiness> {
  return request<IliReadiness>(`/api/ili/readiness/${encodeURIComponent(pipelineId)}`);
}

export function fetchIliRuns(pipelineId: string): Promise<IliDataResponse<IliRunSummary>> {
  return request<IliDataResponse<IliRunSummary>>(`/api/ili/runs/${encodeURIComponent(pipelineId)}`);
}

export function fetchIliAnomalies(pipelineId: string): Promise<IliDataResponse<IliAnomalySummary>> {
  return request<IliDataResponse<IliAnomalySummary>>(`/api/ili/anomalies/${encodeURIComponent(pipelineId)}`);
}

export function fetchDocumentTargets(): Promise<DocumentTargets> {
  return request<DocumentTargets>("/api/documents/targets");
}

export function fetchDocumentRepositoryOverview(): Promise<DocumentRepositoryOverview> {
  return request<DocumentRepositoryOverview>("/api/documents/overview");
}

export function fetchDocuments(filters: { q?: string; documentType?: string; category?: string; pipelineId?: string; segmentId?: string; assetId?: string; approvalStatus?: string; validityStatus?: string; revision?: string; owner?: string; issueDateFrom?: string; issueDateTo?: string; page?: number; pageSize?: number }): Promise<{ items: DocumentRepositoryItem[]; page: number; pageSize: number; total: number }> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key, String(value)); });
  return request(`/api/documents?${params.toString()}`);
}

export function createRepositoryDocument(input: Record<string, unknown>, onProgress?: (percent: number) => void): Promise<{ item: DocumentRepositoryItem }> {
  return requestUpload(input.category === "Asset Photo" ? "/api/documents/asset-photos" : "/api/documents", input, onProgress);
}

export function createAssetPhoto(input: { assetId: string; fileName: string; mimeType: string; fileData: string }): Promise<{ item: DocumentRepositoryItem }> {
  return request("/api/documents/asset-photos", { method: "POST", body: JSON.stringify(input) });
}

export function fetchRepositoryDocument(documentId: string): Promise<{ item: DocumentRepositoryItem }> {
  return request(`/api/documents/${encodeURIComponent(documentId)}`);
}

export function fetchDocumentVersions(documentId: string): Promise<{ items: DocumentVersionRecord[] }> {
  return request(`/api/documents/${encodeURIComponent(documentId)}/versions`);
}

export function createDocumentVersion(documentId: string, input: Record<string, unknown>): Promise<{ item: DocumentVersionRecord }> {
  return requestUpload(`/api/documents/${encodeURIComponent(documentId)}/versions`, input);
}

export function linkExistingDocument(documentId: string, input: { pipelineId?: string; segmentId?: string; assetId?: string }): Promise<{ items: unknown[] }> {
  return request(`/api/documents/${encodeURIComponent(documentId)}/links`, { method: "POST", body: JSON.stringify(input) });
}

export function deleteRepositoryDocument(documentId: string): Promise<void> {
  return request<void>(`/api/documents/${encodeURIComponent(documentId)}`, { method: "DELETE" });
}

export function downloadDocumentVersion(documentId: string, versionId: string): Promise<Blob> {
  return requestBlob(`/api/documents/${encodeURIComponent(documentId)}/versions/${encodeURIComponent(versionId)}/download`);
}

export function fetchLetterHead(): Promise<LetterHeadRecord | null> {
  return request<LetterHeadRecord | null>("/api/letter-heads");
}

export function saveLetterHead(input: Pick<LetterHeadRecord, "fileName" | "fileData">): Promise<LetterHeadRecord> {
  return request<LetterHeadRecord>("/api/letter-heads", {
    method: "PUT",
    body: JSON.stringify(input)
  });
}

export function deleteLetterHead(): Promise<void> {
  return request<void>("/api/letter-heads", { method: "DELETE" });
}

export function createLetterHeadPrint(input: {
  fileName: string;
  fileData: string;
  includeLetterHead: boolean;
}): Promise<Blob> {
  return requestBlob("/api/letter-heads/print", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function fetchDeviceRecords(search?: {
  deviceType?: string;
  status?: string;
}): Promise<DeviceRecord[]> {
  const params = new URLSearchParams();

  if (search?.deviceType?.trim()) {
    params.set("deviceType", search.deviceType.trim());
  }

  if (search?.status?.trim()) {
    params.set("status", search.status.trim());
  }

  const query = params.toString();
  return request<DeviceRecord[]>(`/api/devices${query ? `?${query}` : ""}`);
}

export function fetchSensorMasterLinks(): Promise<import("@/lib/types").SensorMasterLink[]> {
  return request("/api/devices/relationships");
}

export function fetchCpMonitoringData(pipelineId: string): Promise<CpMonitoringRealData> {
  return request<CpMonitoringRealData>(`/api/cp-monitoring/${encodeURIComponent(pipelineId)}`);
}

export function fetchCpTestPoints(pipelineId: string): Promise<CpLinkedTestPointRecord[]> {
  const params = new URLSearchParams({ pipelineId });
  return request<CpLinkedTestPointRecord[]>(`/api/cp-monitoring/test-points?${params.toString()}`);
}

export function fetchCpRectifiers(pipelineId: string): Promise<CpLinkedRectifierRecord[]> {
  const params = new URLSearchParams({ pipelineId });
  return request<CpLinkedRectifierRecord[]>(`/api/cp-monitoring/rectifiers?${params.toString()}`);
}
export function createDeviceRecord(device: DeviceInput): Promise<DeviceRecord> {
  return request<DeviceRecord>("/api/devices", {
    method: "POST",
    body: JSON.stringify(device)
  });
}

export function fetchSensorAssignments(search?: {
  search?: string;
  sensorCategory?: string;
  sensorDeviceType?: string;
  assignmentStatus?: string;
  dataSource?: string;
  pipelineOrAsset?: string;
}): Promise<SensorAssignmentRecord[]> {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(search || {})) {
    if (value?.trim()) {
      params.set(key, value.trim());
    }
  }

  const query = params.toString();
  return request<SensorAssignmentRecord[]>(`/api/sensor-assignments${query ? `?${query}` : ""}`);
}

export function fetchSensorAssignmentById(id: string): Promise<SensorAssignmentRecord> {
  return request<SensorAssignmentRecord>(`/api/sensor-assignments/${id}`);
}

export function createSensorAssignment(
  assignment: SensorAssignmentInput
): Promise<SensorAssignmentRecord> {
  return request<SensorAssignmentRecord>("/api/sensor-assignments", {
    method: "POST",
    body: JSON.stringify(assignment)
  });
}

export function updateSensorAssignment(
  id: string,
  assignment: SensorAssignmentInput
): Promise<SensorAssignmentRecord> {
  return request<SensorAssignmentRecord>(`/api/sensor-assignments/${id}`, {
    method: "PUT",
    body: JSON.stringify(assignment)
  });
}

export function deactivateSensorAssignment(id: string): Promise<SensorAssignmentRecord> {
  return request<SensorAssignmentRecord>(`/api/sensor-assignments/${id}/deactivate`, {
    method: "PATCH"
  });
}

export function reassignSensorAssignment(
  id: string,
  assignment: SensorAssignmentInput
): Promise<SensorAssignmentRecord> {
  return request<SensorAssignmentRecord>(`/api/sensor-assignments/${id}/reassign`, {
    method: "POST",
    body: JSON.stringify(assignment)
  });
}

export function fetchAssessments(): Promise<StoredAssessment[]> {
  return request<StoredAssessment[]>("/api/assessments");
}

export function fetchOfficialRiskOverview(filters: { pipelineId?: string; methodologyVersionId?: string }): Promise<RiskOverview> {
  const params = new URLSearchParams();
  if (filters.pipelineId) params.set("pipelineId", filters.pipelineId);
  if (filters.methodologyVersionId) params.set("methodologyVersionId", filters.methodologyVersionId);
  return request<RiskOverview>(`/api/risk-assessments/overview?${params.toString()}`);
}

export function fetchRemainingRiskRead<T extends import("./risk-remaining-types").RiskEnvelope>(path: "drivers" | "register" | "history" | "reporting", scope: { pipelineId?: string; methodologyVersionId?: string; riskId?: string; revisionId?: string }): Promise<T> {
  const query = new URLSearchParams();
  Object.entries(scope).forEach(([key, value]) => { if (value) query.set(key, value); });
  return request(`/api/risk-assessments/${path}?${query}`);
}

export function fetchRiskMatrix(scope: { pipelineId?: string; methodologyVersionId?: string; category?: string }): Promise<import("./risk-matrix-types").RiskMatrixData> {
  const query = new URLSearchParams();
  Object.entries(scope).forEach(([key, value]) => { if (value) query.set(key, value); });
  return request(`/api/risk-assessments/matrix?${query}`);
}

export function fetchRiskConfiguration(scope: { pipelineId?: string; methodologyVersionId?: string }): Promise<import("./risk-configuration-types").RiskConfigurationData> {
  const query = new URLSearchParams();
  Object.entries(scope).forEach(([key, value]) => { if (value) query.set(key, value); });
  return request(`/api/risk-assessments/configuration?${query}`);
}

export function fetchOfficialRiskMethodologies(): Promise<{ status: string; items: RiskMethodologyOption[]; reason?: string }> {
  return request("/api/risk-assessments/methodologies");
}

export function fetchRiskRelatedOptions(scope: { pipelineId?: string; methodologyVersionId?: string }): Promise<RelatedOptions> {
  const query = new URLSearchParams();
  Object.entries(scope).forEach(([key, value]) => { if (value) query.set(key, value); });
  return request(`/api/risk-assessments/related-data/options?${query}`);
}

export function fetchAssessmentDetailOptions(scope: { pipelineId?: string; methodologyVersionId?: string }): Promise<DetailOptions> {
  const query = new URLSearchParams();
  Object.entries(scope).forEach(([key, value]) => { if (value) query.set(key, value); });
  return request(`/api/risk-assessments/assessment-details/options?${query}`);
}
export function fetchAssessmentDetail(scope: DetailScope): Promise<AssessmentDetail> {
  const query = new URLSearchParams();
  Object.entries(scope).forEach(([key, value]) => { if (value) query.set(key, value); });
  return request(`/api/risk-assessments/assessment-details?${query}`);
}
export function fetchRiskRelatedData(scope: RelatedScope): Promise<RelatedData> {
  const query = new URLSearchParams();
  Object.entries(scope).forEach(([key, value]) => { if (value !== undefined && value !== "") query.set(key, String(value)); });
  return request(`/api/risk-assessments/related-data?${query}`);
}

function treatmentQuery(filters: TreatmentFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value !== undefined && value !== "") params.set(key, String(value));
  return params.toString();
}
export function fetchRiskTreatments(filters: TreatmentFilters): Promise<TreatmentPage> {
  return request(`/api/risk-assessments/treatments?${treatmentQuery(filters)}`);
}
export function fetchRiskTreatmentSummary(filters: TreatmentFilters): Promise<TreatmentSummary> {
  return request(`/api/risk-assessments/treatments/summary?${treatmentQuery(filters)}`);
}
export function fetchRiskTreatment(treatmentId: string, revisionId?: string): Promise<TreatmentDetail> {
  const params = new URLSearchParams(); if (revisionId) params.set("revisionId", revisionId);
  return request(`/api/risk-assessments/treatments/${encodeURIComponent(treatmentId)}?${params.toString()}`);
}
export function fetchRiskTreatmentActionReferences(treatmentId: string, revisionId?: string): Promise<{ status: string; reason: string | null; actions: Omit<TreatmentActionRow, "treatmentLinks">[] | null }> {
  const params = new URLSearchParams(); if (revisionId) params.set("revisionId", revisionId);
  return request(`/api/risk-assessments/treatments/${encodeURIComponent(treatmentId)}/action-references?${params.toString()}`);
}

export function fetchPipelines(search?: string): Promise<PipelineRecord[]> {
  const params = new URLSearchParams();
  if (search?.trim()) {
    params.set("search", search.trim());
  }

  const query = params.toString();
  return request<PipelineRecord[]>(`/api/pipelines${query ? `?${query}` : ""}`);
}

export function fetchPipelineById(id: string): Promise<PipelineRecord> {
  return request<PipelineRecord>(`/api/pipelines/${id}`);
}

export function createPipeline(pipeline: PipelineInput): Promise<PipelineRecord> {
  return request<PipelineRecord>("/api/pipelines", {
    method: "POST",
    body: JSON.stringify(pipeline)
  });
}

export function updatePipeline(id: string, pipeline: PipelineInput): Promise<PipelineRecord> {
  return request<PipelineRecord>(`/api/pipelines/${id}`, {
    method: "PUT",
    body: JSON.stringify(pipeline)
  });
}

export function deletePipeline(id: string): Promise<void> {
  return request<void>(`/api/pipelines/${id}`, { method: "DELETE" });
}

export type InspectionRecordInput = {
  pipelineId: string; reference: string; type: string; date: string; segmentId: string;
  vendor: string; findings: string; status: string; nextDue: string; risk: string;
};
export type InspectionRecord = InspectionRecordInput & { id: string; createdBy: string; createdAt: string };
export function fetchInspectionRecords(pipelineId: string): Promise<InspectionRecord[]> {
  return request(`/api/inspection-records?pipelineId=${encodeURIComponent(pipelineId)}`);
}
export function createInspectionRecord(input: InspectionRecordInput): Promise<InspectionRecord> {
  return request("/api/inspection-records", { method: "POST", body: JSON.stringify(input) });
}
export function updateInspectionRecord(id: string, input: InspectionRecordInput): Promise<InspectionRecord> {
  return request<InspectionRecord>(`/api/inspection-records/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) });
}
export function deleteInspectionRecord(id: string): Promise<void> {
  return request<void>(`/api/inspection-records/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function fetchPipelineHistory(id: string): Promise<PipelineHistory> {
  return request<PipelineHistory>(`/api/pipelines/${id}/history`);
}

export function createAssessment(assessment: StoredAssessment): Promise<StoredAssessment> {
  return request<StoredAssessment>("/api/assessments", {
    method: "POST",
    body: JSON.stringify(assessment)
  });
}

export function fetchReports(): Promise<ReportRecord[]> {
  return request<ReportRecord[]>("/api/reports");
}

export function searchReports(search?: {
  pipelineName?: string;
  reportId?: string;
  pipelineId?: string;
}): Promise<ReportRecord[]> {
  const params = new URLSearchParams();

  if (search?.pipelineName?.trim()) {
    params.set("pipelineName", search.pipelineName.trim());
  }

  if (search?.reportId?.trim()) {
    params.set("reportId", search.reportId.trim());
  }

  if (search?.pipelineId?.trim()) {
    params.set("pipelineId", search.pipelineId.trim());
  }

  const query = params.toString();
  return request<ReportRecord[]>(`/api/reports${query ? `?${query}` : ""}`);
}

export function fetchReportById(id: string): Promise<ReportRecord> {
  return request<ReportRecord>(`/api/reports/${id}`);
}

export function createReport(assessment: StoredAssessment): Promise<ReportRecord> {
  return request<ReportRecord>("/api/reports", {
    method: "POST",
    body: JSON.stringify({
      assessmentId: assessment.id,
      assessment
    })
  });
}

export function fetchCpCalculations(pipelineId?: string): Promise<CpCalculationRecord[]> {
  const params = new URLSearchParams();
  if (pipelineId?.trim()) {
    params.set("pipelineId", pipelineId.trim());
  }
  const query = params.toString();
  return request<CpCalculationRecord[]>(`/api/cp-calculations${query ? `?${query}` : ""}`);
}

export function createCpCalculation(calculation: CpCalculationInput): Promise<CpCalculationRecord> {
  return request<CpCalculationRecord>("/api/cp-calculations", {
    method: "POST",
    body: JSON.stringify(calculation)
  });
}

export async function downloadReportFile(id: string, format: "pdf" | "word") {
  const token = getStoredAuthToken();
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/reports/${id}/download/${format}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      cache: "no-store",
      signal: controller.signal
    });
  } catch (error) {
    throwRequestError(error, controller.signal);
  } finally {
    globalThis.clearTimeout(timeout);
  }

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event("klinthru:unauthorized"));
    }

    throw new ApiError(`API request failed: ${response.status}`, response.status);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const filenameMatch = disposition.match(/filename="([^"]+)"/i);

  return {
    blob,
    filename: filenameMatch?.[1] || `assessment-report.${format === "pdf" ? "pdf" : "doc"}`
  };
}
export function fetchAssessmentPipeDataHistory(search?: {
  assessmentType?: AssessmentKind | "All";
  pipelineId?: string;
  pipelineName?: string;
  pipeId?: string;
  locationId?: string;
  inspectionYear?: string;
  savedDate?: string;
}): Promise<AssessmentPipeDataSummary[]> {
  const params = new URLSearchParams();

  if (search?.assessmentType?.trim()) {
    params.set("assessmentType", search.assessmentType.trim());
  }

  if (search?.pipelineId?.trim()) {
    params.set("pipelineId", search.pipelineId.trim());
  }

  if (search?.pipelineName?.trim()) {
    params.set("pipelineName", search.pipelineName.trim());
  }

  if (search?.pipeId?.trim()) {
    params.set("pipeId", search.pipeId.trim());
  }

  if (search?.locationId?.trim()) {
    params.set("locationId", search.locationId.trim());
  }

  if (search?.inspectionYear?.trim()) {
    params.set("inspectionYear", search.inspectionYear.trim());
  }

  if (search?.savedDate?.trim()) {
    params.set("savedDate", search.savedDate.trim());
  }

  const query = params.toString();
  return request<AssessmentPipeDataSummary[]>(`/api/external-pipe-data${query ? `?${query}` : ""}`);
}

export function fetchAssessmentPipeDataRecord(id: string): Promise<AssessmentPipeDataRecord> {
  return request<AssessmentPipeDataRecord>(`/api/external-pipe-data/${id}`);
}

export async function fetchIntegrationHubRealData(): Promise<IntegrationHubRealData> {
  const [connectors, summary, events, manualResult] = await Promise.all([
    request<IntegrationConnectorRecord[]>("/api/integrations/connectors"),
    request<IntegrationSummary>("/api/integrations/summary"),
    request<IntegrationEventRecord[]>("/api/integrations/events"),
    request<IntegrationManualRecord[]>("/api/integrations/manual-records").then(records => ({ records, error: "" })).catch(error => ({ records: [] as IntegrationManualRecord[], error: error instanceof Error ? error.message : "Saved records are unavailable." }))
  ]);

  return { connectors, summary, events, manualRecords: manualResult.records, manualRecordsError: manualResult.error || undefined };
}

export function createIntegrationManualRecord(input: IntegrationManualRecordInput): Promise<IntegrationManualRecord> {
  return request("/api/integrations/manual-records", { method: "POST", body: JSON.stringify(input) });
}
export function updateIntegrationManualRecord(id: string, input: IntegrationManualRecordInput): Promise<IntegrationManualRecord> {
  return request(`/api/integrations/manual-records/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) });
}
export function deleteIntegrationManualRecord(id: string): Promise<void> {
  return request(`/api/integrations/manual-records/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function fetchIntegrationConnector(id: string): Promise<IntegrationConnectorRecord> {
  return request(`/api/integrations/connectors/${encodeURIComponent(id)}`);
}

export function createIntegrationConnector(input: { name: string; endpoint: string; configuration?: Record<string, unknown>; secretReference?: string | null; scope?: { pipelineId: string; assetId?: string | null } }): Promise<IntegrationConnectorRecord> {
  return request("/api/integrations/connectors", { method: "POST", body: JSON.stringify(input) });
}

export function updateIntegrationConnector(id: string, input: { name?: string; endpoint?: string; enabled?: boolean; configuration?: Record<string, unknown>; secretReference?: string | null }): Promise<IntegrationConnectorRecord> {
  return request(`/api/integrations/connectors/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function testIntegrationConnector(id: string): Promise<{ connector: IntegrationConnectorRecord; test: { ok: boolean; statusCode: number | null; durationMs: number; rawDurationMs?: number } }> {
  return request(`/api/integrations/connectors/${encodeURIComponent(id)}/test`, { method: "POST" });
}

export function createAssessmentPipeDataRecord(assessment: StoredAssessment): Promise<AssessmentPipeDataRecord> {
  return request<AssessmentPipeDataRecord>("/api/external-pipe-data", {
    method: "POST",
    body: JSON.stringify(assessment)
  });
}

export function createDocumentExtractedPipeDataRecord(
  assessment: StoredAssessment,
  pipelineMasterDataUpdateConfirmed: boolean
): Promise<AssessmentPipeDataRecord> {
  return request<AssessmentPipeDataRecord>("/api/external-pipe-data", {
    method: "POST",
    body: JSON.stringify({
      assessment,
      source: "Document",
      pipelineMasterDataUpdateConfirmed
    })
  });
}

export function updateAssessmentPipeDataRecord(
  id: string,
  assessment: StoredAssessment
): Promise<AssessmentPipeDataRecord> {
  return request<AssessmentPipeDataRecord>(`/api/external-pipe-data/${id}`, {
    method: "PUT",
    body: JSON.stringify(assessment)
  });
}

export function updateDocumentExtractedPipeDataRecord(
  id: string,
  assessment: StoredAssessment,
  pipelineMasterDataUpdateConfirmed: boolean
): Promise<AssessmentPipeDataRecord> {
  return request<AssessmentPipeDataRecord>(`/api/external-pipe-data/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      assessment,
      source: "Document",
      pipelineMasterDataUpdateConfirmed
    })
  });
}

export async function downloadAssessmentPipeDataFile(id: string, format: "pdf" | "word") {
  const token = getStoredAuthToken();
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/external-pipe-data/${id}/download/${format}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      cache: "no-store",
      signal: controller.signal
    });
  } catch (error) {
    throwRequestError(error, controller.signal);
  } finally {
    globalThis.clearTimeout(timeout);
  }

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event("klinthru:unauthorized"));
    }

    throw new ApiError(`API request failed: ${response.status}`, response.status);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const filenameMatch = disposition.match(/filename="([^"]+)"/i);

  return {
    blob,
    filename: filenameMatch?.[1] || `assessment-pipe-data.${format === "pdf" ? "pdf" : "doc"}`
  };
}

// Additive Design Basis clients. Existing CP Monitoring/calculation APIs are unchanged.
const designBasisPath = "/api/cp-engineering/design-bases";
function designBasisQuery(filters: Partial<BasisFilters>): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key, String(value)); });
  return params.toString();
}
export function fetchDesignBasisOptions(): Promise<BasisOptions> { return request(`${designBasisPath}/options`); }
export function fetchDesignBasisIdentity(basisId: string): Promise<{ revisions: { id: string; revisionCode: string; lockState: string }[] }> { return request(`${designBasisPath}/${encodeURIComponent(basisId)}`); }
export function fetchDesignBases(filters: Partial<BasisFilters>): Promise<BasisList> { return request(`${designBasisPath}?${designBasisQuery(filters)}`); }
export function fetchDesignBasisSummary(filters: Partial<BasisFilters>): Promise<BasisSummary> { return request(`${designBasisPath}/summary?${designBasisQuery(filters)}`); }
export function fetchDesignBasisRevision(basisId: string, revisionId: string): Promise<DesignBasisRevision> { return request(`${designBasisPath}/${encodeURIComponent(basisId)}/revisions/${encodeURIComponent(revisionId)}`); }
export function fetchDesignBasisHistory(basisId: string, page = 1): Promise<{ items: BasisEvent[]; total: number; page: number; pageSize: number }> { return request(`${designBasisPath}/${encodeURIComponent(basisId)}/history?page=${page}`); }
export function exportDesignBases(filters: Partial<BasisFilters>): Promise<Blob> { return requestBlob(`${designBasisPath}/export?${designBasisQuery(filters)}`); }
export function mutateDesignBasis(path: string, body: Record<string, unknown>, method: "POST" | "PATCH" = "POST"): Promise<{ basisId: string; revisionId: string; replayed: boolean }> {
  return request(`${designBasisPath}${path}`, { method, body: JSON.stringify(body) });
}

const sensorLifecyclePath = "/api/sensor-lifecycle";
export function fetchSensorCalibrations(): Promise<SensorCalibrationRecord[]> { return request(`${sensorLifecyclePath}/calibrations`); }
export function fetchSensorMaintenanceTasks(): Promise<SensorMaintenanceTask[]> { return request(`${sensorLifecyclePath}/maintenance`); }
export function fetchSensorHardwareEvents(): Promise<SensorHardwareEvent[]> { return request(`${sensorLifecyclePath}/events`); }
export function fetchSensorConfigurationVersions(): Promise<SensorConfigurationVersion[]> { return request(`${sensorLifecyclePath}/configuration`); }
export function createSensorLifecycleRecord(resource: "calibrations" | "maintenance" | "events" | "configuration", body: Record<string, unknown>): Promise<unknown> {
  return request(`${sensorLifecyclePath}/${resource}`, { method: "POST", body: JSON.stringify(body) });
}
export function updateSensorLifecycleRecord(resource: "calibrations" | "maintenance" | "events" | "configuration", id: string, body: Record<string, unknown>): Promise<unknown> {
  return request(`${sensorLifecyclePath}/${resource}/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) });
}
export function deleteSensorLifecycleRecord(resource: "calibrations" | "maintenance" | "events" | "configuration", id: string): Promise<void> {
  return request(`${sensorLifecyclePath}/${resource}/${encodeURIComponent(id)}`, { method: "DELETE" });
}
