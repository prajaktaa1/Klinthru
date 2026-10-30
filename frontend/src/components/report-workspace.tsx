"use client";

import { type ReactNode, useEffect, useState } from "react";
import { BarChart3, Clock3, Download, FileText, Plus, Users } from "lucide-react";

import { PipelineSelector } from "@/components/pipeline-selector";
import { Panel } from "@/components/ui";
import {
  fetchPipelineById,
  fetchMasterAssets,
  fetchMasterSegments,
  fetchReportWorkspaceData,
  searchReports,
  isBackendUnavailableError,
  isUnauthorizedError,
  type ReportRecord,
  type ReportWorkspaceData,
  type ReportWorkspaceStatus
} from "@/lib/apiClient";
import { PipelineRecord } from "@/lib/types";

type WorkspaceMode = "real";
const periods = ["Monthly", "Quarterly", "Annual", "One-off"];
const outputFormats = ["PDF (A4 Portrait)", "PDF (A3 Landscape)", "Word (.docx)", "Excel (.xlsx)"];
const renderers = ["Playwright (Chromium)", "WeasyPrint", "ReportLab"];
const deliveryOptions = ["Email PDF attachment", "Save to shared drive", "Upload to SharePoint", "Post summary to Teams/Slack"];

function formatStatusLabel(status: string | null | undefined) {
  if (!status) return "Not Available";
  return status.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function formatDate(value: string | null | undefined, fallback = "Not Available") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatNumber(value: number | null | undefined, unit?: string | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Not Available";
  return unit ? `${value} ${unit}` : String(value);
}

function compactPipelineDescription(data: ReportWorkspaceData | null) {
  const pipeline = data?.pipeline.data;
  if (!pipeline) return "Select a pipeline to view source-backed report data.";
  return [
    pipeline.pipelineCode,
    pipeline.pipeLengthKm !== null ? formatNumber(pipeline.pipeLengthKm, "km") : null,
    pipeline.pipeGradeOther || pipeline.pipeGrade,
    pipeline.pipeOutsideDiameter !== null ? formatNumber(pipeline.pipeOutsideDiameter, pipeline.diameterUnit) : null,
    pipeline.location
  ].filter(Boolean).join(" · ") || pipeline.pipelineName;
}

function statusTone(status: ReportWorkspaceStatus | string) {
  if (status === "available" || status === "ready") return "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "partial") return "border-cyan-400/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300";
  if (status === "blocked") return "border-amber-400/50 bg-amber-500/10 text-amber-800 dark:text-amber-300";
  return "border-slate-300 bg-slate-500/10 text-slate-700 dark:border-slate-700 dark:text-slate-300";
}

export function ReportWorkspace() {
  const [activeTab, setActiveTab] = useState<"library" | "custom" | "scheduled" | "history" | "analytics" | "data-export" | "templates" | "configuration">("library");
  const [selectedSections, setSelectedSections] = useState<Record<string, boolean>>({});
  const [mode, setMode] = useState<WorkspaceMode>("real");
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineRecord | null>(null);
  const [workspaceData, setWorkspaceData] = useState<ReportWorkspaceData | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [isLoadingWorkspaceData, setIsLoadingWorkspaceData] = useState(false);
  const [routePipelineNotice, setRoutePipelineNotice] = useState<string | null>(null);
  const [analyticsReports, setAnalyticsReports] = useState<ReportRecord[]>([]);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [selectedDashboardReportId, setSelectedDashboardReportId] = useState<string | null>(null);
  const [exportAssets, setExportAssets] = useState<import("@/lib/types").AssetMasterAssetRecord[]>([]);
  const [exportSegments, setExportSegments] = useState<import("@/lib/types").AssetMasterSegmentRecord[]>([]);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isLoadingExportData, setIsLoadingExportData] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingAnalytics(true);
    void searchReports()
      .then((reports) => {
        if (!cancelled) setAnalyticsReports(reports);
      })
      .catch((error) => {
        if (cancelled) return;
        setAnalyticsReports([]);
        setAnalyticsError(
          isUnauthorizedError(error)
            ? "Your session is not authorized to load report analytics."
            : isBackendUnavailableError(error)
              ? "Report analytics data API is unavailable."
              : "Unable to load report analytics data."
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoadingAnalytics(false);
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedPipeline) {
      setExportAssets([]);
      setExportSegments([]);
      setExportError(null);
      setIsLoadingExportData(false);
      return;
    }

    let cancelled = false;
    setIsLoadingExportData(true);
    setExportError(null);
    void Promise.all([fetchMasterAssets(selectedPipeline.id), fetchMasterSegments(selectedPipeline.id)])
      .then(([assets, segments]) => {
        if (!cancelled) {
          setExportAssets(assets);
          setExportSegments(segments);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setExportAssets([]);
        setExportSegments([]);
        setExportError(
          isUnauthorizedError(error)
            ? "Your session is not authorized to load export preview data."
            : isBackendUnavailableError(error)
              ? "Asset master data API is unavailable."
              : "Unable to load asset export preview data."
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoadingExportData(false);
      });

    return () => { cancelled = true; };
  }, [selectedPipeline]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const pipelineId = new URLSearchParams(window.location.search).get("pipelineId");
    if (!pipelineId?.trim()) return;

    let cancelled = false;
    setRoutePipelineNotice("Loading selected pipeline from Dashboard...");
    void fetchPipelineById(pipelineId)
      .then((pipeline) => {
        if (!cancelled) {
          setSelectedPipeline(pipeline);
          setMode("real");
          setRoutePipelineNotice(null);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setRoutePipelineNotice(
          isUnauthorizedError(error)
            ? "Your session is not authorized to open this pipeline report workspace."
            : "Selected pipeline from Dashboard could not be loaded."
        );
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (mode !== "real" || !selectedPipeline) {
      setWorkspaceData(null);
      setWorkspaceError(null);
      setIsLoadingWorkspaceData(false);
      return;
    }

    let cancelled = false;
    setIsLoadingWorkspaceData(true);
    setWorkspaceError(null);
    void fetchReportWorkspaceData(selectedPipeline.id)
      .then((payload) => {
        if (!cancelled) setWorkspaceData(payload);
      })
      .catch((error) => {
        if (cancelled) return;
        setWorkspaceData(null);
        if (isUnauthorizedError(error)) setWorkspaceError("Your session is not authorized to load report data.");
        else if (isBackendUnavailableError(error)) setWorkspaceError("Report workspace data API is unavailable. Start the backend and try again.");
        else setWorkspaceError("Unable to load report data for this pipeline.");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingWorkspaceData(false);
      });

    return () => { cancelled = true; };
  }, [mode, selectedPipeline]);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slateblue-600 text-white shadow-sm" aria-hidden="true">
          <FileText size={30} strokeWidth={2.1} />
        </div>
        <div className="min-w-0 pt-0.5">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Reports &amp; Analytics</h1>
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">Generate standard, custom and regulatory reports. Analyse data across all modules for deeper insights.</p>
        </div>
      </div>
      <div className="flex justify-end">
        <button type="button" disabled title="MISSING FIELD — APPROVAL NEEDED: approved report-definition creation contract" className="inline-flex items-center gap-2 rounded-xl bg-slate-300 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed">
          <Plus size={17} />
          + Create Report
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <DashboardKpi label="Standard Reports" icon={BarChart3} />
        <DashboardKpi label="Custom Reports" icon={FileText} />
        <DashboardKpi label="Scheduled Reports" icon={Clock3} />
        <DashboardKpi label="Regulatory Reports" icon={Users} />
        <DashboardKpi label="Total Downloads" icon={Download} />
      </div>
      <ReportTabs activeTab={activeTab} onChange={setActiveTab} />
      {activeTab === "analytics" ? (
        <ReportAnalytics reports={analyticsReports} isLoading={isLoadingAnalytics} error={analyticsError} />
      ) : null}
      {activeTab === "library" ? <ReportLibraryDashboard reports={analyticsReports} isLoading={isLoadingAnalytics} error={analyticsError} selectedReportId={selectedDashboardReportId} onSelectReport={setSelectedDashboardReportId} /> : null}
      {activeTab === "custom" ? <ReportUnavailableTab title="Custom Reports" detail="Custom report definitions, governed field catalogs and chart/layout contracts are not exposed by the existing read-only APIs." /> : null}
      {activeTab === "scheduled" ? <ReportUnavailableTab title="Scheduled Reports" detail="Report schedules, recipients, frequencies and run contracts are not exposed by the existing read-only APIs." /> : null}
      {activeTab === "history" ? <ReportUnavailableTab title="Report History" detail="Legacy report history remains available below through the existing Report API. Report_Run_ID execution history is not exposed." /> : null}
      {activeTab === "data-export" ? (
        <ReportDataExport assets={exportAssets} segments={exportSegments} isLoading={isLoadingExportData} error={exportError} hasSelectedPipeline={Boolean(selectedPipeline)} />
      ) : null}
      {activeTab === "templates" ? <ReportTemplates /> : null}
      {activeTab === "configuration" ? <ReportConfiguration /> : null}
      <Panel className="p-4 sm:p-5">
        <SectionHeading eyebrow="Pipeline Source" title="Select pipeline for real report data" />
        <div className="mt-4">
          <PipelineSelector mode="select-only" selectedPipeline={selectedPipeline} onSelect={setSelectedPipeline} onClear={() => setSelectedPipeline(null)} />
        </div>
        {routePipelineNotice ? <StateNotice tone="neutral" title="Dashboard report context" detail={routePipelineNotice} /> : null}
        {mode === "real" && !selectedPipeline ? <StateNotice tone="neutral" title="Select a pipeline to view report data." detail="No real report values are loaded until a pipeline is selected." /> : null}
        {mode === "real" && isLoadingWorkspaceData ? <StateNotice tone="neutral" title="Loading report workspace data" detail="Fetching source-backed pipeline, risk, report, CP calculation, and AI readiness data." /> : null}
        {mode === "real" && workspaceError ? <StateNotice tone="danger" title="Unable to load report data." detail={workspaceError} /> : null}
      </Panel>

    </div>
  );
}

function ReportTabs({ activeTab, onChange }: { activeTab: "library" | "custom" | "scheduled" | "history" | "analytics" | "data-export" | "templates" | "configuration"; onChange: (tab: "library" | "custom" | "scheduled" | "history" | "analytics" | "data-export" | "templates" | "configuration") => void }) {
  return <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900">
    {([["library", "Report Library"], ["custom", "Custom Reports"], ["scheduled", "Scheduled Reports"], ["history", "Report History"], ["analytics", "Analytics"], ["data-export", "Data Export"], ["templates", "Templates"], ["configuration", "Configuration"]] as const).map(([value, label]) => <button key={value} type="button" onClick={() => onChange(value)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${activeTab === value ? "bg-slateblue-600 text-white" : "text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"}`}>{label}</button>)}
  </div>;
}

function ReportLibraryDashboard({ reports, isLoading, error, selectedReportId, onSelectReport }: { reports: ReportRecord[]; isLoading: boolean; error: string | null; selectedReportId: string | null; onSelectReport: (id: string) => void }) {
  const selected = reports.find((report) => report.id === selectedReportId) ?? reports[0] ?? null;
  const recent = [...reports].sort((a, b) => new Date(b.generatedAt ?? b.createdAt).getTime() - new Date(a.generatedAt ?? a.createdAt).getTime()).slice(0, 5);
  return <div className="space-y-5">
    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.9fr)]"><Panel className="p-4 sm:p-5"><SectionHeading eyebrow="Report Library" title="Report Library" /><p className="mt-2 text-sm text-slate-500">Browse and run standard reports. Use filters to find the right report for your needs.</p>{error ? <StateNotice tone="danger" title="Unable to load reports." detail={error} /> : null}{isLoading ? <StateNotice tone="neutral" title="Loading reports" detail="Reading existing Report records only." /> : null}<div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">{["Module", "Report Category", "Report Type", "Regulatory Standard"].map((label) => <ConfigSelect key={label} label={label} />)}<Field label="Search reports"><input disabled placeholder="Not Available" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900" /></Field></div><div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800"><table className="min-w-full text-xs"><thead className="pipeguard-surface-muted text-left text-slate-500"><tr>{["#", "Report Name", "Module / Source", "Category", "Type", "Updated On", "Actions"].map((header) => <th key={header} className="px-3 py-2 font-semibold">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{reports.length ? reports.slice(0, 10).map((report, index) => <tr key={report.id} className={selected?.id === report.id ? "bg-slate-50 dark:bg-slate-900" : ""}><td className="px-3 py-2 text-slate-500">{index + 1}</td><td className="px-3 py-2"><button type="button" onClick={() => onSelectReport(report.id)} className="font-semibold text-slateblue-700 hover:underline">{report.assessmentType} report</button><span className="mt-1 block text-[10px] text-slate-500">{report.id}</span></td><td className="px-3 py-2 text-slate-500">Not Available</td><td className="px-3 py-2 text-slate-500">Not Available</td><td className="px-3 py-2 text-slate-500">Not Available</td><td className="px-3 py-2 text-slate-500">{formatDate(report.generatedAt ?? report.createdAt)}</td><td className="px-3 py-2"><button type="button" disabled className="rounded-lg border border-slate-300 px-2 py-1 font-semibold text-slate-400">Run</button></td></tr>) : <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">Not Available<p className="mt-2 text-xs">No verified Report records are available.</p></td></tr>}</tbody></table></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><span>Showing {reports.length ? `1 to ${Math.min(reports.length, 10)} of ${reports.length}` : "Not Available"} reports</span><span>Pagination contract: Not Available</span></div></Panel><ReportDashboardPreview report={selected} /></div>
    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.9fr)]"><Panel className="p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><SectionHeading eyebrow="Recent Reports" title="Recent Reports" /><button type="button" disabled className="text-xs font-semibold text-slate-400">View All</button></div><div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800"><table className="min-w-full text-xs"><thead className="pipeguard-surface-muted text-left text-slate-500"><tr>{["Report Name", "Run Date", "Status", "Format", "Requested By", "Actions"].map((header) => <th key={header} className="px-3 py-2 font-semibold">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{recent.length ? recent.map((report) => <tr key={report.id}><td className="px-3 py-2 text-slate-700">{report.assessmentType} report</td><td className="px-3 py-2 text-slate-500">{formatDate(report.generatedAt ?? report.createdAt)}</td><td className="px-3 py-2 text-slate-500">Not Available</td><td className="px-3 py-2 text-slate-500">Not Available</td><td className="px-3 py-2 text-slate-500">{report.createdByName ?? "Not Available"}</td><td className="px-3 py-2"><button type="button" disabled className="font-semibold text-slate-400">Not Available</button></td></tr>) : <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">Not Available</td></tr>}</tbody></table></div></Panel><Panel className="p-4 sm:p-5"><SectionHeading eyebrow="Quick Actions" title="Quick Actions" /><div className="mt-4 grid gap-3 sm:grid-cols-2">{[["Create Custom Report", "Build a report with your own filters and data."], ["Schedule Report", "Automate and schedule regular reports."], ["Data Export", "Export data to Excel, CSV or other formats."], ["Report Templates", "Manage and use report templates."]].map(([title, detail]) => <button key={title} type="button" disabled className="rounded-xl border border-slate-200 p-4 text-left text-slate-400 dark:border-slate-700"><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs leading-5">{detail}</span></button>)}</div></Panel></div>
  </div>;
}

function DashboardKpi({ label, icon: Icon }: { label: string; icon: typeof FileText }) {
  return <Panel className="flex items-center gap-3 p-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slateblue-600 text-white" aria-hidden="true"><Icon size={23} /></div><div className="min-w-0"><p className="text-2xl font-semibold text-slate-400">Not Available</p><p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-200">{label}</p><p className="mt-1 text-xs text-slate-500">MISSING FIELD — APPROVAL NEEDED</p></div></Panel>;
}

function ReportDashboardPreview({ report }: { report: ReportRecord | null }) {
  return <Panel className="p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><SectionHeading eyebrow="Report Preview" title="Report Preview" /><button type="button" disabled aria-label="Expand report preview" className="text-lg text-slate-400">↗</button></div>{report ? <div className="mt-4 space-y-3"><p className="text-lg font-semibold text-slate-900">{report.assessmentType} report</p><p className="text-xs text-slate-500">Report ID: {report.id}</p><p className="text-xs text-slate-500">Generated On: {formatDate(report.generatedAt ?? report.createdAt)}</p><p className="text-xs text-slate-500">Pipeline: {report.pipelineName || "Not Available"}</p><p className="text-xs text-slate-500">Report Run ID: Not Available</p><div className="grid grid-cols-2 gap-2"><PreviewKpi label="Total Defects" value="Not Available" /><PreviewKpi label="High Risk" value="Not Available" /><PreviewKpi label="Medium Risk" value="Not Available" /><PreviewKpi label="Low Risk" value="Not Available" /></div><AnalyticsUnavailable detail="Defect-type and risk-trend chart data are not exposed by the existing read-only APIs." /><div className="grid gap-2 sm:grid-cols-4"><button type="button" disabled className="rounded-xl bg-slate-300 px-3 py-2 text-sm font-semibold text-white">Run Report</button><button type="button" disabled className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-400">Schedule</button><button type="button" disabled className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-400">Customize</button><button type="button" disabled className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-400">Export</button></div></div> : <AnalyticsUnavailable detail="Select a verified Report record to preview available fields." />}</Panel>;
}

function ReportUnavailableTab({ title, detail }: { title: string; detail: string }) {
  return <Panel className="p-5"><SectionHeading eyebrow="Reports" title={title} /><AnalyticsUnavailable detail={detail} /></Panel>;
}

function ReportTemplates() {
  const categories = ["All Templates", "Integrity", "Inspection", "Risk", "Compliance", "Operations", "Regulatory", "Executive"];
  return <div className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)_minmax(320px,0.8fr)]">
    <Panel className="p-4 sm:p-5"><SectionHeading eyebrow="Templates" title="Template Categories" /><div className="mt-4 space-y-1">{categories.map((category) => <button key={category} type="button" disabled className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-400"><span>{category}</span><span>Not Available</span></button>)}</div><p className="mt-4 text-xs leading-5 text-slate-500">No persisted report-template category catalog is exposed by the existing read-only APIs.</p></Panel>
    <Panel className="p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><SectionHeading eyebrow="Report Templates" title="Report Templates" /><div className="flex gap-2"><input disabled placeholder="Search templates..." aria-label="Search templates" className="w-44 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900" /><button type="button" disabled className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-400">Filter</button></div></div><p className="mt-2 text-sm text-slate-500">Use and customize pre-built templates to quickly create reports. Select a template to preview details.</p><div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800"><table className="min-w-full text-xs"><thead className="pipeguard-surface-muted text-left text-slate-500"><tr><th className="px-3 py-2"><input type="checkbox" disabled aria-label="Select all templates" /></th>{["Name", "Category", "Version", "Last Updated", "Owner", "Actions"].map((header) => <th key={header} className="px-3 py-2 font-semibold">{header}</th>)}</tr></thead><tbody><tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">Not Available<p className="mt-2 text-xs">No approved report-template API or persisted template records are available.</p></td></tr></tbody></table></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><span>Showing Not Available</span><span>Rows per page: Not Available</span><div className="flex gap-1"><button type="button" disabled className="rounded-lg border border-slate-300 px-2 py-1 text-slate-400">‹</button><button type="button" disabled className="rounded-lg border border-slate-300 px-2 py-1 text-slate-400">›</button></div></div></Panel>
    <Panel className="p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><SectionHeading eyebrow="Preview" title="Template Preview" /><button type="button" disabled aria-label="Close template preview" className="text-lg text-slate-400">×</button></div><div className="mt-4"><AnalyticsUnavailable detail="Select a verified template to preview details. Template preview data is not exposed by the existing read-only APIs." /></div><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" disabled className="rounded-xl bg-slate-300 px-3 py-2 text-sm font-semibold text-white">Use Template</button><button type="button" disabled className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-400">Edit</button><button type="button" disabled className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-400">Duplicate</button><button type="button" disabled className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-400">Archive</button></div><p className="mt-3 text-xs leading-5 text-slate-500">Template identity, ownership, versioning, lifecycle and preview contracts require approval before these actions can be enabled.</p></Panel>
  </div>;
}

function ReportConfiguration() {
  return <div className="space-y-5">
    <Panel className="p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><SectionHeading eyebrow="Configuration" title="Configuration" /><button type="button" disabled className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-400">Reset to Defaults</button></div><p className="mt-2 text-sm text-slate-500">Manage report settings, standards, security and delivery preferences.</p><p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900">Not Available — no Reports configuration read API or persisted settings model is exposed.</p></Panel>
    <div className="grid gap-5 xl:grid-cols-3">
      <ConfigPanel title="Default Formats" detail="Set default file formats for generated reports."><ConfigSelect label="Primary Format" /><ConfigSelect label="Secondary Format" /><ConfigToggle label="Include charts and visualizations by default" /></ConfigPanel>
      <ConfigPanel title="Naming Conventions" detail="Define how reports are named."><ConfigSelect label="Naming Pattern" /><ConfigUnavailable detail="Available tags: Not Available" /></ConfigPanel>
      <ConfigPanel title="Approval Workflow" detail="Configure approval requirements for report distribution."><ConfigToggle label="Require Approval" detail="Require approval for external distribution" /><ConfigSelect label="Approval Level" /><ConfigSelect label="Approvers" /></ConfigPanel>
      <ConfigPanel title="Watermarking" detail="Add watermarks to sensitive reports."><ConfigToggle label="Enable Watermark" detail="Add watermark to all reports" /><ConfigInput label="Watermark Text" /><ConfigSelect label="Watermark Style" /></ConfigPanel>
      <ConfigPanel title="Access Control" detail="Set permissions for report access."><ConfigSelect label="Default Access Level" /><ConfigSelect label="Additional Roles" /><ConfigToggle label="Restrict data based on asset permissions" /></ConfigPanel>
      <ConfigPanel title="Email Delivery Settings" detail="Configure email delivery for scheduled reports."><ConfigInput label="SMTP Server" /><ConfigInput label="From Address" /><ConfigInput label="Default Subject" /><button type="button" disabled className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-400">Send Test Email</button><ConfigUnavailable detail="Technical delivery credentials are owned by Integration Hub." /></ConfigPanel>
      <ConfigPanel title="Retention Period" detail="Manage how long reports are stored in the system."><ConfigSelect label="Retention Period" /><ConfigToggle label="Auto-Delete" detail="Automatically delete expired reports" /><ConfigUnavailable detail="Report-file retention is owned by Document Management." /></ConfigPanel>
      <ConfigPanel title="Branding Options" detail="Customize report appearance."><ConfigUnavailable detail="Organization Logo: Not Available" /><ConfigInput label="Primary Color" /><ConfigInput label="Report Footer Text" /></ConfigPanel>
      <ConfigPanel title="Regulatory Mapping" detail="Map reports to regulatory frameworks."><ConfigSelect label="Default Framework" /><ConfigSelect label="Additional Frameworks" /><ConfigToggle label="Include regulatory references in reports" /></ConfigPanel>
      <ConfigPanel title="Notification Settings" detail="Configure system notifications for report activities."><ConfigToggle label="Report generation completed" detail="Email notification" /><ConfigToggle label="Report approval required" detail="Email notification" /><ConfigToggle label="Report delivery failed" detail="Email notification" /></ConfigPanel>
      <ConfigPanel title="Audit Settings" detail="Track report activities for compliance."><ConfigToggle label="Enable Audit Log" detail="Log all report activities" /><ConfigSelect label="Log Retention Period" /><ConfigCheck label="Report generation" /><ConfigCheck label="Downloads" /><ConfigCheck label="Approvals" /><ConfigCheck label="Deletions" /></ConfigPanel>
      <ConfigPanel title="Configuration Best Practices" detail="Not Available — no configuration health API is exposed."><ConfigUnavailable detail="Review access controls regularly" /><ConfigUnavailable detail="Align report settings with regulatory requirements" /><ConfigUnavailable detail="Test email delivery settings" /><ConfigUnavailable detail="Monitor audit logs for unusual activity" /></ConfigPanel>
    </div>
    <Panel className="flex flex-wrap justify-end gap-2 p-4 sm:p-5"><button type="button" disabled className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-400">Cancel</button><button type="button" disabled className="rounded-xl bg-slate-300 px-4 py-2 text-sm font-semibold text-white">Save Changes</button></Panel>
  </div>;
}

function ConfigPanel({ title, detail, children }: { title: string; detail: string; children: ReactNode }) {
  return <Panel className="space-y-4 p-4 sm:p-5"><SectionHeading eyebrow="Reports Configuration" title={title} /><p className="text-xs leading-5 text-slate-500">{detail}</p><div className="space-y-3">{children}</div></Panel>;
}

function ConfigSelect({ label }: { label: string }) {
  return <Field label={label}><select disabled value="Not Available" onChange={() => undefined} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900"><option>Not Available</option></select></Field>;
}

function ConfigInput({ label }: { label: string }) {
  return <Field label={label}><input disabled value="" placeholder="Not Available" onChange={() => undefined} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900" /></Field>;
}

function ConfigToggle({ label, detail }: { label: string; detail?: string }) {
  return <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-400 dark:border-slate-700"><span>{label}{detail ? <small className="mt-1 block text-xs text-slate-500">{detail}</small> : null}</span><input type="checkbox" disabled /></label>;
}

function ConfigCheck({ label }: { label: string }) {
  return <label className="flex items-center gap-2 text-sm text-slate-400"><input type="checkbox" disabled />{label}</label>;
}

function ConfigUnavailable({ detail }: { detail: string }) {
  return <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500 dark:border-slate-700 dark:bg-slate-900">{detail}</p>;
}

function ReportDataExport({ assets, segments, isLoading, error, hasSelectedPipeline }: { assets: import("@/lib/types").AssetMasterAssetRecord[]; segments: import("@/lib/types").AssetMasterSegmentRecord[]; isLoading: boolean; error: string | null; hasSelectedPipeline: boolean }) {
  const segmentNames = new Map(segments.map((segment) => [segment.id, segment.segmentId]));
  return <div className="space-y-5">
    <Panel className="p-4 sm:p-5"><SectionHeading eyebrow="Data Export" title="Export data from verified source modules" /><p className="mt-2 text-sm leading-6 text-slate-500">Read-only source preview. Generic export jobs, templates and scheduling are not enabled without approved backend contracts.</p>{error ? <StateNotice tone="danger" title="Unable to load export preview." detail={error} /> : null}{isLoading ? <StateNotice tone="neutral" title="Loading source data" detail="Reading existing Asset and Segment records only." /> : null}</Panel>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]"><Panel className="p-4 sm:p-5"><div className="grid gap-5 md:grid-cols-2"><ExportStep number="1" title="Select Source Module"><select disabled value={hasSelectedPipeline ? "Pipeline Assets" : "Not Available"} onChange={() => undefined} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900"><option>{hasSelectedPipeline ? "Pipeline Assets" : "Not Available"}</option></select><p className="mt-2 text-xs text-slate-500">Existing source: Asset Master, scoped to the selected pipeline.</p></ExportStep><ExportStep number="2" title="Select Fields"><ExportUnavailable text="Not Available" detail="No persisted export field catalog is exposed." /><button type="button" disabled className="mt-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-400">Customize</button></ExportStep><ExportStep number="3" title="Apply Filters (Optional)"><ExportUnavailable text="Not Available" detail="No generic export filter contract is exposed." /><button type="button" disabled className="mt-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-400">Edit Filters</button></ExportStep><ExportStep number="4" title="Date Range (Optional)"><ExportUnavailable text="Not Available" detail="The Asset Master read API has no export date-range contract." /></ExportStep><ExportStep number="5" title="Output Format"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{["Excel", "CSV", "PDF", "JSON"].map((format) => <button key={format} type="button" disabled className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-400 dark:border-slate-700">{format}<span className="mt-1 block text-[10px] font-normal">Not Available</span></button>)}</div></ExportStep><ExportStep number="6" title="Schedule Export (Optional)"><label className="flex items-center gap-2 text-sm text-slate-400"><input type="checkbox" disabled /> Enable scheduled export</label><p className="mt-2 text-xs text-slate-500">Scheduling is blocked pending an approved export/schedule contract.</p></ExportStep></div><div className="mt-5 flex flex-wrap gap-2"><button type="button" disabled className="rounded-xl bg-slate-300 px-4 py-2.5 text-sm font-semibold text-white">Export Now</button><button type="button" disabled className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-400">Save Export Template</button><button type="button" disabled className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-400">Schedule Export</button></div><p className="mt-3 text-xs text-slate-500">Existing specialized SCADA CSV export and legacy PDF/Word downloads remain unchanged.</p></Panel><div className="space-y-5"><ExportEmptyPanel title="Export Queue & History" detail="No generic export job/history API is available." /><ExportEmptyPanel title="Saved Export Templates" detail="No persisted export-template API is available." /></div></div>
    <Panel className="p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><SectionHeading eyebrow="Data Preview" title="Verified Asset Master preview" /><span className="text-xs text-slate-500">{assets.length ? `Showing ${Math.min(assets.length, 100)} of ${assets.length} records` : "Not Available"}</span></div>{hasSelectedPipeline && assets.length ? <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800"><table className="min-w-full text-xs"><thead className="pipeguard-surface-muted text-left text-slate-500"><tr>{["Asset ID", "Asset Name", "Pipeline Segment", "Location", "Diameter (in)", "Material", "Install Date", "Status", "Last Inspection"].map((header) => <th key={header} className="px-3 py-2 font-semibold">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{assets.slice(0, 100).map((asset) => <tr key={asset.id}><td className="px-3 py-2 text-slate-700">{asset.assetId}</td><td className="px-3 py-2 text-slate-700">{asset.name ?? "Not Available"}</td><td className="px-3 py-2 text-slate-500">{asset.segmentId ? segmentNames.get(asset.segmentId) ?? "Not Available" : "Not Available"}</td><td className="px-3 py-2 text-slate-500">{asset.coordinates ?? (asset.latitude !== undefined && asset.longitude !== undefined ? `${asset.latitude}, ${asset.longitude}` : "Not Available")}</td><td className="px-3 py-2 text-slate-500">Not Available</td><td className="px-3 py-2 text-slate-500">Not Available</td><td className="px-3 py-2 text-slate-500">{formatDate(asset.installationDate)}</td><td className="px-3 py-2 text-slate-500">{asset.physicalStatus}</td><td className="px-3 py-2 text-slate-500">Not Available</td></tr>)}</tbody></table></div> : <AnalyticsUnavailable detail={hasSelectedPipeline ? "No verified Asset Master records are available for this pipeline." : "Select a pipeline to view verified Asset Master records."} />}</Panel>
  </div>;
}

function ExportStep({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{number}. {title}</h3><div className="mt-3">{children}</div></section>;
}

function ExportUnavailable({ text, detail }: { text: string; detail: string }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">{text}<p className="mt-1 text-xs">{detail}</p></div>;
}

function ExportEmptyPanel({ title, detail }: { title: string; detail: string }) {
  return <Panel className="p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3><button type="button" disabled className="text-xs font-semibold text-slate-400">View All</button></div><ExportUnavailable text="Not Available" detail={detail} /></Panel>;
}

function ReportAnalytics({ reports, isLoading, error }: { reports: ReportRecord[]; isLoading: boolean; error: string | null }) {
  const generatedByMonth = getGeneratedByMonth(reports);
  const recentReports = [...reports].sort((a, b) => new Date(b.generatedAt ?? b.createdAt).getTime() - new Date(a.generatedAt ?? a.createdAt).getTime()).slice(0, 5);

  return <div className="space-y-5">
    <Panel className="p-4 sm:p-5"><SectionHeading eyebrow="Analytics" title="Reports & Analytics" /><p className="mt-2 text-sm leading-6 text-slate-500">Read-only Reports usage statistics. Engineering states remain owned by their source modules.</p>{error ? <StateNotice tone="danger" title="Unable to load report analytics." detail={error} /> : null}{isLoading ? <StateNotice tone="neutral" title="Loading report analytics" detail="Reading existing Reports records only." /> : null}</Panel>
    <Panel className="p-4 sm:p-5"><SectionHeading eyebrow="Filters" title="Analytics filters" /><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[["Time Period", "Last 6 Months"], ["Date Range", "Not Available"], ["Module", "All Modules"], ["Report Type", "All Report Types"], ["User", "All Users"]].map(([label, value]) => <label key={label} className="text-xs font-semibold text-slate-600 dark:text-slate-300">{label}<select disabled value={value} onChange={() => undefined} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-500 dark:border-slate-700 dark:bg-slate-900"><option>{value}</option></select></label>)}</div><div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled className="rounded-xl bg-slate-300 px-4 py-2 text-sm font-semibold text-white">Apply Filters</button><button type="button" disabled className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-500">Reset</button><span className="self-center text-xs text-slate-500">Filtering is unavailable because no Analytics filter contract is exposed.</span></div></Panel>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><AnalyticsKpi label="Standard Reports" value="Not Available" detail="Report category is not exposed." /><AnalyticsKpi label="Custom Reports" value="Not Available" detail="Report category is not exposed." /><AnalyticsKpi label="Scheduled Reports" value="Not Available" detail="Scheduling contract is unavailable." /><AnalyticsKpi label="Regulatory Reports" value="Not Available" detail="Report category is not exposed." /><AnalyticsKpi label="Total Downloads" value="Not Available" detail="Download events are not exposed." /></div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.8fr)]"><Panel className="p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><SectionHeading eyebrow="Report Usage Trends" title="Reports generated over time" /><div className="flex rounded-xl border border-slate-200 p-1 text-xs dark:border-slate-700"><button type="button" className="rounded-lg bg-slateblue-600 px-3 py-2 font-semibold text-white">Reports Generated</button><button type="button" disabled className="rounded-lg px-3 py-2 font-semibold text-slate-400">Downloads</button></div></div><p className="mt-2 text-sm text-slate-500">Verified Report records only. Downloads: Not Available.</p>{generatedByMonth.length ? <div className="mt-5 grid grid-cols-6 items-end gap-2 border-b border-l border-slate-200 px-3 pb-2 pt-8 dark:border-slate-700">{generatedByMonth.map((item) => <div key={item.label} className="flex min-w-0 flex-col items-center gap-2"><div className="flex h-40 w-full items-end"><div className="w-full rounded-t bg-slateblue-500" style={{ height: `${Math.max(8, (item.count / Math.max(...generatedByMonth.map((entry) => entry.count), 1)) * 100)}%` }} title={`${item.label}: ${item.count} reports`} /></div><span className="truncate text-[10px] text-slate-500">{item.label}</span><span className="text-[10px] font-semibold text-slate-700">{item.count}</span></div>)}</div> : <AnalyticsUnavailable detail="No verified report records are available for a usage trend." />}</Panel><Panel className="p-4 sm:p-5"><SectionHeading eyebrow="Most Downloaded Reports" title="Download ranking" /><AnalyticsUnavailable detail="Download counts and download-event records are not exposed by the existing Reports API." /></Panel></div>
    <div className="grid gap-5 xl:grid-cols-3"><Panel className="p-4 sm:p-5"><SectionHeading eyebrow="Module-wise Reporting Activity" title="Reports by module" /><AnalyticsUnavailable detail="No authoritative Reports module classification is exposed." /></Panel><Panel className="p-4 sm:p-5"><SectionHeading eyebrow="Report Completion Rate" title="Completion and failure" /><AnalyticsUnavailable detail="Execution status and failed-run records are not exposed." /></Panel><Panel className="p-4 sm:p-5"><SectionHeading eyebrow="Average Report Turnaround Time" title="Request to completion" /><AnalyticsUnavailable detail="Request time, completion time and duration are not exposed." /></Panel></div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"><Panel className="p-4 sm:p-5"><SectionHeading eyebrow="User Activity Heatmap" title="Report generation activity" /><AnalyticsUnavailable detail="User/day aggregation is not exposed. No activity levels are inferred." /></Panel><Panel className="p-4 sm:p-5"><SectionHeading eyebrow="Recent Report Activity" title="Existing report records" /><div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">{recentReports.length ? <table className="min-w-full text-xs"><thead className="pipeguard-surface-muted text-left text-slate-500"><tr>{["Report Name", "Module", "User", "Status", "Created On", "Duration"].map((header) => <th key={header} className="px-3 py-2 font-semibold">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{recentReports.map((report) => <tr key={report.id}><td className="px-3 py-2 text-slate-700">{report.assessmentType} report</td><td className="px-3 py-2 text-slate-500">Not Available</td><td className="px-3 py-2 text-slate-500">{report.createdByName ?? "Not Available"}</td><td className="px-3 py-2 text-slate-500">Not Available</td><td className="px-3 py-2 text-slate-500">{formatDate(report.generatedAt ?? report.createdAt)}</td><td className="px-3 py-2 text-slate-500">Not Available</td></tr>)}</tbody></table> : <AnalyticsUnavailable detail="No verified report records are available." />}</div></Panel></div>
  </div>;
}

function getGeneratedByMonth(reports: ReportRecord[]) {
  const counts = new Map<string, number>();
  for (const report of reports) {
    const date = new Date(report.generatedAt ?? report.createdAt);
    if (Number.isNaN(date.getTime())) continue;
    const label = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-6).map(([label, count]) => ({ label, count }));
}

function AnalyticsKpi({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-2xl font-semibold text-slate-900 dark:text-white">{value}</p><p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p><p className="mt-2 text-xs text-slate-500">{detail}</p></div>;
}

function AnalyticsUnavailable({ detail }: { detail: string }) {
  return <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">Not Available<p className="mt-2 text-xs leading-5">{detail}</p></div>;
}

function ReportTemplateGrid() {
  return (
    <Panel className="p-4 sm:p-5">
      <SectionHeading eyebrow="Report Templates" title="Select a template · configure sections · preview available data" />
      <p className="mt-4 rounded-2xl border pipeguard-surface-muted px-4 py-4 text-sm leading-6 text-slate-500">
        Not Available — no persisted report-template catalog is exposed by the existing read-only APIs.
      </p>
    </Panel>
  );
}

function ReportSections({ selectedSections, onToggleSection }: { selectedSections: Record<string, boolean>; onToggleSection: (section: string) => void }) {
  return (
    <Panel className="p-4 sm:p-5">
      <SectionHeading eyebrow="Report Sections" title="Toggle sections to include in this report" />
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <p className="rounded-2xl border pipeguard-surface-muted px-4 py-4 text-sm leading-6 text-slate-500">
          Not Available — report section definitions are not persisted in the existing read-only APIs.
        </p>
      </div>
    </Panel>
  );
}

function ReportScheduleDelivery() {
  return (
    <Panel className="p-4 sm:p-5">
      <SectionHeading eyebrow="Schedule & Delivery" title="Configuration preview only" />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Field label="Report Period"><select disabled className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none disabled:opacity-70 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100">{periods.map((period) => <option key={period}>{period}</option>)}</select></Field>
        <Field label="Delivery Date"><input disabled className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none disabled:opacity-70 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" type="date" /></Field>
        <Field label="Output Format"><select disabled className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none disabled:opacity-70 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100">{outputFormats.map((format) => <option key={format}>{format}</option>)}</select></Field>
        <Field label="Renderer"><select disabled className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none disabled:opacity-70 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100">{renderers.map((renderer) => <option key={renderer}>{renderer}</option>)}</select></Field>
        <div className="lg:col-span-2"><Field label="Recipient Email(s)"><input disabled className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none disabled:opacity-70 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" placeholder="Scheduling not enabled yet" type="text" /></Field></div>
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">{deliveryOptions.map((option) => <label key={option} className="flex items-center justify-between gap-3 rounded-2xl border pipeguard-surface-muted px-4 py-3 opacity-80"><span className="text-sm font-semibold text-slate-800">{option}</span><input checked={false} className="h-4 w-4 accent-cyan-600" disabled readOnly type="checkbox" /></label>)}</div>
      <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-300">Scheduling, delivery, email, SharePoint, Teams, Slack, and report generation are not enabled yet.</p>
    </Panel>
  );
}

function ReportPreview({ workspaceData, isLoading, error, hasSelectedPipeline }: { workspaceData: ReportWorkspaceData | null; isLoading: boolean; error: string | null; hasSelectedPipeline: boolean }) {
  return (
    <Panel className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-slateblue-600">Report Preview</p><h3 className="mt-2 text-lg font-semibold text-slate-900">Existing report data</h3></div>
        <button className="rounded-full bg-slate-400 px-4 py-2 text-sm font-semibold text-white opacity-70" disabled type="button">Generate PDF</button>
      </div>
      <div className="mt-4 rounded-[24px] border pipeguard-surface-muted p-4"><div className="mx-auto max-w-[440px] rounded-2xl border pipeguard-surface p-5 shadow-panel"><ReportCoverHeader /><RealPreviewBody workspaceData={workspaceData} isLoading={isLoading} error={error} hasSelectedPipeline={hasSelectedPipeline} /></div></div>
    </Panel>
  );
}

function ReportCoverHeader() {
  return <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800"><div><p className="text-lg font-semibold text-slate-900">Klinthru</p><p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slateblue-600">Pipeline Integrity Management System</p></div><span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-300">CONFIDENTIAL</span></div>;
}

function RealPreviewBody({ workspaceData, isLoading, error, hasSelectedPipeline }: { workspaceData: ReportWorkspaceData | null; isLoading: boolean; error: string | null; hasSelectedPipeline: boolean }) {
  if (!hasSelectedPipeline) return <PreviewState title="Select a pipeline to view report data." detail="Real report preview values require a selected pipeline." />;
  if (isLoading) return <PreviewState title="Loading source-backed report data" detail="Demo values are not shown while real data is loading." />;
  if (error) return <PreviewState title="Unable to load report data." detail={error} />;
  if (!workspaceData) return <PreviewState title="Report data unavailable" detail="Select a pipeline or refresh after the backend is available." />;

  const pipeline = workspaceData.pipeline.data;
  return (
    <div className="py-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">REAL DATA</p>
      <h4 className="mt-2 text-2xl font-semibold text-slate-900">Existing report data</h4>
      <p className="mt-2 text-sm text-slate-500">{pipeline.pipelineName} · {compactPipelineDescription(workspaceData)}</p>
      <div className="mt-4 grid gap-2 text-xs text-slate-600"><p>Generated preview date: Not Available</p><p>Source: Pipeline, Assessment, Report, CpCalculation, AI readiness</p><p>Report generation not enabled yet</p></div>
      <PreviewSection title="Executive KPI Summary"><div className="grid grid-cols-2 gap-2"><PreviewKpi label="Health Score" value="Not Available" helper="No authoritative health-score field is exposed." /><PreviewKpi label="Peak Risk Score" value={workspaceData.risk.peakRisk ? String(workspaceData.risk.peakRisk.score) : "Not Available"} helper={workspaceData.risk.peakRisk?.semantics ?? "No assessment data"} /><PreviewKpi label="Active Defects" value="Not Available" helper={formatStatusLabel(workspaceData.defects.reason)} /><PreviewKpi label="Minimum RUL" value="Not Available" helper="No authoritative RUL field is exposed." /></div></PreviewSection>
      <PreviewSection title="Pipeline Metadata"><MetadataGrid items={[["Length", formatNumber(pipeline.pipeLengthKm, "km")], ["OD", formatNumber(pipeline.pipeOutsideDiameter, pipeline.diameterUnit)], ["Grade", pipeline.pipeGradeOther || pipeline.pipeGrade || "Not Available"], ["SMYS", formatNumber(pipeline.smysMpa, "MPa")], ["Wall", formatNumber(pipeline.wallThicknessInputValue ?? pipeline.nominalWallThickness, pipeline.wallThicknessUnit)], ["MAOP", formatNumber(pipeline.maopBar, "bar")]]} /></PreviewSection>
      <PreviewSection title="Risk Summary"><MetadataGrid items={[["Latest Risk", workspaceData.risk.latestAssessment?.riskLevel ?? "Not Available"], ["Latest Score", workspaceData.risk.latestAssessment ? String(workspaceData.risk.latestAssessment.riskScore) : "Not Available"], ["High", String(workspaceData.risk.counts.high)], ["Medium", String(workspaceData.risk.counts.medium)], ["Low", String(workspaceData.risk.counts.low)], ["Unknown", String(workspaceData.risk.counts.unknown)]]} /></PreviewSection>
      <PreviewSection title="ILI Anomaly Register"><UnavailableTable headers={["ID", "KP", "Type", "d/t %", "RSF", "RUL", "Verdict"]} message="ILI anomaly data unavailable" detail={formatStatusLabel(workspaceData.ili.reason)} /></PreviewSection>
      <PreviewSection title="Priority Action Register"><UnavailableTable headers={["Action", "Due", "Owner", "Status"]} message="No canonical action register available" detail={formatStatusLabel(workspaceData.actions.reason)} /></PreviewSection>
      <PreviewSection title="Operational Sources"><div className="grid gap-2"><StatusRow label="CP Monitoring" status={workspaceData.cpMonitoring.status} /><StatusRow label="SCADA" status={workspaceData.scada.status} /><StatusRow label="AI Predictions" status={workspaceData.aiPredictions.status} /></div></PreviewSection>
      <div className="mt-5 border-t border-slate-200 pt-3 text-[10px] leading-5 text-slate-500 dark:border-slate-800"><div className="flex flex-wrap justify-between gap-2"><span>Generated by Klinthru</span><span>Generation disabled</span><span>{formatDate(new Date().toISOString())}</span><span>Preview only</span></div></div>
    </div>
  );
}

function RealReportHistory({ workspaceData }: { workspaceData: ReportWorkspaceData | null }) {
  return <Panel className="p-4 sm:p-5"><SectionHeading eyebrow="Recent Reports" title="Existing saved reports" />{!workspaceData ? <p className="mt-4 text-sm text-slate-500">Select a pipeline to load existing saved reports.</p> : workspaceData.existingReports.recent.length ? <div className="mt-4 space-y-3">{workspaceData.existingReports.recent.map((item) => <article key={item.id} className="rounded-2xl border pipeguard-surface-muted p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-900">{item.assessmentType} report</p><p className="mt-1 text-xs leading-5 text-slate-500">{item.id} · generated {formatDate(item.generatedAt)} · {item.createdByName ?? "Unknown creator"}</p></div><span className="rounded-full border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">{item.riskLevel}</span></div></article>)}</div> : <p className="mt-4 text-sm text-slate-500">No saved reports found for this pipeline.</p>}</Panel>;
}

function CpCalculationHistory({ workspaceData }: { workspaceData: ReportWorkspaceData | null }) {
  return <Panel className="p-4 sm:p-5"><SectionHeading eyebrow="CP Calculation History" title="Calculation history" />{!workspaceData ? <p className="mt-4 text-sm text-slate-500">Select a pipeline to load CP calculation history.</p> : workspaceData.cpCalculations.recent.length ? <div className="mt-4 space-y-3">{workspaceData.cpCalculations.recent.map((item) => <article key={item.id} className="rounded-2xl border pipeguard-surface-muted p-4"><p className="text-sm font-semibold text-slate-900">{item.calculationType}</p><p className="mt-1 text-xs leading-5 text-slate-500">{item.id} · {formatDate(item.createdAt)} · {item.createdByName ?? "Unknown creator"}</p></article>)}</div> : <p className="mt-4 text-sm text-slate-500">No CP calculation records found for this pipeline.</p>}<p className="mt-4 text-xs leading-5 text-slate-500">Calculation history only. This is not CP monitoring survey or reading history.</p></Panel>;
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-slateblue-600">{eyebrow}</p><h3 className="mt-2 text-lg font-semibold text-slate-900">{title}</h3></div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</span>{children}</label>;
}

function PreviewSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="mt-5"><h5 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">{title}</h5><div className="mt-3">{children}</div></section>;
}

function PreviewKpi({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return <div className="rounded-xl border pipeguard-surface-muted p-3"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p><p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>{helper ? <p className="mt-1 text-[10px] leading-4 text-slate-500">{helper}</p> : null}</div>;
}

function MetadataGrid({ items }: { items: Array<[string, string]> }) {
  return <div className="grid grid-cols-2 gap-2">{items.map(([label, value]) => <PreviewKpi key={label} label={label} value={value} />)}</div>;
}

function StatusRow({ label, status }: { label: string; status: ReportWorkspaceStatus | string }) {
  return <div className="flex items-center justify-between gap-3 rounded-xl border pipeguard-surface-muted px-3 py-2"><span className="text-xs font-semibold text-slate-700">{label}</span><span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${statusTone(status)}`}>{formatStatusLabel(status)}</span></div>;
}

function PreviewState({ title, detail }: { title: string; detail: string }) {
  return <div className="py-8 text-center"><p className="text-sm font-semibold text-slate-800">{title}</p><p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-slate-500">{detail}</p></div>;
}

function StateNotice({ title, detail, tone }: { title: string; detail: string; tone: "neutral" | "warning" | "danger" }) {
  const classes = tone === "danger" ? "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-300" : tone === "warning" ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-300" : "border-slate-200 pipeguard-surface-muted text-slate-600";
  return <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${classes}`}><p className="font-semibold">{title}</p><p className="mt-1 text-xs leading-5">{detail}</p></div>;
}

function UnavailableTable({ headers, message, detail }: { headers: string[]; message: string; detail: string }) {
  return <PreviewTable headers={headers} rows={[[message, detail, ...Array(Math.max(headers.length - 2, 0)).fill("Not Available")]]} />;
}

function PreviewTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 text-[10px] dark:divide-slate-800">
        <thead className="pipeguard-surface-muted text-left text-slate-500"><tr>{headers.map((header) => <th key={header} className="px-2 py-2 font-semibold">{header}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100 pipeguard-surface dark:divide-slate-800">{rows.map((row, index) => <tr key={`${row[0]}:${index}`}>{headers.map((_, cellIndex) => <td key={`${cellIndex}:${row[cellIndex] ?? ""}`} className="px-2 py-2 text-slate-600">{row[cellIndex] ?? ""}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
