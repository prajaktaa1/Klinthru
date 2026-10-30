"use client";

import { ArrowDownUp, BarChart3, ChevronLeft, ChevronRight, ExternalLink, FileText, FilterX, List } from "lucide-react";

const missingResults = "BLOCKED — saved AI prediction results and approved model/run/snapshot contracts are unavailable.";
const columns = ["Prediction ID", "Pipeline", "Segment", "KPI Range (km)", "Prediction Type", "Predicted Outcome", "Time Horizon", "Confidence", "Status", "Generated On", "Actions"];
const filters = [
  ["Pipeline", "All Pipelines"],
  ["Risk Type", "All Risk Types"],
  ["Time Horizon", "All Horizons"],
  ["Confidence", "All Confidence Levels"],
  ["Status", "All Statuses"]
];
const predictionTypes = [
  ["Corrosion", "bg-rose-500"], ["Cracking", "bg-purple-500"],
  ["Soil Movement", "bg-orange-500"], ["Pressure", "bg-blue-500"],
  ["Environment", "bg-emerald-500"], ["Third-Party", "bg-amber-500"],
  ["Flow Assurance", "bg-sky-400"], ["Manufacturing", "bg-red-500"]
];
const detailFields = ["Prediction ID", "Pipeline", "Segment", "KPI Range", "Prediction Type", "Predicted Outcome", "Time Horizon", "Generated On", "Status", "Model ID", "Model Version", "Model Run ID", "Feature Set Version", "Input Snapshot ID", "Source Lineage", "Reviewer", "Review Status"];
const disabledButton = "inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-md border border-blue-100 bg-white px-3 py-2 text-xs text-blue-600 opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300";

/** No source observation, readiness count or screenshot row is an AI prediction. */
export function AiPredictionResults({ loading = false, failed = false }: { loading?: boolean; failed?: boolean }) {
  const reason = loading ? "Loading source readiness. Saved AI prediction results are unavailable." : failed ? "Source readiness unavailable. Saved AI results could not be verified." : missingResults;
  return <div data-ai-img03="prediction-results" className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(260px,1fr)]">
    <section className="min-w-0 rounded-lg border border-blue-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 sm:p-4" aria-labelledby="ai-results-title">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3"><List className="shrink-0 text-blue-600" size={28} /><div><h3 id="ai-results-title" className="text-xl font-bold text-blue-950 dark:text-white">Prediction Results</h3><p className="mt-1 text-xs leading-5 text-blue-700 dark:text-blue-300">Detailed AI prediction results for pipeline integrity risks and future conditions.</p></div></div>
        <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-blue-900 dark:text-blue-200">Showing N/A results</span><button aria-label="Previous results page" title={missingResults} disabled type="button" className={disabledButton}><ChevronLeft size={15} /></button><button aria-label="Next results page" title={missingResults} disabled type="button" className={disabledButton}><ChevronRight size={15} /></button></div>
      </header>
      <div className="my-4 grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6" aria-label="Prediction result filters">{filters.map(([label, all]) => <label key={label} className="min-w-0 rounded-md border border-blue-100 p-2 text-xs text-blue-950 dark:border-slate-700 dark:text-blue-200"><span className="mb-1 block">{label}</span><select aria-label={label} disabled title="BLOCKED — authorized prediction catalog and filter contract unavailable." className="w-full min-w-0 rounded border border-blue-100 bg-white p-2 text-xs text-blue-800 dark:border-slate-600 dark:bg-slate-800 dark:text-blue-200"><option>{all}</option></select></label>)}<div className="flex items-end rounded-md border border-blue-100 p-2 dark:border-slate-700"><button type="button" disabled title="BLOCKED — no result dataset or active filter selections." className={`${disabledButton} w-full`}><FilterX size={14} />Clear Filters</button></div></div>
      <p role="status" aria-live="polite" className="mb-3 rounded-md bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-900 dark:bg-slate-800 dark:text-blue-200">{reason} N/A is not a zero-result count.</p>
      <div className="min-w-0 overflow-x-auto rounded-md border border-blue-100 dark:border-slate-700">
        <table className="w-full text-left text-xs"><caption className="sr-only">AI prediction register. No verified saved predictions available.</caption><thead className="bg-blue-50 text-blue-950 dark:bg-slate-800 dark:text-blue-200"><tr><th scope="col" className="px-2 py-3"><input type="checkbox" disabled aria-label="Select all predictions" /></th>{columns.map(column => <th key={column} scope="col" className="whitespace-nowrap px-2 py-3">{column === "Actions" ? column : <button type="button" disabled title="BLOCKED — no approved result sorting provider." className="inline-flex cursor-not-allowed items-center gap-1 font-semibold">{column}<ArrowDownUp aria-hidden="true" size={10} /></button>}</th>)}</tr></thead>
          <tbody><tr><td colSpan={columns.length + 1} className="px-4 py-24 text-center text-slate-500 dark:text-slate-400"><strong className="block text-xl font-semibold">N/A</strong><span className="mt-3 block leading-5">{reason}</span><span className="mt-2 block text-xs">Prediction ≠ Defect_ID · AI Risk Outlook ≠ Risk_ID</span></td></tr></tbody>
        </table>
      </div>
      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-blue-900 dark:text-blue-200"><div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2">Rows per page:<select aria-label="Rows per page" disabled title={missingResults} className="rounded border border-blue-100 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"><option>10</option></select></label><span>N/A results</span></div><div className="flex items-center gap-2" aria-label="Prediction pagination"><button type="button" disabled aria-label="Previous page" title={missingResults} className={disabledButton}><ChevronLeft size={14} /></button><span className="rounded border border-blue-100 px-3 py-2 dark:border-slate-700">N/A</span><button type="button" disabled aria-label="Next page" title={missingResults} className={disabledButton}><ChevronRight size={14} /></button></div></footer>
      <p className="mt-3 text-[10px] leading-5 text-slate-500">Advisory outputs only. Risk Type, status classification and KPI Range labels require the documented taxonomy and location contracts. Source measurements are not prediction records.</p>
    </section>
    <div className="min-w-0 space-y-3">
      <section className="min-w-0 rounded-lg border border-blue-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-900" aria-labelledby="ai-types-title"><h3 id="ai-types-title" className="mb-4 flex items-center gap-2 text-sm font-semibold text-blue-950 dark:text-white"><BarChart3 size={18} className="text-blue-600" />Predictions by Type</h3><ul className="space-y-3">{predictionTypes.map(([label, color]) => <li key={label} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_72px] items-center gap-2 text-xs"><span className="flex items-center gap-2 text-blue-900 dark:text-blue-200"><span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${color}`} />{label}</span><span className="font-semibold text-slate-500">N/A</span><span aria-hidden="true" className="h-2 rounded bg-slate-100 dark:bg-slate-800" /></li>)}</ul><p className="mt-4 text-[10px] leading-5 text-slate-500">BLOCKED — saved result counts, population and approved type taxonomy unavailable. Tracks indicate unavailable data.</p></section>
      <aside className="min-w-0 rounded-lg border border-blue-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-900" aria-labelledby="ai-detail-title"><h3 id="ai-detail-title" className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-950 dark:text-white"><FileText size={18} className="text-blue-600" />Prediction Details</h3><div className="mb-4 flex flex-wrap gap-2 text-xs"><span className="rounded-full border border-slate-200 px-3 py-1 text-slate-500 dark:border-slate-700">AI Risk Outlook: N/A</span><span className="rounded-full border border-slate-200 px-3 py-1 text-slate-500 dark:border-slate-700">N/A Confidence</span></div><dl className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs leading-5">{detailFields.map(field => <div key={field} className="contents"><dt className="break-words text-blue-700 dark:text-blue-300">{field}</dt><dd className="min-w-0 break-words text-slate-500">N/A</dd></div>)}</dl><p className="my-4 text-[10px] leading-5 text-slate-500">BLOCKED — no verified prediction selected. Immutable model/run/snapshot lineage, source versions and advisory review evidence are required. No engineering record is created or changed.</p><button type="button" disabled title="BLOCKED — saved prediction identity, lineage and full-analysis destination unavailable." className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-3 text-xs font-semibold text-white opacity-60">View Full Analysis<ExternalLink size={14} /></button></aside>
    </div>
  </div>;
}
