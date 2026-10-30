"use client";

import { useState } from "react";
import { Activity, FlaskConical, GitBranch, ShieldCheck, TriangleAlert, Workflow } from "lucide-react";
import { IcFields, IcPanel, IcUnavailableAction, IcUnknown } from "@/components/internal-corrosion-ui";

const columns = ["Loop ID", "Pipeline", "Segment", "Corrosion Mechanism", "Current Rate (mm/y)", "Inhibitor Status", "Data Confidence", "Status", "Last Updated", "Action"];
const metrics = [
  { label: "Monitored Segments", icon: Workflow },
  { label: "Active Corrosion Loops", icon: GitBranch },
  { label: "Avg Corrosion Rate (mm/y)", icon: Activity },
  { label: "High Internal Corrosion Threat", icon: TriangleAlert },
  { label: "Inhibitor Performance", icon: FlaskConical },
  { label: "Data Confidence", icon: ShieldCheck }
];

export function InternalCorrosionOverview() {
  const [detailsOpen, setDetailsOpen] = useState(true);
  return <div className="space-y-3">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">{metrics.map(({ label, icon: Icon }) => <IcPanel key={label} title={label}><div className="flex items-center gap-3"><Icon aria-hidden="true" className="h-10 w-10 shrink-0 rounded-lg bg-slateblue-50 p-2 text-slateblue-600 dark:bg-slate-800" /><div><p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Not Available</p><p className="mt-1 text-xs text-slate-500">Trend: Unknown</p></div></div></IcPanel>)}</div>
    <IcPanel title="Filters"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-8">{["Pipeline", "Segment", "Corrosion Loop", "Fluid Type", "Threat Severity", "Date Range"].map(label => <label key={label} className="text-xs text-slate-600 dark:text-slate-400">{label}<select disabled title="Verified filter options are not available." className="mt-1 block w-full rounded border border-slate-200 bg-slate-50 p-2 text-xs disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800"><option>Not Available</option></select></label>)}<div className="flex items-end gap-2"><IcUnavailableAction>Apply</IcUnavailableAction><IcUnavailableAction>Reset</IcUnavailableAction></div></div><p className="mt-2 text-xs text-slate-500">Filters unavailable: no verified engineering dataset or option lists.</p></IcPanel>
    <div className={`grid min-w-0 gap-3 ${detailsOpen ? "2xl:grid-cols-[minmax(0,3fr)_minmax(260px,1fr)]" : ""}`}>
      <div className="min-w-0 space-y-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_minmax(0,2fr)]">
          <IcPanel title="Internal Corrosion Health Summary"><div className="flex flex-wrap items-center justify-center gap-5 py-4"><div aria-label="Health distribution unavailable" className="flex h-32 w-32 items-center justify-center rounded-full border-[16px] border-slate-100 text-center text-xs text-slate-500 dark:border-slate-800">Not Available<br />Segments</div><ul className="space-y-3 text-xs text-slate-500">{[["Normal", "bg-emerald-500"], ["Watch", "bg-amber-400"], ["High Concern", "bg-rose-500"]].map(([label, color]) => <li key={label} className="flex items-center gap-2"><span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}: Not Available</li>)}</ul></div></IcPanel>
          <IcPanel title="Corrosion Rate Trend"><div className="flex min-h-48 items-stretch gap-2"><span className="text-xs text-slate-500 [writing-mode:vertical-rl]">Corrosion Rate (mm/y)</span><div className="flex min-w-0 flex-1 flex-col"><div className="flex flex-1 items-center justify-center border-b border-l border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"><IcUnknown>No verified historical series available.</IcUnknown></div><p className="pt-2 text-center text-xs text-slate-500">Date / Assessment period: Not Available</p></div></div><p className="mt-2 text-xs text-slate-500">Series and legend: Not Available. No monthly aggregation or values inferred.</p></IcPanel>
        </div>
        <IcPanel title="Active Corrosion Loops" action={<IcUnavailableAction>Advanced Filters</IcUnavailableAction>}>
          <label className="mb-3 block text-xs text-slate-500">Search corrosion loops<input disabled placeholder="Search corrosion loops..." className="mt-1 block w-full rounded border border-slate-200 bg-slate-50 p-2 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800" /></label>
          <div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left text-xs"><caption className="sr-only">Active Corrosion Loops — verified records not available</caption><thead className="bg-slateblue-50 text-slateblue-800 dark:bg-slate-800 dark:text-slate-300"><tr><th scope="col" className="p-2"><input type="checkbox" disabled aria-label="Select all loops unavailable" /></th>{columns.map(column => <th key={column} scope="col" className="p-2 font-medium">{column}</th>)}</tr></thead><tbody><tr><td colSpan={columns.length + 1} className="p-5 text-center text-slate-500">Not Available — no verified loop records. Record count: Unknown.</td></tr></tbody></table></div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><label>Show <select disabled className="rounded border border-slate-200 bg-transparent p-1 dark:border-slate-700"><option>Not Available</option></select> entries</label><span>Pagination: Not Available</span><div className="flex gap-1"><IcUnavailableAction>Previous</IcUnavailableAction><IcUnavailableAction>Next</IcUnavailableAction></div></div>
        </IcPanel>
        <div className="grid gap-3 lg:grid-cols-3">
          <IcPanel title="Process & Chemistry Snapshot"><p className="mb-2 text-xs text-slate-500">Pipeline / Segment: Not Available</p><IcFields fields={["Temperature (°C)", "Flow Regime", "Water Cut (%)", "CO₂ (mol%)", "H₂S (ppm)", "pH", "Chloride (mg/L)", "Inhibitor Injection (L/d)"]} /></IcPanel>
          <IcPanel title="Coupons / Probes / UT Monitoring" action={<IcUnavailableAction>View Monitoring</IcUnavailableAction>}><IcFields fields={["Latest Coupon Loss (mm)", "Exposure Duration (days)", "ER/LPR Probe Rate (mm/y)", "Averaging Period", "UT Wall Loss (max, %)", "Condition", "Last data update"]} /></IcPanel>
          <IcPanel title="Top Findings / Actions" action={<IcUnavailableAction>View All</IcUnavailableAction>}><IcUnknown>No verified findings or linked central actions available.</IcUnknown><IcUnavailableAction>View Details</IcUnavailableAction><p className="mt-3 text-xs text-slate-500">Finding and Defect identities remain separate.</p></IcPanel>
        </div>
        {!detailsOpen && <button type="button" onClick={() => setDetailsOpen(true)} className="rounded border border-slate-200 px-3 py-2 text-xs text-slateblue-700 dark:border-slate-700 dark:text-slateblue-300">Show Selected Corrosion Loop panel</button>}
      </div>
      {detailsOpen && <IcPanel title="Selected Corrosion Loop" action={<button type="button" aria-label="Close Selected Corrosion Loop panel" onClick={() => setDetailsOpen(false)} className="px-2 text-slate-500">×</button>} className="self-start">
        <p className="mb-3 text-xs text-slate-500">Loop: Not Available · Condition: Unknown</p><div className="mb-3 grid grid-cols-2 gap-2">{["View Details", "View Trend", "View in Asset Master", "Raise Action"].map(label => <IcUnavailableAction key={label}>{label}</IcUnavailableAction>)}</div>
        <IcFields fields={["Pipeline", "Segment / KP (km)", "Fluid Type", "Likely Mechanism", "Current Rate (mm/y)", "Last Assessment", "Inhibitor Status", "Data Confidence", "Temperature (°C)", "Water Cut (%)", "CO₂ (mol%)", "H₂S (ppm)", "pH", "Chloride (mg/L)"]} />
        <div className="mt-4 flex items-center justify-between gap-2"><h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Linked Documents</h4><IcUnavailableAction>View All</IcUnavailableAction></div><IcUnknown>No verified Document_ID references available.</IcUnknown>
        <h4 className="mt-3 text-xs font-semibold text-slate-800 dark:text-slate-200">Source lineage</h4><IcFields fields={["Source Record IDs", "Source Timestamp / Timezone", "Quality / Freshness", "Loop Revision", "Method / Version", "Approval Status"]} /><p className="mt-3 text-xs text-slate-500">Record actions unavailable until an authorized verified loop and approved workflow exist. Raise Action must use the Central Integrity Action Register.</p>
      </IcPanel>}
    </div>
  </div>;
}
