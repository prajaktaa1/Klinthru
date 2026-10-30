export type ReportTemplate = {
  id: string;
  title: string;
  description: string;
  tags: string[];
};

export type ReportPreviewKpi = {
  label: string;
  value: string;
};

export type ReportPreviewAnomaly = {
  id: string;
  kp: string;
  type: string;
  depthToThickness: string;
  rsf: string;
  rulYears: string;
  verdict: "REPAIR" | "MONITOR" | "SAFE";
};

export type ReportPreviewAction = {
  id: number;
  action: string;
  due: string;
  owner: string;
  status: "URGENT" | "PLANNED" | "ONGOING";
};

export type DeliveryHistoryItem = {
  title: string;
  metadata: string;
  recipient: string;
  status: "Delivered" | "Scheduled";
};

export const reportTemplates: ReportTemplate[] = [
  {
    id: "monthly-integrity",
    title: "Monthly Integrity Report",
    description: "Pipeline health score, ILI summary, CP status, SCADA overview, open defects. 8 pages.",
    tags: ["Monthly", "PDF", "All Modules"]
  },
  {
    id: "ili-analysis",
    title: "ILI Analysis Report",
    description: "Full anomaly register, B31G calculations, RSF table, corrosion growth charts.",
    tags: ["On-demand", "ILI", "ASME B31G"]
  },
  {
    id: "risk-assessment",
    title: "Risk Assessment Report",
    description: "ISO 31000 risk matrix, segment scoring, mitigation action register.",
    tags: ["Quarterly", "Risk", "ISO 31000"]
  },
  {
    id: "cp-survey",
    title: "CP Survey Report",
    description: "Test point readings, NACE compliance status, TP-05/06 drift, rectifier data.",
    tags: ["Monthly", "CP", "NACE SP0169"]
  },
  {
    id: "critical-defect",
    title: "Critical Defect Alert",
    description: "Immediate notification for REPAIR-class anomalies. One-page executive summary.",
    tags: ["Immediate", "Critical", "Executive"]
  },
  {
    id: "ai-prediction",
    title: "AI Prediction Report",
    description: "RUL curves, corrosion forecasts, CP drift extrapolation, model confidence.",
    tags: ["Monthly", "AI", "Forecast"]
  },
  {
    id: "defect-status",
    title: "Defect Status Report",
    description: "Open defect register with workflow status, repair progress, planned dates.",
    tags: ["Weekly", "Defects", "Status"]
  },
  {
    id: "scada-operations",
    title: "SCADA Operations Report",
    description: "24-hour P/F/T trend, mass balance, anomaly events, alarm history.",
    tags: ["Daily", "SCADA", "Ops"]
  },
  {
    id: "annual-integrity",
    title: "Annual Integrity Assessment",
    description: "Full PIMS summary, regulatory compliance, risk register, 5-year plan.",
    tags: ["Annual", "Regulatory", "Complete"]
  }
];

export const reportSections = [
  "Executive Summary",
  "KPI Dashboard",
  "ILI Analysis",
  "CP Monitoring",
  "SCADA / Sensors",
  "Risk Assessment",
  "Defect Register",
  "AI Predictions",
  "Action Summary",
  "Appendix / Data"
];

export const reportPreviewKpis: ReportPreviewKpi[] = [
  { label: "Health Score", value: "78 /100" },
  { label: "Peak Risk Score", value: "20" },
  { label: "Active Defects", value: "8" },
  { label: "Min RUL", value: "2.1 yr" }
];

export const reportPreviewAnomalies: ReportPreviewAnomaly[] = [
  { id: "F-005", kp: "38+900", type: "Metal Loss", depthToThickness: "64.0%", rsf: "0.61", rulYears: "2.1", verdict: "REPAIR" },
  { id: "F-006", kp: "52+750", type: "Metal Loss", depthToThickness: "35.0%", rsf: "0.84", rulYears: "6.8", verdict: "MONITOR" },
  { id: "F-003", kp: "28+600", type: "Metal Loss", depthToThickness: "29.0%", rsf: "0.88", rulYears: "9.2", verdict: "MONITOR" },
  { id: "F-007", kp: "67+300", type: "Crack/SCC", depthToThickness: "13.6%", rsf: "0.93", rulYears: "15.0", verdict: "SAFE" }
];

export const reportPreviewActions: ReportPreviewAction[] = [
  { id: 1, action: "Excavate & repair F-005 (Type B sleeve)", due: "Sep 07 2026", owner: "J. Williams", status: "URGENT" },
  { id: 2, action: "Rectifier R-02 output adjustment", due: "Aug 31 2026", owner: "CP Technician", status: "URGENT" },
  { id: 3, action: "DCVG survey SEG-03 & SEG-05", due: "Q4 2026", owner: "Survey Team", status: "PLANNED" },
  { id: 4, action: "HDD crossing CCTV - KP 63.5", due: "Q1 2027", owner: "Inspection Team", status: "ONGOING" }
];

export const deliveryHistory: DeliveryHistoryItem[] = [
  { title: "Monthly Integrity Report - Aug 2026", metadata: "8 pages - Aug 01, 2026 08:00", recipient: "integrity@pipeline.com", status: "Delivered" },
  { title: "Critical Defect Alert - F-005", metadata: "1 page - Aug 15, 2026 09:16", recipient: "ops@pipeline.com", status: "Delivered" },
  { title: "CP Survey Report - Q3 2026", metadata: "5 pages - Aug 22, 2026 12:00", recipient: "cp-team@pipeline.com", status: "Delivered" },
  { title: "Monthly Integrity Report - Sep 2026", metadata: "8 pages - Sep 01, 2026 08:00", recipient: "integrity@pipeline.com", status: "Scheduled" },
  { title: "Risk Assessment Report - Q3 2026", metadata: "6 pages - Sep 15, 2026 09:00", recipient: "integrity@pipeline.com", status: "Scheduled" }
];

export const executiveSummaryText =
  "This demo preview summarizes the integrity condition of Trunkline A using representative ILI, CP, SCADA, risk, and defect-management sections. Values shown here are frontend preview data only and are intended to demonstrate the future report layout, not operational status.";
