"use client";

import { useState } from "react";
import { Activity, Clock, FlaskConical, GitBranch, TriangleAlert } from "lucide-react";
import { IcFields, IcPanel, IcUnavailableAction, IcUnknown } from "@/components/internal-corrosion-ui";

const metrics = [
  { label: "Total Corrosion Loops", icon: GitBranch },
  { label: "High-Concern Loops", icon: TriangleAlert },
  { label: "Active Monitoring Points", icon: Activity },
  { label: "Inhibited Loops", icon: FlaskConical },
  { label: "Loops Overdue for Review", icon: Clock }
];
const columns = ["Loop ID", "Pipeline", "Segment", "Corrosion Mechanism", "Fluid Service", "Current Rate (mm/y)", "Inhibitor Status", "Data Confidence", "Workflow Status", "Corrosion Threat", "Last Updated", "Actions"];
const conditions = [{ label: "Normal", color: "bg-emerald-500" }, { label: "Watch", color: "bg-amber-400" }, { label: "High Concern", color: "bg-rose-500" }];

function Distribution({ labels, centre }: { labels: readonly string[]; centre: string }) {
  return <div className="flex flex-wrap items-center justify-center gap-4 py-3"><div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-[14px] border-slate-100 text-center text-xs text-slate-500 dark:border-slate-800" aria-label={`${centre} distribution unavailable`}>Not Available<br />{centre}</div><ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400">{labels.map(label => <li key={label}>{label}: Not Available</li>)}</ul></div>;
}

export function InternalCorrosionLoops() {
  const [panelOpen, setPanelOpen] = useState(true);
  return <div className="space-y-3">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{metrics.map(({ label, icon: Icon }) => <IcPanel key={label} title={label}><div className="flex items-center gap-3"><Icon aria-hidden="true" className="h-10 w-10 shrink-0 rounded-lg bg-slateblue-50 p-2 text-slateblue-600 dark:bg-slate-800" /><div><p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Not Available</p><p className="mt-1 text-xs text-slate-500">Trend: Unknown</p></div></div></IcPanel>)}</div>
    <IcPanel title="Filters"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-7">{["Pipeline", "Segment", "Corrosion Loop", "Fluid Type", "Status", "Date Range"].map(label => <label key={label} className="text-xs text-slate-600 dark:text-slate-400">{label}<select disabled title="Verified loop filter options are not available." className="mt-1 block w-full rounded border border-slate-200 bg-slate-50 p-2 text-xs disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800"><option>Not Available</option></select></label>)}<div className="flex items-end gap-2"><IcUnavailableAction>Apply</IcUnavailableAction><IcUnavailableAction>Reset</IcUnavailableAction></div></div><p className="mt-2 text-xs text-slate-500">Filters unavailable until verified loop records exist. Status means workflow status; corrosion threat is separate.</p></IcPanel>
    <div className={`grid min-w-0 gap-3 ${panelOpen ? "2xl:grid-cols-[minmax(0,3fr)_minmax(260px,1fr)]" : ""}`}>
      <div className="min-w-0 space-y-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,4fr)_minmax(240px,3fr)]">
          <IcPanel title="Corrosion Loop Network" action={<IcUnavailableAction>Expand network</IcUnavailableAction>}><p className="text-xs text-slate-500">Pipeline: Not Available</p><div className="my-3 flex min-h-36 items-center justify-center rounded border border-dashed border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"><IcUnknown>No verified loop scope or network topology available.</IcUnknown></div><ul aria-label="Corrosion threat legend" className="flex flex-wrap justify-center gap-4 text-xs text-slate-500">{conditions.map(({ label, color }) => <li key={label} className="flex items-center gap-1.5"><span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}: Not Available</li>)}</ul></IcPanel>
          <IcPanel title="Corrosion Loop Threat Distribution" action={<IcUnavailableAction>Expand distribution</IcUnavailableAction>}><Distribution centre="Loops" labels={conditions.map(condition => condition.label)} /></IcPanel>
        </div>
        <IcPanel title="Corrosion Loop Register" action={<IcUnavailableAction>Advanced Filters</IcUnavailableAction>}>
          <label className="mb-3 block text-xs text-slate-500">Search corrosion loops<input disabled placeholder="Search corrosion loops..." title="Verified loop records are not available." className="mt-1 block w-full rounded border border-slate-200 bg-slate-50 p-2 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800" /></label>
          <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-xs"><caption className="sr-only">Corrosion Loop Register — verified records not available</caption><thead className="bg-slateblue-50 text-slateblue-800 dark:bg-slate-800 dark:text-slate-300"><tr><th scope="col" className="p-2"><input type="checkbox" disabled aria-label="Select all loops unavailable" /></th>{columns.map(column => <th key={column} scope="col" className="p-2 font-medium">{column}</th>)}</tr></thead><tbody><tr><td colSpan={columns.length + 1} className="p-5 text-center text-slate-500">Not Available — no verified loop records. Record count: Unknown.</td></tr></tbody></table></div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><label>Show <select disabled className="rounded border border-slate-200 bg-transparent p-1 dark:border-slate-700"><option>Not Available</option></select> entries</label><span>Pagination: Not Available</span><div className="flex gap-1"><IcUnavailableAction>Previous</IcUnavailableAction><IcUnavailableAction>Next</IcUnavailableAction></div></div>
        </IcPanel>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,5fr)_minmax(0,3fr)_minmax(0,3fr)]">
          <IcPanel title="Average Corrosion Rate Trend" action={<IcUnavailableAction>Expand trend</IcUnavailableAction>}><div className="flex min-h-36 gap-2"><span className="text-xs text-slate-500 [writing-mode:vertical-rl]">Corrosion Rate (mm/y)</span><div className="flex min-w-0 flex-1 flex-col"><div className="flex flex-1 items-center justify-center border-b border-l border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"><IcUnknown>No verified historical series available.</IcUnknown></div><p className="pt-2 text-center text-xs text-slate-500">Date / Assessment period: Not Available</p></div></div><p className="mt-2 text-xs text-slate-500">Normal / Watch / High Concern series: Not Available. No historical values or monthly aggregation inferred.</p></IcPanel>
          <IcPanel title="Inhibitor Coverage"><Distribution centre="Coverage" labels={["Inhibited", "Not Inhibited"]} /></IcPanel>
          <IcPanel title="Loop Review Compliance"><Distribution centre="Review" labels={["On Schedule", "Overdue"]} /></IcPanel>
        </div>
        {!panelOpen && <button type="button" onClick={() => setPanelOpen(true)} className="rounded border border-slate-200 px-3 py-2 text-xs text-slateblue-700 dark:border-slate-700 dark:text-slateblue-300">Show Selected Corrosion Loop panel</button>}
      </div>
      {panelOpen && <IcPanel title="Selected Corrosion Loop" className="self-start" action={<button type="button" aria-label="Close Selected Corrosion Loop panel" onClick={() => setPanelOpen(false)} className="px-2 text-slate-500">×</button>}>
        <p className="mb-3 text-xs text-slate-500">Loop: Not Available · Corrosion Threat: Unknown</p><div className="mb-3 grid grid-cols-2 gap-2">{["View Trend", "View Findings", "View in Asset Master", "Raise Action"].map(label => <IcUnavailableAction key={label}>{label}</IcUnavailableAction>)}</div>
        <IcFields fields={["Pipeline", "Segment", "Start / End KP (km)", "Fluid Type", "Corrosion Mechanism", "Workflow Status", "Corrosion Threat", "Current Rate (mm/y)", "Inhibitor Status", "Data Confidence", "Last Updated", "Next Review Due"]} />
        <h4 className="mt-4 text-xs font-semibold text-slate-800 dark:text-slate-200">Latest Chemistry Snapshot</h4><p className="mt-1 text-xs text-slate-500">Pipeline / Segment / Timestamp: Not Available</p><IcFields fields={["Water Cut (%)", "pH", "Temperature (°C)", "CO₂ (mol%)", "H₂S (ppm)", "Chloride (mg/L)"]} />
        <div className="mt-4 flex items-center justify-between gap-2"><h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Linked Documents</h4><IcUnavailableAction>View All</IcUnavailableAction></div><IcUnknown>No verified Document_ID references available.</IcUnknown>
        <h4 className="mt-3 text-xs font-semibold text-slate-800 dark:text-slate-200">Source lineage & revision</h4><IcFields fields={["Source Record IDs", "Source Timestamp / Timezone", "Quality / Freshness", "Loop Revision", "Effective From / To", "Method / Version", "Approval Status"]} /><p className="mt-3 text-xs text-slate-500">Effective-dated loop revisions require future approved backend support. No saved revision is implied. Actions unavailable; Raise Action requires the Central Integrity Action Register.</p>
      </IcPanel>}
    </div>
  </div>;
}
