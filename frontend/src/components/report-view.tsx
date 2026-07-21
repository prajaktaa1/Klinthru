"use client";

import { useEffect, useState } from "react";

import {
  downloadReportFile,
  fetchReportById,
  searchReports,
  type ReportRecord,
  isBackendUnavailableError,
  isUnauthorizedError
} from "@/lib/apiClient";
import { Panel } from "@/components/ui";
import { getRiskBadgeClasses } from "@/lib/riskScoring";
import { clearDemoFallbackData, loadActiveReport, setActiveReport } from "@/lib/storage";
import { DiameterUnit, StoredAssessment } from "@/lib/types";

const PRELIMINARY_NOTICE =
  "Preliminary assessment: These results use prototype calculation logic and are not engineering-certified. Do not use them as the sole basis for operational, safety or maintenance decisions.";

type CuratedMetric = {
  key: string;
  label: string;
  format?: (value: unknown) => string;
};

type ActiveReport = StoredAssessment & {
  reportId?: string;
  createdByName?: string;
};

function prettyLabel(value: string) {
  return value
    .replace(/Id/g, "ID")
    .replace(/Ph/g, "pH")
    .replace(/Scc/g, "SCC")
    .replace(/Mic/g, "MIC")
    .replace(/Ac/g, "AC")
    .replace(/Cp/g, "CP")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function normalizeAssessmentType(value: unknown) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "external") {
    return "External";
  }

  if (normalized === "internal") {
    return "Internal";
  }

  return "External";
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) {
    return "Not available";
  }

  if (typeof value === "boolean") {
    return value ? "True" : "False";
  }

  return String(value);
}

function formatNumberWithUnit(unit: string) {
  return (value: unknown) => `${formatValue(value)} ${unit}`;
}

function hasCpInputType(input: StoredAssessment["input"]): input is StoredAssessment["input"] & {
  cpInputType: string;
} {
  return "cpInputType" in input;
}

function hasAcInputType(input: StoredAssessment["input"]): input is StoredAssessment["input"] & {
  acInputType: string;
} {
  return "acInputType" in input;
}

const inputUnitFormatters: Record<string, (value: unknown, input: StoredAssessment["input"]) => string> = {
  pipeAge: (value) => `${formatValue(value)} years`,
  pipeLength: (value) => `${formatValue(value)} km`,
  wallThickness: (value) => `${formatValue(value)} mm`,
  soilMoisture: (value) => `${formatValue(value)} %`,
  soilResistivity: (value) => `${formatValue(value)} ohm-m`,
  soilTemperature: (value) => `${formatValue(value)} deg C`,
  chloride: (value) => `${formatValue(value)} mg/kg`,
  sulphate: (value) => `${formatValue(value)} mg/kg`,
  sulphideH2S: (value) => `${formatValue(value)} mg/kg`,
  soilCarbonateContent: (value) => `${formatValue(value)} mg/kg`,
  redoxPotential: (value) => `${formatValue(value)} mV`,
  cpInputValue: (value, input) =>
    `${formatValue(value)} ${
      hasCpInputType(input) && input.cpInputType === "CP Polarized Potential" ? "V vs CSE" : "mV"
    }`,
  dcCurrentDensity: (value) => `${formatValue(value)} A/m^2`,
  acInputValue: (value, input) =>
    `${formatValue(value)} ${
      hasAcInputType(input) &&
      (input.acInputType === "AC Voltage to Remote Earth" ||
        input.acInputType === "Pipe AC Voltage to Remote Earth")
        ? "V"
        : "A/m^2"
    }`,
  strayCurrentDensity: (value) => `${formatValue(value)} A/m^2`,
  designLife: (value) => `${formatValue(value)} years`,
  temperature: (value) => `${formatValue(value)} deg C`,
  dissolvedOxygen: (value) => `${formatValue(value)} mg/L`,
  waterVelocity: (value) => `${formatValue(value)} m/s`,
  pipelinePressure: (value) => `${formatValue(value)} bar`
};

function isDiameterUnit(value: unknown): value is DiameterUnit {
  return value === "mm" || value === "cm" || value === "m" || value === "inch" || value === "ft";
}

function getFormattedInputEntries(input: StoredAssessment["input"]) {
  const entries = Object.entries(input).filter(
    ([key]) => key !== "pipeIdDiameterUnit" && key !== "pipeIdDiameterDisplayValue"
  );

  return entries.map(([key, value]) => {
    if (key !== "pipeIdDiameter") {
      const formatter = inputUnitFormatters[key];

      return {
        key,
        label: prettyLabel(key),
        value: formatter ? formatter(value, input) : String(value)
      };
    }

    const displayValue =
      typeof input.pipeIdDiameterDisplayValue === "number" ? input.pipeIdDiameterDisplayValue : value;
    const unit = isDiameterUnit(input.pipeIdDiameterUnit) ? input.pipeIdDiameterUnit : "mm";

    return {
      key,
      label: prettyLabel(key),
      value: `${displayValue} ${unit}`
    };
  });
}

const externalMetrics: CuratedMetric[] = [
  { key: "soilCorrosivityLevel", label: "Predicted Soil Corrosivity" },
  { key: "corrosionDepth", label: "Maximum Corrosion Depth", format: formatNumberWithUnit("mm") },
  { key: "corrosionRate", label: "Corrosion Rate", format: formatNumberWithUnit("mm/y") },
  {
    key: "remainingLife",
    label: "Remaining Life / Time to Perforation",
    format: formatNumberWithUnit("years")
  },
  { key: "highPhSccProbability", label: "High-pH SCC Probability" },
  { key: "nearNeutralPhSccProbability", label: "Near-Neutral-pH SCC Probability" },
  { key: "micWarning", label: "MIC Possibility" },
  { key: "cathodicDelaminationWarning", label: "Cathodic Coating Delamination" },
  { key: "acCorrosionWarning", label: "AC Corrosion Likelihood" },
  {
    key: "strayCurrentCorrosionRate",
    label: "Stray Current Corrosion Rate",
    format: formatNumberWithUnit("mm/y")
  },
  { key: "majorModeOfFailure", label: "Mode of Failure" }
];

const internalMetrics: CuratedMetric[] = [
  { key: "corrosionRate", label: "Internal Corrosion Rate", format: formatNumberWithUnit("mm/y") },
  { key: "corrosionDepth", label: "Corrosion Depth", format: formatNumberWithUnit("mm") },
  { key: "remainingLife", label: "Remaining Life", format: formatNumberWithUnit("years") },
  { key: "micWarning", label: "MIC Possibility" },
  { key: "majorModeOfFailure", label: "Mode of Failure" }
];

function getCuratedMetrics(assessmentType: unknown) {
  return normalizeAssessmentType(assessmentType) === "Internal" ? internalMetrics : externalMetrics;
}

function getCuratedResultRows(
  assessmentType: unknown,
  result: Record<string, unknown>
) {
  return getCuratedMetrics(assessmentType).map((metric) => {
    const value = result[metric.key];
    return {
      key: metric.key,
      label: metric.label,
      value: metric.format ? metric.format(value) : formatValue(value)
    };
  });
}

export function ReportView() {
  const [report, setReport] = useState<ActiveReport | null>(null);
  const [history, setHistory] = useState<ReportRecord[]>([]);
  const [searchPipelineName, setSearchPipelineName] = useState("");
  const [searchReportId, setSearchReportId] = useState("");
  const [historyNotice, setHistoryNotice] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [activeDownloadKey, setActiveDownloadKey] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadReportData() {
      clearDemoFallbackData();

      try {
        const reports = await searchReports();
        const latestReport = reports[0] ? toActiveReport(reports[0]) : null;

        if (latestReport) {
          if (!isMounted) {
            return;
          }

          setReport(latestReport);
          setHistory(reports);
          setActiveReport(latestReport);
          return;
        }

        if (!isMounted) {
          return;
        }

        setHistory([]);
        setReport(null);
      } catch (error) {
        if (isUnauthorizedError(error)) {
          return;
        }

        if (!isMounted) {
          return;
        }

        if (isBackendUnavailableError(error)) {
          setHistoryNotice(error.message);
        }

        const activeReport = loadActiveReport();
        setReport(activeReport ? { ...activeReport } : null);
      }
    }

    void loadReportData();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!report) {
    return (
      <div className="space-y-6">
        <Panel>
          <h3 className="text-xl font-semibold text-slate-900">No reports created yet.</h3>
        </Panel>
        <ReportHistorySection
          history={history}
          historyNotice={historyNotice}
          isLoadingHistory={isLoadingHistory}
          searchPipelineName={searchPipelineName}
          searchReportId={searchReportId}
          setSearchPipelineName={setSearchPipelineName}
          setSearchReportId={setSearchReportId}
          onSearch={() => void handleSearch()}
          onReset={() => void handleResetSearch()}
          onOpenReport={(id) => void handleOpenReport(id)}
          onDownloadReport={(id, format) => void handleDownloadReport(id, format)}
          activeDownloadKey={activeDownloadKey}
        />
      </div>
    );
  }

  const inputEntries = getFormattedInputEntries(report.input);
  const assessmentType = normalizeAssessmentType(report.type);
  const curatedResultEntries = getCuratedResultRows(
    assessmentType,
    report.result as Record<string, unknown>
  );

  async function handleSearch() {
    setIsLoadingHistory(true);
    setHistoryNotice(null);

    try {
      const reports = await searchReports({
        pipelineName: searchPipelineName,
        reportId: searchReportId
      });
      setHistory(reports);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        setHistoryNotice("Your session has expired. Please sign in again.");
        return;
      }

      if (isBackendUnavailableError(error)) {
        setHistoryNotice(error.message);
        return;
      }

      setHistoryNotice("Report history could not be loaded.");
    } finally {
      setIsLoadingHistory(false);
    }
  }

  async function handleResetSearch() {
    setSearchPipelineName("");
    setSearchReportId("");
    setIsLoadingHistory(true);
    setHistoryNotice(null);

    try {
      const reports = await searchReports();
      setHistory(reports);
    } catch (error) {
      if (isBackendUnavailableError(error)) {
        setHistoryNotice(error.message);
        return;
      }

      setHistoryNotice("Report history could not be loaded.");
    } finally {
      setIsLoadingHistory(false);
    }
  }

  async function handleOpenReport(id: string) {
    setHistoryNotice(null);

    try {
      const selectedReport = await fetchReportById(id);
      const nextReport = toActiveReport(selectedReport);
      setReport(nextReport);
      setActiveReport(nextReport);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        setHistoryNotice("Your session has expired. Please sign in again.");
        return;
      }

      setHistoryNotice("This report could not be opened.");
    }
  }

  async function handleDownloadReport(id: string, format: "pdf" | "word") {
    const key = `${id}:${format}`;
    setActiveDownloadKey(key);
    setHistoryNotice(null);

    try {
      const file = await downloadReportFile(id, format);
      const url = window.URL.createObjectURL(file.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        setHistoryNotice("Your session has expired. Please sign in again.");
        return;
      }

      setHistoryNotice(`The ${format.toUpperCase()} download could not be prepared.`);
    } finally {
      setActiveDownloadKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-slateblue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slateblue-700">
              Klinthru Report Header
            </div>
            <h3 className="mt-4 text-3xl font-semibold text-slate-900">{report.pipelineName}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Phase 1 corrosion assessment report with grouped inputs, placeholder outputs, and print-ready summary details.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-4 py-2 text-sm font-semibold ${getRiskBadgeClasses(report.riskLevel)}`}
            >
              {report.riskLevel} Risk
            </span>
            <button
              className="rounded-full bg-slateblue-600 px-5 py-3 text-sm font-semibold text-white"
              onClick={() =>
                report.reportId ? void handleDownloadReport(report.reportId, "pdf") : window.print()
              }
              type="button"
            >
              Download PDF
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Assessment Type
            </p>
            <p className="mt-3 text-lg font-semibold text-slate-900">{assessmentType} Corrosion</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Generated
            </p>
            <p className="mt-3 text-lg font-semibold text-slate-900">
              {new Date(report.createdAt).toLocaleString("en-US")}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Risk Score
            </p>
            <p className="mt-3 text-lg font-semibold text-slate-900">{report.riskScore}</p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slateblue-600">
            Input Summary Table
          </p>
          <h4 className="mt-2 text-xl font-semibold text-slate-900">Captured Input Summary</h4>
          <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Field</th>
                  <th className="px-4 py-3 font-medium">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {inputEntries.map((entry) => (
                  <tr key={entry.key}>
                    <td className="px-4 py-3 text-slate-600">{entry.label}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{entry.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slateblue-600">
            Result Summary Table
          </p>
          <h4 className="mt-2 text-xl font-semibold text-slate-900">Calculated Result Summary</h4>
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            {PRELIMINARY_NOTICE}
          </div>
          <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Metric</th>
                  <th className="px-4 py-3 font-medium">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {curatedResultEntries.map((entry) => (
                  <tr key={entry.key}>
                    <td className="px-4 py-3 text-slate-600">{entry.label}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{entry.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <ReportHistorySection
        history={history}
        historyNotice={historyNotice}
        isLoadingHistory={isLoadingHistory}
        searchPipelineName={searchPipelineName}
        searchReportId={searchReportId}
        setSearchPipelineName={setSearchPipelineName}
        setSearchReportId={setSearchReportId}
        onSearch={() => void handleSearch()}
        onReset={() => void handleResetSearch()}
        onOpenReport={(id) => void handleOpenReport(id)}
        onDownloadReport={(id, format) => void handleDownloadReport(id, format)}
        activeDownloadKey={activeDownloadKey}
      />
    </div>
  );
}

function toActiveReport(report: ReportRecord): ActiveReport {
  return {
    id: report.assessmentId,
    reportId: report.id,
    type: report.assessmentType,
    pipelineName: report.pipelineName,
    createdAt: report.generatedAt,
    riskLevel: report.riskLevel,
    riskScore: Number(report.result.riskScore ?? 0),
    input: report.input as StoredAssessment["input"],
    result: report.result as StoredAssessment["result"],
    createdByName: report.createdByName
  };
}

function ReportHistorySection({
  history,
  historyNotice,
  isLoadingHistory,
  searchPipelineName,
  searchReportId,
  setSearchPipelineName,
  setSearchReportId,
  onSearch,
  onReset,
  onOpenReport,
  onDownloadReport,
  activeDownloadKey
}: {
  history: ReportRecord[];
  historyNotice: string | null;
  isLoadingHistory: boolean;
  searchPipelineName: string;
  searchReportId: string;
  setSearchPipelineName: (value: string) => void;
  setSearchReportId: (value: string) => void;
  onSearch: () => void;
  onReset: () => void;
  onOpenReport: (id: string) => void;
  onDownloadReport: (id: string, format: "pdf" | "word") => void;
  activeDownloadKey: string | null;
}) {
  return (
    <Panel>
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slateblue-600">
        Report History
      </p>
      <h4 className="mt-2 text-xl font-semibold text-slate-900">Saved Reports</h4>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Search and reopen generated reports. Newest reports are shown first.
      </p>

      <form
        className="mt-6 grid gap-3 rounded-[28px] border border-slate-200 bg-slate-50 p-5 md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch();
        }}
      >
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Pipeline Name</span>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
            type="text"
            value={searchPipelineName}
            onChange={(event) => setSearchPipelineName(event.target.value)}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Report ID</span>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
            type="text"
            value={searchReportId}
            onChange={(event) => setSearchReportId(event.target.value)}
          />
        </label>

        <div className="flex items-end">
          <button
            className="w-full rounded-full bg-slateblue-600 px-5 py-3 text-sm font-semibold text-white"
            disabled={isLoadingHistory}
            type="submit"
          >
            {isLoadingHistory ? "Searching..." : "Search"}
          </button>
        </div>

        <div className="flex items-end">
          <button
            className="w-full rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
            onClick={onReset}
            type="button"
          >
            Reset
          </button>
        </div>
      </form>

      {historyNotice ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {historyNotice}
        </div>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Report ID</th>
                <th className="px-4 py-3 font-medium">Pipeline Name</th>
                <th className="px-4 py-3 font-medium">Assessment Type</th>
                <th className="px-4 py-3 font-medium">Risk Level</th>
                <th className="px-4 py-3 font-medium">Created Date</th>
                <th className="px-4 py-3 font-medium">Created Time</th>
                <th className="px-4 py-3 font-medium">Created By</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {history.length > 0 ? (
                history.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-4 py-4 font-medium text-slate-900">{item.id}</td>
                    <td className="px-4 py-4 text-slate-600">{item.pipelineName}</td>
                    <td className="px-4 py-4 text-slate-600">{item.assessmentType}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getRiskBadgeClasses(item.riskLevel)}`}
                      >
                        {item.riskLevel}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {new Date(item.createdAt).toLocaleDateString("en-US")}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {new Date(item.createdAt).toLocaleTimeString("en-US")}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {item.createdByName ?? "Unknown User"}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex min-w-[220px] flex-wrap gap-2">
                        <button
                          className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                          onClick={() => onOpenReport(item.id)}
                          type="button"
                        >
                          Open
                        </button>
                        <button
                          className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                          disabled={activeDownloadKey === `${item.id}:pdf`}
                          onClick={() => onDownloadReport(item.id, "pdf")}
                          type="button"
                        >
                          Download PDF
                        </button>
                        <button
                          className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                          disabled={activeDownloadKey === `${item.id}:word`}
                          onClick={() => onDownloadReport(item.id, "word")}
                          type="button"
                        >
                          Download Word
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={8}>
                    {isLoadingHistory ? "Loading report history..." : "No reports matched your search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  );
}
