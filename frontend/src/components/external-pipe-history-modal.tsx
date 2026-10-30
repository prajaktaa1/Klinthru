"use client";

import { useEffect, useRef, useState } from "react";

import {
  downloadAssessmentPipeDataFile,
  fetchAssessmentPipeDataHistory,
  fetchAssessmentPipeDataRecord,
  isBackendUnavailableError,
  isUnauthorizedError
} from "@/lib/apiClient";
import {
  AssessmentKind,
  AssessmentPipeDataRecord,
  AssessmentPipeDataSummary,
  ExternalCorrosionInput,
  InternalCorrosionInput,
  StoredAssessment
} from "@/lib/types";
import { restoreAssessmentDisplayInput } from "@/lib/externalCorrosionCalculations";

type SearchState = {
  assessmentType: AssessmentKind | "All";
  pipelineName: string;
  pipeId: string;
  locationId: string;
  savedDate: string;
};

function buildInitialSearch(defaultAssessmentType: AssessmentKind): SearchState {
  return {
    assessmentType: defaultAssessmentType,
    pipelineName: "",
    pipeId: "",
    locationId: "",
    savedDate: ""
  };
}

function formatTemperatureUnit(value: unknown) {
  return value === "F" ? "°F" : value === "K" ? "K" : "°C";
}
function formatTemperaturePreview(assessment: StoredAssessment) {
  if (assessment.type === "External") {
    const input = restoreAssessmentDisplayInput(assessment.input as ExternalCorrosionInput);
    const value = input.soilTemperatureInputValue ?? input.soilTemperature;
    return Number.isFinite(value) ? `${value} ${formatTemperatureUnit(input.soilTemperatureUnit)}` : "Not Available";
  }

  const input = assessment.input as InternalCorrosionInput;
  return `${input.temperatureInputValue ?? input.temperature} ${formatTemperatureUnit(input.temperatureUnit)}`;
}

export function ExternalPipeHistoryModal({
  isOpen,
  defaultAssessmentType,
  onClose,
  onEdit,
  pipelineId
}: {
  isOpen: boolean;
  defaultAssessmentType: AssessmentKind;
  onClose: () => void;
  onEdit: (record: AssessmentPipeDataRecord) => void;
  pipelineId?: string;
}) {
  const [search, setSearch] = useState<SearchState>(buildInitialSearch(defaultAssessmentType));
  const [records, setRecords] = useState<AssessmentPipeDataSummary[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<AssessmentPipeDataRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadKey, setDownloadKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const searchRequest = useRef(0);
  const detailRequest = useRef(0);
  const pageCount = Math.max(1, Math.ceil(records.length / pageSize));
  const currentPage = Math.min(page, pageCount);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const nextSearch = buildInitialSearch(defaultAssessmentType);
    setSearch(nextSearch);
    void runSearch(nextSearch);
    return () => { searchRequest.current++; detailRequest.current++; };
  }, [defaultAssessmentType, isOpen, pipelineId]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedRecord(null);
      setError(null);
      setIsLoadingDetail(false);
    }
  }, [isOpen]);

  async function runSearch(nextSearch = search) {
    const request = ++searchRequest.current;
    detailRequest.current++;
    setIsLoading(true);
    setError(null);
    setRecords([]);
    setSelectedRecord(null);
    setIsLoadingDetail(false);
    setPage(1);

    try {
      const history = await fetchAssessmentPipeDataHistory({ ...nextSearch, pipelineId });
      if (request !== searchRequest.current) return;
      setRecords(history);
    } catch (searchError) {
      if (request !== searchRequest.current) return;
      if (isUnauthorizedError(searchError)) {
        setError("Your session has expired. Please sign in again.");
        return;
      }

      if (isBackendUnavailableError(searchError)) {
        setError("Pipe data history is unavailable because the backend could not be reached.");
        return;
      }

      setError("Pipe data history could not be loaded.");
    } finally {
      if (request === searchRequest.current) setIsLoading(false);
    }
  }

  async function handleOpenData(id: string) {
    const request = ++detailRequest.current;
    setSelectedRecord(null);
    setIsLoadingDetail(true);
    setError(null);

    try {
      const record = await fetchAssessmentPipeDataRecord(id);
      if (request !== detailRequest.current) return;
      setSelectedRecord(record);
    } catch (detailError) {
      if (request !== detailRequest.current) return;
      if (isUnauthorizedError(detailError)) {
        setError("Your session has expired. Please sign in again.");
        return;
      }

      setError("This record could not be opened.");
    } finally {
      if (request === detailRequest.current) setIsLoadingDetail(false);
    }
  }

  async function handleEdit(id: string) {
    const request = ++detailRequest.current;
    setIsLoadingDetail(true);
    setError(null);

    try {
      const record = await fetchAssessmentPipeDataRecord(id);
      if (request !== detailRequest.current) return;
      if (record.assessment.type !== defaultAssessmentType) {
        setError(`Only ${defaultAssessmentType.toLowerCase()} records can be loaded into this form.`);
        return;
      }

      onEdit(record);
      onClose();
    } catch (detailError) {
      if (request !== detailRequest.current) return;
      if (isUnauthorizedError(detailError)) {
        setError("Your session has expired. Please sign in again.");
        return;
      }

      setError("This record could not be loaded for editing.");
    } finally {
      if (request === detailRequest.current) setIsLoadingDetail(false);
    }
  }

  async function handleDownload(id: string, format: "pdf" | "word") {
    const key = `${id}:${format}`;
    setDownloadKey(key);
    setError(null);

    try {
      const file = await downloadAssessmentPipeDataFile(id, format);
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
              Assessment Pipe Data
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">Pipe Data History</h3>
            <p className="mt-2 text-sm text-slate-500">
              Search, review, edit, and download saved internal and external assessment records.
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

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="min-h-0 overflow-y-auto border-b border-slate-200 bg-slate-50 p-6 lg:border-b-0 lg:border-r">
            <form
              className="grid gap-3 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-5"
              onSubmit={(event) => {
                event.preventDefault();
                void runSearch();
              }}
            >
              <label className="block">
                <span className="mb-2 block text-xs font-medium text-slate-700">Assessment Type</span>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  value={search.assessmentType}
                  onChange={(event) =>
                    setSearch((current) => ({
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
                <span className="mb-2 block text-xs font-medium text-slate-700">Pipeline Name</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  type="text"
                  value={search.pipelineName}
                  onChange={(event) =>
                    setSearch((current) => ({ ...current, pipelineName: event.target.value }))
                  }
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-medium text-slate-700">Pipe ID</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  type="text"
                  value={search.pipeId}
                  onChange={(event) =>
                    setSearch((current) => ({ ...current, pipeId: event.target.value }))
                  }
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-medium text-slate-700">Location ID</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  type="text"
                  value={search.locationId}
                  onChange={(event) =>
                    setSearch((current) => ({ ...current, locationId: event.target.value }))
                  }
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-medium text-slate-700">Saved Date</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  type="date"
                  value={search.savedDate}
                  onChange={(event) =>
                    setSearch((current) => ({ ...current, savedDate: event.target.value }))
                  }
                />
              </label>

              <div className="md:col-span-2 xl:col-span-5 flex flex-wrap gap-3 pt-1">
                <button
                  className="rounded-full bg-slateblue-600 px-5 py-3 text-sm font-semibold text-white"
                  disabled={isLoading}
                  type="submit"
                >
                  {isLoading ? "Searching..." : "Search History"}
                </button>
                <button
                  className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
                  onClick={() => {
                    const nextSearch = buildInitialSearch(defaultAssessmentType);
                    setSearch(nextSearch);
                    void runSearch(nextSearch);
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
                      <th className="px-4 py-3 font-medium">Pipe ID</th>
                      <th className="px-4 py-3 font-medium">Location ID</th>
                      <th className="px-4 py-3 font-medium">Saved Date & Time</th>
                      <th className="px-4 py-3 font-medium">Saved By</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {records.length > 0 ? (
                      records.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((record) => (
                        <tr key={record.id} className="align-top">
                          <td className="px-4 py-4 text-slate-600">{record.assessmentType}</td>
                          <td className="px-4 py-4 font-medium text-slate-900">{record.pipelineName}</td>
                          <td className="px-4 py-4 text-slate-600">{record.pipeId || "Not available"}</td>
                          <td className="px-4 py-4 text-slate-600">{record.locationId || "Not available"}</td>
                          <td className="px-4 py-4 text-slate-600">
                            {new Date(record.savedAt).toLocaleString("en-US")}
                          </td>
                          <td className="px-4 py-4 text-slate-600">{record.savedByName}</td>
                          <td className="px-4 py-4">
                            <div className="flex min-w-[220px] flex-wrap gap-2">
                              <button
                                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                                onClick={() => void handleOpenData(record.id)}
                                type="button"
                              >
                                Open Data
                              </button>
                              <button
                                className="rounded-full border border-slateblue-200 bg-slateblue-50 px-3 py-2 text-xs font-semibold text-slateblue-700"
                                onClick={() => void handleEdit(record.id)}
                                type="button"
                              >
                                Edit
                              </button>
                              <button
                                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                                disabled={downloadKey === `${record.id}:pdf`}
                                onClick={() => void handleDownload(record.id, "pdf")}
                                type="button"
                              >
                                Download PDF
                              </button>
                              <button
                                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                                disabled={downloadKey === `${record.id}:word`}
                                onClick={() => void handleDownload(record.id, "word")}
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
                        <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>
                          {isLoading ? "Loading saved pipe data..." : error ? "Not Available" : "No saved pipe data matched your search."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 text-xs">
                <span>{isLoading || error ? "Not Available" : `${records.length} matching records`}</span>
                <div className="flex items-center gap-3"><button type="button" disabled={currentPage <= 1 || isLoading} onClick={() => setPage(currentPage - 1)}>Previous</button><span>{currentPage} / {pageCount}</span><button type="button" disabled={currentPage >= pageCount || isLoading} onClick={() => setPage(currentPage + 1)}>Next</button></div>
                <label>Records per page<select aria-label="Pipe data records per page" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }} className="ml-2 rounded border bg-white px-2 py-1">{[10, 25, 50].map(size => <option key={size}>{size}</option>)}</select></label>
              </div>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto bg-white p-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slateblue-600">
                Record Preview
              </p>
              <h4 className="mt-2 text-xl font-semibold text-slate-900">
                {selectedRecord ? selectedRecord.pipelineName : "Select a saved record"}
              </h4>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {selectedRecord
                  ? "Review the saved metadata and key assessment fields before reopening or editing the record."
                  : "Use Open Data to preview a saved record here without changing the current form."}
              </p>

              {isLoadingDetail ? (
                <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-500">
                  Loading selected record...
                </div>
              ) : selectedRecord ? (
                <div className="mt-5 space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <PreviewCard label="Record ID" value={selectedRecord.id} />
                    <PreviewCard label="Assessment Type" value={selectedRecord.assessmentType} />
                    <PreviewCard
                      label="Saved At"
                      value={new Date(selectedRecord.savedAt).toLocaleString("en-US")}
                    />
                    <PreviewCard label="Saved By" value={selectedRecord.savedByName} />
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-900">Key Inputs</p>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <PreviewRow label="Pipeline Name" value={selectedRecord.assessment.pipelineName} />
                      <PreviewRow label="Pipe ID" value={selectedRecord.pipeId || "Not available"} />
                      <PreviewRow label="Location ID" value={selectedRecord.locationId || "Not available"} />
                      <PreviewRow label="Pipe Material" value={selectedRecord.assessment.input.pipeMaterial} />
                      <PreviewRow
                        label={selectedRecord.assessment.type === "Internal" ? "Internal Coating" : "Pipe Grade"}
                        value={
                          selectedRecord.assessment.type === "Internal"
                            ? String((selectedRecord.assessment.input as InternalCorrosionInput).internalCoating)
                            : selectedRecord.assessment.input.pipeGrade
                        }
                      />
                      <PreviewRow label="Temperature" value={formatTemperaturePreview(selectedRecord.assessment)} />
                      <PreviewRow
                        label={selectedRecord.assessmentType === "External" ? "Official Risk" : "Risk Score"}
                        value={selectedRecord.assessmentType === "External" ? "Not Available" : String(selectedRecord.assessment.riskScore)}
                      />
                    </dl>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-500">
                  No record selected yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
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

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}
