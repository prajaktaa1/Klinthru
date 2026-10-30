"use client";

import { useEffect, useMemo, useState } from "react";

import {
  downloadReportFile,
  fetchReportById,
  isBackendUnavailableError,
  isUnauthorizedError,
  searchReports,
  type ReportRecord
} from "@/lib/apiClient";
import { getRiskBadgeClasses } from "@/lib/riskScoring";
import { AssessmentKind, PipelineRecord } from "@/lib/types";

type ReportSearchState = {
  assessmentType: AssessmentKind | "All";
  reportDate: string;
  query: string;
};

const emptySearch: ReportSearchState = {
  assessmentType: "All",
  reportDate: "",
  query: ""
};

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

function formatDateOnly(value: string | undefined) {
  if (!value?.trim()) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Historical data unavailable";
  }

  if (typeof value === "boolean") {
    return value ? "True" : "False";
  }

  return String(value);
}

function prettyLabel(value: string) {
  const overrides: Record<string, string> = {
    smys: "SMYS",
    maop: "MAOP",
    operatingPressure: "Operating Pressure",
    pipelinePressure: "Pipeline Pressure",
    pipeIdDiameter: "Pipe ID / Diameter",
    wallThickness: "Wall Thickness",
    soilTemperature: "Soil Temperature",
    dissolvedOxygen: "Dissolved Oxygen",
    corrosionRate: "Corrosion Rate",
    corrosionDepth: "Corrosion Depth",
    metalLossPercent: "Metal Loss %",
    remainingLife: "Remaining Life",
    failurePressure: "Failure Pressure",
    failurePressureRatio: "Failure Pressure Ratio",
    safetyMargin: "Safety Margin",
    riskLevel: "Risk Level",
    riskScore: "Risk Score",
    recommendation: "Recommendation"
  };

  if (overrides[value]) {
    return overrides[value];
  }

  return value
    .replace(/Id/g, "ID")
    .replace(/Ph/g, "pH")
    .replace(/Scc/g, "SCC")
    .replace(/Mic/g, "MIC")
    .replace(/Cp/g, "CP")
    .replace(/Ac/g, "AC")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function hasSnapshotData(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && Object.keys(value as Record<string, unknown>).length > 0);
}

function getReportDate(report: ReportRecord) {
  return report.generatedAt || report.createdAt;
}

function getReportResultLabel(report: ReportRecord) {
  const result = report.result as Record<string, unknown> | undefined;
  return formatValue(result?.riskLevel ?? report.riskLevel);
}

function getReportRecommendation(report: ReportRecord | null) {
  const result = report?.result as Record<string, unknown> | undefined;
  return formatValue(result?.recommendation);
}

function getReportPipelineCode(report: ReportRecord | null) {
  const input = report?.input as Record<string, unknown> | undefined;
  return formatValue(input?.pipelineCode);
}

function getSearchHaystack(report: ReportRecord) {
  return [
    report.id,
    report.assessmentId,
    report.assessmentType,
    report.pipelineName,
    report.riskLevel,
    report.createdByName,
    report.createdByEmail,
    ...Object.values((report.result ?? {}) as Record<string, unknown>).map((value) => String(value ?? ""))
  ]
    .join(" ")
    .toLowerCase();
}

function filterReports(reports: ReportRecord[], filters: ReportSearchState) {
  const query = filters.query.trim().toLowerCase();

  return reports.filter((report) => {
    if (filters.assessmentType !== "All" && report.assessmentType !== filters.assessmentType) {
      return false;
    }

    if (filters.reportDate && formatDateOnly(getReportDate(report)) !== filters.reportDate) {
      return false;
    }

    if (query && !getSearchHaystack(report).includes(query)) {
      return false;
    }

    return true;
  });
}

function buildSnapshotRows(snapshot: Record<string, unknown> | undefined) {
  if (!hasSnapshotData(snapshot)) {
    return [];
  }

  return Object.entries(snapshot)
    .filter(([key]) =>
      ![
        "pipeIdDiameterUnit",
        "pipeIdDiameterDisplayValue",
        "operatingPressureUnit",
        "operatingPressureDisplayValue",
        "pipelinePressureUnit",
        "pipelinePressureDisplayValue",
        "wallThicknessUnit",
        "wallThicknessDisplayValue",
        "soilTemperatureInputValue",
        "soilTemperatureUnit",
        "temperatureInputValue",
        "temperatureUnit"
      ].includes(key)
    )
    .map(([key, value]) => ({ key, label: prettyLabel(key), value: formatValue(value) }));
}

export function CalculationReportHistoryModal({
  isOpen,
  onClose,
  pipeline
}: {
  isOpen: boolean;
  onClose: () => void;
  pipeline: PipelineRecord;
}) {
  const [pendingSearch, setPendingSearch] = useState<ReportSearchState>(emptySearch);
  const [appliedSearch, setAppliedSearch] = useState<ReportSearchState>(emptySearch);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadKey, setDownloadKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setPendingSearch(emptySearch);
    setAppliedSearch(emptySearch);
    setSelectedReport(null);
    void loadReports();
  }, [isOpen, pipeline.id]);

  const filteredReports = useMemo(() => filterReports(reports, appliedSearch), [appliedSearch, reports]);
  const inputRows = buildSnapshotRows(selectedReport?.input as Record<string, unknown> | undefined);
  const resultRows = buildSnapshotRows(selectedReport?.result as Record<string, unknown> | undefined);

  async function loadReports() {
    setIsLoading(true);
    setError(null);

    try {
      const history = await searchReports({ pipelineId: pipeline.id });
      const scopedReports = history.filter((report) => report.pipelineId === pipeline.id);
      setReports(scopedReports);
      setSelectedReport(scopedReports[0] ?? null);
    } catch (loadError) {
      if (isUnauthorizedError(loadError)) {
        setError("Your session has expired. Please sign in again.");
        return;
      }

      if (isBackendUnavailableError(loadError)) {
        setError(loadError.message);
        return;
      }

      setError("Calculation report history could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleViewReport(reportId: string) {
    setIsLoadingDetail(true);
    setError(null);

    try {
      const report = await fetchReportById(reportId);
      if (report.pipelineId !== pipeline.id) {
        setError("This report is not connected to the selected pipeline.");
        return;
      }

      setSelectedReport(report);
    } catch (detailError) {
      if (isUnauthorizedError(detailError)) {
        setError("Your session has expired. Please sign in again.");
        return;
      }

      setError("This report could not be opened.");
    } finally {
      setIsLoadingDetail(false);
    }
  }

  async function handleDownload(reportId: string, format: "pdf" | "word") {
    const key = `${reportId}:${format}`;
    setDownloadKey(key);
    setError(null);

    try {
      const file = await downloadReportFile(reportId, format);
      const url = window.URL.createObjectURL(file.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      if (isUnauthorizedError(downloadError)) {
        setError("Your session has expired. Please sign in again.");
        return;
      }

      setError(`The ${format.toUpperCase()} download could not be prepared.`);
    } finally {
      setDownloadKey(null);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/55 px-4 py-6 sm:px-6">
      <div className="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-slate-50 shadow-[0_30px_90px_rgba(15,23,42,0.35)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slateblue-600">
              Pipeline History
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">Calculation Report History</h3>
            <p className="mt-2 text-sm text-slate-500">
              Review and download saved External and Internal Corrosion calculation reports for this pipeline.
            </p>
          </div>
          <button
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[1.12fr_0.88fr]">
          <div className="min-h-0 overflow-y-auto border-b border-slate-200 bg-slate-50 p-6 lg:border-b-0 lg:border-r">
            <form
              className="grid gap-3 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.3fr_auto_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                setAppliedSearch(pendingSearch);
              }}
            >
              <label className="block">
                <span className="mb-2 block text-xs font-medium text-slate-700">Assessment Type</span>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  value={pendingSearch.assessmentType}
                  onChange={(event) =>
                    setPendingSearch((current) => ({
                      ...current,
                      assessmentType: event.target.value as AssessmentKind | "All"
                    }))
                  }
                >
                  <option value="All">All</option>
                  <option value="External">External</option>
                  <option value="Internal">Internal</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-medium text-slate-700">Report Date</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  type="date"
                  value={pendingSearch.reportDate}
                  onChange={(event) => setPendingSearch((current) => ({ ...current, reportDate: event.target.value }))}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-medium text-slate-700">Report / Result Search</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  type="text"
                  value={pendingSearch.query}
                  onChange={(event) => setPendingSearch((current) => ({ ...current, query: event.target.value }))}
                />
              </label>

              <div className="flex items-end">
                <button
                  className="w-full rounded-full bg-slateblue-600 px-5 py-3 text-sm font-semibold text-white"
                  disabled={isLoading}
                  type="submit"
                >
                  {isLoading ? "Searching..." : "Search"}
                </button>
              </div>

              <div className="flex items-end">
                <button
                  className="w-full rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
                  onClick={() => {
                    setPendingSearch(emptySearch);
                    setAppliedSearch(emptySearch);
                    void loadReports();
                  }}
                  type="button"
                >
                  Reset
                </button>
              </div>
            </form>

            {error ? (
              <div className="mt-4 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-800">
                {error}
              </div>
            ) : null}

            <div className="mt-5 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Assessment Type</th>
                      <th className="px-4 py-3 font-medium">Pipeline Name</th>
                      <th className="px-4 py-3 font-medium">Pipeline Code</th>
                      <th className="px-4 py-3 font-medium">Report Date</th>
                      <th className="px-4 py-3 font-medium">Calculation Result or Risk Level</th>
                      <th className="px-4 py-3 font-medium">Saved By</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredReports.length > 0 ? (
                      filteredReports.map((report) => (
                        <tr key={report.id} className="align-top">
                          <td className="px-4 py-4 text-slate-600">{report.assessmentType}</td>
                          <td className="px-4 py-4 font-medium text-slate-900">{report.pipelineName}</td>
                          <td className="px-4 py-4 text-slate-600">{getReportPipelineCode(report)}</td>
                          <td className="px-4 py-4 text-slate-600">{formatDateTime(getReportDate(report))}</td>
                          <td className="px-4 py-4">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getRiskBadgeClasses(report.riskLevel)}`}>
                              {getReportResultLabel(report)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-slate-600">{report.createdByName ?? "Unknown User"}</td>
                          <td className="px-4 py-4">
                            <details className="relative min-w-[150px]">
                              <summary className="cursor-pointer list-none rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                                Actions
                              </summary>
                              <div className="absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
                                <ReportActionButton label="View Report" onClick={() => void handleViewReport(report.id)} />
                                <ReportActionButton
                                  disabled={downloadKey === `${report.id}:pdf`}
                                  label={downloadKey === `${report.id}:pdf` ? "Downloading..." : "Download PDF"}
                                  onClick={() => void handleDownload(report.id, "pdf")}
                                />
                                <ReportActionButton
                                  disabled={downloadKey === `${report.id}:word`}
                                  label={downloadKey === `${report.id}:word` ? "Downloading..." : "Download Word"}
                                  onClick={() => void handleDownload(report.id, "word")}
                                />
                              </div>
                            </details>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>
                          {isLoading ? "Loading calculation reports..." : "No calculation reports are available for this pipeline."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto bg-white p-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slateblue-600">
                Report Preview
              </p>
              <h4 className="mt-2 text-xl font-semibold text-slate-900">
                {selectedReport ? selectedReport.pipelineName : "Select a saved report"}
              </h4>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {selectedReport
                  ? "This preview displays the saved report snapshot. It does not rerun calculations or read current master values for results."
                  : "Use View Report to preview a saved report here."}
              </p>

              {isLoadingDetail ? (
                <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-500">
                  Loading selected report...
                </div>
              ) : selectedReport ? (
                <div className="mt-5 space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <PreviewCard label="Pipeline Identity" value={`${selectedReport.pipelineName} - ${getReportPipelineCode(selectedReport)}`} />
                    <PreviewCard label="Assessment Type" value={selectedReport.assessmentType} />
                    <PreviewCard label="Report Date" value={formatDateTime(getReportDate(selectedReport))} />
                    <PreviewCard label="Creator" value={selectedReport.createdByName ?? "Unknown User"} />
                    <PreviewCard label="Risk Classification" value={selectedReport.riskLevel} />
                    <PreviewCard label="Recommendations" value={getReportRecommendation(selectedReport)} />
                  </div>

                  <SnapshotSection title="Saved Assessment Inputs" rows={inputRows} />
                  <SnapshotSection title="Saved Calculation Results" rows={resultRows} />
                </div>
              ) : (
                <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-500">
                  No report selected yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportActionButton({
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
      className="block w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function PreviewCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-3 break-words text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SnapshotSection({
  title,
  rows
}: {
  title: string;
  rows: Array<{ key: string; label: string; value: string }>;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold text-slate-900">{title}</p>
      {rows.length > 0 ? (
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.key}>
              <dt className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{row.label}</dt>
              <dd className="mt-1 break-words text-sm font-medium text-slate-900">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
          Historical data unavailable
        </div>
      )}
    </div>
  );
}
