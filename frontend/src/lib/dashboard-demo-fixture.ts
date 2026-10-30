import type { DashboardAggregation } from "@/lib/apiClient";
import type { PipelineRecord } from "@/lib/types";

export type DashboardDemoPoint = {
  time: string;
  pressureBar: number;
  flowM3h: number;
  temperatureC: number;
  cpPotentialV: number;
  cpCompliancePercent: number;
  anomalyCount: number;
  corrosionRateMpy: number;
};

export type DashboardDemoAlert = {
  severity: "Critical" | "Warning" | "Info";
  source: string;
  message: string;
  timestamp: string;
  status: string;
};

export type DashboardDemoFixture = {
  pipeline: PipelineRecord;
  aggregation: DashboardAggregation;
  activeAnomalies: number;
  inletPressureBar: number;
  flowRateM3h: number;
  cpCompliancePercent: number;
  telemetrySeries: DashboardDemoPoint[];
  alerts: DashboardDemoAlert[];
  agentActivity: Array<{ title: string; status: string; detail: string }>;
  architecture: Array<{ title: string; status: string; detail: string }>;
};

const createdAt = "2026-09-10T08:00:00.000Z";

export const dashboardDemoFixture: DashboardDemoFixture = {
  pipeline: {
    id: "demo-pipeline-alpha",
    pipelineCode: "PG-DEMO-42",
    pipelineName: "North Trunk Line - Demo",
    location: "Coastal Terminal to Inland Station",
    serviceOrProduct: "Dry natural gas",
    pipeLocationId: "KP 0.0 - KP 42.8",
    pipeMaterial: "Carbon Steel",
    pipeGrade: "API 5L X65",
    pipeAgeYears: 18,
    pipeLengthKm: 42.8,
    pipeInsideDiameter: 762,
    pipeOutsideDiameter: 813,
    diameterUnit: "mm",
    smysMpa: 448,
    maopBar: 94,
    nominalWallThickness: 14.3,
    wallThicknessInputValue: 14.3,
    wallThicknessUnit: "mm",
    operatingPressure: 68.4,
    operatingPressureInputValue: 68.4,
    operatingPressureUnit: "bar",
    installationYear: 2008,
    inspectionYear: 2026,
    status: "Demo Preview",
    createdAt,
    updatedAt: createdAt
  },
  aggregation: {
    pipeline: {
      id: "demo-pipeline-alpha",
      pipelineCode: "PG-DEMO-42",
      pipelineName: "North Trunk Line - Demo",
      location: "Coastal Terminal to Inland Station",
      serviceOrProduct: "Dry natural gas",
      pipeMaterial: "Carbon Steel",
      pipeMaterialOther: null,
      pipeGrade: "API 5L X65",
      pipeGradeOther: null,
      pipeLengthKm: 42.8,
      diameter: { inside: 762, outside: 813, unit: "mm" },
      wallThickness: { value: 14.3, unit: "mm" },
      maopBar: 94,
      operatingPressure: 68.4,
      operatingPressureUnit: "bar",
      status: "Demo Preview",
      createdAt,
      updatedAt: createdAt
    },
    summary: {
      pipelineCount: 6,
      assessmentCount: 28,
      riskCounts: { high: 4, medium: 9, low: 13, unknown: 2 },
      pipelineHealth: {
        status: "available",
        value: 84,
        reason: "Frontend demo preview integrity index from synthetic indicators."
      },
      maopUtilisation: {
        status: "available",
        value: 73,
        unit: "%",
        reason: "Frontend demo preview: operating pressure divided by MAOP."
      }
    },
    latestAssessment: {
      id: "demo-assessment-2026-09",
      type: "External",
      riskLevel: "Medium",
      riskScore: 62,
      inspectionDate: "2026-09-01T09:00:00.000Z",
      createdAt: "2026-09-01T10:15:00.000Z",
      routeLink: "/external-corrosion-assessment"
    },
    latestReport: {
      id: "demo-report-2026-09",
      assessmentId: "demo-assessment-2026-09",
      assessmentType: "External",
      riskLevel: "Medium",
      generatedAt: "2026-09-02T14:30:00.000Z",
      createdAt: "2026-09-02T14:30:00.000Z",
      routeLink: "/report"
    },
    activityTimeline: [
      {
        id: "demo-activity-report",
        type: "Report",
        title: "External corrosion report generated",
        timestamp: "2026-09-02T14:30:00.000Z",
        pipelineId: "demo-pipeline-alpha",
        routeLink: "/report",
        riskLevel: "Medium",
        status: "completed"
      },
      {
        id: "demo-activity-cp",
        type: "CpCalculation",
        title: "ICCP output reviewed",
        timestamp: "2026-09-02T11:15:00.000Z",
        pipelineId: "demo-pipeline-alpha",
        routeLink: "/cp-monitoring",
        status: "completed"
      },
      {
        id: "demo-activity-assessment",
        type: "Assessment",
        title: "External assessment updated",
        timestamp: "2026-09-01T10:15:00.000Z",
        pipelineId: "demo-pipeline-alpha",
        routeLink: "/external-corrosion-assessment",
        riskLevel: "Medium",
        status: "completed"
      }
    ],
    modules: {
      scada: {
        status: "available",
        reason: "Demo preview only. Real SCADA remains separate and not connected.",
        telemetry: "frontend_demo_fixture"
      },
      cpMonitoring: {
        status: "available",
        reason: "Demo preview CP compliance from local fixture values.",
        readingCount: 96,
        calculationCount: 8
      },
      iliAnalysis: {
        status: "available",
        reason: "Demo preview anomaly inventory.",
        inspectionRunCount: 3,
        anomalyCount: 12
      },
      alerts: {
        status: "available",
        reason: "Demo preview alerts from local fixture."
      },
      aiPredictions: {
        status: "ready",
        readyCapabilities: 5,
        blockedCapabilities: 3,
        reason: "Demo preview readiness only.",
        capabilities: {
          corrosionGrowthForecasting: { status: "ready", ready: true, reason: "Demo repeated inspections available.", requiredData: ["Repeated inspections"], availableData: ["Demo repeated inspections"] },
          remainingUsefulLife: { status: "ready", ready: true, reason: "Demo failure criterion available.", requiredData: ["Failure criterion"], availableData: ["Demo criterion"] },
          cpDriftPrediction: { status: "ready", ready: true, reason: "Demo CP history available.", requiredData: ["CP readings"], availableData: ["Demo CP readings"] },
          scadaAnomalyDetection: { status: "ready", ready: true, reason: "Demo telemetry available.", requiredData: ["Telemetry history"], availableData: ["Demo telemetry"] },
          defectPrediction: { status: "ready", ready: true, reason: "Demo defect history available.", requiredData: ["Defect history"], availableData: ["Demo anomalies"] },
          modelConfidence: { status: "model_not_configured", ready: false, reason: "No real evaluated model exists.", requiredData: ["Validated model"], availableData: ["Demo preview only"] },
          predictionScan: { status: "backend_not_implemented", ready: false, reason: "Real prediction scan is not implemented.", requiredData: ["Production prediction service"], availableData: ["Demo preview only"] },
          retraining: { status: "backend_not_implemented", ready: false, reason: "Real retraining is not implemented.", requiredData: ["Training pipeline"], availableData: ["Demo preview only"] }
        }
      }
    }
  },
  activeAnomalies: 12,
  inletPressureBar: 68.4,
  flowRateM3h: 1240,
  cpCompliancePercent: 87,
  telemetrySeries: [
    { time: "08:00", pressureBar: 67.8, flowM3h: 1215, temperatureC: 31.4, cpPotentialV: -0.91, cpCompliancePercent: 84, anomalyCount: 10, corrosionRateMpy: 2.1 },
    { time: "08:15", pressureBar: 68.1, flowM3h: 1230, temperatureC: 31.6, cpPotentialV: -0.93, cpCompliancePercent: 85, anomalyCount: 10, corrosionRateMpy: 2.0 },
    { time: "08:30", pressureBar: 68.4, flowM3h: 1240, temperatureC: 31.7, cpPotentialV: -0.95, cpCompliancePercent: 87, anomalyCount: 11, corrosionRateMpy: 2.2 },
    { time: "08:45", pressureBar: 68.0, flowM3h: 1228, temperatureC: 31.9, cpPotentialV: -0.94, cpCompliancePercent: 86, anomalyCount: 12, corrosionRateMpy: 2.3 },
    { time: "09:00", pressureBar: 68.7, flowM3h: 1252, temperatureC: 32.1, cpPotentialV: -0.96, cpCompliancePercent: 88, anomalyCount: 12, corrosionRateMpy: 2.4 },
    { time: "09:15", pressureBar: 68.3, flowM3h: 1244, temperatureC: 32.0, cpPotentialV: -0.95, cpCompliancePercent: 87, anomalyCount: 12, corrosionRateMpy: 2.3 }
  ],
  alerts: [
    { severity: "Warning", source: "Station B", message: "Pressure variance above demo advisory band", timestamp: "2026-09-10T09:12:00.000Z", status: "Open" },
    { severity: "Critical", source: "ILI Segment 14", message: "Demo anomaly cluster requires engineering review", timestamp: "2026-09-10T08:46:00.000Z", status: "Acknowledged" },
    { severity: "Info", source: "CP Rectifier 03", message: "Demo rectifier output stabilized", timestamp: "2026-09-10T08:25:00.000Z", status: "Closed" }
  ],
  agentActivity: [
    { title: "Anomaly triage", status: "Demo active", detail: "Ranking demo ILI anomalies by severity." },
    { title: "CP drift monitor", status: "Demo active", detail: "Watching synthetic CP trend bands." },
    { title: "Hydraulic watcher", status: "Demo active", detail: "Comparing demo pressure and flow profile." }
  ],
  architecture: [
    { title: "Data Intake", status: "Demo connected", detail: "Synthetic pipeline, CP, ILI and SCADA feeds" },
    { title: "SCADA Stream", status: "Demo stream", detail: "Local frontend-only time series" },
    { title: "Prediction Engine", status: "Demo preview", detail: "No production prediction service" },
    { title: "Retraining", status: "Not configured", detail: "No real training pipeline" }
  ]
};
