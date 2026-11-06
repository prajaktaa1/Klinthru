"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";

import { downloadDocumentVersion, fetchAssessments, fetchCpMonitoringData, fetchCpTestPoints, fetchDocuments, fetchIliReadiness, fetchMasterSegments, fetchPipelines, type CpLinkedTestPointRecord, type CpMonitoringRealData, type DocumentRepositoryItem, type IliReadiness } from "@/lib/apiClient";
import { getStoredAuthToken } from "@/lib/authStorage";
import { chainageSummary } from "@/lib/chainage";
import { type AssetMasterSegmentRecord, type ExternalCorrosionInput, type PipelineRecord, type StoredAssessment } from "@/lib/types";

type DataMode = "real" | "demo";
type EcdaStage = "Pre-Assessment" | "Indirect Inspection" | "Direct Examination" | "Post Assessment";
type EcdaTab = EcdaStage | "Overview" | "Findings" | "Actions" | "Documents" | "Trends & Historical" | "Configuration";
type Tone = "red" | "amber" | "cyan" | "blue" | "green";
type Band = "Protected" | "Marginal" | "Under-Protected";
type RealBand = Band | "Not Available";
type RealStatus = "loading" | "empty" | "error";

type CisReading = {
  testPoint: string;
  kp: number;
  eOn: number;
  eOff: number;
  irDrop: number;
  band: Band;
  classification: "MONITORED" | "SCHEDULED" | "IMMEDIATE";
};

type Anomaly = {
  id: string;
  kp: number;
  tool: string;
  dcvg: string;
  acvg: string;
  eOff: number;
  confidence: string;
  classification: "IMMEDIATE" | "SCHEDULED" | "MONITORED";
};

type AnomalyPriority = Anomaly["classification"];

type RealCisReading = {
  id: string;
  testPoint: string;
  kp: string;
  kpSort: number | null;
  eOn: number | null;
  eOff: number | null;
  irDrop: number | null;
  band: RealBand;
  classification: string;
  readingAt: string | null;
};

type RealSoilSnapshot = {
  sourceAssessmentId: string | null;
  sourceDate: string | null;
  resistivity: number | null;
  ph: number | null;
  moisture: number | null;
  h2s: number | null;
  redox: number | null;
};

type RealDirectAssessment = {
  sourceAssessmentId: string | null;
  sourceDate: string | null;
  pipelineName: string | null;
  pipeLocationId: string | null;
  measuredThickness: number | null;
  corrosionLength: number | null;
  corrosionWidth: number | null;
  previousInspectionDate: string | null;
  previousRemainingThickness: number | null;
  minimumRequiredThickness: number | null;
  wallThickness: number | null;
  corrosionRate: number | null;
  corrosionDepth: number | null;
  metalLossPercent: number | null;
  remainingLife: number | null;
  failurePressure: number | null;
  safetyMargin: number | null;
  recommendation: string | null;
  riskLevel: string | null;
  riskScore: number | null;
};

type DcvgResult = {
  percentIr: number;
  className: string;
  likelihood: string;
  priority: "MONITORED" | "SCHEDULED" | "SCHEDULED to IMM" | "IMMEDIATE";
  tone: "cyan" | "blue" | "amber" | "red";
};

type AcvgResult = {
  db: number;
  normalizedDb: number;
  holidaySize: string;
  priority: "MONITORED" | "SCHEDULED" | "SCHED to IMM" | "IMMEDIATE";
  tone: "cyan" | "blue" | "amber" | "red";
};

type WennerResult = {
  resistivity: number;
  classification: string;
  steelLife: string;
  anodeSuitability: string;
  tone: "red" | "amber" | "blue" | "cyan";
};

type AwwaResult = {
  resistivityPoints: number;
  phPoints: number;
  sulfidePoints: number;
  redoxPoints: number;
  moisturePoints: number;
  total: number;
  classification: string;
  tone: "red" | "amber" | "cyan";
};

const stages: Array<{ id: EcdaStage; number: string }> = [
  { id: "Pre-Assessment", number: "1" },
  { id: "Indirect Inspection", number: "2" },
  { id: "Direct Examination", number: "3" },
  { id: "Post Assessment", number: "4" }
];

const ecdaTabs: Array<{ id: EcdaTab; label: string }> = [
  { id: "Overview", label: "Overview" },
  ...stages.map((stage) => ({ id: stage.id, label: stage.id === "Post Assessment" ? "Post-Assessment" : stage.id })),
  ...(["Findings", "Actions", "Documents", "Trends & Historical", "Configuration"] as const).map((id) => ({ id, label: id }))
];

const demoKpis = [
  { label: "Immediate", value: "3", detail: "Require excavation ASAP", tone: "red" as const },
  { label: "Scheduled", value: "7", detail: "Excavate within project", tone: "amber" as const },
  { label: "Monitored", value: "12", detail: "Next reassessment cycle", tone: "cyan" as const },
  { label: "CIS Points", value: "247", detail: "@ 1 m interval (R-1)", tone: "blue" as const }
];

const realKpis = [
  { label: "Immediate", value: "Not Available", detail: "No real ECDA anomalies connected", tone: "red" as const },
  { label: "Scheduled", value: "Not Available", detail: "No real ECDA schedule connected", tone: "amber" as const },
  { label: "Monitored", value: "Not Available", detail: "No real monitoring register connected", tone: "cyan" as const },
  { label: "CIS Points", value: "Not Available", detail: "No real CIS survey loaded", tone: "blue" as const }
];

const notAvailable = "Not Available";

const directDemoKpis = [
  { label: "Excavations", value: "7", detail: "Completed in assessment region", tone: "blue" as const },
  { label: "Verified", value: "5", detail: "Anomalies confirmed in field", tone: "cyan" as const },
  { label: "Immediate", value: "3", detail: "Repair review required", tone: "red" as const },
  { label: "Measurements", value: "10", detail: "UT and visual records", tone: "amber" as const }
];

const directRealKpis = [
  { label: "Excavations", value: notAvailable, detail: "No direct-exam register connected", tone: "blue" as const },
  { label: "Verified", value: notAvailable, detail: "No ECDA verification source connected", tone: "cyan" as const },
  { label: "Immediate", value: notAvailable, detail: "No repair decision source connected", tone: "red" as const },
  { label: "Measurements", value: notAvailable, detail: "Assessment values shown below", tone: "amber" as const }
];

const postDemoKpis = [
  { label: "Findings", value: "22", detail: "Across four ECDA regions", tone: "blue" as const },
  { label: "Remediated", value: "15", detail: "Closed with evidence", tone: "cyan" as const },
  { label: "Open Priority", value: "3", detail: "Immediate actions remain", tone: "red" as const },
  { label: "Next Review", value: "12 mo", detail: "R-1 reassessment cycle", tone: "amber" as const }
];

const postRealKpis = [
  { label: "Findings", value: notAvailable, detail: "No ECDA findings register connected", tone: "blue" as const },
  { label: "Remediated", value: notAvailable, detail: "No remediation register connected", tone: "cyan" as const },
  { label: "Open Priority", value: notAvailable, detail: "No verified decision source connected", tone: "red" as const },
  { label: "Next Review", value: notAvailable, detail: "No reassessment schedule connected", tone: "amber" as const }
];

const emptyRealSoilSnapshot: RealSoilSnapshot = {
  sourceAssessmentId: null,
  sourceDate: null,
  resistivity: null,
  ph: null,
  moisture: null,
  h2s: null,
  redox: null
};

const emptyRealDirectAssessment: RealDirectAssessment = {
  sourceAssessmentId: null,
  sourceDate: null,
  pipelineName: null,
  pipeLocationId: null,
  measuredThickness: null,
  corrosionLength: null,
  corrosionWidth: null,
  previousInspectionDate: null,
  previousRemainingThickness: null,
  minimumRequiredThickness: null,
  wallThickness: null,
  corrosionRate: null,
  corrosionDepth: null,
  metalLossPercent: null,
  remainingLife: null,
  failurePressure: null,
  safetyMargin: null,
  recommendation: null,
  riskLevel: null,
  riskScore: null
};

const directDemoFindings = [
  { id: "EXC-01", kp: "12.34", location: "R-1 / north shoulder", finding: "Coating holiday with shallow corrosion", measured: "9.2 mm", loss: "18%", verification: "CONFIRMED", priority: "IMMEDIATE" as const },
  { id: "EXC-02", kp: "15.10", location: "R-1 / low point", finding: "External metal loss, elongated pit", measured: "10.8 mm", loss: "12%", verification: "CONFIRMED", priority: "SCHEDULED" as const },
  { id: "EXC-03", kp: "22.30", location: "R-1 / road crossing", finding: "Coating disbondment, no active pit", measured: "11.6 mm", loss: "6%", verification: "CONFIRMED", priority: "MONITORED" as const },
  { id: "EXC-04", kp: "28.95", location: "R-1 / drainage crossing", finding: "Deep isolated corrosion feature", measured: "8.4 mm", loss: "26%", verification: "CONFIRMED", priority: "IMMEDIATE" as const },
  { id: "EXC-05", kp: "35.50", location: "R-1 / field access", finding: "Anomaly not reproduced on exposed pipe", measured: "12.1 mm", loss: "-", verification: "NOT CONFIRMED", priority: "SCHEDULED" as const }
];

const postDemoFindings = [
  { id: "ANO-01", region: "R-1", finding: "Coating holiday and external metal loss", priority: "IMMEDIATE" as const, status: "Open", action: "Composite repair" },
  { id: "ANO-03", region: "R-1", finding: "Deep isolated corrosion feature", priority: "IMMEDIATE" as const, status: "Open", action: "Excavate and repair" },
  { id: "ANO-05", region: "R-1", finding: "Moderate corrosion with stable profile", priority: "SCHEDULED" as const, status: "In progress", action: "Repair package" },
  { id: "ANO-07", region: "R-2", finding: "Small coating holiday, protected CP", priority: "MONITORED" as const, status: "Closed", action: "Recheck next cycle" },
  { id: "ANO-09", region: "R-C", finding: "Anomaly not confirmed at excavation", priority: "MONITORED" as const, status: "Closed", action: "Retain evidence" }
];

const cisReadings: CisReading[] = [
  { testPoint: "TP-01", kp: 5.2, eOn: -954, eOff: -895, irDrop: -59, band: "Protected", classification: "MONITORED" },
  { testPoint: "TP-02", kp: 10.4, eOn: -903, eOff: -857, irDrop: -46, band: "Protected", classification: "MONITORED" },
  { testPoint: "TP-03", kp: 15.1, eOn: -863, eOff: -833, irDrop: -30, band: "Marginal", classification: "SCHEDULED" },
  { testPoint: "TP-04", kp: 19.8, eOn: -858, eOff: -784, irDrop: -74, band: "Marginal", classification: "SCHEDULED" },
  { testPoint: "TP-05", kp: 22.3, eOn: -925, eOff: -702, irDrop: -223, band: "Under-Protected", classification: "IMMEDIATE" },
  { testPoint: "TP-06", kp: 25.6, eOn: -808, eOff: -764, irDrop: -44, band: "Marginal", classification: "SCHEDULED" },
  { testPoint: "TP-07", kp: 28.9, eOn: -951, eOff: -885, irDrop: -66, band: "Protected", classification: "MONITORED" },
  { testPoint: "TP-08", kp: 32.4, eOn: -1067, eOff: -1017, irDrop: -50, band: "Protected", classification: "MONITORED" },
  { testPoint: "TP-09", kp: 35.7, eOn: -942, eOff: -865, irDrop: -77, band: "Protected", classification: "MONITORED" },
  { testPoint: "TP-10", kp: 38.1, eOn: -894, eOff: -844, irDrop: -50, band: "Marginal", classification: "SCHEDULED" }
];

const anomalies: Anomaly[] = [
  { id: "ANO-01", kp: 12.34, tool: "DCVG", dcvg: "68%", acvg: "-", eOff: -718, confidence: "HIGH (2/2)", classification: "IMMEDIATE" },
  { id: "ANO-02", kp: 22.3, tool: "CIS", dcvg: "-", acvg: "-", eOff: -712, confidence: "LOW (1 tool)", classification: "IMMEDIATE" },
  { id: "ANO-03", kp: 28.95, tool: "DCVG", dcvg: "38%", acvg: "-", eOff: -820, confidence: "HIGH (2/2)", classification: "IMMEDIATE" },
  { id: "ANO-04", kp: 7.8, tool: "DCVG", dcvg: "24%", acvg: "-", eOff: -862, confidence: "MOD (2/2)", classification: "SCHEDULED" },
  { id: "ANO-05", kp: 15.1, tool: "DCVG", dcvg: "18%", acvg: "-", eOff: -833, confidence: "MOD (2/2)", classification: "SCHEDULED" },
  { id: "ANO-06", kp: 31.2, tool: "CIS", dcvg: "-", acvg: "-", eOff: -804, confidence: "LOW (1/2)", classification: "SCHEDULED" },
  { id: "ANO-07", kp: 35.5, tool: "DCVG", dcvg: "11%", acvg: "-", eOff: -872, confidence: "MOD (2/2)", classification: "MONITORED" }
];

const toneText: Record<Tone, string> = {
  red: "text-[#ff6671]",
  amber: "text-[#f59e0b]",
  cyan: "text-[#00d6b7]",
  blue: "text-[#4a8cff]",
  green: "text-[#10b981]"
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function displayValue(value: string | number | null | undefined, suffix = "") {
  if (value === null || value === undefined || value === "") {
    return notAvailable;
  }

  return `${value}${suffix}`;
}

function parseKp(value: string | null) {
  return value ? chainageSummary(value)?.chainage_km ?? null : null;
}

function displayKp(value: string | null) {
  const parsed = parseKp(value);
  return parsed === null ? notAvailable : parsed.toString();
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : notAvailable;
}

function realBandFromStatus(status: string | null): RealBand {
  if (status === "Protected") {
    return "Protected";
  }

  if (status === "UnderProtected" || status === "Critical") {
    return "Under-Protected";
  }

  return "Not Available";
}

function bandTone(band: RealBand): "red" | "amber" | "cyan" | "blue" {
  if (band === "Protected") {
    return "cyan";
  }

  if (band === "Marginal") {
    return "amber";
  }

  if (band === "Under-Protected") {
    return "red";
  }

  return "blue";
}

function toRealCisReadings(data: CpMonitoringRealData | null): RealCisReading[] {
  if (!data) {
    return [];
  }

  return data.testPoints
    .map((point) => ({
      id: point.id,
      testPoint: point.code,
      kp: displayKp(point.kp),
      kpSort: parseKp(point.kp),
      eOn: point.eOnMv,
      eOff: point.eOffMv,
      irDrop: point.irDropMv,
      band: realBandFromStatus(point.protectionStatus),
      classification: point.protectionStatus ? point.protectionStatus.replace(/([a-z])([A-Z])/g, "$1 $2") : notAvailable,
      readingAt: point.readingAt
    }))
    .sort((left, right) => {
      if (left.kpSort !== null && right.kpSort !== null) {
        return left.kpSort - right.kpSort;
      }

      if (left.kpSort !== null) {
        return -1;
      }

      if (right.kpSort !== null) {
        return 1;
      }

      return left.testPoint.localeCompare(right.testPoint);
    });
}

function readRealSoilNumber(value: unknown, rule: "positive" | "nonNegative" | "finite") {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) {
    return null;
  }

  if (rule === "positive" && parsed <= 0) {
    return null;
  }

  if (rule === "nonNegative" && parsed < 0) {
    return null;
  }

  return parsed;
}

function assessmentTime(assessment: StoredAssessment) {
  const value = assessment.inspectionDate ?? assessment.createdAt;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function toRealSoilSnapshot(assessments: StoredAssessment[], pipelineId: string): RealSoilSnapshot {
  const latest = assessments
    .filter((assessment) => assessment.type === "External" && assessment.pipelineId === pipelineId)
    .sort((left, right) => assessmentTime(right) - assessmentTime(left))[0];

  if (!latest) {
    return emptyRealSoilSnapshot;
  }

  const input = latest.input as ExternalCorrosionInput;
  return {
    sourceAssessmentId: latest.id,
    sourceDate: latest.inspectionDate ?? latest.createdAt,
    resistivity: readRealSoilNumber(input.soilResistivity, "positive"),
    ph: readRealSoilNumber(input.soilPh, "positive"),
    moisture: readRealSoilNumber(input.soilMoisture, "nonNegative"),
    h2s: readRealSoilNumber(input.sulphideH2S, "nonNegative"),
    redox: readRealSoilNumber(input.redoxPotential, "finite")
  };
}

function toRealDirectAssessment(assessments: StoredAssessment[], pipelineId: string): RealDirectAssessment {
  const latest = assessments
    .filter((assessment) => assessment.type === "External" && assessment.pipelineId === pipelineId)
    .sort((left, right) => assessmentTime(right) - assessmentTime(left))[0];

  if (!latest) {
    return emptyRealDirectAssessment;
  }

  const input = latest.input as ExternalCorrosionInput;
  const result = latest.result as StoredAssessment["result"];
  return {
    sourceAssessmentId: latest.id,
    sourceDate: latest.inspectionDate ?? latest.createdAt,
    pipelineName: latest.pipelineName || null,
    pipeLocationId: input.pipeLocationId ?? null,
    measuredThickness: readRealSoilNumber(input.measuredThickness, "positive"),
    corrosionLength: readRealSoilNumber(input.corrosionLength, "positive"),
    corrosionWidth: readRealSoilNumber(input.corrosionWidth, "positive"),
    previousInspectionDate: input.previousInspectionDate || null,
    previousRemainingThickness: readRealSoilNumber(input.previousRemainingThickness, "positive"),
    minimumRequiredThickness: readRealSoilNumber(input.minimumRequiredThickness, "positive"),
    wallThickness: readRealSoilNumber(input.wallThickness, "positive"),
    corrosionRate: readRealSoilNumber(result && "corrosionRate" in result ? result.corrosionRate : null, "nonNegative"),
    corrosionDepth: readRealSoilNumber(result && "corrosionDepth" in result ? result.corrosionDepth : null, "nonNegative"),
    metalLossPercent: readRealSoilNumber(result && "metalLossPercent" in result ? result.metalLossPercent : null, "nonNegative"),
    remainingLife: readRealSoilNumber(result && "remainingLife" in result ? result.remainingLife : null, "nonNegative"),
    failurePressure: readRealSoilNumber(result && "failurePressure" in result ? result.failurePressure : null, "nonNegative"),
    safetyMargin: readRealSoilNumber(result && "safetyMargin" in result ? result.safetyMargin : null, "finite"),
    recommendation: result && "recommendation" in result && typeof result.recommendation === "string" && result.recommendation.trim() ? result.recommendation : null,
    riskLevel: latest.riskLevel || null,
    riskScore: readRealSoilNumber(latest.riskScore, "nonNegative")
  };
}

function Frame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={cx(
      "overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-panel",
      "dark:border-[#173858] dark:bg-[#0d2033] dark:text-[#e7f7ff] dark:shadow-[0_16px_42px_rgba(0,0,0,0.18)]",
        className
      )}>
      {children}
    </section>
  );
}

function FrameHeader({ title, code }: { title: string; code?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-[#173858] dark:bg-[#071522]">
      <h3 className="min-w-0 text-sm font-bold text-slate-950 dark:text-white">{title}</h3>
      {code ? <span className="ml-auto max-w-full break-words text-right font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-[#477ca9]">{code}</span> : null}
    </div>
  );
}

function Badge({ children, tone }: { children: ReactNode; tone: "red" | "amber" | "cyan" | "blue" }) {
  const styles = {
    red: "bg-rose-50 text-rose-700 dark:bg-[#3a2030] dark:text-[#ff6671]",
    amber: "bg-amber-50 text-amber-700 dark:bg-[#34301e] dark:text-[#f59e0b]",
    cyan: "bg-cyan-50 text-cyan-700 dark:bg-[#073e43] dark:text-[#00d6b7]",
    blue: "bg-blue-50 text-blue-700 dark:bg-[#123052] dark:text-[#58a6ff]"
  };
  return <span className={cx("inline-flex rounded-full px-3 py-1 text-xs font-bold", styles[tone])}>{children}</span>;
}

function priorityTone(priority: AnomalyPriority): "red" | "amber" | "cyan" {
  if (priority === "IMMEDIATE") {
    return "red";
  }

  if (priority === "SCHEDULED") {
    return "amber";
  }

  return "cyan";
}

function confidenceBadgeClass(confidence: string) {
  if (confidence.startsWith("HIGH")) {
    return "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-[#00d6b7]/30 dark:bg-[#073e43] dark:text-[#00d6b7]";
  }

  if (confidence.startsWith("MOD")) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-[#f59e0b]/30 dark:bg-[#34301e] dark:text-[#f59e0b]";
  }

  return "border-slate-200 bg-slate-50 text-slate-600 dark:border-[#477ca9]/30 dark:bg-[#102844] dark:text-[#78bdf2]";
}

function calculateDcvgPercent(defectMv: number, eOnMv: number, eOffMv: number) {
  const total = Math.abs(eOnMv - eOffMv);
  if (!(defectMv > 0) || !(total > 0)) {
    return 0;
  }

  return Math.max(0, (defectMv / total) * 100);
}

function classifyDcvg(percentIr: number): DcvgResult {
  if (percentIr < 15) {
    return {
      percentIr,
      className: "Minor",
      likelihood: "Unlikely - small holiday, good CP",
      priority: "MONITORED",
      tone: "cyan"
    };
  }

  if (percentIr < 35) {
    return {
      percentIr,
      className: "Moderate",
      likelihood: "Possible - moderate coating defect",
      priority: "SCHEDULED",
      tone: "blue"
    };
  }

  if (percentIr <= 60) {
    return {
      percentIr,
      className: "Significant",
      likelihood: "Probable - large holiday, reduced CP",
      priority: "SCHEDULED to IMM",
      tone: "amber"
    };
  }

  return {
    percentIr,
    className: "Severe",
    likelihood: "Highly likely - major coating failure",
    priority: "IMMEDIATE",
    tone: "red"
  };
}

function calculateAcvgDb(upstreamMa: number, downstreamMa: number, distanceM: number) {
  if (!(upstreamMa > 0) || !(downstreamMa > 0)) {
    return { db: 0, normalizedDb: 0 };
  }

  const db = 20 * Math.log10(upstreamMa / downstreamMa);
  const normalizedDb = distanceM > 0 ? db * (100 / distanceM) : db;
  return { db: Math.max(0, db), normalizedDb: Math.max(0, normalizedDb) };
}

function classifyAcvg(normalizedDb: number): AcvgResult {
  if (normalizedDb < 3) {
    return {
      db: 0,
      normalizedDb,
      holidaySize: "Pinhole (<1 cm2)",
      priority: "MONITORED",
      tone: "cyan"
    };
  }

  if (normalizedDb < 10) {
    return {
      db: 0,
      normalizedDb,
      holidaySize: "Moderate (1-50 cm2)",
      priority: "SCHEDULED",
      tone: "blue"
    };
  }

  if (normalizedDb <= 20) {
    return {
      db: 0,
      normalizedDb,
      holidaySize: "Large (50-500 cm2)",
      priority: "SCHED to IMM",
      tone: "amber"
    };
  }

  return {
    db: 0,
    normalizedDb,
    holidaySize: "Major failure (>500 cm2)",
    priority: "IMMEDIATE",
    tone: "red"
  };
}

function calculateWennerResistivity(pinSpacingCm: number, voltageMv: number, currentMa: number) {
  if (!(pinSpacingCm > 0) || !(voltageMv > 0) || !(currentMa > 0)) {
    return 0;
  }

  const resistanceOhm = voltageMv / currentMa;
  return 2 * Math.PI * pinSpacingCm * resistanceOhm;
}

function classifyWenner(resistivity: number): WennerResult {
  if (resistivity < 1000) {
    return {
      resistivity,
      classification: "Extremely corrosive",
      steelLife: "< 5 yr",
      anodeSuitability: "Excellent location",
      tone: "red"
    };
  }

  if (resistivity < 5000) {
    return {
      resistivity,
      classification: "Very corrosive",
      steelLife: "5-15 yr",
      anodeSuitability: "Good",
      tone: "amber"
    };
  }

  if (resistivity < 10000) {
    return {
      resistivity,
      classification: "Corrosive",
      steelLife: "15-20 yr",
      anodeSuitability: "Acceptable",
      tone: "amber"
    };
  }

  if (resistivity <= 30000) {
    return {
      resistivity,
      classification: "Mildly corrosive",
      steelLife: "20-50 yr",
      anodeSuitability: "Marginal",
      tone: "blue"
    };
  }

  return {
    resistivity,
    classification: "Non-corrosive",
    steelLife: "> 50 yr",
    anodeSuitability: "Poor (high R_v)",
    tone: "cyan"
  };
}

function scoreAwwaResistivity(resistivity: number) {
  if (resistivity < 1500) {
    return 10;
  }

  if (resistivity < 5000) {
    return 5;
  }

  if (resistivity < 10000) {
    return 2;
  }

  return 0;
}

function scoreAwwaPh(ph: number) {
  if (ph <= 4 || ph >= 8.5) {
    return 3;
  }

  return 0;
}

function scoreAwwaSulfide(value: string) {
  return value === "Detected" ? 3 : 0;
}

function scoreAwwaRedox(redoxMv: number) {
  if (redoxMv < 50) {
    return 3;
  }

  if (redoxMv < 100) {
    return 2;
  }

  return 0;
}

function scoreAwwaMoisture(moisturePercent: number) {
  return moisturePercent >= 20 ? 2 : 0;
}

function calculateAwwaScore({
  resistivity,
  ph,
  sulfide,
  redox,
  moisture
}: {
  resistivity: number;
  ph: number;
  sulfide: string;
  redox: number;
  moisture: number;
}): AwwaResult {
  const resistivityPoints = scoreAwwaResistivity(resistivity);
  const phPoints = scoreAwwaPh(ph);
  const sulfidePoints = scoreAwwaSulfide(sulfide);
  const redoxPoints = scoreAwwaRedox(redox);
  const moisturePoints = scoreAwwaMoisture(moisture);
  const total = resistivityPoints + phPoints + sulfidePoints + redoxPoints + moisturePoints;

  if (total >= 10) {
    return {
      resistivityPoints,
      phPoints,
      sulfidePoints,
      redoxPoints,
      moisturePoints,
      total,
      classification: "Severely corrosive",
      tone: "red"
    };
  }

  if (total >= 5) {
    return {
      resistivityPoints,
      phPoints,
      sulfidePoints,
      redoxPoints,
      moisturePoints,
      total,
      classification: "Corrosive",
      tone: "amber"
    };
  }

  return {
    resistivityPoints,
    phPoints,
    sulfidePoints,
    redoxPoints,
    moisturePoints,
    total,
    classification: "Low concern",
    tone: "cyan"
  };
}

function DataModeSwitch({ mode, setMode }: { mode: DataMode; setMode: (mode: DataMode) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-[#1d4568] dark:bg-[#071522]" aria-label="ECDA data mode">
      {(["real"] as const).map((item) => (
        <button
          className={cx(
            "rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] transition",
            mode === item ? "bg-cyan-600 text-white dark:bg-[#00d6b7] dark:text-[#04111d]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-[#6fa6d3] dark:hover:bg-[#0d2033] dark:hover:text-white"
          )}
          key={item}
          onClick={() => setMode(item)}
          type="button"
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function KpiCard({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: Tone }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-cyan-300 dark:border-[#1d4568] dark:bg-[#0b1d30] dark:hover:border-[#00d6b7]/60">
      <p className={cx("text-3xl font-black leading-none", toneText[tone])}>{value}</p>
      <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-cyan-700 dark:text-[#78bdf2]">{label}</p>
      <p className="mt-2 text-xs text-slate-500 dark:text-[#477ca9]">{detail}</p>
    </article>
  );
}

function StageTabs({ activeStage, setActiveStage }: { activeStage: EcdaTab; setActiveStage: (stage: EcdaTab) => void }) {
  return (
    <nav aria-label="ECDA assessment tabs" className="flex overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-[#1d4568] dark:bg-[#0b1d30]">
      {ecdaTabs.map((stage) => {
        const active = activeStage === stage.id;
        return (
          <button
            aria-pressed={active}
            className={cx(
              "shrink-0 border-r border-slate-200 px-4 py-4 text-center transition duration-300 dark:border-[#1d4568] last:border-r-0",
              active ? "bg-cyan-50 text-cyan-700 shadow-[inset_0_-2px_0_#0891b2] dark:bg-[#063b3d] dark:text-[#00d6b7] dark:shadow-[inset_0_-2px_0_#00d6b7]" : "text-slate-500 hover:bg-slate-50 dark:text-[#6fa6d3] dark:hover:bg-[#102844]"
            )}
            key={stage.id}
            onClick={() => setActiveStage(stage.id)}
            type="button"
          >
            <span className="block text-xs font-bold">{stage.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function RealUnavailable({ title = "Not Available", detail, status = "empty" }: { title?: string; detail: string; status?: RealStatus }) {
  const statusTone: "red" | "amber" | "blue" = status === "error" ? "red" : status === "loading" ? "amber" : "blue";
  const statusLabel = status === "error" ? "Error" : status === "loading" ? "Loading" : notAvailable;

  return (
    <Frame className="p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-base font-bold text-slate-950 dark:text-white">{title}</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-[#6fa6d3]">{detail}</p>
        </div>
        <Badge tone={statusTone}>{statusLabel}</Badge>
      </div>
    </Frame>
  );
}

type PreAssessmentChecklistItem = {
  id: string;
  title: string;
  detail: string;
  required: boolean;
  checked: boolean;
};

const preAssessmentKpis = [
  { label: "Regions Defined", value: "3", detail: "SP0502 §4.2", tone: "cyan" as const },
  { label: "Data Completeness", value: "91%", detail: "≥70% required", tone: "green" as const },
  { label: "Tools Selected", value: "2", detail: "Min 2 per region", tone: "amber" as const },
  { label: "ECDA Cycle", value: "1st", detail: "First-time application", tone: "blue" as const }
];

const realPreAssessmentKpis = [
  { label: "Regions Defined", value: notAvailable, detail: "REAL region source not connected", tone: "cyan" as const },
  { label: "Data Completeness", value: notAvailable, detail: "REAL checklist source not connected", tone: "green" as const },
  { label: "Tools Selected", value: notAvailable, detail: "REAL tool selection source not connected", tone: "amber" as const },
  { label: "ECDA Cycle", value: notAvailable, detail: "REAL cycle source not connected", tone: "blue" as const }
];

const initialPreAssessmentChecklist: PreAssessmentChecklistItem[] = [
  { id: "construction", title: "Construction records", detail: "pipe material, API grade, seam type, wall thickness", required: true, checked: true },
  { id: "coating", title: "Coating records", detail: "FBE type, application year, thickness", required: true, checked: true },
  { id: "cp", title: "CP system records", detail: "rectifier outputs, survey history", required: true, checked: true },
  { id: "operating", title: "Operating records", detail: "MAOP, temperature, product type", required: true, checked: true },
  { id: "gis", title: "GIS alignment sheets", detail: "route, elevation, crossings", required: true, checked: true },
  { id: "soil", title: "Soil surveys", detail: "resistivity, moisture, drainage", required: true, checked: true },
  { id: "prior-integrity", title: "Prior integrity assessments", detail: "ILI results, pressure test, leak history", required: true, checked: true },
  { id: "stray-current", title: "Stray current sources", detail: "DC rail proximity, HVAC lines", required: false, checked: false },
  { id: "casing", title: "Casing details", detail: "locations, insulator status", required: false, checked: true },
  { id: "seam", title: "Seam type documentation", detail: "ERW / SAW / seamless", required: false, checked: false }
];

const preAssessmentRegions = [
  { region: "R-1", tone: "cyan" as const, chainage: "KP 0-38.5", condition: "Sandy loam, rho avg 4,200 ohm-cm, FBE coat", tools: "CIS + DCVG", status: "Complete", statusTone: "cyan" as const },
  { region: "R-C", tone: "amber" as const, chainage: "KP 38.5-39.2", condition: "Cased road crossing - separate region", tools: "DCVG only", status: "In Progress", statusTone: "amber" as const },
  { region: "R-2", tone: "blue" as const, chainage: "KP 39.2-91.0", condition: "Clay-rich, rho avg 1,800 ohm-cm, FBE coat", tools: "CIS + ACVG", status: "Scheduled", statusTone: "cyan" as const }
];

function PreAssessmentDemo() {
  const [checklist, setChecklist] = useState(initialPreAssessmentChecklist);
  const requiredItems = checklist.filter((item) => item.required);
  const supplementalItems = checklist.filter((item) => !item.required);
  const requiredComplete = requiredItems.filter((item) => item.checked).length;
  const supplementalComplete = supplementalItems.filter((item) => item.checked).length;

  function toggleChecklistItem(id: string) {
    setChecklist((items) => items.map((item) => item.id === id ? { ...item, checked: !item.checked } : item));
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-2">
        <Frame>
          <FrameHeader title="Data Collection Checklist" code="SP0502 §4.1" />
          <div className="p-5">
            <div className="space-y-2">
              {checklist.map((item) => (
                <button
                  aria-pressed={item.checked}
                  className={cx(
                    "flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition duration-300 hover:-translate-y-0.5",
                    item.checked
                      ? "border-emerald-300 bg-emerald-50 dark:border-[#00d6b7] dark:bg-[#073e43]"
                      : "border-slate-200 bg-slate-50 dark:border-[#1d4568] dark:bg-[#071522]"
                  )}
                  key={item.id}
                  onClick={() => toggleChecklistItem(item.id)}
                  type="button"
                >
                  <span className={cx(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-black",
                    item.checked ? "border-emerald-400 bg-emerald-400 text-white dark:border-[#37d8b3] dark:bg-[#37d8b3] dark:text-[#04111d]" : "border-slate-300 text-transparent dark:border-[#1d4568]"
                  )}>✓</span>
                  <span className="min-w-0 flex-1 text-sm text-slate-700 dark:text-[#8bbce5]">
                    <span className="font-medium">{item.title}</span>
                    <span className="text-slate-500 dark:text-[#6fa6d3]"> - {item.detail}</span>
                  </span>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-[#477ca9]">{item.required ? "Required" : "Suppl."}</span>
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500 dark:text-[#477ca9]">
              Click items to toggle. Required items: {requiredComplete}/{requiredItems.length} ✓ - Supplemental: {supplementalComplete}/{supplementalItems.length} ✓
            </p>
          </div>
        </Frame>

        <Frame>
          <FrameHeader title="Region Definitions" code="SP0502 §4.3" />
          <div className="p-5">
            <div className="overflow-x-auto">
              <table className="min-w-[700px] w-full text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-[0.12em] text-cyan-700 dark:bg-[#06111f] dark:text-[#78bdf2]">
                  <tr>{["Region", "Chainage", "Soil / Condition", "Tools", "Status"].map((heading) => <th className="px-3 py-3 font-bold" key={heading}>{heading}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-[#173858]">
                  {preAssessmentRegions.map((region) => (
                    <tr className="transition hover:bg-cyan-50/60 dark:hover:bg-[#06111f]/60" key={region.region}>
                      <td className="px-3 py-4"><Badge tone={region.tone}>{region.region}</Badge></td>
                      <td className="px-3 py-4 font-mono text-slate-700 dark:text-white">{region.chainage}</td>
                      <td className="px-3 py-4 text-slate-700 dark:text-white">{region.condition}</td>
                      <td className="px-3 py-4 text-slate-700 dark:text-white">{region.tools}</td>
                      <td className="px-3 py-4"><Badge tone={region.statusTone}>{region.status === "Complete" ? "✓ Complete" : region.status === "In Progress" ? "⚠ In Progress" : "▶ Scheduled"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-slate-700 dark:border-[#f59e0b] dark:bg-[#1f1d12] dark:text-[#78bdf2]">
              <span className="font-bold text-[#f59e0b]">Region Boundary Triggers (SP0502):</span> Coating type change - Soil resistivity shift - Cased crossings (mandatory separate) - Stray current zone - Paved/concrete surface - CP zone boundary - Depth-of-cover variation &gt;1.5 m
            </div>
          </div>
        </Frame>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Frame>
          <FrameHeader title="Feasibility Determination" code="SP0502 §4.2" />
          <div className="p-5">
            <RuleTable
              headings={["Check", "Pass Condition", "Status"]}
              rows={[
                ["Historical data coverage", "≥70% of segment", <Badge tone="cyan">✓ 91%</Badge>],
                ["Field access / right-of-way", "ROW accessible", <Badge tone="cyan">✓ Confirmed</Badge>],
                ["Soil resistivity for CIS", "rho &gt; 1,000 ohm-cm most areas", <Badge tone="cyan">✓ Min 1,200 ohm-cm</Badge>],
                ["Cased crossing length", "&lt; 30% of segment", <Badge tone="cyan">✓ 0.8%</Badge>],
                ["CP system in service", "Active protection confirmed", <Badge tone="cyan">✓ R-01 &amp; R-02 active</Badge>]
              ]}
            />
            <div className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 dark:border-[#00d6b7] dark:bg-[#073e43] dark:text-[#00d6b7]">
              ✓ ECDA FEASIBLE - all checks pass. Proceed to Phase 2.
            </div>
          </div>
        </Frame>

        <Frame>
          <FrameHeader title="Tool Selection Matrix" code="SP0502 §4.4 - min 2 complementary tools" />
          <div className="p-5">
            <RuleTable
              headings={["Tool", "Principle", "Region", "Limitation"]}
              rows={[
                [<strong>CIS</strong>, "Pipe-to-soil potential at 1 m intervals", <span className="flex flex-wrap gap-1"><Badge tone="cyan">R-1</Badge><Badge tone="blue">R-2</Badge></span>, "Stray current affects readings"],
                [<strong>DCVG</strong>, "Voltage gradient → coating holiday %IR", <span className="flex flex-wrap gap-1"><Badge tone="cyan">R-1</Badge><Badge tone="amber">R-C</Badge></span>, "Needs CP interruption"],
                [<strong>ACVG</strong>, "AC signal leakage from holidays (dB)", <Badge tone="blue">R-2</Badge>, "No CP effectiveness data"],
                [<strong>PCM</strong>, "Current attenuation dB/100 m", "Pavement zones", "Location only, not severity"]
              ]}
            />
          </div>
        </Frame>
      </div>
    </div>
  );
}

type EcdaSegmentContext = {
  segments: AssetMasterSegmentRecord[];
  segmentId: string;
  segmentLoading: boolean;
  segmentError: string;
  onSelectSegment: (id: string) => void;
};

function PreAssessmentAction({ children, reason }: { children: ReactNode; reason: string }) {
  return <button type="button" disabled title={reason} aria-label={`${children}: ${reason}`} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-cyan-700 opacity-50 disabled:cursor-not-allowed dark:border-[#1d4568] dark:text-[#78bdf2]">{children}</button>;
}

function PreAssessmentFields({ rows }: { rows: Array<[string, string]> }) {
  return <dl className="divide-y divide-slate-200 text-xs dark:divide-[#173858]">{rows.map(([label, value]) => <div key={label} className="grid grid-cols-2 gap-3 py-2"><dt className="font-bold">{label}</dt><dd className="break-words">{value}</dd></div>)}</dl>;
}

function RealPreAssessment({ pipelines, pipelineId, pipelineLoading, onSelectPipeline, segments, segmentId, segmentLoading, segmentError, onSelectSegment, cp, cpLoading, cpError, assessments, assessmentLoading, assessmentError, refreshKey }: EcdaSegmentContext & {
  pipelines: PipelineRecord[]; pipelineId: string; pipelineLoading: boolean; onSelectPipeline: (id: string) => void;
  cp: CpMonitoringRealData | null; cpLoading: boolean; cpError: string;
  assessments: StoredAssessment[]; assessmentLoading: boolean; assessmentError: string; refreshKey: number;
}) {
  const pipeline = pipelines.find((record) => record.id === pipelineId);
  const segment = segments.find((record) => record.id === segmentId && record.pipelineId === pipelineId);
  const scopeKey = JSON.stringify([pipelineId, segment?.id ?? "", refreshKey]);
  const [sources, setSources] = useState<{
    scopeKey: string; loading: boolean; documents: DocumentRepositoryItem[]; documentTotal: number | null;
    ili: IliReadiness | null; documentError: string; iliError: string;
  } | null>(null);
  useEffect(() => {
    let live = true;
    setSources(null);
    if (!pipelineId) return () => { live = false; };
    const filters = { pipelineId, ...(segment?.id ? { segmentId: segment.id } : {}), page: 1, pageSize: 5 };
    void Promise.allSettled([fetchDocuments(filters), fetchIliReadiness(pipelineId)]).then(([documents, ili]) => {
      if (!live) return;
      setSources({
        scopeKey, loading: false,
        documents: documents.status === "fulfilled" ? documents.value.items : [],
        documentTotal: documents.status === "fulfilled" ? documents.value.total : null,
        ili: ili.status === "fulfilled" && ili.value.pipelineId === pipelineId ? ili.value : null,
        documentError: documents.status === "rejected" ? "Document source could not be loaded." : "",
        iliError: ili.status === "rejected" ? "ILI source could not be loaded." : ""
      });
    });
    return () => { live = false; };
  }, [pipelineId, segment?.id, scopeKey]);
  const currentSources = sources?.scopeKey === scopeKey ? sources : null;
  const sourceCp = !cpError && cp?.pipelineId === pipelineId ? cp : null;
  const external = !assessmentLoading && !assessmentError ? assessments.filter((record) => record.pipelineId === pipelineId && record.type === "External") : [];
  const unavailableRows = (labels: string[]): Array<[string, string]> => labels.map((label) => [label, notAvailable]);
  const disabledEdit = <PreAssessmentAction reason="Saving ECDA decisions requires an approved assessment record and persistence API.">Edit</PreAssessmentAction>;
  const disabledDetails = <PreAssessmentAction reason="An assessment-linked evidence drawer is not available.">View Details</PreAssessmentAction>;
  const selectClass = "mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-[#1d4568] dark:bg-[#071522]";
  const sourceNote = "Pipeline source context only. Selected ECDA evidence and completeness are not verified.";
  return <div className="space-y-5" aria-label="REAL ECDA Pre-Assessment">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-black">Pre-Assessment</h2><p className="mt-2 text-sm text-slate-500 dark:text-[#6fa6d3]">Define scope, assess data availability, review historical information and determine ECDA applicability and approach.</p></div><ol aria-label="ECDA lifecycle" className="flex flex-wrap gap-3 text-xs">{stages.map((stage) => <li key={stage.id}>{stage.number}. {stage.id === "Post Assessment" ? "Post-Assessment" : stage.id}</li>)}</ol></div>
    <Frame><div className="grid gap-4 p-4 sm:grid-cols-2"><label className="text-xs font-bold">Pipeline<select aria-label="Pre-Assessment pipeline" className={selectClass} disabled={pipelineLoading} value={pipelineId} onChange={(event) => onSelectPipeline(event.target.value)}><option value="">{pipelineLoading ? "Loading pipelines..." : "Select pipeline"}</option>{pipelines.map((record) => <option key={record.id} value={record.id}>{record.pipelineCode} - {record.pipelineName}</option>)}</select></label><label className="text-xs font-bold">Segment<select aria-label="Pre-Assessment segment" className={selectClass} disabled={!pipelineId || segmentLoading} value={segment?.id ?? ""} onChange={(event) => onSelectSegment(event.target.value)}><option value="">{segmentLoading ? "Loading segments..." : "Select segment"}</option>{segments.filter((record) => record.pipelineId === pipelineId).map((record) => <option key={record.id} value={record.id}>{record.segmentId}</option>)}</select></label></div></Frame>
    {[segmentError, cpError, assessmentError, currentSources?.documentError, currentSources?.iliError].filter(Boolean).map((error, index) => <p key={`${index}-${error}`} role="alert" className="text-sm text-red-600 dark:text-red-300">{error}</p>)}
    <p className="text-xs text-slate-500 dark:text-[#6fa6d3]">{sourceNote} ECDA assessment and Pre-Assessment IDs: {notAvailable}.</p>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <OverviewPanel title="1. Assessment Scope Definition" action={disabledEdit}><PreAssessmentFields rows={[
        ["Pipeline", pipeline ? `${pipeline.pipelineCode} - ${pipeline.pipelineName}` : notAvailable],
        ["Segment", segment ? `${segment.segmentId} (KP ${segment.startKp?.trim() || notAvailable} - ${segment.endKp?.trim() || notAvailable})` : notAvailable],
        ...unavailableRows(["Length", "Scope Type", "Assessment Driver", "Target Completion", "Description"])
      ]} /><p className="mt-3 text-xs text-slate-500 dark:text-[#6fa6d3]">Source Pipeline ID: {pipeline?.id ?? notAvailable}<br />Source Segment ID: {segment?.id ?? notAvailable}</p></OverviewPanel>
      <OverviewPanel title="2. Route / Segment Screening" action={<PreAssessmentAction reason="Verified route geometry and a GIS destination are not available.">View on Map</PreAssessmentAction>}><p className="py-6 text-center">{notAvailable}</p><PreAssessmentFields rows={[["From KP", segment?.startKp?.trim() || notAvailable], ["To KP", segment?.endKp?.trim() || notAvailable]]} /><p className="mt-3 text-xs text-slate-500 dark:text-[#6fa6d3]">Pipeline Route · Segment · Other Segments · Facilities · KP Marker: {notAvailable}</p></OverviewPanel>
      <OverviewPanel title="3. Data Availability Checklist"><p className="mb-3 text-xs">Completeness: {notAvailable}</p><ul className="space-y-2 text-xs">{["Pipeline / Asset Master Data", "CP Monitoring Data", "External Corrosion Records", "ILI Analysis Data", "Historical Inspection Records", "Environmental & Geohazard Data", "Coating & Construction Records", "Right of Way / Land Use Data", "Third Party Interference Records", "Relevant Documents"].map((label) => <li key={label} className="flex justify-between gap-2"><span>{label}</span><span className="shrink-0">{notAvailable}</span></li>)}</ul><p className="mt-3 text-xs text-slate-500 dark:text-[#6fa6d3]">UNVERIFIED: checklist totals and source qualification rules require reconciliation. Source presence does not establish completeness.</p></OverviewPanel>
      <OverviewPanel title="4. Region / Environment Context" action={disabledEdit}><PreAssessmentFields rows={unavailableRows(["Environment", "Terrain", "Soil Type", "Climate", "Population Density", "Third Party Activity", "Geohazards", "Special Considerations"])} /><p className="mt-3 text-xs text-slate-500 dark:text-[#6fa6d3]">Region-specific soil evidence is {notAvailable}. Pipeline source observations:</p><ul className="mt-2 space-y-2 text-xs">{external.length ? external.map((record) => <li key={record.id} className="break-words">{record.id}: {(record.input as ExternalCorrosionInput).soilType || notAvailable}</li>) : <li>{notAvailable}</li>}</ul></OverviewPanel>
      <OverviewPanel title="5. Historical Incident Review" action={disabledDetails}><OverviewTable headers={["Date", "Type", "Location (KP)", "Description"]} /><p className="mt-3 text-xs text-slate-500 dark:text-[#6fa6d3]">Incident records and inspection indications have distinct meanings. Incident correlation is UNVERIFIED.</p></OverviewPanel>
      <OverviewPanel title="6. Prior Inspection & CP Review" action={disabledDetails}><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr>{["Type", "Date", "Coverage", "Key Findings", "Source Record ID"].map((label) => <th key={label} scope="col" className="px-2 py-2">{label}</th>)}</tr></thead><tbody>
        {!cpLoading && sourceCp?.surveys.map((survey) => <tr key={`cp-${survey.id}`}><td className="px-2 py-2">CP Survey</td><td className="px-2 py-2">{formatDate(survey.surveyDate)}</td><td className="px-2 py-2">{notAvailable}</td><td className="px-2 py-2">{notAvailable}</td><td className="break-all px-2 py-2">{survey.id}</td></tr>)}
        {external.map((record) => <tr key={`external-${record.id}`}><td className="px-2 py-2">External Corrosion Assessment</td><td className="px-2 py-2">{formatDate(record.inspectionDate ?? null)}</td><td className="px-2 py-2">{notAvailable}</td><td className="px-2 py-2">{notAvailable}</td><td className="break-all px-2 py-2">{record.id}</td></tr>)}
        {(!sourceCp?.surveys.length || cpLoading) && !external.length ? <tr><td colSpan={5} className="px-2 py-6 text-center">{notAvailable}</td></tr> : null}
      </tbody></table></div><p className="mt-3 text-xs text-slate-500 dark:text-[#6fa6d3]">{sourceNote} CIS, DCVG, ACVG and ILI run evidence: {notAvailable}. CP protection percentage is not inspection coverage.</p></OverviewPanel>
      <OverviewPanel title="7. ECDA Applicability Decision"><PreAssessmentFields rows={unavailableRows(["Applicable?", "Rationale", "Assessment Scope", "Recommended Approach", "Approval", "Data Limitations", "Engineer", "Reviewer"])} /></OverviewPanel>
      <OverviewPanel title="8. Selected Indirect Inspection Methods" action={disabledEdit}><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr>{["Method", "Selected", "Rationale"].map((label) => <th key={label} scope="col" className="px-2 py-2">{label}</th>)}</tr></thead><tbody>{["CIS", "DCVG", "ACVG", "Aerial Survey", "Satellite Imagery", "Soil Resistivity Survey"].map((method) => <tr key={method}><td className="px-2 py-2">{method}</td><td className="px-2 py-2">{notAvailable}</td><td className="px-2 py-2">{notAvailable}</td></tr>)}</tbody></table></div></OverviewPanel>
      <OverviewPanel title="9. Stakeholders / Responsible Persons" action={disabledEdit}><OverviewTable headers={["Role", "Name", "Department", "Contact"]} /><p className="mt-3 text-xs text-slate-500 dark:text-[#6fa6d3]">Assessment assignments are {notAvailable}.</p></OverviewPanel>
      <OverviewPanel title="10. Schedule and Milestones" action={disabledEdit}><OverviewTable headers={["Milestone", "Target Date", "Status"]} /><p className="mt-3 text-xs text-slate-500 dark:text-[#6fa6d3]">UNVERIFIED: milestone ordering and stage prerequisites need approval.</p></OverviewPanel>
      <OverviewPanel title="11. Status Tracker" action={<PreAssessmentAction reason="A persisted ECDA stage-gate and approval workflow is not available.">View Workflow</PreAssessmentAction>}><ol className="space-y-3 text-xs">{stages.map((stage) => <li key={stage.id}><p className="font-bold">{stage.id === "Post Assessment" ? "Post-Assessment" : stage.id}</p><p className="mt-1">{notAvailable}</p></li>)}</ol></OverviewPanel>
      <OverviewPanel title="12. Required Inputs" action={disabledDetails}><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr>{["Source", "Status", "Last Updated"].map((label) => <th key={label} scope="col" className="px-2 py-2">{label}</th>)}</tr></thead><tbody>{["CP Monitoring", "External Corrosion", "ILI Analysis", "Pipeline / Asset Master", "Document Management"].map((label) => <tr key={label}><td className="px-2 py-2">{label}</td><td className="px-2 py-2">{notAvailable}</td><td className="px-2 py-2">{notAvailable}</td></tr>)}</tbody></table></div>
        <p className="mt-3 text-xs text-slate-500 dark:text-[#6fa6d3]">Assessment input qualification and Last Updated rules are UNVERIFIED.</p>
        {pipelineId && !currentSources ? <p className="mt-3 text-xs" role="status">Loading source metadata...</p> : null}
        <PreAssessmentFields rows={[
          ["CP source surveys (pipeline)", !cpLoading && sourceCp?.availability.surveys.available ? String(sourceCp.surveys.length) : notAvailable],
          ["External source assessments (pipeline)", pipelineId && !assessmentLoading && !assessmentError ? String(external.length) : notAvailable],
          ["ILI runs (pipeline)", currentSources?.ili?.tables.inspectionRuns ? String(currentSources.ili.counts.inspectionRuns) : notAvailable],
          ["Linked source documents", currentSources?.documentTotal != null ? String(currentSources.documentTotal) : notAvailable]
        ]} />
        <p className="mt-3 text-xs font-bold">Document source references (first page)</p><ul className="mt-2 space-y-2 text-xs">{currentSources?.documents.length ? currentSources.documents.map((document) => <li key={document.documentId} className="break-words">{document.title} · Document ID: {document.documentId}<ul>{document.versions.map((version) => <li key={version.documentVersionId}>Version ID: {version.documentVersionId} · Revision: {version.revision ?? notAvailable}</li>)}</ul></li>) : <li>{notAvailable}</li>}</ul>
      </OverviewPanel>
    </div>
  </div>;
}

function RealPipelineSelector({
  pipelines,
  selectedPipelineId,
  isLoading,
  onSelect
}: {
  pipelines: PipelineRecord[];
  selectedPipelineId: string;
  isLoading: boolean;
  onSelect: (pipelineId: string) => void;
}) {
  return (
    <Frame>
      <div className="grid gap-4 p-5 lg:grid-cols-[minmax(260px,0.8fr)_1fr] lg:items-end">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-700 dark:text-[#78bdf2]">REAL pipeline</span>
          <select
            className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-cyan-500 dark:border-[#1d4568] dark:bg-[#071522] dark:text-white"
            disabled={isLoading}
            onChange={(event) => onSelect(event.target.value)}
            value={selectedPipelineId}
          >
            <option value="">{isLoading ? "Loading pipelines..." : "Select pipeline"}</option>
            {pipelines.map((pipeline) => (
              <option key={pipeline.id} value={pipeline.id}>
                {pipeline.pipelineCode} - {pipeline.pipelineName}
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm leading-6 text-slate-500 dark:text-[#6fa6d3]">
          REAL mode reads only existing pipeline, CP monitoring, and External Corrosion assessment history. Missing ECDA survey sources stay marked as {notAvailable}.
        </p>
        <div className="lg:col-span-2">
          {isLoading ? <Badge tone="amber">Loading pipelines</Badge> : pipelines.length ? <Badge tone="cyan">{pipelines.length} REAL pipelines</Badge> : <Badge tone="blue">{notAvailable}</Badge>}
        </div>
      </div>
    </Frame>
  );
}

function RealContextPanel({
  pipeline,
  data
}: {
  pipeline: PipelineRecord | null;
  data: CpMonitoringRealData | null;
}) {
  if (!pipeline) {
    return null;
  }

  const items = [
    ["Pipeline", `${pipeline.pipelineCode} - ${pipeline.pipelineName}`],
    ["Location", displayValue(pipeline.location)],
    ["Length", displayValue(pipeline.pipeLengthKm, " km")],
    ["Status", displayValue(pipeline.status)],
    ["Protection criterion", data?.criterion ? `${data.criterion.valueMv} mV ${data.criterion.referenceElectrode}` : notAvailable],
    ["Latest survey", data?.summary.lastSurveyAt ? formatDate(data.summary.lastSurveyAt) : notAvailable]
  ];

  return (
    <Frame>
      <FrameHeader title="REAL Pipeline Context" code="Pipeline + CP Monitoring" />
      <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
        {items.map(([label, value]) => (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-[#1d4568] dark:bg-[#071522]" key={label}>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-[#477ca9]">{label}</p>
            <p className="mt-2 font-semibold text-slate-950 dark:text-white">{value}</p>
          </div>
        ))}
      </div>
    </Frame>
  );
}

function RealCisChart({ readings, criterion }: { readings: RealCisReading[]; criterion: number | null }) {
  const chartReadings = readings.filter((reading) => reading.eOff !== null);

  if (!chartReadings.length) {
    return <RealUnavailable detail="No real E_OFF readings are available from CP monitoring for the selected pipeline." />;
  }

  const width = 960;
  const height = 245;
  const left = 24;
  const right = 8;
  const top = 20;
  const bottom = 30;
  const rawValues = [...chartReadings.map((reading) => reading.eOff as number), ...(criterion === null ? [] : [criterion])];
  const minValue = Math.min(-1200, ...rawValues) - 60;
  const maxValue = Math.max(-500, ...rawValues) + 40;
  const y = (value: number) => top + (maxValue - value) * ((height - top - bottom) / Math.max(1, maxValue - minValue));
  const x = (index: number) => chartReadings.length === 1 ? (left + width - right) / 2 : left + index * ((width - left - right) / (chartReadings.length - 1));
  const points = chartReadings.map((reading, index) => `${x(index)},${y(reading.eOff as number)}`).join(" ");
  const ticks = [-500, -750, criterion ?? -850, -1050, -1200].filter((tick, index, source) => source.indexOf(tick) === index);

  return (
    <div className="mt-5 overflow-x-auto">
      <svg className="h-auto w-full min-w-[860px]" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Real CIS pipe-to-soil potential profile">
        <rect x={left} y={top} width={width - left - right} height={height - top - bottom} className="fill-slate-50 dark:fill-[#071522]" />
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} className="stroke-slate-200 dark:stroke-white/10" />
            <text x={left + 4} y={y(tick) - 4} className="fill-slate-500 text-[10px] font-bold dark:fill-[#7188a0]">{tick} mV</text>
          </g>
        ))}
        {criterion !== null ? (
          <>
            <line x1={left} x2={width - right} y1={y(criterion)} y2={y(criterion)} className="stroke-red-500" strokeDasharray="5 5" strokeWidth="1.5" />
            <text x={width - 142} y={y(criterion) - 5} className="fill-red-500 text-[11px] font-bold">{criterion} mV criterion</text>
          </>
        ) : null}
        <polyline points={points} fill="none" className="stroke-cyan-600 dark:stroke-[#00a996]" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3">
          <animate attributeName="stroke-dasharray" dur="950ms" from="0 1600" to="1600 0" fill="freeze" />
        </polyline>
        {chartReadings.map((reading, index) => (
          <circle key={reading.id} cx={x(index)} cy={y(reading.eOff as number)} r="4.5" className={reading.band === "Protected" ? "fill-cyan-600 dark:fill-[#00d6b7]" : "fill-[#f59e0b]"} stroke="currentColor" strokeWidth="2">
            <title>{`${reading.testPoint}: ${reading.eOff} mV`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}

function RealCisTable({ readings }: { readings: RealCisReading[] }) {
  if (!readings.length) {
    return <RealUnavailable detail="No real CP test points are available for the selected pipeline." />;
  }

  return (
    <div className="mt-5 overflow-x-auto">
      <table className="min-w-[980px] w-full text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase tracking-[0.12em] text-cyan-700 dark:bg-[#06111f] dark:text-[#78bdf2]">
          <tr>
            {["Test Point", "KP (km)", "E_ON (mV)", "E_OFF (mV)", "IR Drop (mV)", "Band", "Classification", "Reading Date"].map((heading) => (
              <th className="px-4 py-3 font-bold" key={heading}>{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-[#173858]">
          {readings.map((reading) => (
            <tr className="transition hover:bg-cyan-50/60 dark:hover:bg-[#06111f]/60" key={reading.id}>
              <td className="px-4 py-4 font-mono font-bold text-slate-950 dark:text-white">{reading.testPoint}</td>
              <td className="px-4 py-4 font-mono text-slate-700 dark:text-white">{reading.kp}</td>
              <td className="px-4 py-4 font-mono text-slate-700 dark:text-white">{displayValue(reading.eOn)}</td>
              <td className="px-4 py-4 font-mono text-slate-700 dark:text-white">{displayValue(reading.eOff)}</td>
              <td className="px-4 py-4 font-mono text-slate-700 dark:text-white">{displayValue(reading.irDrop)}</td>
              <td className="px-4 py-4"><Badge tone={bandTone(reading.band)}>{reading.band}</Badge></td>
              <td className="px-4 py-4 text-slate-700 dark:text-white">{reading.classification}</td>
              <td className="px-4 py-4 text-slate-500 dark:text-[#8bbce5]">{formatDate(reading.readingAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RealSoilPanels({ soil, isLoading, error }: { soil: RealSoilSnapshot; isLoading: boolean; error: string }) {
  if (error) {
    return <RealUnavailable title="Could Not Load REAL Soil Data" detail={error} status="error" />;
  }

  if (isLoading) {
    return <RealUnavailable title="Loading REAL Soil Data" detail="Reading the latest saved External Corrosion assessment for the selected pipeline." status="loading" />;
  }

  const completeForAwwa = [soil.resistivity, soil.ph, soil.moisture, soil.h2s, soil.redox].every((value) => value !== null);
  const awwaResult = completeForAwwa
    ? calculateAwwaScore({
        resistivity: soil.resistivity as number,
        ph: soil.ph as number,
        sulfide: soil.h2s === 0 ? "Not detected" : "Detected",
        redox: soil.redox as number,
        moisture: soil.moisture as number
      })
    : null;
  const displaySoilValue = (value: number | null, suffix = "") => value === null ? notAvailable : `${value}${suffix}`;
  const rows: Array<[string, string, string | number]> = [
    ["Soil Resistivity", displaySoilValue(soil.resistivity, " ohm-m"), awwaResult?.resistivityPoints ?? notAvailable],
    ["pH", displaySoilValue(soil.ph), awwaResult?.phPoints ?? notAvailable],
    ["Sulphide (H2S)", displaySoilValue(soil.h2s, " mg/kg"), awwaResult?.sulfidePoints ?? notAvailable],
    ["Redox Potential", displaySoilValue(soil.redox, " mV"), awwaResult?.redoxPoints ?? notAvailable],
    ["Moisture Content", displaySoilValue(soil.moisture, " %"), awwaResult?.moisturePoints ?? notAvailable]
  ];

  return (
    <Frame>
        <FrameHeader title="AWWA Soil Corrosivity Score" code="REAL External Corrosion History" />
        <div className="p-5">
          <p className="text-sm leading-6 text-slate-600 dark:text-[#8bbce5]">
            Source-backed soil values from the latest saved External Corrosion assessment. Missing measurements remain {notAvailable}.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-[0.12em] text-cyan-700 dark:bg-[#06111f] dark:text-[#78bdf2]">
                <tr>
                  {['Factor', 'Measured Value', 'Points'].map((heading) => <th className="px-4 py-3 font-bold" key={heading}>{heading}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-[#173858]">
                {rows.map(([label, value, points]) => (
                  <tr className="transition hover:bg-cyan-50/60 dark:hover:bg-[#06111f]/60" key={label}>
                    <td className="px-4 py-3 text-slate-700 dark:text-white">{label}</td>
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-white">{value}</td>
                    <td className={cx("px-4 py-3 font-bold", points === notAvailable ? "text-slate-500 dark:text-[#6fa6d3]" : Number(points) > 0 ? "text-[#f59e0b]" : "text-[#00d6b7]")}>{points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-[#1d4568] dark:bg-[#071522]">
            <p className="font-bold text-slate-950 dark:text-white">Total AWWA Score: <span className={toneText[awwaResult?.tone ?? "blue"]}>{awwaResult?.total ?? notAvailable}</span></p>
            <Badge tone={awwaResult?.tone ?? "blue"}>{awwaResult?.classification ?? notAvailable}</Badge>
          </div>
          <p className="mt-4 text-xs text-slate-500 dark:text-[#477ca9]">
            Source assessment: {soil.sourceAssessmentId ?? notAvailable} | Inspection date: {formatDate(soil.sourceDate)}
          </p>
        </div>
    </Frame>
  );
}

type IndirectIliRun = { id: string; pipelineId: string; runReference: string; toolType: string; inspectionDate: string; status: string };
type IndirectIliAnomaly = { id: string; pipelineId: string; inspectionRunId: string; featureId: string; kpKm: number | null; anomalyType: string; orientation: string; inspectionDate: string };
type IndirectIliResponse<T> = { pipelineId: string; status: string; tableAvailable: boolean; data: T[] };

// Read existing owner APIs only. No survey import, interpretation or persistence occurs here.
async function readIndirectIli<T>(kind: "runs" | "anomalies", pipelineId: string, signal: AbortSignal): Promise<IndirectIliResponse<T>> {
  const token = getStoredAuthToken();
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4002";
  const response = await fetch(`${base}/api/ili/${kind}/${encodeURIComponent(pipelineId)}`, {
    method: "GET", cache: "no-store", signal,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!response.ok) throw new Error("ILI source could not be loaded.");
  const result = await response.json() as IndirectIliResponse<T>;
  if (result.pipelineId !== pipelineId || !Array.isArray(result.data)) throw new Error("ILI source scope could not be verified.");
  return result;
}

type IndirectLoad<T> = { data: T | null; error: string; loading: boolean };
type IndirectSources = {
  scopeKey: string;
  cp: IndirectLoad<CpLinkedTestPointRecord[]>;
  documents: IndirectLoad<{ items: DocumentRepositoryItem[]; total: number }>;
  runs: IndirectLoad<IndirectIliResponse<IndirectIliRun>>;
  anomalies: IndirectLoad<IndirectIliResponse<IndirectIliAnomaly>>;
};

function useIndirectSources(pipelineId: string, segmentId: string, revision: number) {
  const scopeKey = JSON.stringify([pipelineId, segmentId, revision]);
  const [sources, setSources] = useState<IndirectSources | null>(null);
  useEffect(() => {
    let live = true;
    const pending = { data: null, error: "", loading: Boolean(pipelineId) };
    setSources({ scopeKey, cp: pending, documents: pending, runs: pending, anomalies: pending });
    const controllers = [new AbortController(), new AbortController()];
    const timers = pipelineId ? controllers.map((controller) => globalThis.setTimeout(() => controller.abort(), 5000)) : [];
    async function load<K extends "cp" | "documents" | "runs" | "anomalies">(key: K, request: Promise<NonNullable<IndirectSources[K]["data"]>>) {
      try {
        const data = await request;
        if (live) setSources((current) => current?.scopeKey === scopeKey ? { ...current, [key]: { data, loading: false, error: "" } } : current);
      } catch {
        if (live) setSources((current) => current?.scopeKey === scopeKey ? { ...current, [key]: { data: null, loading: false, error: "Source could not be loaded." } } : current);
      }
    }
    if (pipelineId) {
      void load("cp", fetchCpTestPoints(pipelineId));
      void load("documents", fetchDocuments({ pipelineId, ...(segmentId ? { segmentId } : {}), page: 1, pageSize: 5 }));
      void load("runs", readIndirectIli<IndirectIliRun>("runs", pipelineId, controllers[0].signal).finally(() => globalThis.clearTimeout(timers[0])));
      void load("anomalies", readIndirectIli<IndirectIliAnomaly>("anomalies", pipelineId, controllers[1].signal).finally(() => globalThis.clearTimeout(timers[1])));
    }
    return () => { live = false; controllers.forEach((controller) => controller.abort()); timers.forEach((timer) => globalThis.clearTimeout(timer)); };
  }, [pipelineId, segmentId, scopeKey]);
  return sources?.scopeKey === scopeKey ? sources : null;
}

function IndirectTable({ headers, rows }: { headers: string[]; rows: Array<{ id: string; cells: ReactNode[] }> }) {
  return <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 dark:bg-[#071522]"><tr>{headers.map((header) => <th key={header} scope="col" className="whitespace-nowrap px-3 py-2">{header}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={row.id} className="border-t border-slate-200 dark:border-[#173858]">{row.cells.map((cell, index) => <td key={index} className="break-words px-3 py-2">{cell}</td>)}</tr>) : <tr><td colSpan={headers.length} className="px-3 py-6 text-center">{notAvailable}</td></tr>}</tbody></table></div>;
}

function IndirectPlot({ title, labels }: { title: string; labels: string[] }) {
  return <OverviewPanel title={title} action={<div className="flex gap-2"><select aria-label={`${title} scope`} disabled title="Survey samples and an approved assessment scope are not available." className="rounded-md border border-slate-200 bg-transparent p-2 text-xs dark:border-[#1d4568]"><option>Full Segment</option></select><PreAssessmentAction reason="Verified chart samples are not available.">Expand</PreAssessmentAction></div>}><p className="py-10 text-center">{notAvailable}</p><p className="text-xs text-slate-500 dark:text-[#6fa6d3]">{labels.join(" · ")}</p></OverviewPanel>;
}

function RealEcdaWorkspace({ pipelines, selectedPipeline, selectedPipelineId, data, soil, isLoadingPipelines, isLoadingData, isLoadingSoil, error, soilError, onSelectPipeline, segments, segmentId, segmentLoading, segmentError, onSelectSegment, assessments, refreshKey }: EcdaSegmentContext & {
  pipelines: PipelineRecord[]; selectedPipeline: PipelineRecord | null; selectedPipelineId: string;
  data: CpMonitoringRealData | null; soil: RealSoilSnapshot; isLoadingPipelines: boolean; isLoadingData: boolean;
  isLoadingSoil: boolean; error: string; soilError: string; onSelectPipeline: (id: string) => void;
  assessments: StoredAssessment[]; refreshKey: number;
}) {
  const segment = segments.find((record) => record.id === segmentId && record.pipelineId === selectedPipelineId);
  const sources = useIndirectSources(selectedPipelineId, segmentId, refreshKey);
  const sourceCp = !error && !isLoadingData && data?.pipelineId === selectedPipelineId ? data : null;
  const points = sources?.cp.data?.filter((record) => record.cp.pipelineId === selectedPipelineId) ?? [];
  const external = !soilError && !isLoadingSoil ? assessments.filter((record) => record.type === "External" && record.pipelineId === selectedPipelineId) : [];
  const runs = sources?.runs.data?.status === "available" && sources.runs.data.tableAvailable ? sources.runs.data.data.filter((record) => record.pipelineId === selectedPipelineId) : [];
  const anomalies = sources?.anomalies.data?.status === "available" && sources.anomalies.data.tableAvailable ? sources.anomalies.data.data.filter((record) => record.pipelineId === selectedPipelineId) : [];
  const value = (input: string | number | null | undefined): string => input === null || input === undefined || input === "" || (typeof input === "number" && !Number.isFinite(input)) ? notAvailable : String(input);
  const documents = sources?.documents.data?.items ?? [];
  const cpRows = points.flatMap((point) => (["onPotential", "offPotential"] as const).flatMap((kind) => {
    const reading = point.readings?.[kind];
    if (!reading?.readingId) return [];
    return [{ id: `${point.cp.id}-${kind}-${reading.readingId}`, cells: [point.cp.id, point.cp.code, value(point.cp.kp), value(point.asset?.pipelineId === selectedPipelineId ? point.asset.segmentId : null), reading.readingId, kind === "onPotential" ? "ON_POTENTIAL" : "INSTANT_OFF_POTENTIAL", value(reading.valueMv), value(reading.valueV), value(reading.referenceElectrode), value(reading.readingAt), value(reading.quality), value(reading.source), notAvailable] }];
  }));
  const unavailableAction = (label: string, reason: string) => <PreAssessmentAction reason={reason}>{label}</PreAssessmentAction>;
  return <div className="space-y-5" aria-label="REAL ECDA Indirect Inspection">
    <RealPipelineSelector pipelines={pipelines} selectedPipelineId={selectedPipelineId} isLoading={isLoadingPipelines} onSelect={onSelectPipeline} />
    <Frame><div className="p-4"><label className="text-xs font-bold">Segment<select aria-label="Indirect Inspection segment" value={segment?.id ?? ""} disabled={!selectedPipelineId || segmentLoading} onChange={(event) => onSelectSegment(event.target.value)} className="ml-3 rounded-md border border-slate-200 bg-white p-2 text-sm dark:border-[#1d4568] dark:bg-[#071522]"><option value="">{segmentLoading ? "Loading segments..." : "Select segment"}</option>{segments.filter((record) => record.pipelineId === selectedPipelineId).map((record) => <option key={record.id} value={record.id}>{record.segmentId}</option>)}</select></label><p className="mt-2 text-xs">Source Segment ID: {segment?.id ?? notAvailable} · KP {segment?.startKp || notAvailable} - {segment?.endKp || notAvailable}</p></div></Frame>
    {[error, soilError, segmentError, ...(["cp", "documents", "runs", "anomalies"] as const).map((key) => sources?.[key].error ? `${key}: ${sources[key].error}` : "")].filter(Boolean).map((message, index) => <p key={`${index}-${message}`} role="alert" className="text-sm text-red-600 dark:text-red-300">{message}</p>)}
    <RealContextPanel pipeline={selectedPipeline} data={sourceCp} />
    {selectedPipelineId && (isLoadingData || !sources || Object.values(sources).some((source) => typeof source === "object" && source?.loading)) ? <p role="status" className="text-xs">Loading source metadata...</p> : null}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">{[
      ["CIPS Survey", "CIPS run / surveyed length"], ["DCVG Survey", "Survey status / surveyed length"], ["ACVG Survey", "Survey status / surveyed length"], ["Interference Survey", "Indications / follow-up"], ["CP Adequacy Review", "ECDA concern / within criteria"], ["Data Quality", "Source completeness / critical issues"]
    ].map(([label, detail]) => <KpiCard key={label} label={label} value={notAvailable} detail={`${detail}: ${notAvailable}`} tone="blue" />)}</div>
    <p className="text-xs text-slate-500 dark:text-[#6fa6d3]">Source tables below show pipeline records and mastered segment IDs where available. They do not establish a selected survey, ECDA correlation or segment coverage. UNVERIFIED: survey scope, source alignment and quality rules.</p>
    <div className="grid gap-4 xl:grid-cols-3">
      <OverviewPanel title="Route Alignment Map" action={unavailableAction("View on Map", "Route geometry and a verified GIS destination are not available.")}><p className="py-10 text-center">{notAvailable}</p><p className="text-xs text-slate-500 dark:text-[#6fa6d3]">Pipeline Route · CIPS Indication · DCVG/ACVG Indication · Interference · CP Holiday</p><p className="mt-3 text-xs">Map markers and source coordinates: {notAvailable}</p></OverviewPanel>
      <IndirectPlot title="Coating Indication Map (CIPS)" labels={["Clock Position", "Distance (km)", "Coating Condition", "Good", "Minor Indication", "Moderate Indication", "Severe Indication"]} />
      <IndirectPlot title="DCVG / ACVG Survey Results" labels={["Voltage (source unit)", "Distance (km)", "DCVG", "ACVG"]} />
    </div>
    <div className="grid gap-4 xl:grid-cols-2">
      <OverviewPanel title="Interference Indications"><IndirectTable headers={["ID", "KP (km)", "Type", "Source", "Severity", "Status"]} rows={[]} /><p className="mt-3 text-xs">Interference finding IDs and assessed workflow status: {notAvailable}</p><p className="my-3 text-xs font-bold">CP reading interference status (source context)</p><IndirectTable headers={["Reading ID", "CP Point ID", "KP (source)", "Reading Type", "Electrode", "Date", "Source Interference Status"]} rows={(sourceCp?.testPoints ?? []).filter((point) => point.readingId && point.interferenceStatus).map((point) => ({ id: point.readingId!, cells: [point.readingId, point.id, value(point.kp), value(point.measurementType), value(point.referenceElectrode), value(point.readingAt), value(point.interferenceStatus)] }))} /></OverviewPanel>
      <IndirectPlot title="CP Adequacy Review" labels={["ON Potential (source unit / electrode)", "Distance (km)", "Adequate", "Marginal", "Inadequate", `Criteria: ${notAvailable}`]} />
    </div>
    <OverviewPanel title="CP Source Readings"><p className="mb-3 text-xs text-slate-500 dark:text-[#6fa6d3]">ON and OFF are separate source records. Values and timestamps are preserved without conversion or pairing. Criteria versions are listed separately; a reading-to-evaluation link is {notAvailable}.</p><IndirectTable headers={["CP Point ID", "Point", "KP (source)", "Source Segment ID", "Reading ID", "Reading Type", "Value (mV)", "Value (V)", "Electrode", "Date", "Source Quality", "Source", "Evaluation / Criteria Version"]} rows={cpRows} /></OverviewPanel>
    <OverviewPanel title="CP Survey Source References"><IndirectTable headers={["CP Survey ID", "Survey Name", "Survey Date", "Source Status"]} rows={(sourceCp?.surveys ?? []).map((survey) => ({ id: survey.id, cells: [survey.id, value(survey.surveyName), value(survey.surveyDate), value(survey.status)] }))} /><p className="mt-3 text-xs">Generic CP surveys are not identified as CIPS runs. Selected CIPS_Run_ID: {notAvailable}.</p></OverviewPanel>
    <OverviewPanel title="CP Criteria Source Versions"><IndirectTable headers={["Criteria Set ID", "Criteria Version ID", "Version", "Reading Type", "Electrode", "Unit", "Protection Threshold", "Marginal Threshold", "Over-protection Threshold"]} rows={(sourceCp?.approvedCriteria ?? []).map((criterion, index) => ({ id: `${criterion.criteriaVersionId}-${criterion.measurementType}-${criterion.referenceElectrode}-${index}`, cells: [criterion.criteriaSetId, criterion.criteriaVersionId, criterion.version, criterion.measurementType, value(criterion.referenceElectrode), criterion.unit, value(criterion.protectionThresholdMv), value(criterion.marginalThresholdMv), value(criterion.overProtectionThresholdMv)] }))} /><p className="mt-3 text-xs">Threshold fields are returned by the source API; applicability to individual readings is UNVERIFIED.</p></OverviewPanel>
    <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
      <OverviewPanel title="Imported Survey Files" action={unavailableAction("Import Files", "Import must use the owning survey module; no verified survey import workflow is available.")}><IndirectTable headers={["File Name", "Survey Type", "Survey Date", "Format", "Records", "Status"]} rows={[]} /><p className="mt-3 text-xs">Document metadata does not establish survey parsing or Loaded status.</p></OverviewPanel>
      <OverviewPanel title="Anomaly Ranking (Prioritized Indirect Inspection Locations)" action={unavailableAction("View All", "A source-linked ECDA indication register and approved ranking rules are not available.")}><IndirectTable headers={["Rank", "KP (km)", "Type", "Combined Score", "Key Drivers", "Recommended Action"]} rows={[]} /><p className="mt-3 text-xs">ECDA_Correlation_Group_ID: {notAvailable}. Source membership, location tolerance, methodology version, confidence and ranking rules are UNVERIFIED.</p></OverviewPanel>
    </div>
    <OverviewPanel title="Data Sources"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[
      ["CP Monitoring", "Synchronize CP survey and rectifier data", "/cp-monitoring", "View Data"],
      ["External Corrosion", "Historical EC features and trends", "/external-corrosion-assessment", "View Data"],
      ["Field Surveys", "CIPS, DCVG, ACVG and interference", "", "View Data"],
      ["Document Management", "Reports, drawings and assessment documents", "/document-upload", "View Documents"]
    ].map(([title, detail, href, label]) => <div key={title} className="rounded-lg border border-slate-200 p-3 dark:border-[#1d4568]"><h3 className="text-sm font-bold">{title}</h3><p className="my-2 text-xs text-slate-500 dark:text-[#6fa6d3]">{detail}</p><p className="mb-2 text-xs">Assessment source connection: {notAvailable}</p>{href ? <a className="text-xs font-bold text-cyan-700 dark:text-[#78bdf2]" href={href}>{label}</a> : unavailableAction(label, "An authoritative field-survey source destination is not available.")}</div>)}</div><p className="mt-3 text-xs">Links open the owning module. Source record IDs are shown below; no assessment-specific deep link or synchronization is asserted.</p></OverviewPanel>
    <OverviewPanel title="External Corrosion Source Records"><IndirectTable headers={["Assessment ID", "Pipeline ID", "Inspection Date", "Coating Condition", "Holiday Found", "Holiday Size (source value; unit unavailable)"]} rows={external.map((record) => { const input = record.input as ExternalCorrosionInput; return { id: record.id, cells: [record.id, value(record.pipelineId), value(record.inspectionDate), value(input.coatingCondition), value(input.holidayFound), value(input.holidaySize)] }; })} /></OverviewPanel>
    <OverviewPanel title="ILI Source Records"><a href="/ili-analysis" className="text-xs font-bold text-cyan-700 dark:text-[#78bdf2]">View ILI Data</a><p className="my-3 text-xs">Pipeline evidence only. ILI remains authoritative; no ECDA indication or defect is created.</p><IndirectTable headers={["ILI Run ID", "Run Reference", "Tool Type", "Inspection Date", "Source Status"]} rows={runs.map((run) => ({ id: run.id, cells: [run.id, value(run.runReference), value(run.toolType), value(run.inspectionDate), value(run.status)] }))} /><IndirectTable headers={["ILI Anomaly ID", "ILI Run ID", "Feature ID", "KP (km)", "Type", "Orientation", "Inspection Date"]} rows={anomalies.map((anomaly) => ({ id: anomaly.id, cells: [anomaly.id, anomaly.inspectionRunId, value(anomaly.featureId), value(anomaly.kpKm), value(anomaly.anomalyType), value(anomaly.orientation), value(anomaly.inspectionDate)] }))} /></OverviewPanel>
    <OverviewPanel title="Document Source References"><p className="mb-3 text-xs">First page of linked source metadata. File contents are not imported. ECDA survey links and processing status: {notAvailable}.</p><IndirectTable headers={["Document ID", "Version ID", "Revision", "File Name", "MIME Type", "Uploaded At", "Document Approval Status"]} rows={documents.flatMap((document) => document.versions.map((version) => ({ id: `${document.documentId}-${version.documentVersionId}`, cells: [document.documentId, version.documentVersionId, value(version.revision), value(version.fileName), value(version.mimeType), value(version.uploadedAt), value(version.approvalStatus)] })))} /></OverviewPanel>
    <RealSoilPanels soil={soil} isLoading={isLoadingSoil} error={soilError} />
    <RealUnavailable title="Wenner 4-Pin Soil Resistivity" detail="No source-backed REAL Wenner measurements are available. The displayed soil resistivity remains the External Corrosion source value in ohm-m." />
  </div>;
}

function CisChart() {
  const width = 960;
  const height = 245;
  const left = 24;
  const right = 8;
  const top = 20;
  const bottom = 30;
  const min = -1280;
  const max = -500;
  const y = (value: number) => top + (max - value) * ((height - top - bottom) / (max - min));
  const x = (index: number) => left + index * ((width - left - right) / (cisReadings.length - 1));
  const points = cisReadings.map((reading, index) => `${x(index)},${y(reading.eOff)}`).join(" ");
  const ticks = [-500, -750, -850, -1050, -1200];

  return (
    <div className="mt-5 overflow-x-auto">
      <svg className="h-auto w-full min-w-[860px]" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Demo CIS pipe-to-soil potential profile">
        <rect x={left} y={top} width={width - left - right} height={y(-500) - top} className="fill-rose-50 dark:fill-[#2f2747]/80" />
        <rect x={left} y={y(-500)} width={width - left - right} height={y(-750) - y(-500)} className="fill-orange-50 dark:fill-[#2b2d30]/70" />
        <rect x={left} y={y(-750)} width={width - left - right} height={y(-850) - y(-750)} className="fill-amber-50 dark:fill-[#263642]/70" />
        <rect x={left} y={y(-850)} width={width - left - right} height={y(-1200) - y(-850)} className="fill-cyan-50 dark:fill-[#063944]/70" />
        <rect x={left} y={y(-1200)} width={width - left - right} height={height - bottom - y(-1200)} className="fill-indigo-50 dark:fill-[#1d2855]/70" />
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} className="stroke-slate-200 dark:stroke-white/10" />
            <text x={left + 4} y={y(tick) - 4} className="fill-slate-500 text-[10px] font-bold dark:fill-[#7188a0]">{tick} mV</text>
          </g>
        ))}
        <line x1={left} x2={width - right} y1={y(-850)} y2={y(-850)} className="stroke-red-500" strokeDasharray="5 5" strokeWidth="1.5" />
        <text x={width - 120} y={y(-850) - 5} className="fill-red-500 text-[11px] font-bold">-850 mV (protected)</text>
        <polyline points={points} fill="none" className="stroke-cyan-600 dark:stroke-[#00a996]" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3">
          <animate attributeName="stroke-dasharray" dur="950ms" from="0 1600" to="1600 0" fill="freeze" />
        </polyline>
        {cisReadings.map((reading, index) => (
          <circle key={reading.testPoint} cx={x(index)} cy={y(reading.eOff)} r="4.5" className={reading.band === "Protected" ? "fill-cyan-600 dark:fill-[#00d6b7]" : "fill-[#f59e0b]"} stroke="currentColor" strokeWidth="2">
            <title>{`${reading.testPoint}: ${reading.eOff} mV`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}

function Legend() {
  const items = [
    ["bg-red-500", "No protection (>-500 mV)"],
    ["bg-[#f59e0b]", "Under-protected (-500 to -749)"],
    ["bg-[#f6a600]", "Marginal (-750 to -849)"],
    ["bg-[#00d6b7]", "Protected (-850 to -1200)"],
    ["bg-[#8b5cf6]", "Over-protected (<-1200)"]
  ];
  return (
    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
      {items.map(([color, label]) => (
        <span className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-white" key={label}>
          <span className={cx("h-1 w-4 rounded-full", color)} />
          {label}
        </span>
      ))}
    </div>
  );
}

function CisTable() {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="min-w-[980px] w-full text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase tracking-[0.12em] text-cyan-700 dark:bg-[#06111f] dark:text-[#78bdf2]">
          <tr>
            {["Test Point", "KP (km)", "E_ON (mV)", "E_OFF (mV)", "IR Drop (mV)", "Band", "Classification"].map((heading) => (
              <th className="px-4 py-3 font-bold" key={heading}>{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-[#173858]">
          {cisReadings.map((reading) => (
            <tr className="transition hover:bg-cyan-50/60 dark:hover:bg-[#06111f]/60" key={reading.testPoint}>
              <td className="px-4 py-4 font-mono font-bold text-slate-950 dark:text-white">{reading.testPoint}</td>
              <td className="px-4 py-4 font-mono text-slate-700 dark:text-white">{reading.kp}</td>
              <td className="px-4 py-4 font-mono text-slate-700 dark:text-white">{reading.eOn}</td>
              <td className="px-4 py-4 font-mono text-slate-700 dark:text-white">{reading.eOff}</td>
              <td className="px-4 py-4 font-mono text-slate-700 dark:text-white">{reading.irDrop}</td>
              <td className="px-4 py-4"><Badge tone={reading.band === "Protected" ? "cyan" : reading.band === "Marginal" ? "amber" : "red"}>{reading.band}</Badge></td>
              <td className="px-4 py-4"><Badge tone={reading.classification === "IMMEDIATE" ? "red" : reading.classification === "SCHEDULED" ? "amber" : "cyan"}>{reading.classification}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InputBox({
  label,
  value,
  onChange,
  inputMode = "decimal"
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  inputMode?: "decimal" | "text";
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-cyan-700 dark:text-[#78bdf2]">{label}</span>
      <input
        className="mt-2 h-9 w-full rounded-md border border-slate-200 bg-white px-3 font-mono text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:shadow-[0_0_0_3px_rgba(8,145,178,0.14)] dark:border-[#1d4568] dark:bg-[#071522] dark:text-white dark:focus:border-[#00d6b7] dark:focus:shadow-[0_0_0_3px_rgba(0,214,183,0.14)]"
        inputMode={inputMode}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        readOnly={!onChange}
        value={value}
      />
    </label>
  );
}

function SelectBox({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-cyan-700 dark:text-[#78bdf2]">{label}</span>
      <select
        className="mt-2 h-9 w-full rounded-md border border-slate-200 bg-white px-3 font-mono text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:shadow-[0_0_0_3px_rgba(8,145,178,0.14)] dark:border-[#1d4568] dark:bg-[#071522] dark:text-white dark:focus:border-[#00d6b7] dark:focus:shadow-[0_0_0_3px_rgba(0,214,183,0.14)]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function RuleTable({ headings, rows }: { headings: string[]; rows: ReactNode[][] }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-[560px] w-full text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase tracking-[0.12em] text-cyan-700 dark:bg-[#06111f] dark:text-[#78bdf2]">
          <tr>{headings.map((heading) => <th className="px-4 py-3" key={heading}>{heading}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-[#173858]">
          {rows.map((row, index) => (
            <tr key={index}>{row.map((cell, cellIndex) => <td className="px-4 py-3 text-slate-800 dark:text-white" key={cellIndex}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function numberFromInput(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function DemoCalculators() {
  const [dcvgDefect, setDcvgDefect] = useState("42");
  const [dcvgEOn, setDcvgEOn] = useState("-975");
  const [dcvgEOff, setDcvgEOff] = useState("-860");
  const [dcvgResult, setDcvgResult] = useState<DcvgResult>(() => classifyDcvg(calculateDcvgPercent(42, -975, -860)));
  const [dcvgRun, setDcvgRun] = useState(0);
  const [acvgI1, setAcvgI1] = useState("85");
  const [acvgI2, setAcvgI2] = useState("52");
  const [acvgDistance, setAcvgDistance] = useState("100");
  const initialAcvg = calculateAcvgDb(85, 52, 100);
  const [acvgResult, setAcvgResult] = useState<AcvgResult>(() => ({
    ...classifyAcvg(initialAcvg.normalizedDb),
    db: initialAcvg.db
  }));
  const [acvgRun, setAcvgRun] = useState(0);

  function runDcvgCalculation() {
    const percentIr = calculateDcvgPercent(
      numberFromInput(dcvgDefect),
      numberFromInput(dcvgEOn),
      numberFromInput(dcvgEOff)
    );
    setDcvgResult(classifyDcvg(percentIr));
    setDcvgRun((current) => current + 1);
  }

  function runAcvgCalculation() {
    const values = calculateAcvgDb(
      numberFromInput(acvgI1),
      numberFromInput(acvgI2),
      numberFromInput(acvgDistance)
    );
    setAcvgResult({
      ...classifyAcvg(values.normalizedDb),
      db: values.db
    });
    setAcvgRun((current) => current + 1);
  }

  const dcvgMeterWidth = `${Math.min(100, Math.max(4, dcvgResult.percentIr))}%`;
  const acvgMeterWidth = `${Math.min(100, Math.max(4, (acvgResult.normalizedDb / 20) * 100))}%`;

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Frame>
        <FrameHeader title="DCVG %IR Calculator" code="NACE SP0502 Sec 5.2" />
        <div className="p-5">
          <code className="inline-flex rounded-md bg-blue-50 px-3 py-2 font-mono text-sm text-blue-700 dark:bg-[#14365a] dark:text-[#58a6ff]">%IR = (DV_defect / DV_total) * 100</code>
          <p className="mt-4 text-xs text-slate-500 dark:text-[#477ca9]">DV_total = |E_on - E_off| at remote reference - DV_defect = peak voltage spike above holiday</p>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_1fr_110px] md:items-end">
            <InputBox label="DV defect (mV)" onChange={setDcvgDefect} value={dcvgDefect} />
            <InputBox label="E_on (mV)" onChange={setDcvgEOn} value={dcvgEOn} />
            <InputBox label="E_off (mV)" onChange={setDcvgEOff} value={dcvgEOff} />
            <button className="h-9 rounded-md bg-[#00d6b7] px-4 text-sm font-bold text-[#04111d] transition hover:-translate-y-0.5 hover:bg-[#2ff5d8]" onClick={runDcvgCalculation} type="button">Calculate</button>
          </div>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-[#1d4568] dark:bg-[#071522]" key={`dcvg-${dcvgRun}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700 dark:text-[#78bdf2]">Calculated %IR</p>
                <p className={cx("mt-1 text-3xl font-black", toneText[dcvgResult.tone === "cyan" ? "cyan" : dcvgResult.tone === "blue" ? "blue" : dcvgResult.tone === "amber" ? "amber" : "red"])}>{dcvgResult.percentIr.toFixed(1)}%</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={dcvgResult.tone}>{dcvgResult.className}</Badge>
                <Badge tone={dcvgResult.tone}>{dcvgResult.priority}</Badge>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-[#06111f]">
              <div className={cx("h-full rounded-full transition-all duration-700", dcvgResult.tone === "red" ? "bg-[#ff6671]" : dcvgResult.tone === "amber" ? "bg-[#f59e0b]" : dcvgResult.tone === "blue" ? "bg-[#58a6ff]" : "bg-[#00d6b7]")} style={{ width: dcvgMeterWidth }} />
            </div>
            <p className="mt-3 text-xs text-slate-600 dark:text-[#8bbce5]">{dcvgResult.likelihood}</p>
          </div>
          <RuleTable
            headings={["%IR", "Class", "Corrosion Likelihood", "ECDA Priority"]}
            rows={[
              ["< 15%", "Minor", "Unlikely - small holiday, good CP", <Badge tone="cyan">MONITORED</Badge>],
              ["15 - 35%", "Moderate", "Possible - moderate coating defect", <Badge tone="blue">SCHEDULED</Badge>],
              ["35 - 60%", "Significant", "Probable - large holiday, reduced CP", <Badge tone="amber">SCHEDULED to IMM</Badge>],
              ["> 60%", "Severe", "Highly likely - major coating failure", <Badge tone="red">IMMEDIATE</Badge>]
            ]}
          />
        </div>
      </Frame>

      <Frame>
        <FrameHeader title="ACVG Signal Strength & PCM Attenuation" code="SP0502 Sec 5.3" />
        <div className="p-5">
          <code className="inline-flex rounded-md bg-blue-50 px-3 py-2 font-mono text-sm text-blue-700 dark:bg-[#14365a] dark:text-[#58a6ff]">A_dB = 20 * log10(I1 / I2)</code>
          <p className="mt-4 text-xs text-slate-500 dark:text-[#477ca9]">I1 = upstream current (mA) - I2 = downstream current (mA) - dB per 100 m for PCM coating assessment</p>
          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_1fr_80px] md:items-end">
            <InputBox label="I1 upstream (mA)" onChange={setAcvgI1} value={acvgI1} />
            <InputBox label="I2 downstream (mA)" onChange={setAcvgI2} value={acvgI2} />
            <InputBox label="Distance (m)" onChange={setAcvgDistance} value={acvgDistance} />
            <button className="h-9 rounded-md bg-[#00d6b7] px-4 text-sm font-bold text-[#04111d] transition hover:-translate-y-0.5 hover:bg-[#2ff5d8]" onClick={runAcvgCalculation} type="button">Calc</button>
          </div>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-[#1d4568] dark:bg-[#071522]" key={`acvg-${acvgRun}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700 dark:text-[#78bdf2]">Calculated attenuation</p>
                <p className={cx("mt-1 text-3xl font-black", toneText[acvgResult.tone === "cyan" ? "cyan" : acvgResult.tone === "blue" ? "blue" : acvgResult.tone === "amber" ? "amber" : "red"])}>{acvgResult.normalizedDb.toFixed(1)} dB/100m</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={acvgResult.tone}>{acvgResult.holidaySize}</Badge>
                <Badge tone={acvgResult.tone}>{acvgResult.priority}</Badge>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-[#06111f]">
              <div className={cx("h-full rounded-full transition-all duration-700", acvgResult.tone === "red" ? "bg-[#ff6671]" : acvgResult.tone === "amber" ? "bg-[#f59e0b]" : acvgResult.tone === "blue" ? "bg-[#58a6ff]" : "bg-[#00d6b7]")} style={{ width: acvgMeterWidth }} />
            </div>
            <p className="mt-3 text-xs text-slate-600 dark:text-[#8bbce5]">Raw signal strength: {acvgResult.db.toFixed(2)} dB. Normalized for the entered survey distance.</p>
          </div>
          <RuleTable
            headings={["ACVG (dB above BG)", "Holiday Size", "Priority"]}
            rows={[
              ["< 3 dB", "Pinhole (<1 cm2)", <Badge tone="cyan">MONITORED</Badge>],
              ["3 - 10 dB", "Moderate (1-50 cm2)", <Badge tone="blue">SCHEDULED</Badge>],
              ["10 - 20 dB", "Large (50-500 cm2)", <Badge tone="amber">SCHED to IMM</Badge>],
              ["> 20 dB", "Major failure (>500 cm2)", <Badge tone="red">IMMEDIATE</Badge>]
            ]}
          />
          <p className="mt-4 text-xs text-slate-500 dark:text-[#477ca9]">PCM coating: &lt;1 dB/100m Good - 1-3 Moderate degradation - &gt;3 Significant damage</p>
        </div>
      </Frame>
    </div>
  );
}

function SoilPanels() {
  const [pinSpacing, setPinSpacing] = useState("152");
  const [wennerVoltage, setWennerVoltage] = useState("68");
  const [wennerCurrent, setWennerCurrent] = useState("15");
  const [wennerResult, setWennerResult] = useState<WennerResult>(() => classifyWenner(calculateWennerResistivity(152, 68, 15)));
  const [wennerRun, setWennerRun] = useState(0);
  const [soilResistivity, setSoilResistivity] = useState("1800");
  const [soilPh, setSoilPh] = useState("6.8");
  const [sulfide, setSulfide] = useState("Not detected");
  const [redox, setRedox] = useState("45");
  const [moisture, setMoisture] = useState("18");
  const [awwaResult, setAwwaResult] = useState<AwwaResult>(() => calculateAwwaScore({
    resistivity: 1800,
    ph: 6.8,
    sulfide: "Not detected",
    redox: 45,
    moisture: 18
  }));
  const [awwaRun, setAwwaRun] = useState(0);

  function runWennerCalculation() {
    setWennerResult(classifyWenner(calculateWennerResistivity(
      numberFromInput(pinSpacing),
      numberFromInput(wennerVoltage),
      numberFromInput(wennerCurrent)
    )));
    setWennerRun((current) => current + 1);
  }

  function runAwwaCalculation() {
    setAwwaResult(calculateAwwaScore({
      resistivity: numberFromInput(soilResistivity),
      ph: numberFromInput(soilPh),
      sulfide,
      redox: numberFromInput(redox),
      moisture: numberFromInput(moisture)
    }));
    setAwwaRun((current) => current + 1);
  }

  const wennerMeterWidth = `${Math.min(100, Math.max(5, (Math.min(wennerResult.resistivity, 30000) / 30000) * 100))}%`;
  const awwaMeterWidth = `${Math.min(100, Math.max(5, (awwaResult.total / 12) * 100))}%`;

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Frame>
        <FrameHeader title="Wenner 4-Pin Soil Resistivity" code="ASTM G57 - SP0502 Sec 3.6" />
        <div className="p-5">
          <code className="inline-flex rounded-md bg-blue-50 px-3 py-2 font-mono text-sm text-blue-700 dark:bg-[#14365a] dark:text-[#58a6ff]">p = 2pi * a * R  [ohm-cm]</code>
          <p className="mt-4 text-xs text-slate-500 dark:text-[#477ca9]">a = pin spacing (cm) = depth of measurement - R = V/I from instrument (ohm)</p>
          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_1fr_110px] md:items-end">
            <InputBox label="Pin spacing a (cm)" onChange={setPinSpacing} value={pinSpacing} />
            <InputBox label="Voltage V (mV)" onChange={setWennerVoltage} value={wennerVoltage} />
            <InputBox label="Current I (mA)" onChange={setWennerCurrent} value={wennerCurrent} />
            <button className="h-9 rounded-md bg-[#00d6b7] px-4 text-sm font-bold text-[#04111d] transition hover:-translate-y-0.5 hover:bg-[#2ff5d8]" onClick={runWennerCalculation} type="button">Calculate</button>
          </div>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-[#1d4568] dark:bg-[#071522]" key={`wenner-${wennerRun}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700 dark:text-[#78bdf2]">Calculated soil resistivity</p>
                <p className={cx("mt-1 text-3xl font-black", toneText[wennerResult.tone])}>{Math.round(wennerResult.resistivity).toLocaleString()} ohm-cm</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={wennerResult.tone}>{wennerResult.classification}</Badge>
                <Badge tone={wennerResult.tone}>{wennerResult.steelLife}</Badge>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-[#06111f]">
              <div className={cx("h-full rounded-full transition-all duration-700", wennerResult.tone === "red" ? "bg-[#ff6671]" : wennerResult.tone === "amber" ? "bg-[#f59e0b]" : wennerResult.tone === "blue" ? "bg-[#58a6ff]" : "bg-[#00d6b7]")} style={{ width: wennerMeterWidth }} />
            </div>
            <p className="mt-3 text-xs text-slate-600 dark:text-[#8bbce5]">Anode suitability: {wennerResult.anodeSuitability}. R = V/I from DEMO field readings.</p>
          </div>
          <RuleTable
            headings={["p (ohm-cm)", "Classification", "Steel Life (bare)", "Anode Suitability"]}
            rows={[
              ["< 1,000", <Badge tone="red">Extremely corrosive</Badge>, "< 5 yr", "Excellent location"],
              ["1,000-5,000", <Badge tone="amber">Very corrosive</Badge>, "5-15 yr", "Good"],
              ["5,000-10,000", <Badge tone="amber">Corrosive</Badge>, "15-20 yr", "Acceptable"],
              ["10,000-30,000", <Badge tone="blue">Mildly corrosive</Badge>, "20-50 yr", "Marginal"],
              ["> 30,000", <Badge tone="cyan">Non-corrosive</Badge>, "> 50 yr", "Poor (high R_v)"]
            ]}
          />
        </div>
      </Frame>

      <Frame>
        <FrameHeader title="AWWA Soil Corrosivity Score" code="AWWA C105 - 5-factor system" />
        <div className="p-5">
          <p className="text-sm text-cyan-700 dark:text-[#78bdf2]">Enter field measurements - score calculated automatically. Total &gt;=10 = Severely corrosive.</p>
          <RuleTable
            headings={["Factor", "Measured Value", "Points"]}
            rows={[
              ["Soil Resistivity (ohm-cm)", <InputBox label="" onChange={setSoilResistivity} value={soilResistivity} />, <span className={cx("font-bold", awwaResult.resistivityPoints ? "text-[#f59e0b]" : "text-[#00d6b7]")}>{awwaResult.resistivityPoints}</span>],
              ["pH", <InputBox label="" onChange={setSoilPh} value={soilPh} />, <span className={cx("font-bold", awwaResult.phPoints ? "text-[#f59e0b]" : "text-[#00d6b7]")}>{awwaResult.phPoints}</span>],
              ["Sulfide (H2S) content", <SelectBox label="" onChange={setSulfide} options={["Not detected", "Detected"]} value={sulfide} />, <span className={cx("font-bold", awwaResult.sulfidePoints ? "text-[#f59e0b]" : "text-[#00d6b7]")}>{awwaResult.sulfidePoints}</span>],
              ["Redox potential (mV)", <InputBox label="" onChange={setRedox} value={redox} />, <span className={cx("font-bold", awwaResult.redoxPoints ? "text-[#f59e0b]" : "text-[#00d6b7]")}>{awwaResult.redoxPoints}</span>],
              ["Moisture content (%)", <InputBox label="" onChange={setMoisture} value={moisture} />, <span className={cx("font-bold", awwaResult.moisturePoints ? "text-[#f59e0b]" : "text-[#00d6b7]")}>{awwaResult.moisturePoints}</span>]
            ]}
          />
          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-[#1d4568] dark:bg-[#071522]" key={`awwa-${awwaRun}`}>
            <div className="flex items-center justify-between gap-4">
              <p className="font-bold text-slate-950 dark:text-white">Total AWWA Score: <span className={toneText[awwaResult.tone]}>{awwaResult.total}</span></p>
              <div className="flex items-center gap-3">
                <button className="rounded-md bg-[#00d6b7] px-4 py-2 text-sm font-bold text-[#04111d] transition hover:-translate-y-0.5 hover:bg-[#2ff5d8]" onClick={runAwwaCalculation} type="button">Score</button>
                <Badge tone={awwaResult.tone}>{awwaResult.classification}</Badge>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-[#06111f]">
              <div className={cx("h-full rounded-full transition-all duration-700", awwaResult.tone === "red" ? "bg-[#ff6671]" : awwaResult.tone === "amber" ? "bg-[#f59e0b]" : "bg-[#00d6b7]")} style={{ width: awwaMeterWidth }} />
            </div>
            <p className="mt-3 text-xs text-slate-600 dark:text-[#8bbce5]">AWWA C105 DEMO score from five editable field factors. Scores 10 and above are treated as severely corrosive.</p>
          </div>
        </div>
      </Frame>
    </div>
  );
}

function AnomalyRegister() {
  return (
    <Frame>
      <FrameHeader title="Anomaly Classification Register" code="SP0502 Sec 5.2 - Three-tier system" />
      <div className="p-5">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-[0.12em] text-cyan-700 dark:bg-[#06111f] dark:text-[#78bdf2]">
              <tr>{["Anomaly ID", "KP (km)", "Tool", "DCVG %IR", "ACVG (dB)", "E_OFF (mV)", "Tool Confidence", "Classification", "Action"].map((heading) => <th className="px-4 py-3" key={heading}>{heading}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-[#173858]">
              {anomalies.map((anomaly, index) => (
                <tr
                  className="translate-y-0 opacity-100 transition duration-300 hover:bg-cyan-50/60 hover:shadow-[inset_3px_0_0_rgba(8,145,178,0.42)] dark:hover:bg-[#06111f]/70 dark:hover:shadow-[inset_3px_0_0_rgba(0,214,183,0.65)]"
                  key={anomaly.id}
                  style={{ transitionDelay: `${index * 35}ms` }}
                >
                  <td className="px-4 py-3 font-mono font-bold text-slate-950 dark:text-white">{anomaly.id}</td>
                  <td className="px-4 py-3 font-mono text-slate-700 dark:text-white">{anomaly.kp}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-white">{anomaly.tool}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-white">{anomaly.dcvg}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-white">{anomaly.acvg}</td>
                  <td className="px-4 py-3 font-mono text-slate-700 dark:text-white">{anomaly.eOff}</td>
                  <td className="px-4 py-3">
                    <span className={cx("inline-flex rounded-full border px-2.5 py-1 text-xs font-bold", confidenceBadgeClass(anomaly.confidence))}>{anomaly.confidence}</span>
                  </td>
                  <td className="px-4 py-3"><Badge tone={priorityTone(anomaly.classification)}>{anomaly.classification}</Badge></td>
                  <td className="px-4 py-3 text-slate-400 dark:text-[#305d87]">-</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-slate-700 shadow-[0_0_0_1px_rgba(245,158,11,0.12)] dark:border-[#f59e0b] dark:bg-[#1f1d12] dark:text-[#78bdf2]">
          <span className="mr-2 inline-flex h-5 w-5 animate-pulse items-center justify-center rounded-full border border-[#f59e0b] text-xs font-black text-[#f59e0b]">!</span>
          <span className="font-bold text-[#f59e0b]">Clustering Rule:</span> Multiple Moderate (%IR 15-35%) anomalies within 3 m of each other become a single SEVERE combined anomaly and upgrade to IMMEDIATE.
        </div>
      </div>
    </Frame>
  );
}

function DirectField({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-300 dark:border-[#1d4568] dark:bg-[#071522] dark:hover:border-[#00d6b7]/60">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-[#477ca9]">{label}</p>
      <p className="mt-2 break-words font-mono text-sm font-bold text-slate-950 dark:text-white">{value}</p>
      {detail ? <p className="mt-1 text-xs text-slate-500 dark:text-[#6fa6d3]">{detail}</p> : null}
    </div>
  );
}

function DirectExaminationDemo() {
  return (
    <>
      <Frame>
        <FrameHeader title="Direct Examination - Excavation Findings" code="NACE SP0502 Sec 5.4 - DEMO" />
        <div className="p-5">
          <div className="mb-5 flex flex-col gap-3 rounded-lg border border-cyan-200 bg-cyan-50/70 p-4 dark:border-[#00d6b7]/40 dark:bg-[#073e43]/40 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-cyan-800 dark:text-[#00d6b7]">Field excavation evidence</p>
              <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-[#8bbce5]">DEMO findings show how verified anomalies, exposed-pipe measurements and repair priorities are reviewed together.</p>
            </div>
            <Badge tone="cyan">DEMO RECORDS</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DirectField label="Assessment region" value="R-1" detail="KP 0 - 38.5" />
            <DirectField label="Excavation campaign" value="EXC-2026-01" detail="7 planned digs" />
            <DirectField label="Inspection date" value="01 Oct 2026" detail="Field verification complete" />
            <DirectField label="Evidence owner" value="Integrity team" detail="UT + visual examination" />
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-[1060px] w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-[0.12em] text-cyan-700 dark:bg-[#06111f] dark:text-[#78bdf2]">
                <tr>{["Excavation", "KP (km)", "Location", "Field finding", "Measured wall", "Metal loss", "Verification", "Repair priority"].map((heading) => <th className="px-4 py-3" key={heading}>{heading}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-[#173858]">
                {directDemoFindings.map((finding, index) => (
                  <tr className="transition duration-300 hover:bg-cyan-50/60 dark:hover:bg-[#06111f]/70" key={finding.id} style={{ transitionDelay: `${index * 35}ms` }}>
                    <td className="px-4 py-3 font-mono font-bold text-slate-950 dark:text-white">{finding.id}</td>
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-white">{finding.kp}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-white">{finding.location}</td>
                    <td className="max-w-[250px] px-4 py-3 text-slate-700 dark:text-white">{finding.finding}</td>
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-white">{finding.measured}</td>
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-white">{finding.loss}</td>
                    <td className="px-4 py-3"><Badge tone={finding.verification === "CONFIRMED" ? "cyan" : "blue"}>{finding.verification}</Badge></td>
                    <td className="px-4 py-3"><Badge tone={priorityTone(finding.priority)}>{finding.priority}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Frame>

      <div className="grid gap-5 xl:grid-cols-2">
        <Frame>
          <FrameHeader title="Corrosion and Metal-Loss Measurements" code="UT / VISUAL - DEMO" />
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            <DirectField label="Selected excavation" value="EXC-01" detail="KP 12.34" />
            <DirectField label="Nominal wall thickness" value="11.2 mm" detail="Pipe record" />
            <DirectField label="Measured minimum wall" value="9.2 mm" detail="UT minimum" />
            <DirectField label="Corrosion length" value="118 mm" detail="Axial extent" />
            <DirectField label="Corrosion width" value="42 mm" detail="Circumferential extent" />
            <DirectField label="Previous remaining wall" value="9.8 mm" detail="Prior inspection" />
            <DirectField label="Coating condition" value="Holiday / disbonded" detail="Visual examination" />
            <DirectField label="Measurement status" value="Verified" detail="Two-tool confirmation" />
          </div>
        </Frame>

        <Frame>
          <FrameHeader title="Engineering Results" code="EXTERNAL CORROSION - DEMO" />
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            <DirectField label="Corrosion depth" value="2.0 mm" detail="Calculated metal loss" />
            <DirectField label="Corrosion rate" value="0.18 mm/y" detail="Historical comparison" />
            <DirectField label="Metal loss" value="18.0%" detail="Remaining wall basis" />
            <DirectField label="Remaining life" value="24 years" detail="Engineering estimate" />
            <DirectField label="Failure pressure" value="8.4 MPa" detail="Calculated criterion" />
            <DirectField label="Safety margin" value="2.1 MPa" detail="Against operating pressure" />
            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 dark:border-[#ff6671]/40 dark:bg-[#3a2030]/60">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-rose-700 dark:text-[#ff9aa1]">Engineering assessment</p>
                <p className="mt-2 text-sm font-bold text-slate-950 dark:text-white">Immediate repair review</p>
              </div>
              <Badge tone="red">HIGH RISK</Badge>
            </div>
          </div>
        </Frame>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Frame>
          <FrameHeader title="Anomaly Verification Status" code="ECDA DIRECT EVIDENCE - DEMO" />
          <div className="p-5">
            <div className="space-y-3">
              {([
                ["ANO-01", "EXC-01", "Confirmed by visual + UT", "IMMEDIATE", "red" as const],
                ["ANO-03", "EXC-04", "Confirmed by UT profile", "IMMEDIATE", "red" as const],
                ["ANO-05", "EXC-05", "Not reproduced on exposed pipe", "SCHEDULED", "amber" as const]
              ] as const).map(([anomalyId, excavationId, status, priority, tone], index) => (
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 transition duration-300 hover:border-cyan-300 dark:border-[#1d4568] dark:bg-[#071522] dark:hover:border-[#00d6b7]/60" key={anomalyId} style={{ transitionDelay: `${index * 45}ms` }}>
                  <span className={cx("h-2.5 w-2.5 shrink-0 rounded-full animate-pulse", tone === "red" ? "bg-[#ff6671]" : "bg-[#f59e0b]")} />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-bold text-slate-950 dark:text-white">{anomalyId} <span className="font-normal text-slate-500 dark:text-[#6fa6d3]">/ {excavationId}</span></p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-[#6fa6d3]">{status}</p>
                  </div>
                  <Badge tone={tone}>{priority}</Badge>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-[#6fa6d3]">Verification status is based on DEMO excavation evidence and is separate from ILI anomaly records.</p>
          </div>
        </Frame>

        <Frame>
          <FrameHeader title="Repair Priority and Recommendation" code="SP0502 DECISION SUPPORT - DEMO" />
          <div className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 dark:border-[#ff6671]/40 dark:bg-[#3a2030]/60">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-rose-700 dark:text-[#ff9aa1]">Selected action</p>
                <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">Repair before return to service</p>
              </div>
              <Badge tone="red">IMMEDIATE</Badge>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <DirectField label="Recommended method" value="Composite repair" detail="Subject to engineering approval" />
              <DirectField label="Follow-up" value="Repeat UT profile" detail="Confirm repaired wall condition" />
              <DirectField label="Work owner" value="Pipeline integrity" detail="Assign field repair package" />
              <DirectField label="Decision status" value="Pending approval" detail="DEMO workflow state" />
            </div>
            <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-slate-700 dark:border-[#f59e0b] dark:bg-[#1f1d12] dark:text-[#8bbce5]">
              <span className="font-bold text-[#f59e0b]">Recommendation:</span> Remove coating, validate the full defect profile, and complete an approved repair before closeout.
            </div>
          </div>
        </Frame>
      </div>
    </>
  );
}

function RealDirectExamination({
  selectedPipeline,
  selectedPipelineId,
  pipelines,
  isLoadingPipelines,
  isLoadingAssessment,
  error,
  onSelectPipeline,
  segments,
  segmentId,
  segmentLoading,
  segmentError,
  onSelectSegment,
  assessments,
  refreshKey
}: EcdaSegmentContext & {
  selectedPipeline: PipelineRecord | null;
  selectedPipelineId: string;
  pipelines: PipelineRecord[];
  isLoadingPipelines: boolean;
  isLoadingAssessment: boolean;
  error: string;
  onSelectPipeline: (pipelineId: string) => void;
  assessments: StoredAssessment[];
  refreshKey: number;
}) {
  const segment = segments.find((record) => record.id === segmentId && record.pipelineId === selectedPipelineId);
  const sources = useIndirectSources(selectedPipelineId, segmentId, refreshKey);
  const records = !error && !isLoadingAssessment ? assessments.filter((record) => record.id && record.type === "External" && record.pipelineId === selectedPipelineId) : [];
  const sourceValue = (value: unknown): string => {
    if (typeof value === "number") return Number.isFinite(value) ? String(value) : notAvailable;
    return typeof value === "string" && value.trim() ? value : notAvailable;
  };
  const sourceMeasurement = (record: StoredAssessment, measurement: unknown): string => {
    const dated = Boolean(record.inspectionDate && Number.isFinite(Date.parse(record.inspectionDate)));
    return dated && typeof measurement === "number" && Number.isFinite(measurement) ? String(measurement) : notAvailable;
  };
  const unavailableAction = (label: string, reason: string) => <PreAssessmentAction reason={reason}>{label}</PreAssessmentAction>;
  const unavailableFields = (labels: string[]): Array<[string, string]> => labels.map((label) => [label, notAvailable]);
  const points = sources?.cp.data?.filter((record) => record.cp.pipelineId === selectedPipelineId) ?? [];
  const runs = sources?.runs.data?.status === "available" && sources.runs.data.tableAvailable ? sources.runs.data.data.filter((record) => record.pipelineId === selectedPipelineId) : [];
  const anomalies = sources?.anomalies.data?.status === "available" && sources.anomalies.data.tableAvailable ? sources.anomalies.data.data.filter((record) => record.pipelineId === selectedPipelineId) : [];
  const documents = sources?.documents.data?.items ?? [];
  const examinationMissing = "ECDA examination and excavation records with approved source links are not available.";
  const fieldMissing = "Field observations, inspector, examination date and evidence links are not available.";
  return (
    <div className="space-y-5" aria-label="REAL ECDA Direct Examination">
      <RealPipelineSelector pipelines={pipelines} selectedPipelineId={selectedPipelineId} isLoading={isLoadingPipelines} onSelect={onSelectPipeline} />
      <Frame><div className="p-4"><label className="text-xs font-bold">Segment<select aria-label="Direct Examination segment" value={segment?.id ?? ""} disabled={!selectedPipelineId || segmentLoading} onChange={(event) => onSelectSegment(event.target.value)} className="ml-3 rounded-md border border-slate-200 bg-white p-2 text-sm dark:border-[#1d4568] dark:bg-[#071522]"><option value="">{segmentLoading ? "Loading segments..." : "Select segment"}</option>{segments.filter((record) => record.pipelineId === selectedPipelineId).map((record) => <option key={record.id} value={record.id}>{record.segmentId}</option>)}</select></label><p className="mt-2 text-xs">Source Pipeline ID: {selectedPipeline?.id === selectedPipelineId ? selectedPipeline.id : notAvailable} · Source Segment ID: {segment?.id ?? notAvailable} · KP {segment?.startKp || notAvailable} - {segment?.endKp || notAvailable}</p></div></Frame>
      {error ? <RealUnavailable title="Could Not Load REAL Assessment Data" detail={error} status="error" /> : null}
      {[segmentError, ...(["cp", "documents", "runs", "anomalies"] as const).map((key) => sources?.[key].error ? `${key}: ${sources[key].error}` : "")].filter(Boolean).map((message, index) => <p key={`${index}-${message}`} role="alert" className="text-sm text-red-600 dark:text-red-300">{message}</p>)}
      {isLoadingAssessment || (selectedPipelineId && (!sources || Object.values(sources).some((source) => typeof source === "object" && source?.loading))) ? <p role="status" className="text-xs">Loading historical source references...</p> : null}
      <p className="text-sm text-slate-500 dark:text-[#6fa6d3]">ECDA examination, excavation and NDT result IDs: {notAvailable}. Historical source records below do not establish a confirmed ECDA examination, physical damage or approved assessment scope.</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OverviewPanel title="Excavation Locations" action={unavailableAction("Add Excavation", examinationMissing)}><PreAssessmentFields rows={unavailableFields(["Total Excavations", "Completed", "In Progress", "Planned"])} /></OverviewPanel>
        <OverviewPanel title="Field Verification" action={unavailableAction("Add Field Record", fieldMissing)}><PreAssessmentFields rows={unavailableFields(["Locations Verified", "Confirmed", "Requires Review", "Anomaly Found"])} /></OverviewPanel>
        <OverviewPanel title="Excavation Schedule" action={unavailableAction("View Schedule", examinationMissing)}><PreAssessmentFields rows={unavailableFields(["Start Date", "End Date", "Progress", "Completed / Planned"])} /><p className="mt-3 text-xs text-slate-500 dark:text-[#6fa6d3]">UNVERIFIED: schedule bounds and assessment target-date reconciliation.</p></OverviewPanel>
        <OverviewPanel title="Location Map" action={unavailableAction("Expand Map", "Verified route geometry and excavation coordinates are not available.")}><p className="py-8 text-center">{notAvailable}</p><p className="text-xs">Completed · In Progress · Planned · Anomaly</p><p className="mt-3 text-xs text-slate-500 dark:text-[#6fa6d3]">UNVERIFIED: marker identities, legend and route alignment.</p></OverviewPanel>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <OverviewPanel title="NDT & Wall-Thickness Results" action={unavailableAction("View All Results", "NDT result IDs, methods, inspection dates and excavation links are not available.")}><IndirectTable headers={["Excavation ID", "NDT Method", "Measured WT (mm)", "Nominal WT (mm)", "WT Loss (%)", "Result"]} rows={[]} /></OverviewPanel>
        <OverviewPanel title="Coating Condition Observations" action={unavailableAction("View All Observations", fieldMissing)}><IndirectTable headers={["Excavation ID", "Coating Type", "Condition", "Observations"]} rows={[]} /></OverviewPanel>
        <OverviewPanel title="Excavation Photographs"><p className="py-8 text-center">{notAvailable}</p><PreAssessmentFields rows={unavailableFields(["Excavation ID", "Document_ID", "Document Version ID", "Caption", "Capture Date"])} /><p className="mt-3 text-xs">Document upload dates are not photo capture dates. No linked excavation photographs are verified.</p></OverviewPanel>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <OverviewPanel title="Soil / Environment Observations"><IndirectTable headers={["Excavation ID", "Soil Type", "Moisture Condition", "pH", "Resistivity (Ω·m)", "Observations"]} rows={[]} /></OverviewPanel>
        <OverviewPanel title="Defect / Anomaly Confirmation" action={unavailableAction("View All Anomalies", "Confirmed ECDA physical-condition records and their source evidence are not available.")}><IndirectTable headers={["Excavation ID", "Anomaly Type", "Measured WT (mm)", "Severity", "Confirmation"]} rows={[]} /><p className="mt-3 text-xs">ECDA Finding ≠ Defect. Physical confirmation, a check for existing defects/ILI conditions, and engineer approval are required before a controlled Defect Manager link or candidate. No automatic defect creation.</p></OverviewPanel>
        <OverviewPanel title="Action / Status Tracker" action={unavailableAction("View All Actions", "A canonical Central Integrity Action Register and examination-to-action links are not available.")}><IndirectTable headers={["Excavation ID", "Action", "Owner", "Target Date", "Status"]} rows={[]} /><p className="mt-3 text-xs">Central Action_ID: {notAvailable}. Actions are not created or duplicated in ECDA.</p></OverviewPanel>
      </div>
      <OverviewPanel title="Linked Records"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[
        ["External Corrosion Records", "Related Records", "View Records", "Examination-to-External Corrosion source links are not available."],
        ["Defect Manager", "Linked Defects", "View Records", "Confirmed physical evidence, duplicate checks and an approved Defect_ID link are not available."],
        ["Document Management", "Related Documents", "View Documents", "Examination/excavation document links are not available."],
        ["Pipeline / Asset Master", "Pipeline / Segment", "View Asset", "An examination-to-asset link is not available."]
      ].map(([title, detail, action, reason]) => <div key={title} className="rounded-lg border border-slate-200 p-3 dark:border-[#1d4568]"><h3 className="text-sm font-bold">{title}</h3><p className="my-2 text-lg font-bold">{notAvailable}</p><p className="mb-3 text-xs">{detail}</p>{unavailableAction(action, reason)}</div>)}</div></OverviewPanel>
      <OverviewPanel title="Historical External Corrosion Source Evidence"><p className="mb-3 text-xs text-slate-500 dark:text-[#6fa6d3]">Read-only pipeline history, referenced by Assessment ID. These values are not excavation/NDT results or segment-specific confirmation. Inspection Date and Created At remain distinct. Canonical input units follow the existing source report contract; entered wall-thickness metadata is retained separately. Measurements without a valid source inspection date remain Not Available; Created At is not used as a measurement date.</p><IndirectTable headers={["Assessment ID", "Pipeline ID", "Source Location ID", "Inspection Date", "Created At", "Measured Thickness (mm)", "Nominal Thickness (mm)", "Entered Wall Thickness", "Entered Unit", "Corrosion Length (mm)", "Corrosion Width (mm)", "Previous Inspection", "Previous Remaining Wall (mm)", "Minimum Required Wall (mm)"]} rows={records.map((record) => { const input = record.input as ExternalCorrosionInput; return { id: record.id, cells: [record.id, sourceValue(record.pipelineId), sourceValue(input.pipeLocationId), sourceValue(record.inspectionDate), sourceValue(record.createdAt), sourceMeasurement(record, input.measuredThickness), sourceMeasurement(record, input.wallThickness), (input.wallThicknessUnit === "mm" || input.wallThicknessUnit === "in") ? sourceMeasurement(record, input.wallThicknessDisplayValue) : notAvailable, sourceValue(input.wallThicknessUnit), sourceMeasurement(record, input.corrosionLength), sourceMeasurement(record, input.corrosionWidth), sourceValue(input.previousInspectionDate), sourceMeasurement(record, input.previousRemainingThickness), sourceMeasurement(record, input.minimumRequiredThickness)] }; })} /></OverviewPanel>
      <OverviewPanel title="Historical Coating and Soil Source Evidence"><IndirectTable headers={["Assessment ID", "Inspection Date", "Coating Type", "Other Coating Type", "Coating Condition", "Holiday Found", "Holiday Size (mm)", "Soil Type", "Soil Moisture (%)", "pH", "Resistivity (ohm-m)", "Groundwater Presence", "Groundwater Condition"]} rows={records.map((record) => { const input = record.input as ExternalCorrosionInput; return { id: record.id, cells: [record.id, sourceValue(record.inspectionDate), sourceValue(input.coatingType), sourceValue(input.coatingTypeOther), sourceValue(input.coatingCondition), sourceValue(input.holidayFound), sourceMeasurement(record, input.holidaySize), sourceValue(input.soilType), sourceMeasurement(record, input.soilMoisture), sourceMeasurement(record, input.soilPh), sourceMeasurement(record, input.soilResistivity), sourceValue(input.groundwaterPresence), sourceValue(input.groundwaterCondition)] }; })} /><p className="mt-3 text-xs">Numeric source moisture is not converted into Dry/Moist/Wet observations. Source coating and soil values do not establish field verification.</p></OverviewPanel>
      <OverviewPanel title="Historical Engineering Source Results"><IndirectTable headers={["Assessment ID", "Inspection Date", "Corrosion Depth (mm)", "Corrosion Rate (mm/y)", "Metal Loss (%)", "Remaining Life (years)", "Failure Pressure (bar)", "Safety Margin (%)", "Stored Source Risk Level", "Stored Source Risk Score", "Stored Recommendation"]} rows={records.map((record) => { const result = record.result as StoredAssessment["result"] | null; const field = (name: string) => sourceMeasurement(record, result && name in result ? (result as unknown as Record<string, unknown>)[name] : null); return { id: record.id, cells: [record.id, sourceValue(record.inspectionDate), field("corrosionDepth"), field("corrosionRate"), field("metalLossPercent"), field("remainingLife"), field("failurePressure"), field("safetyMargin"), sourceValue(record.riskLevel), sourceValue(record.riskScore), sourceValue(result && "recommendation" in result ? result.recommendation : null)] }; })} /><p className="mt-3 text-xs">Stored source risk values are historical External Corrosion outputs; they are not ECDA concern, confirmed damage, official Risk_IDs or repair approval.</p><PreAssessmentFields rows={unavailableFields(["Anomaly verification", "Repair priority", "Repair method", "Post-repair verification"])} /></OverviewPanel>
      <OverviewPanel title="Referenced Source Records"><p className="mb-3 text-xs">Pipeline-level context only. No examination associations, selected survey, photo verification or defect correlation are inferred. Source links are read-only.</p><p className="mb-2 text-xs font-bold">CP source references</p><IndirectTable headers={["CP Point ID", "KP (source)", "Reading ID", "Reading Type", "Value (mV)", "Value (V)", "Electrode", "Reading Date"]} rows={points.flatMap((point) => (["onPotential", "offPotential"] as const).flatMap((kind) => { const reading = point.readings?.[kind]; return reading?.readingId ? [{ id: `${point.cp.id}-${kind}-${reading.readingId}`, cells: [point.cp.id, sourceValue(point.cp.kp), reading.readingId, kind === "onPotential" ? "ON_POTENTIAL" : "INSTANT_OFF_POTENTIAL", sourceValue(reading.valueMv), sourceValue(reading.valueV), sourceValue(reading.referenceElectrode), sourceValue(reading.readingAt)] }] : []; }))} /><p className="my-3 text-xs font-bold">ILI source references</p><IndirectTable headers={["ILI Run ID", "Inspection Date", "Tool Type", "Source Status"]} rows={runs.map((run) => ({ id: run.id, cells: [run.id, sourceValue(run.inspectionDate), sourceValue(run.toolType), sourceValue(run.status)] }))} /><IndirectTable headers={["ILI Anomaly ID", "ILI Run ID", "Feature ID", "KP (km)", "Type", "Orientation"]} rows={anomalies.map((anomaly) => ({ id: anomaly.id, cells: [anomaly.id, anomaly.inspectionRunId, sourceValue(anomaly.featureId), sourceValue(anomaly.kpKm), sourceValue(anomaly.anomalyType), sourceValue(anomaly.orientation)] }))} /><p className="my-3 text-xs font-bold">Document source references (first page)</p><IndirectTable headers={["Document_ID", "Document Version ID", "Revision", "File Name", "MIME Type", "Uploaded At"]} rows={documents.flatMap((document) => document.versions.map((version) => ({ id: `${document.documentId}-${version.documentVersionId}`, cells: [document.documentId, version.documentVersionId, sourceValue(version.revision), sourceValue(version.fileName), sourceValue(version.mimeType), sourceValue(version.uploadedAt)] })))} /></OverviewPanel>
    </div>
  );
}

function PostAssessmentDemo() {
  return (
    <>
      <Frame>
        <FrameHeader title="Post Assessment - ECDA Summary" code="NACE SP0502 Sec 6 - DEMO" />
        <div className="p-5">
          <div className="mb-5 flex flex-col gap-3 rounded-lg border border-cyan-200 bg-cyan-50/70 p-4 dark:border-[#00d6b7]/40 dark:bg-[#073e43]/40 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-cyan-800 dark:text-[#00d6b7]">ECDA cycle closeout</p>
              <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-[#8bbce5]">DEMO summary combines indirect inspection, direct examination and remediation evidence for the final engineering review.</p>
            </div>
            <Badge tone="cyan">READY FOR DECISION</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DirectField label="Pipeline segment" value="KP 0 - 91 km" detail="PipeGuard transmission line" />
            <DirectField label="ECDA cycle" value="Cycle 1" detail="Initial direct assessment" />
            <DirectField label="Regions reviewed" value="3" detail="R-1, R-C and R-2" />
            <DirectField label="Assessment outcome" value="Accept with actions" detail="Priority repairs tracked" />
          </div>
        </div>
      </Frame>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <Frame>
          <FrameHeader title="Findings and Priorities" code="SP0502 CLOSEOUT REGISTER - DEMO" />
          <div className="p-5">
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-[0.12em] text-cyan-700 dark:bg-[#06111f] dark:text-[#78bdf2]">
                  <tr>{["Finding", "Region", "Description", "Priority", "Status", "Next action"].map((heading) => <th className="px-4 py-3" key={heading}>{heading}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-[#173858]">
                  {postDemoFindings.map((finding, index) => (
                    <tr className="transition duration-300 hover:bg-cyan-50/60 dark:hover:bg-[#06111f]/70" key={finding.id} style={{ transitionDelay: `${index * 35}ms` }}>
                      <td className="px-4 py-3 font-mono font-bold text-slate-950 dark:text-white">{finding.id}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-white">{finding.region}</td>
                      <td className="max-w-[260px] px-4 py-3 text-slate-700 dark:text-white">{finding.finding}</td>
                      <td className="px-4 py-3"><Badge tone={priorityTone(finding.priority)}>{finding.priority}</Badge></td>
                      <td className="px-4 py-3 text-slate-700 dark:text-white">{finding.status}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-[#8bbce5]">{finding.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Frame>

        <Frame>
          <FrameHeader title="Remediation Status" code="DEMO WORKFLOW" />
          <div className="space-y-5 p-5">
            {([
              ["Immediate actions", "3 of 3 open", 0, "red" as const],
              ["Scheduled actions", "4 of 7 complete", 57, "amber" as const],
              ["Monitored findings", "12 retained", 100, "cyan" as const],
              ["Evidence packages", "15 of 22 closed", 68, "blue" as const]
            ] as const).map(([label, value, percent, tone], index) => (
              <div key={label} style={{ transitionDelay: `${index * 45}ms` }}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-bold text-slate-950 dark:text-white">{label}</span>
                  <span className={toneText[tone]}>{value}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-[#06111f]">
                  <div className={cx("h-full rounded-full transition-all duration-700", tone === "red" ? "bg-[#ff6671]" : tone === "amber" ? "bg-[#f59e0b]" : tone === "blue" ? "bg-[#58a6ff]" : "bg-[#00d6b7]")} style={{ width: `${percent}%` }} />
                </div>
              </div>
            ))}
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-5 text-slate-700 dark:border-[#f59e0b] dark:bg-[#1f1d12] dark:text-[#8bbce5]">
              <span className="font-bold text-[#f59e0b]">Closeout note:</span> Immediate findings remain open until repair evidence and post-repair inspection are attached.
            </div>
          </div>
        </Frame>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Frame>
          <FrameHeader title="Reassessment Interval" code="SP0502 MONITORING PLAN - DEMO" />
          <div className="grid gap-3 p-5 sm:grid-cols-3">
            <DirectField label="R-1 protected" value="12 months" detail="Next CIS / CP review" />
            <DirectField label="R-C crossing" value="6 months" detail="Focused coating review" />
            <DirectField label="Post repair" value="30 days" detail="Confirm repair condition" />
          </div>
        </Frame>

        <Frame>
          <FrameHeader title="Final Engineering Decision" code="INTEGRITY REVIEW - DEMO" />
          <div className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-[#f59e0b]/60 dark:bg-[#1f1d12]">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-700 dark:text-[#f59e0b]">Decision</p>
                <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">Accept with priority remediation</p>
              </div>
              <Badge tone="amber">CONDITIONAL</Badge>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-700 dark:text-[#8bbce5]">Keep the segment in service under the monitoring plan, complete the three immediate repairs, and close the cycle only after evidence review.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <DirectField label="Responsible group" value="Pipeline integrity" detail="Engineering approval required" />
              <DirectField label="Decision date" value="01 Oct 2026" detail="DEMO closeout record" />
            </div>
          </div>
        </Frame>
      </div>

      <Frame>
        <FrameHeader title="Recommendations" code="ECDA CYCLE 1 - DEMO" />
        <div className="grid gap-3 p-5 md:grid-cols-3">
          <DirectField label="1. Repair" value="Complete immediate anomalies" detail="Use approved repair procedure and retain evidence." />
          <DirectField label="2. Verify" value="Repeat UT after repair" detail="Confirm remaining wall and coating condition." />
          <DirectField label="3. Monitor" value="Continue CIS and soil review" detail="Reassess according to regional intervals." />
        </div>
      </Frame>
    </>
  );
}

type LaterEcdaContext = EcdaSegmentContext & {
  pipelines: PipelineRecord[];
  pipelineId: string;
  pipelineLoading: boolean;
  onSelectPipeline: (id: string) => void;
};

function LaterEcdaScope({ context, title }: { context: LaterEcdaContext; title: string }) {
  const segment = context.segments.find((record) => record.id === context.segmentId && record.pipelineId === context.pipelineId);
  return <div className="space-y-4">
    <RealPipelineSelector pipelines={context.pipelines} selectedPipelineId={context.pipelineId} isLoading={context.pipelineLoading} onSelect={context.onSelectPipeline} />
    <Frame><div className="p-4"><label className="block text-xs font-bold">Segment<select aria-label={`${title} segment`} className="mt-2 w-full rounded-md border border-slate-200 bg-white p-2 text-sm dark:border-[#1d4568] dark:bg-[#071522]" value={segment?.id ?? ""} disabled={!context.pipelineId || context.segmentLoading} onChange={(event) => context.onSelectSegment(event.target.value)}><option value="">{context.segmentLoading ? "Loading segments..." : "Select segment"}</option>{context.segments.filter((record) => record.pipelineId === context.pipelineId).map((record) => <option key={record.id} value={record.id}>{record.segmentId}</option>)}</select></label><PreAssessmentFields rows={[["Pipeline_ID", context.pipelineId || notAvailable], ["Segment_ID", segment?.id ?? notAvailable], ["From KP", segment?.startKp?.trim() || notAvailable], ["To KP", segment?.endKp?.trim() || notAvailable]]} /></div></Frame>
    {context.segmentError ? <p role="alert" className="text-sm text-red-600 dark:text-red-300">{context.segmentError}</p> : null}
    <p className="text-xs text-slate-500 dark:text-[#6fa6d3]">ECDA_Assessment_ID: {notAvailable}. Pipeline and segment selection is source context; approved ECDA scope and source snapshots are {notAvailable}.</p>
  </div>;
}

function LaterEcdaFields({ labels }: { labels: string[] }) {
  return <PreAssessmentFields rows={labels.map((label) => [label, notAvailable])} />;
}

function LaterEcdaKpi({ label, detail }: { label: string; detail: string }) {
  return <div className="min-w-0 [&>article]:h-full [&>article>p:first-child]:text-lg [&>article>p]:break-words"><KpiCard label={label} value={notAvailable} detail={detail} tone="blue" /></div>;
}

function LaterEcdaFilter({ label, placeholder }: { label: string; placeholder?: string }) {
  return <label className="block min-w-0 text-xs font-bold">{label}<select disabled title="An authoritative ECDA record and controlled filter values are not available." className="mt-2 w-full rounded-md border border-slate-200 bg-transparent p-2 text-xs opacity-60 dark:border-[#1d4568]"><option>{placeholder ?? notAvailable}</option></select></label>;
}

function LaterEcdaChart({ title, labels }: { title: string; labels: string[] }) {
  return <OverviewPanel title={title}><p className="py-10 text-center text-sm">{notAvailable}</p><LaterEcdaFields labels={labels} /></OverviewPanel>;
}

function RealPostAssessment({ context, assessment, isLoadingAssessment, error }: {
  context: LaterEcdaContext; assessment: RealDirectAssessment; isLoadingAssessment: boolean; error: string;
}) {
  return <div className="space-y-5" aria-label="REAL ECDA Post-Assessment">
    <LaterEcdaScope context={context} title="Post-Assessment" />
    {error ? <RealUnavailable title="Could Not Load Historical Source Context" detail={error} status="error" /> : null}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[
      ["Validated Findings", "Validated findings / initial indications and change"],
      ["Reassessment Interval", "Recommended interval and approval"],
      ["Coverage Evaluation", "Effective coverage and evaluation"],
      ["Confidence Score", "Assessment confidence and classification"],
      ["Final Assessment Outcome", "Approved engineering conclusion"]
    ].map(([label, detail]) => <LaterEcdaKpi key={label} label={label} detail={detail} />)}</div>
    <div className="grid gap-4 xl:grid-cols-3">
      <LaterEcdaChart title="Findings Summary" labels={["External Corrosion", "Coating Damage", "CP Related", "Mechanical Damage", "Other", "Total"]} />
      <LaterEcdaChart title="Residual ECDA Concern Matrix" labels={["Indication Severity", "Evidence / Confidence", "Approved matrix methodology", "Residual concern"]} />
      <LaterEcdaChart title="Coverage & Confidence" labels={["Inspection Coverage", "Assessed", "Not Assessed", "Assessment Confidence", "High", "Medium", "Low"]} />
    </div>
    <p className="text-xs text-slate-500 dark:text-[#6fa6d3]">Residual ECDA concern is distinct from official Risk. Matrix rules, coverage, confidence and effectiveness evaluation are {notAvailable}; no chart samples or approvals are inferred.</p>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <OverviewPanel title="Remediation Recommendations" action={<PreAssessmentAction reason="Approved ECDA recommendations and central Action_ID references are not available.">View All</PreAssessmentAction>}><OverviewTable headers={["ECDA Priority", "Recommendation", "Basis", "Source Record ID", "Action_ID"]} /></OverviewPanel>
      <OverviewPanel title="Closure Criteria"><LaterEcdaFields labels={["All significant indications assessed", "Findings validated with field data", "Remediation actions defined", "ECDA concern within approved limits", "Management review completed", "Final approval obtained"]} /></OverviewPanel>
      <OverviewPanel title="Management Review Status"><OverviewTable headers={["Review", "Status", "Date", "Reviewer"]} /><LaterEcdaFields labels={["Technical Review", "Risk Review (Risk Assessment)", "Integrity Manager", "HSE Review"]} /></OverviewPanel>
      <OverviewPanel title="Approval Workflow"><LaterEcdaFields labels={["Assessment Complete", "Management Review", "Final Approval", "Assessment Closed"]} /></OverviewPanel>
    </div>
    <OverviewPanel title="Reassessment Basis"><LaterEcdaFields labels={["ECDA_Reassessment_ID", "Recommended Interval", "Basis", "Effective Date", "Next Due Date", "Engineering Justification", "Approved By", "Approval Date"]} /></OverviewPanel>
    <OverviewPanel title="Linked Report Generation"><p className="mb-4 text-xs text-slate-500 dark:text-[#6fa6d3]">Reports & Analytics generates approved reports; Document Management retains one Document_ID per file.</p><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{["ECDA Final Report", "Findings Register", "Risk Assessment Summary", "Management Summary"].map((label) => <div key={label} className="space-y-3 rounded-md border border-slate-200 p-3 dark:border-[#1d4568]"><p className="text-xs font-bold">{label}</p><p className="text-xs">{notAvailable}</p><PreAssessmentAction reason="Approved ECDA revision, source snapshot, Report_Run_ID and Document_ID linkage are not available.">Generate</PreAssessmentAction></div>)}</div></OverviewPanel>
    <OverviewPanel title="Historical External Corrosion Source Context"><p className="mb-3 text-xs text-slate-500 dark:text-[#6fa6d3]">Source recommendation only; this is not an ECDA post-assessment conclusion, physical verification, official Risk or an approved source snapshot.</p><PreAssessmentFields rows={[["Source Assessment ID", !isLoadingAssessment && !error ? assessment.sourceAssessmentId ?? notAvailable : notAvailable], ["Source Date", !isLoadingAssessment && !error ? formatDate(assessment.sourceDate) : notAvailable], ["Stored Recommendation", !isLoadingAssessment && !error ? displayValue(assessment.recommendation) : notAvailable]]} /></OverviewPanel>
  </div>;
}

function RealEcdaFindings({ context }: { context: LaterEcdaContext }) {
  const missing = "An ECDA_Finding_ID and approved finding evidence links are not available.";
  return <div className="space-y-5" aria-label="REAL ECDA Findings">
    <LaterEcdaScope context={context} title="Findings" />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">{["Total Findings", "Critical", "High", "Medium", "Low", "Closed"].map((label) => <LaterEcdaKpi key={label} label={label} detail="ECDA finding count and percentage unavailable" />)}</div>
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]"><div className="min-w-0 space-y-4">
      <div className="grid gap-4 lg:grid-cols-2"><LaterEcdaChart title="Findings by Severity" labels={["Critical", "High", "Medium", "Low"]} /><LaterEcdaChart title="Findings by Status" labels={["Open", "In Progress", "Closed", "Deferred"]} /></div>
      <OverviewPanel title="Filter Findings"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><LaterEcdaFilter label="Source Stage" placeholder="All Stages" /><LaterEcdaFilter label="Severity" placeholder="All Severities" /><LaterEcdaFilter label="Status" placeholder="All Statuses" /><label className="block text-xs font-bold">Search findings<input aria-label="Search findings" placeholder="Search findings..." disabled title={missing} className="mt-2 w-full rounded-md border border-slate-200 bg-transparent p-2 dark:border-[#1d4568]" /></label><PreAssessmentAction reason={missing}>Clear Filters</PreAssessmentAction></div></OverviewPanel>
      <OverviewPanel title="Finding Register"><OverviewTable headers={["ID", "KP / Location", "Source Stage", "Description", "ECDA Severity", "Confidence", "Status", "Linked Action_ID", "Linked Defect_ID", "ILI/CP Evidence", "Responsible Engineer"]} /><div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs"><span>Finding count: {notAvailable}</span><LaterEcdaFilter label="Rows per page" /><PreAssessmentAction reason={missing}>Previous</PreAssessmentAction><PreAssessmentAction reason={missing}>Next</PreAssessmentAction></div></OverviewPanel>
    </div><div className="min-w-0"><OverviewPanel title="Finding Details"><p className="mb-4 text-sm">{notAvailable}</p><div className="mb-4 flex flex-wrap gap-2">{["Summary", "Evidence", "Actions", "History"].map((label) => <PreAssessmentAction key={label} reason={missing}>{label}</PreAssessmentAction>)}</div><LaterEcdaFields labels={["ECDA_Finding_ID", "Pipeline_ID", "Segment_ID", "KP / Location", "Source Stage", "Source_Record_ID", "ECDA Severity", "Confidence", "Responsible Engineer", "Created", "Last Updated", "Description", "ECDA Concern Implication"]} /><h3 className="my-3 text-xs font-bold">Related Items</h3><LaterEcdaFields labels={["Action_ID", "Defect_ID", "ILI Evidence", "CP Evidence", "Document_IDs", "Physical Damage Confirmed", "Engineer Approval"]} /><div className="mt-4 flex flex-wrap gap-2"><PreAssessmentAction reason={missing}>View Details</PreAssessmentAction><PreAssessmentAction reason="Physical confirmation, deduplication, engineer approval and controlled Defect Manager workflow are required.">Send to Defect Manager</PreAssessmentAction><PreAssessmentAction reason={missing}>Export</PreAssessmentAction></div></OverviewPanel></div></div>
    <p className="text-xs text-slate-500 dark:text-[#6fa6d3]">ECDA Finding ≠ Defect. CP and ILI are evidence source types, not additional ECDA lifecycle stages. Finding counts and source correlations are UNVERIFIED.</p>
  </div>;
}

function RealEcdaActions({ context }: { context: LaterEcdaContext }) {
  const missing = "The Central Integrity Action Register API and ECDA Action_ID relationships are not available.";
  return <div className="space-y-5" aria-label="REAL ECDA Actions">
    <LaterEcdaScope context={context} title="Actions" />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{["Total Actions", "Overdue", "Open", "Completed"].map((label) => <LaterEcdaKpi key={label} label={label} detail="Central action count and period comparison unavailable" />)}</div>
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]"><div className="min-w-0 space-y-4">
      <div className="grid gap-4 lg:grid-cols-3"><LaterEcdaChart title="Action Status" labels={["Open", "Overdue", "Completed"]} /><LaterEcdaChart title="Actions by Priority" labels={["High", "Medium", "Low", "Info"]} /><LaterEcdaChart title="Actions by Module" labels={["ECDA", "ILI", "CP", "Inspection", "Other"]} /></div>
      <OverviewPanel title="Filter Actions"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{["Status", "Priority", "Owner", "Module"].map((label) => <LaterEcdaFilter key={label} label={label} placeholder="All" />)}<label className="text-xs font-bold sm:col-span-2">Search actions<input disabled aria-label="Search actions" title={missing} placeholder="Search actions..." className="mt-2 w-full rounded-md border border-slate-200 bg-transparent p-2 dark:border-[#1d4568]" /></label><PreAssessmentAction reason={missing}>Clear Filters</PreAssessmentAction></div></OverviewPanel>
      <OverviewPanel title="Action Register" action={<div className="flex flex-wrap gap-2"><PreAssessmentAction reason={missing}>Export</PreAssessmentAction><PreAssessmentAction reason={missing}>New Action</PreAssessmentAction></div>}><p className="mb-3 text-xs text-slate-500 dark:text-[#6fa6d3]">Actions are managed through the central integrity action register. One Action_ID; no separate ECDA action records.</p><OverviewTable headers={["Action_ID", "Action Title", "Linked Finding", "ECDA Priority", "Owner", "Due Date", "Status", "Progress", "Linked Module"]} /><div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs"><span>Action count: {notAvailable}</span><LaterEcdaFilter label="Rows per page" /><PreAssessmentAction reason={missing}>Previous</PreAssessmentAction><PreAssessmentAction reason={missing}>Next</PreAssessmentAction></div></OverviewPanel>
    </div><div className="min-w-0 space-y-4"><OverviewPanel title="Action Workflow"><p className="mb-3 text-xs text-slate-500 dark:text-[#6fa6d3]">Uses the central integrity action register</p><LaterEcdaFields labels={["Identify", "Assess", "Plan", "Implement", "Verify", "Close"]} /></OverviewPanel><OverviewPanel title="Upcoming Actions" action={<PreAssessmentAction reason={missing}>View All</PreAssessmentAction>}><OverviewTable headers={["Due Date", "Action", "Pipeline / Segment", "Priority", "Due In"]} /></OverviewPanel><OverviewPanel title="Overdue Actions" action={<PreAssessmentAction reason={missing}>View All</PreAssessmentAction>}><OverviewTable headers={["Due Date", "Action", "Pipeline / Segment", "Priority", "Days Overdue"]} /></OverviewPanel></div></div>
  </div>;
}

function RealEcdaDocuments({ context, refreshKey }: { context: LaterEcdaContext; refreshKey: number }) {
  const [query, setQuery] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selection, setSelection] = useState<{ documentId: string; versionId: string } | null>(null);
  const [detailTab, setDetailTab] = useState("Details");
  const [previewRequest, setPreviewRequest] = useState<{ key: string } | null>(null);
  const [preview, setPreview] = useState<{ key: string; url: string; error: string; loading: boolean } | null>(null);
  const validSegmentId = context.segments.find((record) => record.id === context.segmentId && record.pipelineId === context.pipelineId)?.id ?? "";
  useEffect(() => { setPage(1); }, [context.pipelineId, validSegmentId]);
  const scopeKey = JSON.stringify([context.pipelineId, validSegmentId, query, approvalStatus, page, pageSize, refreshKey]);
  const [result, setResult] = useState<{ key: string; data: { items: DocumentRepositoryItem[]; total: number; page: number; pageSize: number } | null; error: string } | null>(null);
  useEffect(() => {
    let live = true;
    setSelection(null);
    setPreviewRequest(null);
    setResult(null);
    if (context.pipelineId) {
      fetchDocuments({ pipelineId: context.pipelineId, ...(validSegmentId ? { segmentId: validSegmentId } : {}), q: query, approvalStatus, page, pageSize }).then((data) => {
        if (live) setResult({ key: scopeKey, data, error: "" });
      }).catch(() => { if (live) setResult({ key: scopeKey, data: null, error: "Document source could not be loaded. ECDA remains available." }); });
    }
    return () => { live = false; };
  }, [context.pipelineId, validSegmentId, query, approvalStatus, page, pageSize, scopeKey]);
  const current = result?.key === scopeKey ? result : null;
  const data = current?.data;
  const document = data?.items.find((item) => item.documentId === selection?.documentId);
  const version = document?.versions.find((item) => item.documentVersionId === selection?.versionId);
  const previewKey = document && version ? JSON.stringify([scopeKey, document.documentId, version.documentVersionId]) : "";
  useEffect(() => {
    let live = true;
    let objectUrl = "";
    setPreview(null);
    if (previewKey && previewRequest?.key === previewKey && document && version) {
      setPreview({ key: previewKey, url: "", error: "", loading: true });
      downloadDocumentVersion(document.documentId, version.documentVersionId).then((blob) => {
        if (!live) return;
        objectUrl = URL.createObjectURL(blob);
        setPreview({ key: previewKey, url: objectUrl, error: "", loading: false });
      }).catch(() => { if (live) setPreview({ key: previewKey, url: "", error: "The selected source file could not be loaded.", loading: false }); });
    }
    return () => { live = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [previewKey, previewRequest, document, version]);
  const selectedPreview = preview?.key === previewKey ? preview : null;
  const missing = "ECDA_Assessment_ID, stage and approved document evidence relationships are not available.";
  const controlClass = "mt-2 w-full rounded-md border border-slate-200 bg-transparent p-2 text-xs dark:border-[#1d4568]";
  const categories = ["Total Documents", "Survey Reports", "CP Evidence", "Excavation Reports", "Photos", "Approvals", "Final Reports"];
  const linkedIds = document?.links.map((link) => [link.pipeline ? `Pipeline_ID: ${link.pipeline.id} (${link.pipeline.pipelineCode})` : "", link.segment ? `Segment_ID: ${link.segment.id} (${link.segment.segmentId})` : "", link.asset ? `Asset_ID: ${link.asset.id} (${link.asset.assetId})` : ""].filter(Boolean).join(" · ")).filter(Boolean) ?? [];
  return <div className="space-y-5" aria-label="REAL ECDA Documents">
    <LaterEcdaScope context={context} title="Documents" />
    <OverviewPanel title="Documents" action={<div className="flex flex-wrap gap-2"><PreAssessmentAction reason={missing}>Upload Link</PreAssessmentAction><PreAssessmentAction reason="Approved ECDA revision, report run and source snapshot are not available.">Generate Report</PreAssessmentAction><a href="/document-upload" className="rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-cyan-700 dark:border-[#1d4568] dark:text-[#78bdf2]">Open in Document Management</a></div>}><p className="text-xs text-slate-500 dark:text-[#6fa6d3]">Read-only Document Management source context for the selected pipeline/segment. ECDA document membership and stage: {notAvailable}.</p></OverviewPanel>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">{categories.map((label) => <LaterEcdaKpi key={label} label={label} detail="ECDA-linked document count unavailable" />)}</div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{["All Documents", ...categories.slice(1, 6)].map((label) => <Frame key={label}><div className="space-y-2 p-3"><PreAssessmentAction reason="An approved ECDA document category mapping is not available.">{label}</PreAssessmentAction><p className="text-xs">{notAvailable}</p></div></Frame>)}</div>
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"><div className="min-w-0"><OverviewPanel title="Document Register — Source Context">
      <div className="mb-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">Search documents<input className={controlClass} value={query} disabled={!context.pipelineId} placeholder="Search documents..." onChange={(event) => { setQuery(event.target.value); setPage(1); }} /></label><LaterEcdaFilter label="Linked Stage" placeholder="All Stages" /><label className="text-xs font-bold">Status<select className={controlClass} value={approvalStatus} disabled={!context.pipelineId} onChange={(event) => { setApprovalStatus(event.target.value); setPage(1); }}><option value="">All Status</option>{["Draft", "Submitted", "Under Review", "Approved", "Approved with Comments", "Rejected", "Superseded", "Archived"].map((status) => <option key={status}>{status}</option>)}</select></label><LaterEcdaFilter label="Date (Newest)" /></div>
      <p className="mb-3 text-xs text-slate-500 dark:text-[#6fa6d3]">Search uses source title, document number and category. Status matches any source revision; rows show the matching revision. Source results are ordered by repository update time, not ECDA approval date.</p>
      {context.pipelineId && !current ? <p role="status" className="mb-3 text-xs">Loading document source metadata...</p> : null}{current?.error ? <p role="alert" className="mb-3 text-sm text-red-600 dark:text-red-300">{current.error}</p> : null}
      <IndirectTable headers={["Document_ID", "File Name", "Linked Stage", "Revision", "Status", "Uploaded By (ID)", "Date", "Linked Record", "Select"]} rows={(data?.items ?? []).map((item) => {
        const rowVersion = item.versions.find((candidate) => !approvalStatus || candidate.approvalStatus === approvalStatus);
        return { id: item.documentId, cells: [item.documentId, rowVersion?.fileName ?? notAvailable, notAvailable, rowVersion?.revision ?? notAvailable, rowVersion?.approvalStatus ?? notAvailable, rowVersion?.uploadedById ?? notAvailable, formatDate(rowVersion?.uploadedAt ?? null), item.links.map((link) => link.segment?.segmentId ?? link.asset?.assetId ?? link.pipeline?.pipelineCode).filter(Boolean).join(" · ") || notAvailable, <button key="select" type="button" disabled={!rowVersion} onClick={() => { if (rowVersion) { setSelection({ documentId: item.documentId, versionId: rowVersion.documentVersionId }); setDetailTab("Details"); setPreviewRequest(null); } }} className="rounded-md border border-slate-200 p-2 text-cyan-700 disabled:opacity-50 dark:border-[#1d4568] dark:text-[#78bdf2]">View Details</button>] };
      })} />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs"><span>Source documents: {data ? data.total : notAvailable} · Selected: {document ? 1 : 0}</span><label>Rows per page<select aria-label="Document rows per page" value={pageSize} disabled={!context.pipelineId} className="ml-2 rounded-md border border-slate-200 bg-transparent p-2 dark:border-[#1d4568]" onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>{[10, 25, 50].map((size) => <option key={size}>{size}</option>)}</select></label><button type="button" disabled={!data || page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-md border border-slate-200 p-2 disabled:opacity-50 dark:border-[#1d4568]">Previous</button><span>Page {data ? data.page : notAvailable} / {data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : notAvailable}</span><button type="button" disabled={!data || page * pageSize >= data.total} onClick={() => setPage((value) => value + 1)} className="rounded-md border border-slate-200 p-2 disabled:opacity-50 dark:border-[#1d4568]">Next</button></div>
    </OverviewPanel></div><div className="min-w-0"><OverviewPanel title="Document Preview" action={document ? <button type="button" aria-label="Close document preview" onClick={() => { setSelection(null); setPreviewRequest(null); }} className="rounded-md border border-slate-200 p-2 text-xs dark:border-[#1d4568]">Close</button> : undefined}>
      <p className="mb-3 break-words text-sm font-bold">{version?.fileName ?? notAvailable}</p>
      {document ? <label className="mb-3 block text-xs font-bold">Source Revision<select aria-label="Source document revision" value={version?.documentVersionId ?? ""} onChange={(event) => { setSelection({ documentId: document.documentId, versionId: event.target.value }); setPreviewRequest(null); }} className={controlClass}>{document.versions.map((item) => <option key={item.documentVersionId} value={item.documentVersionId}>{item.revision ?? notAvailable} · {item.documentVersionId}</option>)}</select></label> : null}
      <button type="button" disabled={!document || !version || selectedPreview?.loading} onClick={() => setPreviewRequest({ key: previewKey })} title={version ? "Load the exact selected source document version" : "Select an existing source document version"} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-cyan-700 disabled:opacity-50 dark:border-[#1d4568] dark:text-[#78bdf2]">View Document</button>
      {selectedPreview?.loading ? <p role="status" className="mt-3 text-xs">Loading source file...</p> : null}{selectedPreview?.error ? <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-300">{selectedPreview.error}</p> : null}
      {selectedPreview?.url && version ? <div className="mt-3 space-y-3">{version.mimeType === "application/pdf" || ["image/png", "image/jpeg"].includes(version.mimeType) ? <iframe title="Selected source document preview" sandbox="" src={selectedPreview.url} className="h-80 w-full rounded-md border border-slate-200 dark:border-[#1d4568]" /> : <p className="text-xs">Inline preview: {notAvailable}</p>}<a href={selectedPreview.url} download={version.fileName} className="inline-block rounded-md border border-slate-200 p-2 text-xs font-bold text-cyan-700 dark:border-[#1d4568] dark:text-[#78bdf2]">Download selected version</a></div> : <p className="py-8 text-center text-sm">{notAvailable}</p>}
      <div role="tablist" aria-label="Document source details" className="my-4 flex flex-wrap gap-2">{["Details", "Tags", "Linked Records", "Source Modules"].map((tab) => <button key={tab} type="button" role="tab" aria-selected={detailTab === tab} onClick={() => setDetailTab(tab)} className={cx("rounded-md border px-3 py-2 text-xs", detailTab === tab ? "border-cyan-500 text-cyan-700 dark:text-cyan-300" : "border-slate-200 dark:border-[#1d4568]")}>{tab}</button>)}</div>
      {detailTab === "Details" ? <PreAssessmentFields rows={[["Document_ID", document?.documentId ?? notAvailable], ["Document_Version_ID", version?.documentVersionId ?? notAvailable], ["Revision", version?.revision ?? notAvailable], ["Title", document?.title ?? notAvailable], ["File Name", version?.fileName ?? notAvailable], ["File Type", version?.mimeType ?? notAvailable], ["File Size (bytes)", version ? String(version.fileSize) : notAvailable], ["Linked Stage", notAvailable], ["Status", version?.approvalStatus ?? notAvailable], ["Uploaded By (ID)", version?.uploadedById ?? notAvailable], ["Date Uploaded", version?.uploadedAt ?? notAvailable], ["Description", document?.description ?? notAvailable], ["Document Type", document?.documentType ?? notAvailable], ["Category", document?.category ?? notAvailable]]} /> : detailTab === "Linked Records" ? <div className="space-y-3 text-xs">{document?.links.length ? document.links.map((link) => <p key={link.documentLinkId} className="break-words">Document_Link_ID: {link.documentLinkId} · Document_Version_ID: {link.documentVersionId ?? notAvailable} · {link.pipeline ? `Pipeline_ID: ${link.pipeline.id}` : link.segment ? `Segment_ID: ${link.segment.id}` : link.asset ? `Asset_ID: ${link.asset.id}` : notAvailable}</p>) : <p>{notAvailable}</p>}<p className="break-words">{linkedIds.join("; ") || notAvailable}</p><p>ECDA approved evidence membership: {notAvailable}</p></div> : <p className="py-6 text-center text-sm">{notAvailable}</p>}
      <p className="mt-4 text-xs text-slate-500 dark:text-[#6fa6d3]">Current repository revisions are source context, not an immutable ECDA approval snapshot. Tags, source-module assignments and stage membership remain UNVERIFIED.</p>
    </OverviewPanel></div></div>
  </div>;
}

function RealEcdaTrends({ context }: { context: LaterEcdaContext }) {
  const missing = "Historical ECDA revisions, stage timestamps, approved source snapshots and correlation rules are not available.";
  return <div className="space-y-5" aria-label="REAL ECDA Trends & Historical">
    <LaterEcdaScope context={context} title="Trends & Historical" />
    <OverviewPanel title="Historical Filters"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><LaterEcdaFilter label="Date Range" /><LaterEcdaFilter label="Metric" placeholder="All Metrics" /><PreAssessmentAction reason={missing}>Apply</PreAssessmentAction><PreAssessmentAction reason={missing}>Reset</PreAssessmentAction></div></OverviewPanel>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">{["Total Assessments", "Total Findings", "Recurring Locations", "Avg. Stage Duration", "Reassessments", "Surveys Completed"].map((label) => <LaterEcdaKpi key={label} label={label} detail="Historical ECDA result and previous-period comparison unavailable" />)}</div>
    <div className="grid gap-4 xl:grid-cols-3"><LaterEcdaChart title="Year-over-Year Assessment Counts" labels={["Year", "Assessments"]} /><LaterEcdaChart title="Finding Trends" labels={["Year", "Number of Findings", "High", "Medium", "Low"]} /><LaterEcdaChart title="Recurring Locations (Top 10)" labels={["KP / Location", "Recurrence Count", "Location_Correlation_Group_ID"]} /></div>
    <div className="grid gap-4 xl:grid-cols-3"><LaterEcdaChart title="Stage Durations (Historical Average)" labels={["Duration (Days)", "Pre-Assessment", "Indirect Inspection", "Direct Examination", "Post-Assessment"]} /><OverviewPanel title="Reassessment History"><OverviewTable headers={["#", "Assessment ID", "Original Date", "Reassessment Date", "Trigger", "Findings Δ"]} /></OverviewPanel><OverviewPanel title="Survey History"><OverviewTable headers={["#", "Survey ID", "Survey Date", "Type", "Coverage (km)", "Findings"]} /></OverviewPanel></div>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"><LaterEcdaChart title="Historical Condition Changes by Segment" labels={["Year", "Condition Index", "Overall Condition", "External Corrosion", "Coating Condition"]} /><OverviewPanel title="Condition Index (By Year)"><OverviewTable headers={["Year", "Overall", "External Corrosion", "Coating"]} /></OverviewPanel></div>
    <p className="text-xs text-slate-500 dark:text-[#6fa6d3]">UNVERIFIED: historical populations, condition-index methodology, reporting intervals and same-location tolerance. Source records are not recast as ECDA history; no correlation groups or charts are invented.</p>
  </div>;
}

function RealEcdaConfiguration({ context }: { context: LaterEcdaContext }) {
  const missing = "Controlled ECDA configuration persistence, permissions and methodology versions are not available.";
  const manage = (label: string) => <PreAssessmentAction reason={missing}>{label}</PreAssessmentAction>;
  const rows = (labels: string[], columns: number) => labels.map((label) => ({ id: label, cells: [label, ...Array.from({ length: columns - 1 }, () => notAvailable)] }));
  return <div className="space-y-5" aria-label="REAL ECDA Configuration">
    <LaterEcdaScope context={context} title="Configuration" />
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-black">Configuration</h2><p className="mt-2 text-sm text-slate-500 dark:text-[#6fa6d3]">ECDA methodology, templates, rules, data sources and workflows for this assessment.</p></div><div className="flex flex-wrap gap-2">{manage("Reset to Default")}{manage("Save Configuration")}</div></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <OverviewPanel title="1. Methodology Settings"><LaterEcdaFilter label="Methodology Standard" /><div className="mt-3"><LaterEcdaFilter label="Assessment Level" /></div><LaterEcdaFields labels={["ECDA_Methodology_ID", "ECDA_Methodology_Version", "Enable ECDA Indication Prioritisation", "Include Historical Findings", "Use Segment Grouping"]} /></OverviewPanel>
      <OverviewPanel title="2. Stage Templates" action={manage("Manage Templates")}><IndirectTable headers={["Stage", "Template"]} rows={rows(stages.map((stage) => stage.id === "Post Assessment" ? "Post-Assessment" : stage.id), 2)} /></OverviewPanel>
      <OverviewPanel title="3. Assessment Criteria" action={manage("Manage Criteria")}><IndirectTable headers={["Criterion", "ID", "Weighting"]} rows={rows(["Coating Condition", "CP Effectiveness", "Environment Severity", "Historical Corrosion", "Inspection Evidence"], 3)} /></OverviewPanel>
      <OverviewPanel title="4. Threshold Rules" action={manage("Edit Threshold Rules")}><IndirectTable headers={["Condition", "Low", "Medium", "High"]} rows={rows(["Coating Condition", "CP Level (mV)", "Corrosion Rate (mm/yr)", "Feature Density"], 4)} /><p className="mt-3 text-xs text-slate-500 dark:text-[#6fa6d3]">ECDA concern thresholds: {notAvailable}. CP criteria require the actual reading type, electrode, units and source version; no ON/OFF substitution.</p></OverviewPanel>
      <OverviewPanel title="5. Survey-Type Library" action={manage("Manage Survey Types")}><IndirectTable headers={["Code", "Survey Type", "Active"]} rows={rows(["DCVG", "CIPS", "ACVG", "PCM", "ILI-EC", "VIS"], 3)} /><p className="mt-3 text-xs text-slate-500 dark:text-[#6fa6d3]">Reference labels only; controlled library entries and active states are {notAvailable}.</p></OverviewPanel>
      <OverviewPanel title="6. Confidence Rules" action={manage("Configure Confidence Rules")}><IndirectTable headers={["Evidence Type", "Weighting", "Active"]} rows={rows(["Direct Examination", "ILI Data", "CP Data", "Historical Records", "Third Party Reports"], 3)} /></OverviewPanel>
      <OverviewPanel title="7. Notification Settings" action={manage("Manage Notifications")}><IndirectTable headers={["Event", "Notify", "Channels"]} rows={rows(["Stage Completion", "High ECDA Priority Finding", "Assessment Overdue", "Approval Required", "Configuration Changes"], 3)} /></OverviewPanel>
      <OverviewPanel title="8. Data-Source Mapping" action={<a href="/integration-hub" className="rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-cyan-700 dark:border-[#1d4568] dark:text-[#78bdf2]">Open Integration Hub</a>}><IndirectTable headers={["Data Source", "Logical Reference", "ECDA Mapping Status"]} rows={[
        { id: "cp", cells: ["CP Monitoring", "CP source record IDs / criteria versions", notAvailable] },
        { id: "ili", cells: ["ILI Analysis", "ILI_Run_ID / ILI_Anomaly_ID", notAvailable] },
        { id: "direct", cells: ["Direct Examination", "ECDA_Direct_Examination_ID", notAvailable] },
        { id: "master", cells: ["Pipeline / Asset Master", "Pipeline_ID / Segment_ID / Asset_ID", notAvailable] },
        { id: "external", cells: ["External Corrosion", "Source Assessment ID / survey references", notAvailable] },
        { id: "documents", cells: ["Document Management", "Document_ID / Document_Version_ID", notAvailable] }
      ]} /><p className="mt-3 text-xs text-slate-500 dark:text-[#6fa6d3]">Read-only logical ownership map. Technical connector status is not asserted. Connections remain in Integration Hub.</p></OverviewPanel>
    </div>
    <div className="grid gap-4 xl:grid-cols-3">
      <OverviewPanel title="9. Dropdown Dictionaries" action={manage("Manage Dictionaries")}><IndirectTable headers={["Dictionary", "Values", "Last Updated"]} rows={rows(["Coating Type", "Soil Type", "Environment Type", "Corrosion Mechanism"], 3)} /></OverviewPanel>
      <OverviewPanel title="10. Workflow Approvals" action={manage("Configure Workflow")}><IndirectTable headers={["Stage", "Approver Role", "Required"]} rows={rows(stages.map((stage) => stage.id === "Post Assessment" ? "Post-Assessment" : stage.id), 3)} /><LaterEcdaFields labels={["Final Approval Requirement", "Stage-Gate Prerequisites", "Authorized Override Audit", "Approved Revision Immutability", "Exact Source Revision Snapshot", "Reassessment Rules"]} /><p className="mt-3 text-xs text-slate-500 dark:text-[#6fa6d3]">These backend safeguards are unavailable. Tab navigation does not approve or advance a stage. Four lifecycle stages only.</p></OverviewPanel>
      <OverviewPanel title="11. Permissions References" action={manage("Manage Permissions")}><IndirectTable headers={["Role", "Can View", "Can Edit", "Can Approve"]} rows={rows(["Viewer", "Integrity Engineer", "Inspection Manager", "Senior Integrity Engineer", "Administrator"], 4)} /><p className="mt-3 text-xs text-slate-500 dark:text-[#6fa6d3]">Reference role labels only. ECDA permission grants: {notAvailable}.</p></OverviewPanel>
    </div>
  </div>;
}

function OverviewAction({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return <button type="button" onClick={onClick} disabled={!onClick} title={onClick ? undefined : "Required ECDA workflow is not available"} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-cyan-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#1d4568] dark:text-[#78bdf2]">{children}</button>;
}

function OverviewPanel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return <Frame><div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-[#173858]"><h2 className="text-sm font-bold">{title}</h2>{action}</div><div className="p-4">{children}</div></Frame>;
}

function OverviewTable({ headers }: { headers: string[] }) {
  return <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 dark:bg-[#071522]"><tr>{headers.map((header) => <th key={header} scope="col" className="whitespace-nowrap px-3 py-2 font-bold">{header}</th>)}</tr></thead><tbody><tr><td colSpan={headers.length} className="px-3 py-8 text-center text-slate-500 dark:text-[#6fa6d3]">{notAvailable}</td></tr></tbody></table></div>;
}

function EcdaOverview({ pipelines, pipelineId, loading, error, cp, cpLoading, onSelectPipeline, onNavigate, segments, segmentId, segmentLoading, segmentError, onSelectSegment }: EcdaSegmentContext & {
  pipelines: PipelineRecord[]; pipelineId: string; loading: boolean; error: string;
  cp: CpMonitoringRealData | null; cpLoading: boolean;
  onSelectPipeline: (id: string) => void; onNavigate: (tab: EcdaTab) => void;
}) {
  const pipeline = pipelines.find((record) => record.id === pipelineId);
  const segment = segments.find((record) => record.id === segmentId && record.pipelineId === pipelineId);
  const sourceCp = cp?.pipelineId === pipelineId ? cp : null;
  const selectClass = "mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-[#1d4568] dark:bg-[#071522]";
  return <div className="space-y-5" aria-label="ECDA Overview">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="max-w-4xl text-sm text-slate-500 dark:text-[#6fa6d3]">Execute the External Corrosion Direct Assessment (ECDA) lifecycle from pre-assessment to post-assessment, integrating CP, external corrosion, ILI and inspection data.</p>
      <div className="flex gap-2"><OverviewAction>Export</OverviewAction><OverviewAction>New ECDA Assessment</OverviewAction></div>
    </div>
    <Frame><div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-6">
      <label className="text-xs font-bold">Pipeline<select aria-label="Overview pipeline" className={selectClass} value={pipelineId} disabled={loading} onChange={(event) => onSelectPipeline(event.target.value)}><option value="">{loading ? "Loading pipelines..." : "Select pipeline"}</option>{pipelines.map((record) => <option key={record.id} value={record.id}>{record.pipelineCode} - {record.pipelineName}</option>)}</select><span className="mt-2 block font-normal">{pipeline?.pipelineCode ?? notAvailable}<br />{pipeline?.pipelineName ?? notAvailable}</span></label>
      <label className="text-xs font-bold">Segment<select aria-label="Overview segment" className={selectClass} value={segment?.id ?? ""} disabled={!pipelineId || segmentLoading} onChange={(event) => onSelectSegment(event.target.value)}><option value="">{segmentLoading ? "Loading segments..." : "Select segment"}</option>{segments.filter((record) => record.pipelineId === pipelineId).map((record) => <option key={record.id} value={record.id}>{record.segmentId}</option>)}</select><span className="mt-2 block font-normal">KP {segment?.startKp?.trim() || notAvailable} - {segment?.endKp?.trim() || notAvailable}</span></label>
      {["Environment", "Target Completion", "Overall Status", "Assessment Progress"].map((label) => <div key={label}><p className="text-xs font-bold">{label}</p><p className="mt-2 text-sm text-slate-500 dark:text-[#6fa6d3]">{notAvailable}</p></div>)}
    </div></Frame>
    {error ? <p role="alert" className="text-sm text-red-600 dark:text-red-300">{error}</p> : null}
    {segmentError ? <p role="alert" className="text-sm text-red-600 dark:text-red-300">{segmentError}</p> : null}
    <p className="text-xs text-slate-500 dark:text-[#6fa6d3]">Pipeline and segment selections show master source context. An ECDA assessment scope and approved evidence selection are {notAvailable}.</p>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      {[
        ["Total Length Assessed", "Assessment coverage"], ["Assessment Units", "Total segments"],
        ["Direct Examinations", "Completed / planned"], ["Findings", "High / Medium / Low"],
        ["Open Actions", "Overdue actions"], ["Next Milestone", "Scheduled activity"]
      ].map(([label, detail]) => <KpiCard key={label} label={label} value={notAvailable} detail={`${detail}: ${notAvailable}`} tone="blue" />)}
    </div>
    <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr_1fr]">
      <OverviewPanel title="ECDA Lifecycle Progress"><ol className="grid gap-4 sm:grid-cols-4">{stages.map((stage) => <li key={stage.id} className="text-center"><span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-500 dark:border-[#1d4568]">{stage.number}</span><p className="mt-3 text-xs font-bold">{stage.id === "Post Assessment" ? "Post-Assessment" : stage.id}</p><p className="mt-2 text-xs text-slate-500 dark:text-[#6fa6d3]">{notAvailable}</p></li>)}</ol></OverviewPanel>
      <OverviewPanel title="Findings by Severity"><p className="py-5 text-center text-sm">{notAvailable}</p><dl className="space-y-2 text-xs">{["High", "Medium", "Low"].map((label) => <div key={label} className="flex justify-between gap-2"><dt>{label}</dt><dd>{notAvailable}</dd></div>)}</dl></OverviewPanel>
      <OverviewPanel title="Assessment Status by Segment"><p className="py-5 text-center text-sm">{notAvailable}</p><div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-[#6fa6d3]">{["Completed", "In Progress", "Not Started"].map((label) => <span key={label}>{label}</span>)}</div></OverviewPanel>
    </div>
    <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr_1fr]">
      <OverviewPanel title="Recent ECDA Assessments" action={<OverviewAction>View All</OverviewAction>}><OverviewTable headers={["ID", "Pipeline", "Segment", "Environment", "Assessment Date", "Status", "Progress"]} /></OverviewPanel>
      <OverviewPanel title="Coverage" action={<OverviewAction>View Details</OverviewAction>}><p className="py-6 text-center text-lg font-bold">{notAvailable}</p><p className="text-center text-xs text-slate-500 dark:text-[#6fa6d3]">Assessment Coverage</p></OverviewPanel>
      <OverviewPanel title="Inputs & Data Sources" action={<OverviewAction>View Details</OverviewAction>}><dl className="space-y-3 text-xs">
        <div><dt className="font-bold">Cathodic Protection (CP)</dt><dd className="mt-1 text-slate-500 dark:text-[#6fa6d3]">Latest survey: {cpLoading ? "Loading..." : sourceCp?.summary.lastSurveyAt ? formatDate(sourceCp.summary.lastSurveyAt) : notAvailable}</dd><dd className="mt-1 text-slate-500 dark:text-[#6fa6d3]">Storage: {cpLoading ? "Loading..." : sourceCp ? sourceCp.availability.surveys.available ? "Available" : notAvailable : notAvailable}</dd></div>
        {["ILI Data", "External Corrosion Records", "Historical Inspection Data", "Geospatial & Pipeline Data"].map((label) => <div key={label}><dt className="font-bold">{label}</dt><dd className="mt-1 text-slate-500 dark:text-[#6fa6d3]">{notAvailable}</dd></div>)}
      </dl><p className="mt-3 text-xs text-slate-500 dark:text-[#6fa6d3]">CP survey information is pipeline source context; ECDA evidence approval is {notAvailable}.</p></OverviewPanel>
    </div>
    <div className="grid gap-4 xl:grid-cols-[1.2fr_1.3fr_1fr]">
      <OverviewPanel title="Upcoming Activities" action={<OverviewAction>View All</OverviewAction>}><OverviewTable headers={["Date", "Activity", "Segment", "Owner", "Status"]} /></OverviewPanel>
      <OverviewPanel title="Open Findings" action={<OverviewAction onClick={() => onNavigate("Findings")}>View All</OverviewAction>}><OverviewTable headers={["ID", "Description", "Segment", "Severity", "Status"]} /></OverviewPanel>
      <OverviewPanel title="Quick Actions"><div className="grid gap-2 sm:grid-cols-2">
        {[
          { label: "New ECDA Assessment", detail: "Create a new assessment" },
          { label: "Upload Inspection Data", detail: "Import ILI or inspection data" },
          { label: "View Findings", detail: "Explore all findings", tab: "Findings" as const },
          { label: "Manage Actions", detail: "Track and assign actions", tab: "Actions" as const },
          { label: "View Trends", detail: "Analyse historical data", tab: "Trends & Historical" as const },
          { label: "Assessment Configuration", detail: "Manage settings and templates", tab: "Configuration" as const }
        ].map((action) => <div key={action.label}><OverviewAction onClick={action.tab ? () => onNavigate(action.tab!) : undefined}>{action.label}</OverviewAction><p className="mt-1 text-xs text-slate-500 dark:text-[#6fa6d3]">{action.detail}</p></div>)}
      </div></OverviewPanel>
    </div>
  </div>;
}

export function EcdaAssessmentWorkspace() {
  const [mode, setMode] = useState<DataMode>("real");
  const [activeStage, setActiveStage] = useState<EcdaTab>("Overview");
  const readsRealSources = mode === "real" || !stages.some((stage) => stage.id === activeStage);
  const [pipelines, setPipelines] = useState<PipelineRecord[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState("");
  const [segments, setSegments] = useState<AssetMasterSegmentRecord[]>([]);
  const [segmentId, setSegmentId] = useState("");
  const [segmentLoading, setSegmentLoading] = useState(false);
  const [segmentError, setSegmentError] = useState("");
  const [realAssessments, setRealAssessments] = useState<StoredAssessment[]>([]);
  const [realData, setRealData] = useState<CpMonitoringRealData | null>(null);
  const [realSoil, setRealSoil] = useState<RealSoilSnapshot>(emptyRealSoilSnapshot);
  const [realDirectAssessment, setRealDirectAssessment] = useState<RealDirectAssessment>(emptyRealDirectAssessment);
  const [isLoadingPipelines, setIsLoadingPipelines] = useState(false);
  const [isLoadingRealData, setIsLoadingRealData] = useState(false);
  const [isLoadingRealSoil, setIsLoadingRealSoil] = useState(false);
  const [realError, setRealError] = useState("");
  const [realSoilError, setRealSoilError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let live = true;
    setSegments([]);
    setSegmentError("");
    setSegmentLoading(Boolean(selectedPipelineId));
    if (selectedPipelineId) {
      fetchMasterSegments(selectedPipelineId).then((records) => {
        if (!live) return;
        const scoped = records.filter((record) => record.pipelineId === selectedPipelineId);
        setSegments(scoped);
        setSegmentId((current) => scoped.some((record) => record.id === current) ? current : "");
      }).catch((cause) => {
        if (live) {
          setSegmentId("");
          setSegmentError(cause instanceof Error ? cause.message : "Segments could not be loaded.");
        }
      }).finally(() => { if (live) setSegmentLoading(false); });
    }
    return () => { live = false; };
  }, [selectedPipelineId, refreshKey]);

  useEffect(() => {
    if (!readsRealSources || pipelines.length) {
      setIsLoadingPipelines(false);
      return;
    }

    let live = true;
    setIsLoadingPipelines(true);
    setRealError("");
    fetchPipelines("")
      .then((records) => {
        if (!live) {
          return;
        }

        setPipelines(records);
      })
      .catch((cause) => {
        if (!live) {
          return;
        }

        setRealError(cause instanceof Error ? cause.message : "Pipelines could not be loaded.");
      })
      .finally(() => {
        if (live) {
          setIsLoadingPipelines(false);
        }
      });

    return () => {
      live = false;
    };
  }, [readsRealSources, pipelines.length]);

  useEffect(() => {
    if (!readsRealSources || !selectedPipelineId) {
      setRealData(null);
      setIsLoadingRealData(false);
      return;
    }

    let live = true;
    setIsLoadingRealData(true);
    setRealError("");
    fetchCpMonitoringData(selectedPipelineId)
      .then((data) => {
        if (!live) {
          return;
        }

        setRealData(data);
      })
      .catch((cause) => {
        if (!live) {
          return;
        }

        setRealData(null);
        setRealError(cause instanceof Error ? cause.message : "REAL CP monitoring data could not be loaded.");
      })
      .finally(() => {
        if (live) {
          setIsLoadingRealData(false);
        }
      });

    return () => {
      live = false;
    };
  }, [readsRealSources, selectedPipelineId, refreshKey]);

  useEffect(() => {
    if (mode !== "real" || !selectedPipelineId) {
      setRealAssessments([]);
      setRealSoil(emptyRealSoilSnapshot);
      setRealDirectAssessment(emptyRealDirectAssessment);
      setRealSoilError("");
      setIsLoadingRealSoil(false);
      return;
    }

    let live = true;
    setRealAssessments([]);
    setIsLoadingRealSoil(true);
    setRealSoilError("");
    fetchAssessments()
      .then((assessments) => {
        if (!live) {
          return;
        }

        setRealAssessments(assessments.filter((record) => record.pipelineId === selectedPipelineId));
        setRealSoil(toRealSoilSnapshot(assessments, selectedPipelineId));
        setRealDirectAssessment(toRealDirectAssessment(assessments, selectedPipelineId));
      })
      .catch((cause) => {
        if (!live) {
          return;
        }

        setRealAssessments([]);
        setRealSoil(emptyRealSoilSnapshot);
        setRealDirectAssessment(emptyRealDirectAssessment);
        setRealSoilError(cause instanceof Error ? cause.message : "External Corrosion assessment history could not be loaded.");
      })
      .finally(() => {
        if (live) {
          setIsLoadingRealSoil(false);
        }
      });

    return () => {
      live = false;
    };
  }, [mode, selectedPipelineId, refreshKey]);

  const selectedPipeline = useMemo(
    () => pipelines.find((pipeline) => pipeline.id === selectedPipelineId) ?? null,
    [pipelines, selectedPipelineId]
  );
  const realReadings = useMemo(() => toRealCisReadings(realData), [realData]);
  const realProtectedCount = realReadings.filter((reading) => reading.band === "Protected").length;
  const realUnderProtectedCount = realReadings.filter((reading) => reading.band === "Under-Protected").length;
  const dynamicRealKpis = selectedPipelineId
    ? [
        { label: "Protected", value: realData ? String(realProtectedCount) : notAvailable, detail: realData ? "Latest CP status" : "No real CP data loaded", tone: "cyan" as const },
        { label: "Under-Protected", value: realData ? String(realUnderProtectedCount) : notAvailable, detail: realData ? "Latest CP status" : "No real CP data loaded", tone: "red" as const },
        { label: "Criterion", value: realData?.criterion ? `${realData.criterion.valueMv}` : notAvailable, detail: realData?.criterion ? `${realData.criterion.referenceElectrode} ${realData.criterion.measurementType}` : "No protection rule connected", tone: "amber" as const },
        { label: "CIS Points", value: realData ? String(realReadings.length) : notAvailable, detail: realData ? "From CP test points" : "No real CIS data loaded", tone: "blue" as const }
      ]
    : realKpis;
  const kpis = mode === "demo"
    ? activeStage === "Pre-Assessment" ? preAssessmentKpis : activeStage === "Direct Examination" ? directDemoKpis : activeStage === "Post Assessment" ? postDemoKpis : demoKpis
    : activeStage === "Pre-Assessment" ? realPreAssessmentKpis : activeStage === "Direct Examination" ? directRealKpis : activeStage === "Post Assessment" ? postRealKpis : dynamicRealKpis;
  const headerSegment = mode === "real"
    ? activeStage === "Pre-Assessment" || activeStage === "Indirect Inspection" || activeStage === "Direct Examination" || activeStage === "Post Assessment"
      ? `Segment: ${segments.find((record) => record.id === segmentId && record.pipelineId === selectedPipelineId)?.segmentId ?? notAvailable}`
      : selectedPipeline
      ? `Segment: ${selectedPipeline.pipelineCode} - ${selectedPipeline.pipeLengthKm ? `${selectedPipeline.pipeLengthKm} km` : notAvailable}`
      : `Segment: ${notAvailable}`
    : "Segment: KP 0 - 91 km";

  function clearRealPayload(loading: boolean) {
    setRealAssessments([]);
    setRealData(null);
    setRealSoil(emptyRealSoilSnapshot);
    setRealDirectAssessment(emptyRealDirectAssessment);
    setRealError("");
    setRealSoilError("");
    setIsLoadingRealData(loading);
    setIsLoadingRealSoil(loading);
  }

  function handleModeChange(nextMode: DataMode) {
    setMode(nextMode);
    clearRealPayload(nextMode === "real" && Boolean(selectedPipelineId));
    if (nextMode !== "real") {
      setIsLoadingPipelines(false);
    }
  }

  function handlePipelineChange(nextPipelineId: string) {
    setSegmentId("");
    setSegments([]);
    setSelectedPipelineId(nextPipelineId);
    clearRealPayload(Boolean(nextPipelineId));
  }

  function refreshRealData() {
    if (readsRealSources && selectedPipelineId) {
      clearRealPayload(true);
      setRefreshKey((current) => current + 1);
    }
  }

  const segmentContext: EcdaSegmentContext = {
    segments, segmentId, segmentLoading, segmentError,
    onSelectSegment: (id) => setSegmentId(segments.some((record) => record.id === id && record.pipelineId === selectedPipelineId) ? id : "")
  };

  const laterContext: LaterEcdaContext = { ...segmentContext, pipelines, pipelineId: selectedPipelineId, pipelineLoading: isLoadingPipelines, onSelectPipeline: handlePipelineChange };

  return (
    <section className="min-h-screen bg-[#f4f8fc] px-3 py-6 text-slate-900 dark:bg-[#06111d] dark:text-white sm:px-6">
      <div className="mx-auto max-w-[1368px] space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-1 rounded-md bg-[#00d6b7] px-2.5 py-1.5 text-xs font-black text-[#04111d]">M11</span>
            <div>
              <h1 className="text-xl font-black text-slate-950 dark:text-white">ECDA Assessment</h1>
              <p className="mt-1 font-mono text-xs tracking-[0.12em] text-slate-500 dark:text-[#477ca9]">NACE SP0502 - 49 CFR 192 - External Corrosion Direct Assessment</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {activeStage !== "Overview" && stages.some((stage) => stage.id === activeStage) ? <span className="font-mono text-xs text-slate-500 dark:text-[#477ca9]">{headerSegment}</span> : null}
            <button
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-cyan-700 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#1d4568] dark:bg-[#0b1d30] dark:text-[#78bdf2] dark:hover:border-[#00d6b7]/50 dark:hover:bg-[#102844]"
              disabled={readsRealSources && !selectedPipelineId}
              onClick={refreshRealData}
              type="button"
            >
              Refresh
            </button>
            {stages.some((stage) => stage.id === activeStage) ? <DataModeSwitch mode={mode} setMode={handleModeChange} /> : null}
          </div>
        </div>

        <StageTabs activeStage={activeStage} setActiveStage={setActiveStage} />

        {stages.some((stage) => stage.id === activeStage) && !(mode === "real" && (activeStage === "Indirect Inspection" || activeStage === "Direct Examination" || activeStage === "Post Assessment")) ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
        </div> : null}

        {activeStage === "Overview" ? <EcdaOverview {...segmentContext} pipelines={pipelines} pipelineId={selectedPipelineId} loading={isLoadingPipelines} error={realError} cp={realData} cpLoading={isLoadingRealData} onSelectPipeline={handlePipelineChange} onNavigate={setActiveStage} /> : activeStage === "Findings" ? <RealEcdaFindings context={laterContext} /> : activeStage === "Actions" ? <RealEcdaActions context={laterContext} /> : activeStage === "Documents" ? <RealEcdaDocuments context={laterContext} refreshKey={refreshKey} /> : activeStage === "Trends & Historical" ? <RealEcdaTrends context={laterContext} /> : activeStage === "Configuration" ? <RealEcdaConfiguration context={laterContext} /> : mode === "real" ? activeStage === "Pre-Assessment" ? <RealPreAssessment {...segmentContext} pipelines={pipelines} pipelineId={selectedPipelineId} pipelineLoading={isLoadingPipelines} onSelectPipeline={handlePipelineChange} cp={realData} cpLoading={isLoadingRealData} cpError={realError} assessments={realAssessments} assessmentLoading={isLoadingRealSoil} assessmentError={realSoilError} refreshKey={refreshKey} /> : activeStage === "Direct Examination" ? (
          <RealDirectExamination
            {...segmentContext}
            assessments={realAssessments}
            refreshKey={refreshKey}
            error={realSoilError}
            isLoadingAssessment={isLoadingRealSoil}
            isLoadingPipelines={isLoadingPipelines}
            onSelectPipeline={handlePipelineChange}
            pipelines={pipelines}
            selectedPipeline={selectedPipeline}
            selectedPipelineId={selectedPipelineId}
          />
        ) : activeStage === "Post Assessment" ? (
          <RealPostAssessment
            context={{ ...segmentContext, pipelines, pipelineId: selectedPipelineId, pipelineLoading: isLoadingPipelines, onSelectPipeline: handlePipelineChange }}
            assessment={realDirectAssessment}
            error={realSoilError}
            isLoadingAssessment={isLoadingRealSoil}
          />
        ) : (
          <RealEcdaWorkspace
              {...segmentContext}
              data={realData}
              error={realError}
              isLoadingData={isLoadingRealData}
              isLoadingPipelines={isLoadingPipelines}
              isLoadingSoil={isLoadingRealSoil}
              onSelectPipeline={handlePipelineChange}
              pipelines={pipelines}
              assessments={realAssessments}
              refreshKey={refreshKey}
              selectedPipeline={selectedPipeline}
              selectedPipelineId={selectedPipelineId}
              soil={realSoil}
              soilError={realSoilError}
            />
        ) : activeStage === "Pre-Assessment" ? (
          <PreAssessmentDemo />
        ) : activeStage === "Direct Examination" ? (
          <DirectExaminationDemo />
        ) : activeStage === "Post Assessment" ? (
          <PostAssessmentDemo />
        ) : (
          <>
            <Frame>
              <FrameHeader title="Close Interval Survey (CIS) - Pipe-to-Soil Potential Profile" code="NACE SP0169 - Region R-1" />
              <div className="p-5">
                <CisChart />
                <Legend />
                <CisTable />
              </div>
            </Frame>

            <DemoCalculators />
            <SoilPanels />
            <AnomalyRegister />
          </>
        )}
      </div>
    </section>
  );
}
