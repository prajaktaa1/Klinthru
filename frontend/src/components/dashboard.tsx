"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import styles from "./pipeline-history.module.css";

import { CalculationReportHistoryModal } from "@/components/calculation-report-history-modal";
import { PipelineSelector } from "@/components/pipeline-selector";
import {
  downloadReportFile,
  fetchAssessmentPipeDataHistory,
  fetchAiPredictionsReadiness,
  fetchDashboardAggregation,
  fetchAssessments,
  fetchCpMonitoringData,
  fetchCpRectifiers,
  fetchOfficialRiskMethodologies,
  fetchRiskMatrix,
  fetchScadaOverview,
  fetchScadaQuality,
  fetchSensorAssignments,
  fetchMasterSegments,
  fetchIliAnomalies,
  fetchDocuments,
  fetchReportWorkspaceData,
  fetchIntegrationHubRealData,
  fetchPipelineHistory,
  fetchPipelines,
  isUnauthorizedError,
  searchReports,
  type DashboardAggregation,
  type ReportRecord,
  type CpMonitoringRealData,
  type ScadaOverview,
  type ScadaQuality,
  type IliDataResponse,
  type IliAnomalySummary,
  type ReportWorkspaceData,
  type IntegrationSummary
} from "@/lib/apiClient";
import type { RiskMatrixData } from "@/lib/risk-matrix-types";
import { Panel } from "@/components/ui";
import { getRiskBadgeClasses } from "@/lib/riskScoring";
import {
  AssessmentPipeDataSummary,
  AiPredictionsReadiness,
  PipelineHistory,
  PipelineRecord,
  AssetMasterSegmentRecord,
  StoredAssessment,
  SensorAssignmentRecord
} from "@/lib/types";

type PipelineHistoryBundle = {
  history: PipelineHistory | null;
  inspections: AssessmentPipeDataSummary[];
};

type ActivityItem = {
  id: string;
  timestamp: string;
  title: string;
  detail: string;
  riskLevel?: StoredAssessment["riskLevel"];
};

type PipelineActionModal =
  | { type: "pipe-data"; pipeline: PipelineRecord }
  | { type: "inspection-history"; pipeline: PipelineRecord }
  | { type: "calculation-reports"; pipeline: PipelineRecord }
  | { type: "reports"; pipeline: PipelineRecord }
  | { type: "upload-info"; pipeline: PipelineRecord };

type DashboardMode = "real" | "demo";

function formatDate(value: string | undefined, fallback = "Not available") {
  if (!value?.trim()) {
    return fallback;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatDateTime(value: string | undefined, fallback = "Not available") {
  if (!value?.trim()) {
    return fallback;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return date.toLocaleString("en-US");
}

function hasStoredValue(value: string | number | undefined | null) {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  return Boolean(value?.trim());
}

function formatMasterText(value: string | undefined, fallback = "Not provided") {
  return value?.trim() ? value : fallback;
}

function formatMasterNumber(value: number | undefined, unit?: string) {
  if (!hasStoredValue(value)) {
    return "Not provided";
  }

  return unit ? `${value} ${unit}` : String(value);
}

function formatOperatingPressure(value: number | undefined, inputValue: number | undefined, unit: string | undefined) {
  return formatMasterNumber(inputValue ?? value, unit ?? "bar");
}

function formatWallThickness(value: number | undefined, inputValue: number | undefined, unit: string | undefined) {
  return formatMasterNumber(inputValue ?? value, unit ?? "mm");
}

function getLatestInspectionDate(bundle: PipelineHistoryBundle | undefined) {
  const dates = [
    ...(bundle?.history?.externalAssessments ?? []).map((record) => record.createdAt),
    ...(bundle?.history?.internalAssessments ?? []).map((record) => record.createdAt),
    ...(bundle?.inspections ?? []).map((record) => record.savedAt)
  ]
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());

  return dates[0]?.toISOString();
}

function getLatestAssessment(history: PipelineHistory | null) {
  return [...(history?.externalAssessments ?? []), ...(history?.internalAssessments ?? [])]
    .sort((left, right) => getTimestamp(right.inspectionDate ?? right.createdAt) - getTimestamp(left.inspectionDate ?? left.createdAt))[0];
}

function getLatestReport(reports: ReportRecord[] | undefined) {
  return [...(reports ?? [])].sort((a, b) => {
    return getTimestamp(b.generatedAt ?? b.createdAt) - getTimestamp(a.generatedAt ?? a.createdAt);
  })[0];
}

function getTimestamp(value: string | undefined) {
  const timestamp = value ? new Date(value).getTime() : Number.NaN;
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getReportRiskLabel(report: ReportRecord) {
  return String(report.result?.riskLevel ?? report.riskLevel ?? "Not available");
}

function getPipelineOptionLabel(pipeline: PipelineRecord) {
  return `${formatMasterText(pipeline.pipelineName)} \u2014 ${formatMasterText(pipeline.pipelineCode)}`;
}

function formatStatusLabel(status: string | undefined) {
  if (!status) {
    return "Unavailable";
  }

  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getDashboardDateRange(period: string) {
  const months = period === "3m" ? 3 : period === "6m" ? 6 : period === "12m" ? 12 : null;
  if (months === null) return {};
  const end = new Date();
  const start = new Date(end);
  start.setMonth(start.getMonth() - months);
  return {
    issueDateFrom: start.toISOString().slice(0, 10),
    issueDateTo: end.toISOString().slice(0, 10)
  };
}

function statusTone(status: string | undefined): "green" | "amber" | "red" | "blue" {
  if (status === "available" || status === "ready") return "green";
  if (status === "migration_pending" || status === "no_readings" || status === "not_calculated") return "amber";
  if (status === "not_connected" || status === "not_configured" || status === "blocked") return "red";
  return "blue";
}

function getPipelineCompleteness(pipeline: PipelineRecord) {
  const fields = [
    pipeline.pipelineName,
    pipeline.pipelineCode,
    pipeline.status,
    pipeline.location,
    pipeline.serviceOrProduct,
    pipeline.pipeLocationId,
    pipeline.pipeMaterial,
    pipeline.pipeGrade,
    pipeline.pipeAgeYears,
    pipeline.pipeLengthKm,
    pipeline.pipeInsideDiameter,
    pipeline.pipeOutsideDiameter,
    pipeline.diameterUnit,
    pipeline.smysMpa,
    pipeline.maopBar,
    pipeline.nominalWallThickness ?? pipeline.wallThicknessInputValue,
    pipeline.wallThicknessUnit,
    pipeline.designPressure,
    pipeline.operatingPressure ?? pipeline.operatingPressureInputValue,
    pipeline.operatingPressureUnit,
    pipeline.installationYear ?? pipeline.installationDate,
    pipeline.inspectionYear,
    pipeline.designLife
  ];
  const completed = fields.filter(hasStoredValue).length;
  return Math.round((completed / fields.length) * 100);
}

function getCreatedByLabel(pipeline: PipelineRecord) {
  return pipeline.createdByName?.trim() || pipeline.createdByEmail?.trim() || "Unavailable";
}

function formatPipelineStatus(status: string | undefined, fallback = "Unavailable") {
  if (status === "Decommissioned") {
    return "Retired";
  }

  return formatMasterText(status, fallback);
}

const PIPELINE_HISTORY_PAGE_SIZE = 8;
const PIPELINE_HISTORY_STATUS_FILTERS = [
  "All",
  "Active",
  "Inactive",
  "Under Maintenance",
  "Decommissioned"
] as const;

export function DashboardView() {
  const router = useRouter();
  const [assessments, setAssessments] = useState<StoredAssessment[]>([]);
  const [pipelines, setPipelines] = useState<PipelineRecord[]>([]);
  const [dashboardSegments, setDashboardSegments] = useState<AssetMasterSegmentRecord[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState("");
  const [dashboardTimePeriod, setDashboardTimePeriod] = useState("12m");
  const [pipelineBundles, setPipelineBundles] = useState<Record<string, PipelineHistoryBundle>>({});
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineRecord | null>(null);
  const [pipelineHistory, setPipelineHistory] = useState<PipelineHistory | null>(null);
  const [pipelineHistoryNotice, setPipelineHistoryNotice] = useState<string | null>(null);
  const [isLoadingPipelines, setIsLoadingPipelines] = useState(true);
  const [dashboardDataError, setDashboardDataError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<PipelineActionModal | null>(null);
  const [reportsByPipeline, setReportsByPipeline] = useState<Record<string, ReportRecord[]>>({});
  const [isLoadingReportsForPipelineId, setIsLoadingReportsForPipelineId] = useState<string | null>(null);
  const [isLoadingInspectionsForPipelineId, setIsLoadingInspectionsForPipelineId] = useState<string | null>(null);
  const [activeDownloadReportId, setActiveDownloadReportId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [editRequestKey, setEditRequestKey] = useState<string | number | null>(null);
  const [createRequestKey, setCreateRequestKey] = useState<string | number | null>(null);
  const [discardEditRequestKey, setDiscardEditRequestKey] = useState<string | number | null>(null);
  const [hasPipelineEditChanges, setHasPipelineEditChanges] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
  const [isPipelineActionsOpen, setIsPipelineActionsOpen] = useState(false);
  const [pipelineSearchValue, setPipelineSearchValue] = useState("");
  const [pipelineHistorySearch, setPipelineHistorySearch] = useState("");
  const [pipelineHistoryStatusFilter, setPipelineHistoryStatusFilter] = useState("All");
  const [pipelineHistoryPage, setPipelineHistoryPage] = useState(1);
  const [expandedPipelineId, setExpandedPipelineId] = useState<string | null>(null);
  const [previewReportId, setPreviewReportId] = useState<string | null>(null);
  const [aiReadiness, setAiReadiness] = useState<AiPredictionsReadiness | null>(null);
  const [dashboardAggregation, setDashboardAggregation] = useState<DashboardAggregation | null>(null);
  const [dashboardAggregationError, setDashboardAggregationError] = useState<string | null>(null);
  const [isLoadingDashboardAggregation, setIsLoadingDashboardAggregation] = useState(false);
  const [riskMatrix, setRiskMatrix] = useState<RiskMatrixData | null>(null);
  const [cpMonitoringData, setCpMonitoringData] = useState<CpMonitoringRealData | null>(null);
  const [scadaOverview, setScadaOverview] = useState<ScadaOverview | null>(null);
  const [scadaQuality, setScadaQuality] = useState<ScadaQuality | null>(null);
  const [sensorAssignments, setSensorAssignments] = useState<SensorAssignmentRecord[] | null>(null);
  const [iliAnomalies, setIliAnomalies] = useState<IliDataResponse<IliAnomalySummary> | null>(null);
  const [documentScope, setDocumentScope] = useState<{ total: number; scope: "pipeline" | "segment" } | null>(null);
  const [reportWorkspaceData, setReportWorkspaceData] = useState<ReportWorkspaceData | null>(null);
  const [externalPipeDataCount, setExternalPipeDataCount] = useState<number | null>(null);
  const [integrationSummary, setIntegrationSummary] = useState<IntegrationSummary | null>(null);
  const [dashboardSourceErrors, setDashboardSourceErrors] = useState<Record<string, string>>({});
  const pipelineHistoryRequestRef = useRef(0);
  const isDemoPreview = false;

  useEffect(() => {
    void loadDashboardData();
  }, []);

  useEffect(() => {
    void fetchAiPredictionsReadiness().then(setAiReadiness).catch(() => setAiReadiness(null));
  }, []);

  useEffect(() => {
    if (!selectedPipeline) {
      setDashboardAggregation(null);
      setDashboardAggregationError(null);
      setRiskMatrix(null);
      setCpMonitoringData(null);
      setScadaOverview(null);
      setScadaQuality(null);
      setSensorAssignments(null);
      setIliAnomalies(null);
      setDocumentScope(null);
      setReportWorkspaceData(null);
      setExternalPipeDataCount(null);
      setDashboardSourceErrors({});
      setDashboardSegments([]);
      setSelectedSegmentId("");
      return;
    }

    let cancelled = false;
    setIsLoadingDashboardAggregation(true);
    setDashboardAggregationError(null);
    setDashboardAggregation(null);
    void fetchDashboardAggregation(selectedPipeline.id)
      .then((payload) => {
        if (!cancelled) {
          setDashboardAggregation(payload);
        }
      })
      .catch((error) => {
        if (!cancelled && !isUnauthorizedError(error)) {
          setDashboardAggregation(null);
          setDashboardAggregationError("Dashboard aggregation could not be loaded.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingDashboardAggregation(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPipeline]);

  useEffect(() => {
    if (!selectedPipeline) return;
    let cancelled = false;
    const hours = dashboardTimePeriod === "24h" ? 24 : dashboardTimePeriod === "7d" ? 168 : dashboardTimePeriod === "30d" ? 720 : null;
    setRiskMatrix(null);
    setCpMonitoringData(null);
    setScadaOverview(null);
    setScadaQuality(null);
    setSensorAssignments(null);
    setIliAnomalies(null);
    setDocumentScope(null);
    setReportWorkspaceData(null);
    setExternalPipeDataCount(null);
    setDashboardSourceErrors({});
    void Promise.allSettled([
      fetchOfficialRiskMethodologies().then((methods): Promise<RiskMatrixData> => methods.items[0]?.id ? fetchRiskMatrix({ pipelineId: selectedPipeline.id, methodologyVersionId: methods.items[0].id }) : Promise.resolve({ status: "unavailable", reason: "MISSING FIELD — APPROVAL NEEDED: no approved methodology version is available.", item: null })),
      fetchCpMonitoringData(selectedPipeline.id),
      fetchScadaOverview(selectedPipeline.id),
      hours === null ? Promise.resolve(null) : fetchScadaQuality(selectedPipeline.id, hours),
      fetchSensorAssignments({ pipelineOrAsset: selectedPipeline.id }),
      fetchIliAnomalies(selectedPipeline.id)
    ]).then((results) => {
      if (cancelled) return;
      const nextErrors: Record<string, string> = {};
      const [risk, cp, scada, quality, sensors, ili] = results;
      if (risk.status === "fulfilled") setRiskMatrix(risk.value); else nextErrors.risk = "Risk Matrix source could not be read.";
      if (cp.status === "fulfilled") setCpMonitoringData(cp.value); else nextErrors.cp = "CP Monitoring source could not be read.";
      if (scada.status === "fulfilled") setScadaOverview(scada.value); else nextErrors.scada = "SCADA overview source could not be read.";
      if (quality.status === "fulfilled") setScadaQuality(quality.value); else nextErrors.quality = "SCADA data-quality source could not be read.";
      if (sensors.status === "fulfilled") setSensorAssignments(sensors.value); else nextErrors.sensors = "Sensor assignment source could not be read.";
      if (ili.status === "fulfilled") setIliAnomalies(ili.value); else nextErrors.ili = "ILI anomaly source could not be read.";
      setDashboardSourceErrors(nextErrors);
    });
    return () => { cancelled = true; };
  }, [selectedPipeline, dashboardTimePeriod]);

  useEffect(() => {
    let cancelled = false;
    void fetchIntegrationHubRealData()
      .then((data) => { if (!cancelled) setIntegrationSummary(data.summary); })
      .catch(() => { if (!cancelled) setIntegrationSummary(null); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedPipeline) return;
    let cancelled = false;
    const segmentId = selectedSegmentId || undefined;
    setDocumentScope(null);
    setReportWorkspaceData(null);
    setExternalPipeDataCount(null);
    const documentDateRange = getDashboardDateRange(dashboardTimePeriod);
    void Promise.allSettled([
      fetchDocuments({ pipelineId: selectedPipeline.id, ...(segmentId ? { segmentId } : {}), ...documentDateRange, page: 1, pageSize: 1 }),
      fetchReportWorkspaceData(selectedPipeline.id),
      segmentId ? Promise.resolve(null) : fetchAssessmentPipeDataHistory({ assessmentType: "External", pipelineId: selectedPipeline.id })
    ]).then(([documents, reports, external]) => {
      if (cancelled) return;
      setDashboardSourceErrors((current) => {
        const next = { ...current };
        if (documents.status === "rejected") next.documents = "Document repository source could not be read.";
        else delete next.documents;
        if (reports.status === "rejected") next.reports = "Report workspace source could not be read.";
        else delete next.reports;
        if (external.status === "rejected") next.externalCorrosion = "External pipe-data source could not be read.";
        else delete next.externalCorrosion;
        return next;
      });
      if (documents.status === "fulfilled" && documents.value) {
        setDocumentScope({ total: documents.value.total, scope: segmentId ? "segment" : "pipeline" });
      }
      if (reports.status === "fulfilled" && reports.value) setReportWorkspaceData(reports.value);
      if (external.status === "fulfilled" && external.value) setExternalPipeDataCount(external.value.length);
    });
    return () => { cancelled = true; };
  }, [selectedPipeline, selectedSegmentId, dashboardTimePeriod]);

  useEffect(() => {
    if (!selectedPipeline) return;
    let cancelled = false;
    setDashboardSegments([]);
    void fetchMasterSegments(selectedPipeline.id)
      .then((records) => { if (!cancelled) setDashboardSegments(records); })
      .catch(() => { if (!cancelled) setDashboardSegments([]); });
    return () => { cancelled = true; };
  }, [selectedPipeline]);

  const riskCounts = assessments.reduce((counts, assessment) => {
    const riskLevel = String(assessment.riskLevel);
    if (riskLevel === "High" || riskLevel === "Medium" || riskLevel === "Low") {
      counts[riskLevel] += 1;
    }
    return counts;
  }, { High: 0, Medium: 0, Low: 0 });
  const highRisk = riskCounts.High;
  const mediumRisk = riskCounts.Medium;
  const lowRisk = riskCounts.Low;

  const activeDashboardAggregation = dashboardAggregation;
  const activePipeline = selectedPipeline;
  const endpointRiskCounts = activeDashboardAggregation?.summary.riskCounts;
  const displayedAssessmentCount = activePipeline && activeDashboardAggregation ? activeDashboardAggregation.summary.assessmentCount : assessments.length;
  const displayedRiskCounts = {
    High: endpointRiskCounts?.high ?? highRisk,
    Medium: endpointRiskCounts?.medium ?? mediumRisk,
    Low: endpointRiskCounts?.low ?? lowRisk,
    Unknown: endpointRiskCounts?.unknown ?? 0
  };
  const displayedPipelineCount = activeDashboardAggregation?.summary.pipelineCount ?? pipelines.length;
  const displayedAiReadiness = activeDashboardAggregation?.modules.aiPredictions ?? aiReadiness;
  const total = Math.max(displayedAssessmentCount, 1);
  const operationalStatus = isDemoPreview
    ? "DEMO DATA / Frontend preview only"
    : activeDashboardAggregation
    ? `SCADA ${formatStatusLabel(activeDashboardAggregation.modules.scada.status)} / CP ${formatStatusLabel(activeDashboardAggregation.modules.cpMonitoring.status)}`
    : "Select a pipeline for backend aggregation";
  const chartData = [
    { label: "High", value: displayedRiskCounts.High, color: "bg-red-500" },
    { label: "Medium", value: displayedRiskCounts.Medium, color: "bg-amber-500" },
    { label: "Low", value: displayedRiskCounts.Low, color: "bg-emerald-500" }
  ];

  const selectedReports = useMemo(() => {
    if (!activeModal || activeModal.type !== "reports") {
      return [];
    }

    return reportsByPipeline[activeModal.pipeline.id] ?? [];
  }, [activeModal, reportsByPipeline]);
  const selectedPipelineBundle = activePipeline ? pipelineBundles[activePipeline.id] : undefined;
  const selectedLatestInspection = getLatestInspectionDate(selectedPipelineBundle);
  const selectedLatestReport = getLatestReport(selectedPipelineBundle?.history?.reports);
  const selectedLatestAssessment = getLatestAssessment(pipelineHistory);
  const aggregatedLatestAssessment = activeDashboardAggregation?.latestAssessment && "id" in activeDashboardAggregation.latestAssessment ? activeDashboardAggregation.latestAssessment : null;
  const aggregatedLatestReport = activeDashboardAggregation?.latestReport && "id" in activeDashboardAggregation.latestReport ? activeDashboardAggregation.latestReport : null;
  const recentActivity = useMemo<ActivityItem[]>(() => {
    const assessmentActivity = assessments.map((assessment) => ({
      id: `assessment:${assessment.id}`,
      timestamp: assessment.inspectionDate ?? assessment.createdAt,
      title: assessment.pipelineName,
      detail: `${assessment.type} assessment`,
      riskLevel: assessment.riskLevel
    }));
    const selectedHistoryActivity = (pipelineHistory?.timeline ?? [])
      .filter((entry) => entry.recordType === "Report" || entry.recordType === "CpCalculation")
      .map((entry) => ({
        id: `${entry.recordType}:${entry.id}`,
        timestamp: entry.createdAt,
        title: selectedPipeline?.pipelineName ?? "Selected pipeline",
        detail: entry.recordType === "Report" ? `${entry.displayType} report` : `${entry.calculationType ?? entry.displayType} calculation`,
        riskLevel: entry.riskLevel
      }));
    return [...assessmentActivity, ...selectedHistoryActivity]
      .sort((left, right) => getTimestamp(right.timestamp) - getTimestamp(left.timestamp))
      .slice(0, 4);
  }, [assessments, isDemoPreview, pipelineHistory, selectedPipeline?.pipelineName]);
  const isDownloadingSelectedLatestReport = Boolean(
    selectedLatestReport && activeDownloadReportId === selectedLatestReport.id
  );

  async function loadDashboardData() {
    setIsLoadingPipelines(true);
    setPipelineHistoryNotice(null);
    setDashboardDataError(null);

    try {
      const [backendAssessments, backendPipelines] = await Promise.all([
        fetchAssessments(),
        fetchPipelines()
      ]);
      setAssessments(backendAssessments);
      setPipelines(backendPipelines);

      if (selectedPipeline) {
        const refreshed = backendPipelines.find((pipeline) => pipeline.id === selectedPipeline.id) ?? null;
        setSelectedPipeline(refreshed);
        setPipelineSearchValue(refreshed ? getPipelineOptionLabel(refreshed) : "");
        if (refreshed) {
          void loadPipelineHistory(refreshed);
        } else {
          setPipelineHistory(null);
        }
      }
    } catch (error) {
      if (!isUnauthorizedError(error)) {
        setDashboardDataError("Dashboard data could not be loaded. Existing displayed records have not been changed.");
      }
    } finally {
      setIsLoadingPipelines(false);
    }
  }

  async function loadPipelineHistory(pipeline: PipelineRecord) {
    const requestId = pipelineHistoryRequestRef.current + 1;
    pipelineHistoryRequestRef.current = requestId;
    setSelectedPipeline(pipeline);
    setPipelineHistory(null);
    setPipelineHistoryNotice(null);
    setActionNotice(null);
    try {
      const [history, inspections] = await Promise.all([
        fetchPipelineHistory(pipeline.id),
        fetchAssessmentPipeDataHistory({ pipelineId: pipeline.id, assessmentType: "All" })
      ]);
      if (pipelineHistoryRequestRef.current !== requestId) {
        return;
      }
      setPipelineHistory(history);
      setPipelineBundles((current) => ({
        ...current,
        [pipeline.id]: {
          history,
          inspections
        }
      }));
    } catch {
      if (pipelineHistoryRequestRef.current !== requestId) {
        return;
      }
      setPipelineHistory(null);
      setPipelineHistoryNotice("Pipeline history could not be loaded.");
    }
  }

  async function loadInspectionHistoryFor(pipeline: PipelineRecord) {
    setIsLoadingInspectionsForPipelineId(pipeline.id);
    setActionNotice(null);
    try {
      const inspections = await fetchAssessmentPipeDataHistory({
        pipelineId: pipeline.id,
        assessmentType: "All"
      });
      setPipelineBundles((current) => ({
        ...current,
        [pipeline.id]: {
          history: current[pipeline.id]?.history ?? null,
          inspections
        }
      }));
    } catch {
      setActionNotice("Inspection history could not be loaded.");
    } finally {
      setIsLoadingInspectionsForPipelineId(null);
    }
  }

  async function openReportsFor(pipeline: PipelineRecord) {
    setIsLoadingReportsForPipelineId(pipeline.id);
    setActionNotice(null);
    setPreviewReportId(null);
    try {
      const reports = await searchReports({ pipelineId: pipeline.id });
      setReportsByPipeline((current) => ({ ...current, [pipeline.id]: reports }));
      setActiveModal({ type: "reports", pipeline });
    } catch {
      setActionNotice("Reports could not be loaded.");
    } finally {
      setIsLoadingReportsForPipelineId(null);
    }
  }

  async function downloadLatestReport(pipeline: PipelineRecord) {
    const latestReport = getLatestReport(pipelineBundles[pipeline.id]?.history?.reports);
    if (!latestReport) {
      setActionNotice("No report available.");
      return;
    }

    await downloadReport(latestReport.id);
  }

  function openReportsModule(pipeline: PipelineRecord, report?: ReportRecord) {
    const params = new URLSearchParams({ pipelineId: pipeline.id });
    if (report?.id) {
      params.set("reportId", report.id);
    }
    router.push(`/report?${params.toString()}`);
  }

  async function downloadReport(reportId: string) {
    setActiveDownloadReportId(reportId);
    setActionNotice(null);
    try {
      const file = await downloadReportFile(reportId, "pdf");
      const url = window.URL.createObjectURL(file.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setActionNotice("The latest report could not be downloaded.");
    } finally {
      setActiveDownloadReportId(null);
    }
  }

  async function handleAction(action: string, pipeline: PipelineRecord) {
    if (action === "view-pipe-data") {
      setActiveModal({ type: "pipe-data", pipeline });
      return;
    }

    if (action === "edit-pipe-data") {
      setSelectedPipeline(pipeline);
      void loadPipelineHistory(pipeline);
      setEditRequestKey(`${pipeline.id}:${Date.now()}`);
      return;
    }

    if (action === "inspection-history") {
      setActiveModal({ type: "inspection-history", pipeline });
      await loadInspectionHistoryFor(pipeline);
      return;
    }

    if (action === "reports") {
      await openReportsFor(pipeline);
      return;
    }

    if (action === "reports-module") {
      openReportsModule(pipeline, getLatestReport(pipelineBundles[pipeline.id]?.history?.reports));
      return;
    }

    if (action === "calculation-reports") {
      setActiveModal({ type: "calculation-reports", pipeline });
      return;
    }

    if (action === "ili-history") {
      router.push(`/ili-analysis?pipelineId=${encodeURIComponent(pipeline.id)}`);
      return;
    }

    if (action === "download-latest-report") {
      await downloadLatestReport(pipeline);
      return;
    }

    if (action === "upload-info") {
      setActiveModal({ type: "upload-info", pipeline });
    }
  }

  function clearSelectedPipeline() {
    pipelineHistoryRequestRef.current += 1;
    setSelectedPipeline(null);
    setPipelineHistory(null);
    setPipelineSearchValue("");
    setActionNotice(null);
    setActiveModal(null);
    setPreviewReportId(null);
    setIsPipelineActionsOpen(false);
    setIsDiscardConfirmOpen(false);
  }

  function handlePipelineSearchChange(value: string) {
    setPipelineSearchValue(value);
    const pipeline = pipelines.find((candidate) => getPipelineOptionLabel(candidate) === value) ?? null;

    if (!pipeline) {
      setSelectedPipeline(null);
      setPipelineHistory(null);
      setActionNotice(null);
      return;
    }

    void loadPipelineHistory(pipeline);
  }

  function handleCancelPipelineSelection() {
    setIsPipelineActionsOpen(false);
    if (hasPipelineEditChanges) {
      setIsDiscardConfirmOpen(true);
      return;
    }

    clearSelectedPipeline();
  }

  function discardPipelineSelection() {
    setDiscardEditRequestKey(`discard:${Date.now()}`);
    setHasPipelineEditChanges(false);
    clearSelectedPipeline();
  }

  const maopUtilisation = activeDashboardAggregation?.summary.maopUtilisation;
  const maopValue =
    maopUtilisation?.status === "available" && typeof maopUtilisation.value === "number"
      ? `${maopUtilisation.value}${maopUtilisation.unit}`
      : "UNKNOWN";
  const cpStatus = activeDashboardAggregation?.modules.cpMonitoring;
  const iliStatus = activeDashboardAggregation?.modules.iliAnalysis;
  const displayedIliAnomalyCount = iliAnomalies?.status === "available"
    ? iliAnomalies.count
    : iliStatus?.status === "available"
      ? iliStatus.anomalyCount
      : null;
  const scadaStatus = activeDashboardAggregation?.modules.scada;
  const alertsStatus = activeDashboardAggregation?.modules.alerts;
  const latestAssessmentLabel = aggregatedLatestAssessment
    ? `${aggregatedLatestAssessment.type} - ${formatDate(aggregatedLatestAssessment.inspectionDate ?? aggregatedLatestAssessment.createdAt)}`
    : selectedLatestAssessment
      ? `${selectedLatestAssessment.type} - ${formatDate(selectedLatestAssessment.inspectionDate ?? selectedLatestAssessment.createdAt)}`
      : "Unavailable";
  const latestReportLabel = aggregatedLatestReport
    ? formatDate(aggregatedLatestReport.generatedAt ?? aggregatedLatestReport.createdAt)
    : reportWorkspaceData?.existingReports.recent[0]
      ? formatDate(reportWorkspaceData.existingReports.recent[0].generatedAt ?? reportWorkspaceData.existingReports.recent[0].createdAt)
    : selectedLatestReport
      ? formatDate(selectedLatestReport.generatedAt ?? selectedLatestReport.createdAt)
      : "Unavailable";
  const filteredPipelineHistoryRows = useMemo(() => {
    const query = pipelineHistorySearch.trim().toLowerCase();
    return pipelines
      .filter((pipeline) => {
        const matchesStatus = pipelineHistoryStatusFilter === "All" || pipeline.status === pipelineHistoryStatusFilter;
        const matchesQuery = query
          ? [pipeline.pipelineName, pipeline.pipelineCode].some((value) => value.toLowerCase().includes(query))
          : true;
        return matchesStatus && matchesQuery;
      })
      .sort((left, right) => getTimestamp(right.updatedAt) - getTimestamp(left.updatedAt));
  }, [pipelineHistorySearch, pipelineHistoryStatusFilter, pipelines]);
  const pipelineHistoryTotalPages = Math.max(1, Math.ceil(filteredPipelineHistoryRows.length / PIPELINE_HISTORY_PAGE_SIZE));
  const pipelineHistorySafePage = Math.min(pipelineHistoryPage, pipelineHistoryTotalPages);
  const paginatedPipelineHistoryRows = filteredPipelineHistoryRows.slice(
    (pipelineHistorySafePage - 1) * PIPELINE_HISTORY_PAGE_SIZE,
    pipelineHistorySafePage * PIPELINE_HISTORY_PAGE_SIZE
  );

  useEffect(() => {
    setPipelineHistoryPage(1);
  }, [pipelineHistorySearch, pipelineHistoryStatusFilter]);

  useEffect(() => {
    setExpandedPipelineId(null);
  }, [pipelineHistorySearch, pipelineHistoryStatusFilter, pipelineHistorySafePage]);

  useEffect(() => {
    if (isLoadingPipelines || paginatedPipelineHistoryRows.length === 0) {
      return;
    }

    let cancelled = false;
    const missingRows = paginatedPipelineHistoryRows.filter((pipeline) => !pipelineBundles[pipeline.id]);
    if (missingRows.length === 0) {
      return;
    }

    void Promise.allSettled(
      missingRows.map(async (pipeline) => {
        const [history, inspections] = await Promise.all([
          fetchPipelineHistory(pipeline.id),
          fetchAssessmentPipeDataHistory({ pipelineId: pipeline.id, assessmentType: "All" })
        ]);
        return { pipelineId: pipeline.id, history, inspections };
      })
    ).then((results) => {
      if (cancelled) {
        return;
      }

      const loaded = results
        .filter((result): result is PromiseFulfilledResult<{ pipelineId: string; history: PipelineHistory; inspections: AssessmentPipeDataSummary[] }> => result.status === "fulfilled")
        .map((result) => result.value);

      if (loaded.length === 0) {
        return;
      }

      setPipelineBundles((current) => {
        const next = { ...current };
        for (const bundle of loaded) {
          next[bundle.pipelineId] = {
            history: bundle.history,
            inspections: bundle.inspections
          };
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [isLoadingPipelines, paginatedPipelineHistoryRows, pipelineBundles]);

  return (
    <div className="dashboard-root flex min-h-[calc(100vh-8rem)] min-w-0 flex-col gap-3 overflow-x-hidden rounded-[24px] pipeguard-surface-muted p-2 lg:min-h-[calc(100vh-6rem)] lg:gap-2.5 lg:p-1">
      <Panel className="dashboard-header border-slate-200/80 p-3 shadow-sm sm:p-4">
        <div className="dashboard-header-content flex min-w-0 flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="dashboard-header-copy min-w-0">
            <div className="flex flex-wrap items-center gap-2">
            </div>
            <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Executive Dashboard</h3>
            <p className="mt-1 text-sm text-slate-500">Real-time view of pipeline integrity, risks, operations and actions across your assets.</p>
            <p className="mt-1 text-xs font-semibold text-slate-400">Data · Analyze · Predict · Ensure a Safer Tomorrow</p>
          </div>
          <div className="dashboard-header-controls grid w-full min-w-0 gap-2 sm:grid-cols-2 xl:max-w-5xl xl:grid-cols-4">
            <label className="block min-w-0 flex-1">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Select Pipeline</span>
              <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900" disabled={isLoadingPipelines} onChange={(event) => { const pipeline = pipelines.find((candidate) => candidate.id === event.target.value); if (pipeline) { setSelectedSegmentId(""); void loadPipelineHistory(pipeline); } }} value={activePipeline?.id ?? ""}>
                <option value="">{isLoadingPipelines ? "Loading pipelines..." : "Select a pipeline"}</option>
                {pipelines.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{getPipelineOptionLabel(pipeline)}</option>)}
              </select>
            </label>
            <label className="block min-w-0 flex-1">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Select Segment</span>
              <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900" disabled={!activePipeline || dashboardSegments.length === 0} onChange={(event) => setSelectedSegmentId(event.target.value)} value={selectedSegmentId}>
                <option value="">All Segments</option>
                {dashboardSegments.map((segment) => <option key={segment.id} value={segment.id}>{segment.segmentId}</option>)}
              </select>
              {selectedSegmentId ? <span className="mt-1 block text-[10px] text-slate-500">Segment-scoped aggregation: UNKNOWN</span> : null}
            </label>
            <label className="block min-w-0 flex-1">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Time Period</span>
              <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900" onChange={(event) => setDashboardTimePeriod(event.target.value)} value={dashboardTimePeriod}>
                <option value="live">Live</option><option value="24h">24h</option><option value="7d">7d</option><option value="30d">30d</option><option value="3m">3m</option><option value="6m">6m</option><option value="12m">12 months</option><option value="custom">Custom</option>
              </select>
              <span className="mt-1 block text-[10px] text-slate-500">Period-scoped aggregation: UNKNOWN</span>
            </label>
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1 rounded-xl border pipeguard-surface-muted px-3 py-2 text-xs leading-5 text-slate-500">Last Updated<br /><span className="font-semibold text-slate-700">{activePipeline?.updatedAt ? formatDateTime(activePipeline.updatedAt) : "UNKNOWN"}</span></div>
              <button className="rounded-xl bg-slateblue-600 px-3 py-2.5 text-sm font-semibold text-white" disabled={isLoadingPipelines} onClick={() => void loadDashboardData()} type="button">Refresh</button>
              <button className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-500" disabled title="BLOCKED — Dashboard export source contract is unavailable." type="button">Export</button>
            </div>
          </div>
        </div>
      </Panel>


      <ExecutiveKpiGrid pipeline={activePipeline} aggregation={activeDashboardAggregation} cpStatus={cpStatus} iliStatus={iliStatus} aiReadiness={displayedAiReadiness} router={router} cpData={cpMonitoringData} scada={scadaOverview} scadaQuality={scadaQuality} riskMatrix={riskMatrix} selectedSegmentId={selectedSegmentId} />



      <div className="dashboard-operational-grid grid min-w-0 gap-2.5 xl:grid-cols-[minmax(240px,0.72fr)_minmax(0,2.28fr)]">
        <HealthPanel
          detail={activeDashboardAggregation?.summary.pipelineHealth.reason ?? "No approved health calculation"}
          value={!selectedSegmentId && activeDashboardAggregation?.summary.pipelineHealth.status === "available" ? activeDashboardAggregation.summary.pipelineHealth.value : null}
        />
        <div className="grid gap-2.5">
          <div className="dashboard-operational-cards grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
            <DashboardMetric accent="red" label="Active Anomalies" value={!selectedSegmentId && displayedIliAnomalyCount != null ? displayedIliAnomalyCount : "UNKNOWN"} detail={dashboardSourceErrors.ili ?? iliStatus?.reason ?? "ILI source unavailable"} />
            <DashboardMetric accent="amber" label="CP Compliance" value={!selectedSegmentId && cpMonitoringData?.availability.testPoints.available && cpMonitoringData.summary.protectionCoveragePercent != null ? `${cpMonitoringData.summary.protectionCoveragePercent}%` : "UNKNOWN"} detail={cpMonitoringData?.availability.testPoints.reason ?? cpStatus?.reason ?? "CP source unavailable"} />
            <DashboardMetric accent={statusTone(maopUtilisation?.status)} label="MAOP Utilisation" value={selectedSegmentId ? "UNKNOWN" : maopValue} detail={maopUtilisation?.reason ?? "Requires MAOP and pressure"} />
            <DashboardMetric accent="red" label="Inlet Pressure" value="UNKNOWN" detail={scadaStatus?.reason ?? "SCADA telemetry unavailable"} />
            <DashboardMetric accent="red" label="Flow Rate" value="UNKNOWN" detail={scadaStatus?.reason ?? "SCADA telemetry unavailable"} />
          </div>
          <Panel className="border-slate-200/80 p-3 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">Pipeline Information</h3><p className="text-xs text-slate-500">Technical data strip</p></div>
            {activePipeline ? <div className="mt-3 grid divide-y divide-slate-200 overflow-hidden rounded-xl border pipeguard-surface-muted sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-6"><HistoryCell label="Pipeline Name" value={activeDashboardAggregation?.pipeline.pipelineName ?? formatMasterText(activePipeline.pipelineName, "Unavailable")} /><HistoryCell label="Pipeline Length" value={activeDashboardAggregation?.pipeline.pipeLengthKm ? `${activeDashboardAggregation.pipeline.pipeLengthKm} km` : formatMasterNumber(activePipeline.pipeLengthKm, "km").replace("Not provided", "Unavailable")} /><HistoryCell label="Latest Assessment" value={latestAssessmentLabel} /><HistoryCell label="Latest Report" value={latestReportLabel} /><HistoryCell label="Pipe Specification" value={[activeDashboardAggregation?.pipeline.pipeMaterial ?? activePipeline.pipeMaterial, activeDashboardAggregation?.pipeline.pipeGrade ?? activePipeline.pipeGrade].filter(Boolean).join(" / ") || "Unavailable"} /><HistoryCell label="Wall Thickness" value={activeDashboardAggregation?.pipeline.wallThickness.value ? `${activeDashboardAggregation.pipeline.wallThickness.value} ${activeDashboardAggregation.pipeline.wallThickness.unit ?? ""}`.trim() : formatWallThickness(activePipeline.nominalWallThickness, activePipeline.wallThicknessInputValue, activePipeline.wallThicknessUnit).replace("Not provided", "Unavailable")} /></div> : <UnavailablePanel text="Select a pipeline to view available master data and history." />}
          </Panel>
        </div>
      </div>

      <ExecutiveReferencePanelsImg09 pipeline={activePipeline} aggregation={activeDashboardAggregation} selectedSegmentId={selectedSegmentId} timePeriod={dashboardTimePeriod} cpData={cpMonitoringData} scada={scadaOverview} scadaQuality={scadaQuality} sensorAssignments={sensorAssignments} riskMatrix={riskMatrix} segments={dashboardSegments} sourceErrors={dashboardSourceErrors} documentScope={documentScope} reportWorkspaceData={reportWorkspaceData} externalPipeDataCount={externalPipeDataCount} integrationSummary={integrationSummary} />

      {!isDemoPreview && dashboardDataError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">{dashboardDataError}</div> : null}
      {!isDemoPreview && dashboardAggregationError ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">{dashboardAggregationError}</div> : null}

      {false ? <Panel className="border-slate-200/80 p-3 shadow-sm"><div className="flex flex-wrap items-baseline justify-between gap-2"><div><h3 className="text-lg font-semibold text-slate-900">Pipeline Risk Schematic</h3><p className="mt-1 text-sm text-slate-500">{isDemoPreview ? "Demo preview segment schematic from local fixture." : "Assessment-level risk only. No segment risk colouring is fabricated."}</p></div><span className="text-xs text-slate-500">{displayedAssessmentCount} assessments</span></div><RiskSchematic chartData={chartData} displayedAssessmentCount={displayedAssessmentCount} displayedRiskCounts={displayedRiskCounts} total={total} isDemoPreview={isDemoPreview} /></Panel> : null}

      {false ? <AiAgentArchitecturePanel
        aggregation={activeDashboardAggregation}
        displayedAiReadiness={displayedAiReadiness}
        isDemoPreview={isDemoPreview}
        reportStatus={latestReportLabel}
        riskStatus={displayedAssessmentCount ? "Available context" : "Unavailable"}
        selectedPipeline={activePipeline}
      /> : null}

      {false ? <Panel className="">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Pipeline History</h3>
            <p className="mt-1 text-sm text-slate-500">
              Expand a pipeline to review its data and available history. Use Actions to open a module or edit a record.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="rounded-full border border-cyan-300/70 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-500/15"
              href="/document-upload"
            >
              Upload Document
            </Link>
            <button
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              disabled={isLoadingPipelines}
              onClick={() => void loadDashboardData()}
              type="button"
            >
              {isLoadingPipelines ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              className="w-full rounded-full bg-slateblue-600 px-5 py-3 text-sm font-semibold text-white sm:w-auto"
              onClick={() => setCreateRequestKey(`create:${Date.now()}`)}
              type="button"
            >
              Create New Pipeline
            </button>
          </div>

          <PipelineSelector
            hidePicker
            selectedPipeline={selectedPipeline}
            onSelect={(pipeline) => {
              setPipelineSearchValue(getPipelineOptionLabel(pipeline));
              void loadPipelineHistory(pipeline);
              void loadDashboardData();
            }}
            onClear={clearSelectedPipeline}
            createRequestKey={createRequestKey}
            discardEditRequestKey={discardEditRequestKey}
            editRequestKey={editRequestKey}
            onDirtyChange={setHasPipelineEditChanges}
          />
        </div>

        {pipelineHistoryNotice ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium leading-6 text-amber-800">
            {pipelineHistoryNotice}
          </div>
        ) : null}

        {actionNotice ? (
          <div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium leading-6 text-amber-800">
            {actionNotice}
          </div>
        ) : null}

        <div className="mt-6 rounded-[28px] border pipeguard-surface p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
            <label className="block">
              <span className="mb-2 block text-xs font-medium text-slate-700">Search Pipeline History</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                onChange={(event) => setPipelineHistorySearch(event.target.value)}
                placeholder="Search by pipeline name or code"
                value={pipelineHistorySearch}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-medium text-slate-700">Status Filter</span>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                onChange={(event) => setPipelineHistoryStatusFilter(event.target.value)}
                value={pipelineHistoryStatusFilter}
              >
                {PIPELINE_HISTORY_STATUS_FILTERS.map((status) => (
                  <option key={status} value={status}>
                    {formatPipelineStatus(status)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {isLoadingPipelines ? (
            <div className="mt-5 rounded-3xl border border-dashed pipeguard-placeholder px-5 py-8 text-center text-sm text-slate-500">
              Loading pipelines...
            </div>
          ) : pipelines.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed pipeguard-placeholder px-5 py-8 text-center text-sm text-slate-500">
              No pipelines available. Create a pipeline or upload a document to begin.
            </div>
          ) : filteredPipelineHistoryRows.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed pipeguard-placeholder px-5 py-8 text-center text-sm text-slate-500">
              No pipelines match the current search and status filter.
            </div>
          ) : (
            <div className="mt-5 rounded-[24px] border pipeguard-surface-muted">
              <div className={styles.tableContainer}>
                <table className={`${styles.table} w-full text-sm`}>
                  <caption className="sr-only">Pipeline History. Expand a pipeline name to review its details.</caption>
                  <thead className="pipeguard-surface text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em]">Name</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em]">Code</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em]">Status</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em]">Completeness</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em]">Updated</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em]">Created By</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPipelineHistoryRows.map((pipeline) => {
                      const completeness = getPipelineCompleteness(pipeline);
                      const bundle = pipelineBundles[pipeline.id];
                      const latestReport = getLatestReport(bundle?.history?.reports);
                      const assessmentCount = (bundle?.history?.externalAssessments.length ?? 0) + (bundle?.history?.internalAssessments.length ?? 0);
                      const inspectionCount = bundle?.inspections.length ?? 0;
                      const cpHistoryCount = bundle?.history?.cpCalculations.length ?? 0;
                      const reportCount = bundle?.history?.reports.length ?? 0;
                      const isExpanded = expandedPipelineId === pipeline.id;
                      const detailsId = `pipeline-details-${pipeline.id}`;
                      const toggleExpanded = () => setExpandedPipelineId((current) => current === pipeline.id ? null : pipeline.id);
                      return (
                        <Fragment key={pipeline.id}>
                        <tr className={styles.summaryRow} data-expanded={isExpanded} onClick={toggleExpanded}>
                          <td className="px-4 py-3 text-slate-800">
                            <button
                              className={`${styles.expandButton} text-left font-semibold text-slate-900`}
                              aria-expanded={isExpanded}
                              aria-controls={detailsId}
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleExpanded();
                              }}
                              type="button"
                            >
                              <svg className={styles.chevron} data-expanded={isExpanded} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
                              <span className="min-w-0 break-words">{formatMasterText(pipeline.pipelineName, "Unavailable")}<span className={styles.mobileCode}>{pipeline.pipelineCode}</span></span>
                            </button>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">{formatMasterText(pipeline.pipelineCode, "Unavailable")}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-full border pipeguard-surface px-2.5 py-1 text-xs font-semibold text-slate-700">
                              {formatPipelineStatus(pipeline.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
                                <div className="h-full rounded-full bg-cyan-500" style={{ width: `${completeness}%` }} />
                              </div>
                              <span className="text-xs font-semibold">{completeness}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{formatDate(pipeline.updatedAt, "Unavailable")}</td>
                          <td className="px-4 py-3 text-slate-600">{getCreatedByLabel(pipeline)}</td>
                          <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                            <PipelineHistoryActionsDropdown
                              actions={[
                                {
                                  label: "Dashboard",
                                  onClick: () => {
                                    setPipelineSearchValue(getPipelineOptionLabel(pipeline));
                                    void loadPipelineHistory(pipeline);
                                  }
                                },
                                { label: "View Pipeline", onClick: () => void handleAction("view-pipe-data", pipeline) },
                                { label: "Edit Pipeline", onClick: () => void handleAction("edit-pipe-data", pipeline) },
                                {
                                  label: "Assessment History",
                                  disabled: assessmentCount === 0,
                                  hint: assessmentCount === 0 ? "No assessments" : `${assessmentCount} records`,
                                  onClick: () => void handleAction("inspection-history", pipeline)
                                },
                                {
                                  label: "Inspection History",
                                  disabled: inspectionCount === 0,
                                  hint: inspectionCount === 0 ? "No inspections" : `${inspectionCount} records`,
                                  onClick: () => void handleAction("inspection-history", pipeline)
                                },
                                {
                                  label: "ILI History",
                                  disabled: true,
                                  hint: "No real ILI read view connected",
                                  onClick: () => void handleAction("ili-history", pipeline)
                                },
                                {
                                  label: "View Reports",
                                  disabled: reportCount === 0 || isLoadingReportsForPipelineId === pipeline.id,
                                  hint: reportCount === 0 ? "No reports" : `${reportCount} reports`,
                                  onClick: () => void handleAction("reports-module", pipeline)
                                },
                                {
                                  label: latestReport ? "Download Report" : "Download Reports",
                                  disabled: !latestReport || activeDownloadReportId === latestReport.id,
                                  hint: latestReport ? "Latest PDF" : "No reports",
                                  onClick: () => void handleAction("download-latest-report", pipeline)
                                }
                              ]}
                            />
                          </td>
                        </tr>
                        <tr className={styles.detailsRow} aria-hidden={!isExpanded}>
                          <td colSpan={7}>
                            <div className={styles.expansion} data-expanded={isExpanded}>
                              <div className={styles.expansionInner}>
                                <section id={detailsId} aria-label={`${pipeline.pipelineName} details`} className={styles.details}>
                                  <div>
                                    <h4 className="text-sm font-semibold text-slate-900">Pipeline overview</h4>
                                    <dl className={styles.dataGrid}>
                                      {[
                                        ["Location", formatMasterText(pipeline.location)],
                                        ["Service / product", formatMasterText(pipeline.serviceOrProduct)],
                                        ["Material / grade", [pipeline.pipeMaterialOther || pipeline.pipeMaterial, pipeline.pipeGradeOther || pipeline.pipeGrade].filter(Boolean).join(" / ") || "Not provided"],
                                        ["Length", formatMasterNumber(pipeline.pipeLengthKm, "km")],
                                        ["Outside diameter", formatMasterNumber(pipeline.pipeOutsideDiameter, pipeline.diameterUnit)],
                                        ["Wall thickness", formatWallThickness(pipeline.nominalWallThickness, pipeline.wallThicknessInputValue, pipeline.wallThicknessUnit)],
                                        ["Operating pressure", formatOperatingPressure(pipeline.operatingPressure, pipeline.operatingPressureInputValue, pipeline.operatingPressureUnit)],
                                        ["MAOP", formatMasterNumber(pipeline.maopBar, "bar")],
                                        ["Pipeline status", formatPipelineStatus(pipeline.status)],
                                        ["Last updated", formatDate(pipeline.updatedAt)],
                                        ["Created by", getCreatedByLabel(pipeline)],
                                        ["Latest inspection", bundle ? formatDate(getLatestInspectionDate(bundle), "No inspections") : "Unavailable"]
                                      ].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-slate-900">{value}</dd></div>)}
                                    </dl>
                                  </div>
                                  <div className={styles.historyPanel}>
                                    <div className="flex items-center justify-between gap-3"><h4 className="text-sm font-semibold text-slate-900">Data completeness</h4><span className="text-sm font-semibold text-cyan-700">{completeness}%</span></div>
                                    <div className={styles.progress} role="progressbar" aria-label="Pipeline data completeness" aria-valuenow={completeness} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${completeness}%` }} /></div>
                                    <p className="mt-2 text-xs text-slate-500">{completeness === 100 ? "All tracked master data fields are complete." : "Complete missing master data using Edit Pipeline in Actions."}</p>
                                    <h4 className="mb-3 mt-5 text-sm font-semibold text-slate-900">Available history</h4>
                                    {bundle?.history ? <dl className={styles.historyGrid}>{[["Assessments", assessmentCount], ["Inspections", inspectionCount], ["CP calculations", cpHistoryCount], ["Reports", reportCount]].map(([label, count]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{count === 0 ? "No records" : `${count} records`}</dd></div>)}</dl> : <p className="text-xs text-slate-500">History is not available yet. Refresh to try again.</p>}
                                    <p className="mt-3 text-xs text-slate-500">ILI history is not connected. Open available history from Actions.</p>
                                  </div>
                                </section>
                              </div>
                            </div>
                          </td>
                        </tr>
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Showing {(pipelineHistorySafePage - 1) * PIPELINE_HISTORY_PAGE_SIZE + 1}-
                  {Math.min(pipelineHistorySafePage * PIPELINE_HISTORY_PAGE_SIZE, filteredPipelineHistoryRows.length)} of {filteredPipelineHistoryRows.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-full border pipeguard-surface px-3 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={pipelineHistorySafePage <= 1}
                    onClick={() => setPipelineHistoryPage((page) => Math.max(1, page - 1))}
                    type="button"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-semibold text-slate-600">
                    Page {pipelineHistorySafePage} of {pipelineHistoryTotalPages}
                  </span>
                  <button
                    className="rounded-full border pipeguard-surface px-3 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={pipelineHistorySafePage >= pipelineHistoryTotalPages}
                    onClick={() => setPipelineHistoryPage((page) => Math.min(pipelineHistoryTotalPages, page + 1))}
                    type="button"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Panel> : null}

      {activeModal ? renderActionModal(activeModal) : null}
      {isDiscardConfirmOpen ? (
        <ActionModal title="Discard unsaved changes?" subtitle="Pipeline History" onClose={() => setIsDiscardConfirmOpen(false)}>
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">
            Discard unsaved changes?
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
              onClick={() => setIsDiscardConfirmOpen(false)}
              type="button"
            >
              Keep Editing
            </button>
            <button
              className="rounded-full bg-slateblue-600 px-5 py-3 text-sm font-semibold text-white"
              onClick={discardPipelineSelection}
              type="button"
            >
              Discard Changes
            </button>
          </div>
        </ActionModal>
      ) : null}
    </div>
  );

  function renderActionModal(modal: PipelineActionModal) {
    if (modal.type === "pipe-data") {
      return (
        <ActionModal title="Pipe Data" subtitle={`${modal.pipeline.pipelineName} - ${modal.pipeline.pipelineCode}`} onClose={() => setActiveModal(null)}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <PreviewCard label="Pipeline Name" value={formatMasterText(modal.pipeline.pipelineName)} />
            <PreviewCard label="Pipeline Code" value={formatMasterText(modal.pipeline.pipelineCode)} />
            <PreviewCard label="Pipeline Status" value={formatPipelineStatus(modal.pipeline.status)} />
            <PreviewCard label="Pipe Location/ID" value={formatMasterText(modal.pipeline.pipeLocationId ?? modal.pipeline.location)} />
            <PreviewCard label="Pipe Material" value={formatMasterText(modal.pipeline.pipeMaterial)} />
            <PreviewCard label="Pipe Grade" value={formatMasterText(modal.pipeline.pipeGrade)} />
            <PreviewCard label="Pipe Age" value={formatMasterNumber(modal.pipeline.pipeAgeYears, "years")} />
            <PreviewCard label="Pipe Length" value={formatMasterNumber(modal.pipeline.pipeLengthKm, "km")} />
            <PreviewCard label="Outside Diameter" value={formatMasterNumber(modal.pipeline.pipeOutsideDiameter, modal.pipeline.diameterUnit ?? "mm")} />
            <PreviewCard label="Wall Thickness" value={formatWallThickness(modal.pipeline.nominalWallThickness, modal.pipeline.wallThicknessInputValue, modal.pipeline.wallThicknessUnit)} />
            <PreviewCard label="SMYS" value={formatMasterNumber(modal.pipeline.smysMpa, "MPa")} />
            <PreviewCard label="MAOP" value={formatMasterNumber(modal.pipeline.maopBar, "bar")} />
            <PreviewCard label="Operating Pressure" value={formatOperatingPressure(modal.pipeline.operatingPressure, modal.pipeline.operatingPressureInputValue, modal.pipeline.operatingPressureUnit)} />
            <PreviewCard label="Installation Year" value={formatMasterNumber(modal.pipeline.installationYear)} />
            <PreviewCard label="Inspection Year" value={formatMasterNumber(modal.pipeline.inspectionYear)} />
          </div>
        </ActionModal>
      );
    }

    if (modal.type === "inspection-history") {
      const bundle = pipelineBundles[modal.pipeline.id];
      const rows = [
        ...(bundle?.history?.externalAssessments ?? []).map((assessment) => ({
          id: assessment.id,
          type: assessment.type,
          source: "Assessment",
          createdAt: assessment.createdAt,
          riskLevel: assessment.riskLevel
        })),
        ...(bundle?.history?.internalAssessments ?? []).map((assessment) => ({
          id: assessment.id,
          type: assessment.type,
          source: "Assessment",
          createdAt: assessment.createdAt,
          riskLevel: assessment.riskLevel
        })),
        ...(bundle?.inspections ?? []).map((record) => ({
          id: record.id,
          type: record.assessmentType,
          source: "Pipe Data",
          createdAt: record.savedAt,
          riskLevel: undefined
        }))
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return (
        <ActionModal title="Inspection History" subtitle={`${modal.pipeline.pipelineName} - ${modal.pipeline.pipelineCode}`} onClose={() => setActiveModal(null)}>
          {isLoadingInspectionsForPipelineId === modal.pipeline.id ? (
            <div className="rounded-3xl border border-dashed pipeguard-placeholder px-5 py-8 text-sm text-slate-500">
              Loading inspection history...
            </div>
          ) : rows.length > 0 ? (
            <div className="overflow-hidden rounded-3xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Inspection Type</th>
                    <th className="px-4 py-3 font-medium">Record Source</th>
                    <th className="px-4 py-3 font-medium">Inspection Date</th>
                    <th className="px-4 py-3 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 pipeguard-surface">
                  {rows.map((row) => (
                    <tr key={`${row.source}:${row.id}`}>
                      <td className="px-4 py-4 text-slate-600">{row.type}</td>
                      <td className="px-4 py-4 text-slate-600">{row.source}</td>
                      <td className="px-4 py-4 text-slate-600">{formatDateTime(row.createdAt)}</td>
                      <td className="px-4 py-4 text-slate-600">{row.riskLevel ?? "Saved pipe data"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed pipeguard-placeholder px-5 py-8 text-sm text-slate-500">
              No inspections.
            </div>
          )}
        </ActionModal>
      );
    }

    if (modal.type === "reports") {
      const previewReport = selectedReports.find((report) => report.id === previewReportId) ?? null;

      return (
        <ActionModal title="Reports" subtitle={`${modal.pipeline.pipelineName} - ${modal.pipeline.pipelineCode}`} onClose={() => setActiveModal(null)}>
          {selectedReports.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-3xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Report Type</th>
                      <th className="px-4 py-3 font-medium">Report Date</th>
                      <th className="px-4 py-3 font-medium">Pipeline</th>
                      <th className="px-4 py-3 font-medium">Result</th>
                      <th className="px-4 py-3 font-medium">Version</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 pipeguard-surface">
                    {selectedReports.map((report, index) => (
                      <tr key={report.id}>
                        <td className="px-4 py-4 text-slate-600">{report.assessmentType}</td>
                        <td className="px-4 py-4 text-slate-600">{formatDateTime(report.generatedAt ?? report.createdAt)}</td>
                        <td className="px-4 py-4 text-slate-600">
                          {report.pipelineName} / {modal.pipeline.pipelineCode}
                        </td>
                        <td className="px-4 py-4 text-slate-600">{getReportRiskLabel(report)}</td>
                        <td className="px-4 py-4 text-slate-600">Snapshot {selectedReports.length - index}</td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              className="rounded-full border pipeguard-surface px-3 py-2 text-xs font-semibold text-slate-700"
                              onClick={() => setPreviewReportId(report.id)}
                              type="button"
                            >
                              View
                            </button>
                            <button
                              className="rounded-full border pipeguard-surface px-3 py-2 text-xs font-semibold text-slate-700"
                              disabled={activeDownloadReportId === report.id}
                              onClick={() => void downloadReport(report.id)}
                              type="button"
                            >
                              {activeDownloadReportId === report.id ? "Downloading..." : "Download"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewReport ? (
                <div className="rounded-3xl border pipeguard-surface-muted p-5">
                  <p className="text-sm font-semibold text-slate-900">Report Preview</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <PreviewCard label="Report ID" value={previewReport.id} />
                    <PreviewCard label="Assessment ID" value={previewReport.assessmentId} />
                    <PreviewCard label="Risk Level" value={getReportRiskLabel(previewReport)} />
                    <PreviewCard label="Created" value={formatDateTime(previewReport.createdAt)} />
                    <PreviewCard label="Generated" value={formatDateTime(previewReport.generatedAt)} />
                    <PreviewCard label="Created By" value={formatMasterText(previewReport.createdByName)} />
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed pipeguard-placeholder px-5 py-8 text-sm text-slate-500">
              No report available.
            </div>
          )}
        </ActionModal>
      );
    }

    if (modal.type === "calculation-reports") {
      return (
        <CalculationReportHistoryModal
          isOpen
          onClose={() => setActiveModal(null)}
          pipeline={modal.pipeline}
        />
      );
    }

    return (
      <ActionModal title="Upload Inspection File" subtitle={`${modal.pipeline.pipelineName} - ${modal.pipeline.pipelineCode}`} onClose={() => setActiveModal(null)}>
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">
          Inspection file upload is not available yet. Enter inspection data through the External or Internal Corrosion Assessment.
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            className="rounded-full bg-slateblue-600 px-5 py-3 text-sm font-semibold text-white"
            href="/external-corrosion-assessment"
          >
            Go to External Assessment
          </Link>
          <Link
            className="rounded-full bg-slateblue-600 px-5 py-3 text-sm font-semibold text-white"
            href="/internal-corrosion-assessment"
          >
            Go to Internal Assessment
          </Link>
          <button
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
            onClick={() => setActiveModal(null)}
            type="button"
          >
            Cancel
          </button>
        </div>
      </ActionModal>
    );
  }
}

function PanelHeader({ title, eyebrow, meta }: { title: string; eyebrow: string; meta?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#c8d8e6] px-5 py-4 dark:border-slate-800">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{eyebrow} <span className="text-[#00a889]">{title}</span></p>
      {meta ? <span className="rounded bg-rose-100 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{meta}</span> : null}
    </div>
  );
}

function AiAgentArchitecturePanel({
  aggregation,
  displayedAiReadiness,
  isDemoPreview,
  reportStatus,
  riskStatus,
  selectedPipeline
}: {
  aggregation?: DashboardAggregation | null;
  displayedAiReadiness?: Pick<AiPredictionsReadiness, "readyCapabilities" | "blockedCapabilities"> | DashboardAggregation["modules"]["aiPredictions"] | null;
  isDemoPreview: boolean;
  reportStatus: string;
  riskStatus: string;
  selectedPipeline: PipelineRecord | null;
}) {
  const sourceAgents = [
    {
      name: "ILI Agent",
      status: isDemoPreview ? "DEMO SOURCE" : formatStatusLabel(aggregation?.modules.iliAnalysis.status ?? "unavailable"),
      detail: isDemoPreview ? "DEMO smart pig data / anomaly source" : aggregation?.modules.iliAnalysis.reason ?? "ILI readiness source unavailable."
    },
    {
      name: "CP Agent",
      status: isDemoPreview ? "DEMO SOURCE" : formatStatusLabel(aggregation?.modules.cpMonitoring.status ?? "unavailable"),
      detail: isDemoPreview ? "DEMO potential monitoring / test point source" : aggregation?.modules.cpMonitoring.reason ?? "CP monitoring source unavailable."
    },
    {
      name: "SCADA Agent",
      status: isDemoPreview ? "DEMO SOURCE" : formatStatusLabel(aggregation?.modules.scada.status ?? "not_connected"),
      detail: isDemoPreview ? "DEMO pressure / flow / temperature fixture" : aggregation?.modules.scada.reason ?? "No SCADA source is connected."
    },
    {
      name: "Upload Agent",
      status: isDemoPreview ? "DEMO SOURCE" : selectedPipeline ? "Available context" : "Unavailable",
      detail: isDemoPreview ? "DEMO PDF / CSV extraction context" : "Document upload workspace exists; no live upload agent status is configured."
    }
  ];
  const outputAgents = [
    {
      name: "Risk Agent",
      status: isDemoPreview ? "DEMO ANALYSIS" : riskStatus,
      detail: isDemoPreview ? "DEMO PoF / CoF / risk matrix context" : "Uses existing assessment and dashboard risk context where available."
    },
    {
      name: "Report Agent",
      status: isDemoPreview ? "DEMO OUTPUT" : reportStatus === "Unavailable" ? "Unavailable" : "Available context",
      detail: isDemoPreview ? "DEMO compliance / executive report context" : `Latest report context: ${reportStatus}.`
    },
    {
      name: "Alert Agent",
      status: isDemoPreview ? "DEMO PREVIEW" : formatStatusLabel(aggregation?.modules.alerts.status ?? "not_configured"),
      detail: isDemoPreview ? "DEMO threshold / anomaly alert context" : aggregation?.modules.alerts.reason ?? "No live alert service is configured."
    }
  ];
  const orchestratorStatus = isDemoPreview ? "DEMO ORCHESTRATOR" : "Not configured";
  const orchestratorDetail = isDemoPreview
    ? "DEMO core engine routing only. No backend AI service is called."
    : displayedAiReadiness
      ? `${displayedAiReadiness.readyCapabilities} readiness checks available, ${displayedAiReadiness.blockedCapabilities} blocked. No live orchestrator service is configured.`
      : "No live orchestrator service is configured.";
  const foundationItems = isDemoPreview
    ? ["DEMO ASSESSMENTS", "DEMO REPORTS", "DEMO SCADA", "DEMO RISK"]
    : [
        selectedPipeline ? "PIPELINE SELECTED" : "PIPELINE REQUIRED",
        aggregation ? "BACKEND AGGREGATION" : "NO AGGREGATION",
        formatStatusLabel(aggregation?.modules.scada.status ?? "not_connected").toUpperCase(),
        displayedAiReadiness ? "AI READINESS CHECKED" : "AI READINESS UNAVAILABLE"
      ];

  return (
    <Panel className="overflow-hidden border-slate-200/80 p-0 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <PanelHeader title="AI Agent Architecture - System Data Flow" eyebrow="AI agent" meta={isDemoPreview ? "DEMO DATA" : "REAL DATA"} />
      <div className="p-4 sm:p-5">
        <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1fr)_96px_minmax(144px,176px)_96px_minmax(0,1fr)] lg:items-center">
          <div className="grid gap-2.5">
            {sourceAgents.map((agent, index) => <AgentNode key={agent.name} index={index} {...agent} />)}
          </div>
          <FlowConnector label="source agents" tone="cyan" />
          <AgentNode detail={orchestratorDetail} emphasis name="AI Orchestrator" status={orchestratorStatus} />
          <FlowConnector label="analysis agents" tone="amber" />
          <div className="grid gap-2.5">
            {outputAgents.map((agent, index) => <AgentNode key={agent.name} index={index} {...agent} />)}
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Data foundation <span className="text-[#00a889]">{isDemoPreview ? "DEMO ONLY" : "CURRENT SYSTEM STATUS"}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {foundationItems.map((item) => (
              <span key={item} className={`rounded px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${item.includes("DEMO") ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"}`}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function AgentNode({
  detail,
  emphasis = false,
  index,
  name,
  status
}: {
  detail: string;
  emphasis?: boolean;
  index?: number;
  name: string;
  status: string;
}) {
  const isDemo = status.toUpperCase().includes("DEMO");
  const statusTone = isDemo
    ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
    : status === "Unavailable" || status === "Not Configured" || status === "Not Connected"
      ? "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
      : "border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300";

  return (
    <article className={`relative rounded-lg border px-3 py-3 shadow-[0_8px_22px_rgba(15,23,42,0.05)] dark:shadow-none ${emphasis ? "border-cyan-400 bg-cyan-500/10 text-center ring-1 ring-cyan-400/30" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"}`}>
      {typeof index === "number" ? <span className="absolute -left-1.5 top-4 hidden h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.65)] lg:block" aria-hidden="true" /> : null}
      <div className={`flex gap-2 ${emphasis ? "flex-col items-center justify-center" : "items-start justify-between"}`}>
        <h4 className={`text-sm font-bold text-slate-900 dark:text-white ${emphasis ? "font-mono uppercase tracking-[0.1em] text-[#00a889]" : ""}`}>{name}</h4>
        <span className={`rounded border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.1em] ${statusTone}`}>
          {status}
        </span>
      </div>
      <p className={`mt-2 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400 ${emphasis ? "font-mono uppercase tracking-[0.08em]" : ""}`}>{detail}</p>
    </article>
  );
}

function FlowConnector({ label, tone }: { label: string; tone: "cyan" | "amber" }) {
  const color = tone === "cyan" ? "bg-cyan-400/70 text-cyan-700 dark:text-cyan-300" : "bg-amber-400/80 text-amber-700 dark:text-amber-300";

  return (
    <div className="flex items-center justify-center lg:h-full">
      <div className={`flex w-full items-center gap-2 ${color}`}>
        <span className="h-px flex-1 rounded-full bg-current opacity-60" />
        <span className="hidden rounded border border-current/30 bg-white/80 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] dark:bg-slate-950/80 sm:inline-flex">
          {label}
        </span>
        <span className="h-px w-5 rounded-full bg-current opacity-60" />
        <span aria-hidden="true" className="-ml-1 text-lg leading-none">-&gt;</span>
      </div>
    </div>
  );
}

function HealthPanel({ value, detail }: { value: number | null; detail: string }) {
  const displayValue = typeof value === "number" ? value : null;
  const percent = displayValue ?? 0;
  const circumference = 2 * Math.PI * 44;
  const dash = (Math.min(Math.max(percent, 0), 100) / 100) * circumference;

  return (
    <Panel className="flex min-h-[236px] flex-col justify-between overflow-hidden border-[#c8d8e6] bg-white p-0 shadow-[0_6px_18px_rgba(30,64,100,0.08)] dark:border-slate-800 dark:bg-slate-950">
      <div className="border-b border-[#c8d8e6] px-5 py-4 dark:border-slate-800">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Pipeline <span className="text-[#00a889]">Health</span></p>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-5 text-center">
        {displayValue !== null ? (
          <div className="relative h-36 w-36">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120" role="img" aria-label={`Pipeline health ${displayValue}%`}>
              <circle cx="60" cy="60" fill="none" r="44" stroke="currentColor" strokeOpacity="0.12" strokeWidth="12" />
              <circle cx="60" cy="60" fill="none" r="44" stroke="var(--app-primary)" strokeDasharray={`${dash} ${circumference - dash}`} strokeLinecap="round" strokeWidth="12" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-2xl font-semibold text-slate-900">{displayValue}</p>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Health score</p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed pipeguard-placeholder px-5 py-6">
            <p className="text-lg font-semibold text-slate-500">UNKNOWN</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">No approved health calculation exists.</p>
          </div>
        )}
        <p className="mt-3 text-xs leading-5 text-slate-500">{detail}</p>
      </div>
    </Panel>
  );
}

function DashboardMetric({ label, value, detail, accent, prominent = false }: { label: string; value: string | number; detail: string; accent: "blue" | "red" | "amber" | "green"; prominent?: boolean }) {
  const accents = { blue: "border-l-slateblue-500", red: "border-l-rose-500", amber: "border-l-amber-500", green: "border-l-emerald-500" };
  const isUnavailable = value === "UNKNOWN" || value === "DATA STALE";
  return (
    <div className={`rounded-lg border border-l-4 border-[#c8d8e6] bg-white p-3 shadow-[0_6px_18px_rgba(30,64,100,0.06)] dark:border-slate-800 dark:bg-slate-950 ${isUnavailable ? "border-l-slate-300" : accents[accent]}`}>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className={`mt-1.5 font-semibold tracking-tight ${isUnavailable ? "text-slate-500" : "text-slate-950 dark:text-white"} ${prominent ? "text-xl" : "text-lg"}`}>{value}</p>
      <p className="mt-1 line-clamp-2 text-xs leading-4 text-slate-500 dark:text-slate-400">{detail}</p>
    </div>
  );
}

function RiskSchematic({
  chartData,
  displayedAssessmentCount,
  displayedRiskCounts,
  total,
  isDemoPreview = false
}: {
  chartData: Array<{ label: string; value: number; color: string }>;
  displayedAssessmentCount: number;
  displayedRiskCounts: { High: number; Medium: number; Low: number; Unknown: number };
  total: number;
  isDemoPreview?: boolean;
}) {
  const segmentTones = ["bg-emerald-500", "bg-emerald-500", "bg-amber-500", "bg-red-500", "bg-amber-500"];
  const segmentBorderTones = ["border-emerald-500", "border-emerald-500", "border-amber-500", "border-red-500", "border-amber-500"];

  return (
    <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_260px]">
      <div className="relative min-h-[230px] overflow-hidden rounded-xl border pipeguard-grid-placeholder px-5 py-6">
        <div className="absolute right-5 top-4 flex items-center gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />Low</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />Medium</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-rose-500" />High</span>
        </div>
        <div className="absolute left-[12%] right-[12%] top-1/2 h-4 -translate-y-1/2 overflow-hidden rounded-full border border-cyan-400/25 bg-slate-200/40 dark:bg-slate-950/40">
          {isDemoPreview ? <div className="grid h-full grid-cols-[1.2fr_1fr_1.4fr_1fr_1.1fr]"><span className="bg-emerald-500" /><span className="bg-amber-500" /><span className="bg-rose-500" /><span className="bg-amber-500" /><span className="bg-emerald-500" /></div> : <div className="h-full pipeguard-surface-subtle" />}
        </div>
        <div className="absolute left-[11%] top-1/2 -translate-y-1/2 rounded-lg border pipeguard-surface-subtle px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">STA<br />A</div>
        <div className="absolute right-[10%] top-1/2 -translate-y-1/2 rounded-lg border pipeguard-surface-subtle px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">STA<br />B</div>
        {[20, 35, 50, 64, 78].map((left, index) => (
          <div key={left} className="absolute top-1/2 flex -translate-y-1/2 flex-col items-center gap-2" style={{ left: `${left}%` }}>
            <div className={`h-5 w-5 rotate-45 border-2 bg-[var(--app-surface)] ${isDemoPreview ? segmentBorderTones[index] : "border-cyan-400/40"}`} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">TP-{String(index + 1).padStart(2, "0")}</span>
          </div>
        ))}
        <div className="absolute inset-x-5 bottom-4 rounded-lg border border-dashed pipeguard-placeholder px-3 py-2 text-center text-xs text-slate-500">
          {isDemoPreview ? "Demo segment risk preview" : "Segment-level risk source unavailable"}
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
        {chartData.map((item) => (
          <div key={item.label} className="rounded-xl border pipeguard-surface-muted p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">{item.label}</p>
              <p className="text-xl font-semibold text-slate-900">{item.value}</p>
            </div>
            <div className="mt-2 h-1.5 rounded-full pipeguard-surface-subtle">
              <div className={`h-1.5 rounded-full ${item.color}`} style={{ width: `${(item.value / total) * 100}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              {displayedAssessmentCount ? `${Math.round((item.value / displayedAssessmentCount) * 100)}%` : "No assessments"}
            </p>
          </div>
        ))}
        <div className="rounded-xl border pipeguard-surface-muted px-3 py-2 text-xs text-slate-500 sm:col-span-3 xl:col-span-1">
          Unknown risk records: <span className="font-semibold text-slate-800">{displayedRiskCounts.Unknown}</span>
        </div>
      </div>
    </div>
  );
}

function UnavailablePanel({ text, compact = false }: { text: string; compact?: boolean }) {
  return <div className={`mt-3 rounded-xl border border-dashed pipeguard-placeholder px-4 text-sm text-slate-500 ${compact ? "py-3" : "py-5"}`}>{text}</div>;
}

function ModuleStatus({ title, status, detail }: { title: string; status: string; detail: string }) {
  return (
    <article className="flex items-center justify-between gap-3 rounded-xl border pipeguard-surface-muted px-3 py-2">
      <div className="min-w-0"><h4 className="text-xs font-semibold text-slate-800">{title}</h4><p className="mt-0.5 text-xs text-slate-500">{detail}</p></div>
      <p className="shrink-0 text-xs font-semibold text-slate-600">{status}</p>
    </article>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0"><p className="text-xs font-medium text-slate-500">{label}</p><p className="max-w-[60%] text-right text-sm font-semibold text-slate-800">{value}</p></div>;
}

type ExecutiveKpiGridProps = {
  pipeline: PipelineRecord | null;
  aggregation: DashboardAggregation | null;
  cpStatus: DashboardAggregation["modules"]["cpMonitoring"] | undefined;
  iliStatus: DashboardAggregation["modules"]["iliAnalysis"] | undefined;
  aiReadiness: DashboardAggregation["modules"]["aiPredictions"] | AiPredictionsReadiness | null;
  router: { push: (href: string) => void };
  cpData: CpMonitoringRealData | null;
  scada: ScadaOverview | null;
  scadaQuality: ScadaQuality | null;
  riskMatrix: RiskMatrixData | null;
  selectedSegmentId: string;
};

function ExecutiveKpiGrid({ pipeline, aggregation, cpStatus, cpData, scada, scadaQuality, riskMatrix, selectedSegmentId }: ExecutiveKpiGridProps) {
  const pipelineId = pipeline?.id;
  const cpValue = !selectedSegmentId && cpData?.summary.protectionCoveragePercent != null && cpData.availability.testPoints.available ? `${cpData.summary.protectionCoveragePercent}%` : "UNKNOWN";
  const scadaLive = scada?.status === "Live" || scada?.status === "Partial";
  const monitoringValue = selectedSegmentId ? "UNKNOWN" : scada?.status === "Stale" ? "DATA STALE" : scadaLive && scadaQuality?.expected && scadaQuality.availabilityPercent != null ? `${scadaQuality.availabilityPercent}%` : "UNKNOWN";
  const healthValue = !selectedSegmentId && aggregation?.summary.pipelineHealth.status === "available" && aggregation.summary.pipelineHealth.value != null ? `${aggregation.summary.pipelineHealth.value}%` : "UNKNOWN";
  const riskValue = !selectedSegmentId && riskMatrix?.status === "available" && riskMatrix.item?.summary?.high != null ? String(riskMatrix.item.summary.high) : "UNKNOWN";
  const cpDetail = selectedSegmentId ? "Segment-scoped CP unavailable" : cpData?.availability.testPoints.reason ?? cpStatus?.reason ?? "CP source unavailable";
  // Readiness is not a prediction or an official risk outlook.
  const kpis = [
    { label: "Overall Integrity Status", value: healthValue, detail: aggregation?.summary.pipelineHealth.reason ?? "Health source unavailable", trend: "UNKNOWN", href: undefined },
    { label: "Critical / High Risk", value: riskValue, detail: "Official high risk; critical split unavailable", trend: "UNKNOWN", href: pipelineId ? `/risk-assessment?pipelineId=${encodeURIComponent(pipelineId)}` : undefined },
    { label: "Open High/Critical Defects", value: "UNKNOWN", detail: "Defect source unavailable", trend: "UNKNOWN", href: pipelineId ? `/defect-manager?pipelineId=${encodeURIComponent(pipelineId)}` : undefined },
    { label: "Overdue Integrity Actions", value: "UNKNOWN", detail: "Action source unavailable", trend: "UNKNOWN", href: undefined },
    { label: "CP Status", value: cpValue, detail: cpDetail, trend: "UNKNOWN", href: undefined },
    { label: "Corrosion Status", value: "UNKNOWN", detail: "Corrosion source unavailable", trend: "UNKNOWN", href: undefined },
    { label: "Monitoring / Data Coverage", value: monitoringValue, detail: scadaQuality ? `Source window: ${scadaQuality.hours} hours` : "Monitoring source unavailable", trend: "UNKNOWN", href: undefined },
    { label: "AI Outlook (12 months)", value: "UNKNOWN", detail: "AI prediction source unavailable", trend: "UNKNOWN", href: "/ai-predictions" }
  ];
  return <section aria-labelledby="executive-kpis" className="dashboard-kpi-grid grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8"><h2 id="executive-kpis" className="sr-only">Executive Dashboard KPI cards</h2>{kpis.map((kpi) => <ExecutiveKpi key={kpi.label} {...kpi} />)}</section>;
}

function ExecutiveKpi({ label, value, detail, trend, href }: { label: string; value: string; detail: string; trend: string; href?: string }) {
  const content = <div className="dashboard-kpi-card min-h-[132px] rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><div className="text-xs font-semibold text-slate-500">{label}</div><div className="mt-3 text-xl font-bold text-slate-500">{value}</div><div className="mt-1 text-[11px] text-slate-500">{detail}</div><div className="mt-3 text-[11px] font-semibold text-slate-400">{trend}</div></div>;
  return href ? <Link href={href} aria-label={`${label}: ${value}`}>{content}</Link> : content;
}

function ExecutiveReferencePanels({ pipeline, aggregation, selectedSegmentId, timePeriod, riskMatrix, cpData, scada, scadaQuality, sensorAssignments, sourceErrors }: { pipeline: PipelineRecord | null; aggregation: DashboardAggregation | null; selectedSegmentId: string; timePeriod: string; riskMatrix: RiskMatrixData | null; cpData: CpMonitoringRealData | null; scada: ScadaOverview | null; scadaQuality: ScadaQuality | null; sensorAssignments: SensorAssignmentRecord[] | null; sourceErrors: Record<string, string> }) {
  const pipelineLength = aggregation?.pipeline.pipeLengthKm ?? pipeline?.pipeLengthKm;
  const riskItem = riskMatrix?.status === "available" ? riskMatrix.item : null;
  const riskAvailable = Boolean(riskItem);
  const riskCells = riskItem?.distributions.current ?? [];
  const activeSensors = sensorAssignments?.filter((sensor) => sensor.assignmentStatus === "Active").length;
  const scadaCoverage = scadaQuality?.availabilityPercent ?? scada?.kpis.dataAvailabilityPercent;
  const healthRows = [
    ["Pipeline / Asset Master", "UNKNOWN", "Completeness contract unavailable"],
    ["Sensors", activeSensors == null ? "UNKNOWN" : String(activeSensors), sourceErrors.sensors ?? "Active sensor assignments from source API"],
    ["SCADA", scadaCoverage == null ? "DATA STALE" : `${scadaCoverage}%`, sourceErrors.scada ?? scada?.limitations[0] ?? "SCADA source API"],
    ["CP Monitoring", cpData?.summary.protectionCoveragePercent == null ? "DATA STALE" : `${cpData.summary.protectionCoveragePercent}%`, sourceErrors.cp ?? cpData?.availability.testPoints.reason ?? "CP source API"],
    ["Document Management", "UNKNOWN", "Dashboard document-health contract unavailable"],
    ["Data Quality", "UNKNOWN", "Integration quality contract unavailable"]
  ];
  const blocked = "BLOCKED — authoritative source contract unavailable";
  return <>
    <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
      <Panel className="border-slate-200/80 p-3 shadow-sm"><div className="flex items-baseline justify-between gap-2"><div><h3 className="text-lg font-semibold text-slate-900">Integrity Risk Trend (Last 12 Months)</h3><p className="mt-1 text-xs text-slate-500">{blocked}</p></div><select disabled className="rounded-lg border border-slate-200 bg-slate-100 px-2 py-1 text-xs text-slate-500"><option>All Segments</option></select></div><div className="mt-4 flex h-44 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-400">UNKNOWN / DATA STALE</div><p className="mt-2 text-[11px] text-slate-500">Risk Index, High/Critical Risk, Moderate Risk and Low Risk series are not available from the current API.</p></Panel>
      <Panel className="border-slate-200/80 p-3 shadow-sm"><h3 className="text-lg font-semibold text-slate-900">Pipeline Map &amp; Asset Overview</h3><div className="mt-3 flex flex-wrap gap-2">{["Pipeline Route", "Assets", "Risk & Defects", "CP Status", "Sensors"].map((layer) => <button key={layer} disabled className="rounded-lg border border-slate-200 bg-slate-100 px-2 py-1 text-xs text-slate-500" title={blocked}>{layer}</button>)}</div><div className="mt-3 flex h-44 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center text-sm font-semibold text-slate-400">GIS BLOCKED<br /><span className="text-xs font-normal">No verified route geometry or markers</span></div></Panel>
    </div>
    <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
      <Panel className="border-slate-200/80 p-3 shadow-sm"><div className="flex items-baseline justify-between gap-2"><div><h3 className="text-lg font-semibold text-slate-900">Recent Alerts &amp; Events</h3><p className="mt-1 text-xs text-slate-500">{blocked}</p></div><button disabled className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1 text-xs text-slate-500">View All</button></div><div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-400">UNKNOWN / DATA STALE</div></Panel>
      <Panel className="border-slate-200/80 p-3 shadow-sm"><h3 className="text-lg font-semibold text-slate-900">Defect Trend (Last 12 Months)</h3><p className="mt-1 text-xs text-slate-500">{blocked}</p><div className="mt-4 flex h-36 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-400">UNKNOWN</div></Panel>
    </div>
    <div className="grid gap-2.5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <Panel className="border-slate-200/80 p-3 shadow-sm"><h3 className="text-lg font-semibold text-slate-900">Risk Matrix (Current)</h3><p className="mt-1 text-xs text-slate-500">{riskItem ? `Verified as of ${formatDateTime(riskItem.asOf)}` : riskMatrix?.reason ?? sourceErrors.risk ?? blocked}</p>{riskAvailable ? <div className="mt-4 grid grid-cols-5 gap-1">{riskCells.map((cell) => <div key={`${cell.likelihood}-${cell.consequence}`} className="min-h-12 rounded border border-slate-200 bg-slate-50 p-1 text-center text-xs text-slate-700"><div>{cell.likelihood} × {cell.consequence}</div><strong>{cell.count}</strong></div>)}</div> : <div className="mt-4 flex h-36 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-400">UNKNOWN</div>}</Panel>
      <Panel className="border-slate-200/80 p-3 shadow-sm"><div className="flex items-baseline justify-between gap-2"><div><h3 className="text-lg font-semibold text-slate-900">Top Risks &amp; Upcoming Activities</h3><p className="mt-1 text-xs text-slate-500">{blocked}</p></div><button disabled className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1 text-xs text-slate-500">View All</button></div><div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-400">UNKNOWN / DATA STALE</div></Panel>
    </div>
    <Panel className="border-slate-200/80 p-3 shadow-sm"><h3 className="text-lg font-semibold text-slate-900">Module &amp; Data Health</h3><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{healthRows.map(([label, value, detail]) => <div className="rounded-lg border border-slate-200 bg-slate-50 p-3" key={label}><div className="text-xs font-semibold text-slate-600">{label}</div><div className="mt-2 text-lg font-bold text-slate-500">{value}</div><div className="mt-1 text-[10px] text-slate-500">{detail}</div></div>)}</div></Panel>
    <Panel className="border-slate-200/80 p-3 shadow-sm"><div className="flex items-baseline justify-between gap-2"><h3 className="text-lg font-semibold text-slate-900">Key Metrics</h3><button disabled className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1 text-xs text-slate-500" title="BLOCKED — dashboard preference contract unavailable">Customise</button></div><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{[["Pipeline Length", pipelineLength == null ? "UNKNOWN" : `${pipelineLength} km`], ["Segments", "UNKNOWN"], ["Stations", scada?.kpis.stationsExpected == null ? "UNKNOWN" : String(scada.kpis.stationsExpected)], ["Active Sensors", activeSensors == null ? "UNKNOWN" : String(activeSensors)], ["CP Rectifiers", cpData?.summary.rectifierCount == null ? "UNKNOWN" : String(cpData.summary.rectifierCount)], ["Compressor Stations", "UNKNOWN"]].map(([label, value]) => <div className="rounded-lg border border-slate-200 bg-white p-3" key={label}><div className="text-xs font-semibold text-slate-500">{label}</div><div className="mt-2 text-lg font-bold text-slate-500">{value}</div></div>)}</div><p className="mt-3 text-[11px] text-slate-500">Context: Pipeline {pipeline?.pipelineCode ?? "UNKNOWN"} · Segment {selectedSegmentId || "ALL"} · Period {timePeriod}; source APIs apply pipeline scope only unless explicitly supported.</p></Panel>
  </>;
}

function ExecutiveReferencePanelsImg09({
  pipeline, aggregation, selectedSegmentId, timePeriod, cpData, scada,
  scadaQuality, sensorAssignments, riskMatrix, segments, sourceErrors,
  documentScope, reportWorkspaceData, externalPipeDataCount, integrationSummary
}: {
  pipeline: PipelineRecord | null; aggregation: DashboardAggregation | null;
  selectedSegmentId: string; timePeriod: string; cpData: CpMonitoringRealData | null;
  scada: ScadaOverview | null; scadaQuality: ScadaQuality | null;
  sensorAssignments: SensorAssignmentRecord[] | null; riskMatrix: RiskMatrixData | null;
  segments: AssetMasterSegmentRecord[]; sourceErrors: Record<string, string>;
  documentScope: { total: number; scope: "pipeline" | "segment" } | null;
  reportWorkspaceData: ReportWorkspaceData | null;
  externalPipeDataCount: number | null;
  integrationSummary: IntegrationSummary | null;
}) {
  const pipelineLength = selectedSegmentId ? null : aggregation?.pipeline.pipeLengthKm ?? pipeline?.pipeLengthKm;
  const activeSensors = selectedSegmentId ? null : sensorAssignments?.filter((sensor) => sensor.assignmentStatus === "Active").length;
  const cpCoverage = !selectedSegmentId && cpData?.availability.testPoints.available ? cpData.summary.protectionCoveragePercent : null;
  const cpRectifiers = !selectedSegmentId && cpData?.availability.rectifiers.available ? cpData.summary.rectifierCount : null;
  const scadaLive = scada?.status === "Live" || scada?.status === "Partial";
  const scadaAvailability = !selectedSegmentId && scadaLive && scadaQuality && scadaQuality.expected > 0 ? scadaQuality.availabilityPercent : null;
  // Current risk and SCADA APIs are pipeline scoped; a selected segment cannot be represented by their totals.
  const riskItem = !selectedSegmentId && riskMatrix?.status === "available" ? riskMatrix.item : null;
  const matrixCells = riskItem?.distributions.current ?? [];
  const riskRows = riskItem?.rows.slice().sort((a, b) => b.current.score - a.current.score).slice(0, 6) ?? [];
  const scadaEvents = !selectedSegmentId && scadaLive
    ? scada.events.slice().sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt)).slice(0, 5) : [];
  const healthRows = [
    ["Pipeline / Asset Master", "UNKNOWN", "Completeness source unavailable"],
    ["Sensors", activeSensors == null ? "UNKNOWN" : activeSensors.toLocaleString(), sourceErrors.sensors ?? "Active sensor assignments"],
    ["SCADA", selectedSegmentId ? "UNKNOWN" : scada?.status === "Stale" ? "DATA STALE" : scadaAvailability == null ? "UNKNOWN" : String(scadaAvailability) + "%", sourceErrors.quality ?? "Data availability"],
    ["CP Monitoring", cpCoverage == null ? "UNKNOWN" : String(cpCoverage) + "%", sourceErrors.cp ?? "CP monitoring source"],
    ["Document Management", documentScope ? String(documentScope.total) : "UNKNOWN", sourceErrors.documents ?? `${documentScope?.scope === "segment" ? "Segment" : "Pipeline"}-scoped repository records`],
    ["Reports & Analytics", reportWorkspaceData?.existingReports.count == null ? "UNKNOWN" : String(reportWorkspaceData.existingReports.count), sourceErrors.reports ?? "Pipeline-scoped saved reports"],
    ["External Pipe Data", externalPipeDataCount == null ? "UNKNOWN" : String(externalPipeDataCount), sourceErrors.externalCorrosion ?? "External records only; confirmed corrosion/ECDA result BLOCKED"],
    ["Integration Hub", integrationSummary == null ? "UNKNOWN" : String(integrationSummary.activeConnectors), "Connector context only; not engineering health"]
  ];
  const keyMetrics = [
    ["Pipeline Length", pipelineLength == null ? "UNKNOWN" : String(pipelineLength) + " km"],
    ["Segments", !selectedSegmentId && segments.length ? String(segments.length) : "UNKNOWN"],
    ["Stations", !selectedSegmentId && scadaLive && scada?.kpis.stationsExpected != null ? String(scada.kpis.stationsExpected) : "UNKNOWN"],
    ["Active Sensors", activeSensors == null ? "UNKNOWN" : activeSensors.toLocaleString()],
    ["CP Rectifiers", cpRectifiers == null ? "UNKNOWN" : String(cpRectifiers)],
    ["Compressor Stations", "UNKNOWN"]
  ];
  const matrixTone = (level: string | undefined) => {
    if (!level) return "bg-slate-100 text-slate-500";
    const name = level.toLowerCase();
    if (name.includes("critical") || name.includes("very high")) return "bg-red-500/80 text-white";
    if (name.includes("high")) return "bg-orange-300/80 text-slate-900";
    if (name.includes("medium") || name.includes("moderate")) return "bg-yellow-200 text-slate-900";
    if (name.includes("low")) return "bg-emerald-300/70 text-slate-900";
    return "bg-slate-100 text-slate-500";
  };
  return <div className="dashboard-reference-layout min-w-0 space-y-2.5">
    <div className="dashboard-reference-primary grid min-w-0 gap-2.5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1.35fr)_minmax(280px,0.85fr)]">
      <Panel className="border-slate-200/80 p-3 shadow-sm">
        <div className="flex items-center justify-between gap-2"><h3 className="text-lg font-semibold text-slate-900">Integrity Risk Trend (Last 12 Months) <span className="text-xs text-slate-400">ⓘ</span></h3><select disabled className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"><option>All Segments</option></select></div>
        <div className="relative mt-3 h-40 overflow-hidden rounded border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500" role="img" aria-label="Integrity Risk Trend unavailable">
          <div className="absolute inset-0 grid grid-rows-5">{[1, 2, 3, 4, 5].map((row) => <div className="border-b border-slate-200" key={row} />)}</div>
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50/60">UNKNOWN</div>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 text-[10px] text-slate-500"><span>● Overall Risk Index</span><span>● High/Critical Risk</span><span>● Moderate Risk</span><span>● Low Risk</span></div>
      </Panel>
      <Panel className="border-slate-200/80 p-3 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Pipeline Map &amp; Asset Overview</h3>
        <div className="mt-3 flex flex-wrap gap-1">{["Pipeline Route", "Assets", "Risk & Defects", "CP Status", "Sensors"].map((layer) => <button disabled key={layer} className="rounded border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-500">{layer}</button>)}</div>
        <div className="relative mt-3 flex h-40 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-500" role="img" aria-label="Map geometry unavailable">UNKNOWN
          <div className="absolute left-2 top-2 flex flex-col gap-0.5"><button disabled className="rounded bg-white/90 px-2 py-0.5 text-xs text-slate-500">+</button><button disabled className="rounded bg-white/90 px-2 py-0.5 text-xs text-slate-500">−</button></div>
          <div className="absolute right-2 top-2 flex gap-1"><button disabled className="rounded bg-white/90 px-2 py-1 text-[10px] text-slate-500">Map</button><button disabled className="rounded bg-white/90 px-2 py-1 text-[10px] text-slate-500">Satellite</button></div>
          <div className="absolute bottom-1 right-1 rounded bg-white/90 p-1.5 text-[9px] leading-4 text-slate-500"><div>● Normal</div><div>● Attention</div><div>● High Risk</div><div>● Offline</div></div>
        </div>
      </Panel>
      <Panel className="border-slate-200/80 p-3 shadow-sm">
        <div className="flex items-center justify-between gap-2"><div><h3 className="text-lg font-semibold text-slate-900">Recent SCADA Events <span className="text-xs text-slate-400">ⓘ</span></h3><p className="mt-1 text-[10px] text-slate-500">Pipeline-scoped SCADA Events only; Segment and Time Period filters are not supported by this source.</p></div><Link className="rounded border border-blue-200 px-2 py-1 text-[10px] text-blue-600" href="/scada">Open SCADA</Link></div>
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[520px] text-[9px]"><thead className="bg-blue-50 text-left text-slate-600"><tr>{["Severity", "Date & Time", "Event", "Location", "Source Event ID"].map((head) => <th className="px-1.5 py-1.5" key={head}>{head}</th>)}</tr></thead><tbody>
          {scada?.status === "Stale" ? <tr><td colSpan={5} className="bg-slate-100 py-10 text-center text-sm font-semibold text-slate-500">DATA STALE</td></tr> : scadaEvents.length ? scadaEvents.map((event) => <tr className="border-b border-slate-100" key={event.id}><td className="px-1.5 py-1.5 text-slate-500">{event.severity || "UNKNOWN"}</td><td className="px-1.5 py-1.5">{formatDateTime(event.occurredAt, "UNKNOWN")}</td><td className="px-1.5 py-1.5">{event.description || "UNKNOWN"}</td><td className="px-1.5 py-1.5 text-slate-500">UNKNOWN</td><td className="px-1.5 py-1.5"><Link className="text-slateblue-600" href="/scada" aria-label={`Open SCADA source for event ${event.eventId}`}>{event.eventId || "UNKNOWN"}</Link></td></tr>)
            : <tr><td colSpan={5} className="py-10 text-center text-sm font-semibold text-slate-500">UNKNOWN</td></tr>}
        </tbody></table></div>
      </Panel>
    </div>
    <div className="dashboard-reference-secondary grid min-w-0 gap-2.5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)_minmax(0,1.35fr)]">
      <Panel className="border-slate-200/80 p-3 shadow-sm">
        <div className="flex items-center justify-between gap-2"><h3 className="text-lg font-semibold text-slate-900">Defect Trend (Last 12 Months) <span className="text-xs text-slate-400">ⓘ</span></h3><select disabled className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"><option>All Segments</option></select></div>
        <div className="relative mt-3 h-36 overflow-hidden rounded border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500" role="img" aria-label="Defect Trend unavailable">
          <div className="absolute inset-0 grid grid-rows-5">{[1, 2, 3, 4, 5].map((row) => <div className="border-b border-slate-200" key={row} />)}</div>
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50/60">UNKNOWN</div>
        </div>
        <div className="mt-2 flex justify-center gap-3 text-[10px] text-slate-500"><span>■ Critical</span><span>■ High</span><span>■ Medium</span><span>■ Low</span></div>
      </Panel>
      <Panel className="border-slate-200/80 p-3 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Risk Matrix (Current)</h3>
        <div className="mt-3 grid grid-cols-[45px_repeat(5,minmax(0,1fr))] gap-px text-[8px]"><div />
          {["1\nInsignificant", "2\nMinor", "3\nModerate", "4\nMajor", "5\nCatastrophic"].map((label) => <div className="whitespace-pre-line text-center text-slate-500" key={label}>{label}</div>)}
          {[5, 4, 3, 2, 1].map((likelihood) => <Fragment key={likelihood}><div className="self-center text-slate-500">{likelihood}</div>{[1, 2, 3, 4, 5].map((consequence) => {
            const cell = matrixCells.find((item) => item.likelihood === likelihood && item.consequence === consequence);
            return <div className={"flex min-h-7 items-center justify-center border border-white " + matrixTone(cell?.level)} key={consequence}>{cell && cell.count > 0 ? cell.count : ""}</div>;
          })}</Fragment>)}
        </div>
        {!riskItem ? <p className="mt-2 text-center text-xs font-semibold text-slate-500">UNKNOWN</p> : null}
      </Panel>
      <Panel className="border-slate-200/80 p-3 shadow-sm">
        <div className="flex items-center justify-between gap-2"><h3 className="text-lg font-semibold text-slate-900">Top Risks &amp; Upcoming Activities <span className="text-xs text-slate-400">ⓘ</span></h3><button disabled className="rounded border border-blue-200 px-2 py-1 text-[10px] text-blue-600">View All</button></div>
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[560px] text-[9px]"><thead className="bg-blue-50 text-left text-slate-600"><tr>{["#", "Type", "Description", "Location", "Due Date", "Status"].map((head) => <th className="px-1.5 py-1.5" key={head}>{head}</th>)}</tr></thead><tbody>
          {riskRows.length ? riskRows.map((risk, index) => <tr className="border-b border-slate-100" key={risk.riskId}><td className="px-1.5 py-1.5">{index + 1}</td><td className="px-1.5 py-1.5">Risk</td><td className="px-1.5 py-1.5">{risk.title || "UNKNOWN"}</td><td className="px-1.5 py-1.5 text-slate-500">UNKNOWN</td><td className="px-1.5 py-1.5 text-slate-500">UNKNOWN</td><td className="px-1.5 py-1.5">{risk.status || "UNKNOWN"}</td></tr>)
            : <tr><td colSpan={6} className="py-10 text-center text-sm font-semibold text-slate-500">UNKNOWN</td></tr>}
        </tbody></table></div>
      </Panel>
    </div>
    <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.85fr)]">
      <Panel className="border-slate-200/80 p-3 shadow-sm"><h3 className="text-lg font-semibold text-slate-900">Module &amp; Data Health</h3><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{healthRows.map(([label, value, detail]) => <div className="rounded-lg border border-slate-200 bg-slate-50 p-2" key={label}><div className="text-[10px] font-semibold text-slate-600">{label}</div><div className="mt-1 text-lg font-bold text-slate-500">{value}</div><div className="text-[9px] text-slate-500">{detail}</div></div>)}</div></Panel>
      <Panel className="border-slate-200/80 p-3 shadow-sm"><div className="flex items-center justify-between"><h3 className="text-lg font-semibold text-slate-900">Key Metrics</h3><button disabled className="rounded border border-blue-200 px-2 py-1 text-[10px] text-blue-600">Customise</button></div><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{keyMetrics.map(([label, value]) => <div className="rounded-lg border border-slate-200 bg-white p-2" key={label}><div className="text-[10px] text-slate-500">{label}</div><div className={"mt-1 text-base font-bold " + (value === "UNKNOWN" ? "text-slate-500" : "text-blue-700")}>{value}</div></div>)}</div><p className="mt-2 text-[9px] text-slate-500">Context: Pipeline {pipeline?.pipelineCode ?? "UNKNOWN"} · Segment {selectedSegmentId || "ALL"} · Period {timePeriod}</p></Panel>
    </div>
  </div>;
}
function HistoryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function ActionMenuButton({
  label,
  onClick,
  disabled = false
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="block w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function PipelineHistoryActionsDropdown({
  actions
}: {
  actions: Array<{
    label: string;
    hint?: string;
    disabled?: boolean;
    onClick: () => void;
  }>;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        dropdownRef.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
    }}>
      <button
        className="rounded-full border pipeguard-surface px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-cyan-400 hover:text-cyan-700"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        Actions <span aria-hidden="true">⌄</span>
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 max-h-80 w-64 max-w-[calc(100vw-3rem)] overflow-y-auto rounded-2xl border pipeguard-surface py-2 shadow-[0_18px_45px_rgba(15,23,42,0.18)]">
          {actions.map((action) => (
            <button
              key={action.label}
              className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-xs font-semibold text-slate-700 transition hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent"
              disabled={action.disabled}
              onClick={() => {
                setOpen(false);
                action.onClick();
              }}
              title={action.disabled ? action.hint : undefined}
              type="button"
            >
              <span>{action.label}</span>
              {action.hint ? <span className="shrink-0 text-[10px] font-medium text-slate-500">{action.hint}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ActionModal({
  title,
  subtitle,
  children,
  onClose
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/55 px-4 py-6 sm:px-6">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[32px] border pipeguard-surface shadow-[0_30px_90px_rgba(15,23,42,0.35)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slateblue-600">
              Pipeline History
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h3>
            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          </div>
          <button
            className="rounded-full border pipeguard-surface px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
        <div className="max-h-[calc(92vh-112px)] overflow-y-auto pipeguard-surface-muted p-6">{children}</div>
      </div>
    </div>
  );
}

function PreviewCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border pipeguard-surface px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-900">{value}</p>
    </div>
  );
}
