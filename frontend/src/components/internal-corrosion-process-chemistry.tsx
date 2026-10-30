"use client";

import { useState } from "react";
import { Activity, Droplets, FlaskConical, GitBranch, ShieldCheck, Thermometer } from "lucide-react";
import { IcFields, IcPanel, IcUnavailableAction, IcUnknown } from "@/components/internal-corrosion-ui";

const metrics = [
  { label: "Avg. Temperature (°C)", icon: Thermometer },
  { label: "Avg. Water Cut (%)", icon: Droplets },
  { label: "Avg. CO₂ (% mol)", icon: GitBranch },
  { label: "Avg. H₂S (ppm)", icon: FlaskConical },
  { label: "Avg. pH", icon: FlaskConical },
  { label: "Avg. Chloride (mg/L)", icon: ShieldCheck },
  { label: "Process Stability", icon: Activity }
];
const parameters = ["Temperature (°C)", "Water Cut (%)", "CO₂ (% mol)", "H₂S (ppm)", "pH", "Chloride (mg/L)", "Inhibitor Dosage (ppm)"];
const charts = [
  { title: "Temperature (°C)", axis: "Temperature (°C)", legends: ["Temperature", "Target Range"] },
  { title: "Flow Regime", axis: "Proportion (%)", legends: ["Single Phase", "Bubbly", "Slug", "Annular"] },
  { title: "Water Cut (%)", axis: "Water Cut (%)", legends: ["Water Cut", "Target Range"] },
  { title: "CO₂ (% mol)", axis: "CO₂ (% mol)", legends: ["CO₂", "Threshold"] },
  { title: "H₂S (ppm)", axis: "H₂S (ppm)", legends: ["H₂S", "Threshold"] },
  { title: "pH (Acidity)", axis: "pH", legends: ["pH", "Target Range"] },
  { title: "Chloride (mg/L)", axis: "Chloride (mg/L)", legends: ["Chloride", "Threshold"] },
  { title: "Inhibitor Dosage (ppm)", axis: "Inhibitor Dosage (ppm)", legends: ["Inhibitor Dosage", "Target Range"] }
];
const sampleColumns = ["Sample ID", "Date", "Segment", "Parameter", "Result", "Unit", "Threshold", "Trend"];

export function InternalCorrosionProcessChemistry() {
  const [panelOpen, setPanelOpen] = useState(true);
  const [detailTab, setDetailTab] = useState<"Current Values" | "Details">("Current Values");
  return <div className="space-y-3">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">{metrics.map(({ label, icon: Icon }) => <IcPanel key={label} title={label}><div className="flex items-center gap-2"><Icon aria-hidden="true" className="h-9 w-9 shrink-0 rounded-lg bg-slateblue-50 p-2 text-slateblue-600 dark:bg-slate-800" /><div><p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Not Available</p><p className="mt-1 text-xs text-slate-500">Trend: Unknown</p></div></div></IcPanel>)}</div>
    <IcPanel title="Filters"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-7">{["Pipeline", "Segment", "Loop", "Operating Regime", "Fluid Type", "Date Range"].map(label => <label key={label} className="text-xs text-slate-600 dark:text-slate-400">{label}<select disabled title="Verified process and chemistry options are not available." className="mt-1 block w-full rounded border border-slate-200 bg-slate-50 p-2 text-xs disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800"><option>Not Available</option></select></label>)}<div className="flex items-end gap-2"><IcUnavailableAction>Apply</IcUnavailableAction><IcUnavailableAction>Reset</IcUnavailableAction></div></div><p className="mt-2 text-xs text-slate-500">Filters unavailable until authorized source mappings and verified values exist.</p></IcPanel>
    <div className={`grid min-w-0 gap-3 ${panelOpen ? "2xl:grid-cols-[minmax(0,3fr)_minmax(260px,1fr)]" : ""}`}>
      <div className="min-w-0 space-y-3">
        <IcPanel title="Process & Chemistry Trends" action={<IcUnavailableAction>Expand trends</IcUnavailableAction>}>
          <div className="mb-3 flex flex-wrap items-center justify-end gap-3 text-xs text-slate-500"><span>Time Range: Not Available</span><label>Aggregation <select disabled title="Calendar-month aggregation is not supported by the existing source API." className="rounded border border-slate-200 bg-transparent p-1 dark:border-slate-700"><option>Not Available</option></select></label></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{charts.map(chart => <div key={chart.title} className="min-w-0 rounded-lg border border-slate-200 p-2 dark:border-slate-700"><div className="mb-2 flex items-start justify-between gap-1"><h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">{chart.title}</h4><IcUnavailableAction>More</IcUnavailableAction></div><div className="flex min-h-32 gap-1"><span className="text-[10px] text-slate-500 [writing-mode:vertical-rl]">{chart.axis}</span><div className="flex min-w-0 flex-1 flex-col"><div className="flex flex-1 items-center justify-center border-b border-l border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"><IcUnknown>Not Available</IcUnknown></div><p className="pt-1 text-center text-[10px] text-slate-500">Date: Not Available</p></div></div><p className="mt-2 text-[10px] leading-4 text-slate-500">{chart.legends.join(" / ")}: Not Available</p></div>)}</div>
          <p className="mt-3 text-xs text-slate-500">SCADA, LIMS and Sensors remain authoritative. No series, thresholds or target bands are inferred. The source history API retains its 30-day limit; calendar-month aggregation is unavailable.</p>
        </IcPanel>
        <div className="grid gap-3 xl:grid-cols-3">
          <IcPanel title="Process Chemistry Snapshot"><p className="mb-2 text-xs text-slate-500">Pipeline / Segment / Sample time: Not Available</p><IcFields fields={parameters} /><p className="mt-3 text-xs text-slate-500">Target compliance: Unknown — no verified measurements or approved criteria.</p></IcPanel>
          <IcPanel title="Laboratory Samples" action={<IcUnavailableAction>View All</IcUnavailableAction>}><div className="overflow-x-auto"><table className="w-full min-w-[580px] text-left text-xs"><caption className="sr-only">Laboratory Samples — verified source records unavailable</caption><thead className="bg-slateblue-50 text-slateblue-800 dark:bg-slate-800 dark:text-slate-300"><tr>{sampleColumns.map(column => <th key={column} scope="col" className="p-2 font-medium">{column}</th>)}</tr></thead><tbody><tr><td colSpan={sampleColumns.length} className="p-5 text-center text-slate-500">Not Available — no verified Lab_Result_ID or sample records.</td></tr></tbody></table></div><p className="mt-3 text-xs text-slate-500">Laboratory results remain source-owned; Integration Hub owns transport.</p></IcPanel>
          <IcPanel title="Chemistry Threat Matrix"><div className="overflow-x-auto"><table className="w-full min-w-[340px] text-left text-xs"><caption className="sr-only">Chemistry threat interpretations, not official Risk Assessment</caption><thead className="bg-slateblue-50 text-slateblue-800 dark:bg-slate-800 dark:text-slate-300"><tr>{["Threat Type", "Status", "Concern Level", "Trend"].map(column => <th key={column} scope="col" className="p-2 font-medium">{column}</th>)}</tr></thead><tbody>{["Sweet Corrosion", "Sour Corrosion", "MIC", "Under-Deposit Corrosion", "Scaling"].map(label => <tr key={label} className="border-b border-slate-100 dark:border-slate-800"><th scope="row" className="p-2 font-normal text-slate-600 dark:text-slate-300">{label}</th><td className="p-2 text-slate-500">Unknown</td><td className="p-2 text-slate-500">Unknown</td><td className="p-2 text-slate-500">Not Available</td></tr>)}</tbody></table></div><p className="mt-3 text-xs text-slate-500">Reference categories only; no assessed threat or official Risk_ID is implied.</p></IcPanel>
        </div>
        {!panelOpen && <button type="button" onClick={() => setPanelOpen(true)} className="rounded border border-slate-200 px-3 py-2 text-xs text-slateblue-700 dark:border-slate-700 dark:text-slateblue-300">Show Selected Segment panel</button>}
      </div>
      {panelOpen && <IcPanel title="Selected Segment" className="self-start" action={<button type="button" aria-label="Close Selected Segment panel" onClick={() => setPanelOpen(false)} className="px-2 text-slate-500">×</button>}>
        <p className="mb-3 text-xs text-slate-500">Pipeline / Segment: Not Available · Condition: Unknown</p>
        <div className="mb-3 flex border-b border-slate-200 dark:border-slate-700">{(["Current Values", "Details"] as const).map(tab => <button key={tab} type="button" aria-pressed={detailTab === tab} onClick={() => setDetailTab(tab)} className={`px-3 py-2 text-xs ${detailTab === tab ? "border-b-2 border-slateblue-600 font-semibold text-slateblue-700 dark:text-slateblue-300" : "text-slate-500"}`}>{tab}</button>)}</div>
        {detailTab === "Current Values" ? <IcFields fields={parameters} /> : <IcFields fields={["Pipeline", "Segment / KP (km)", "Source Record IDs", "SCADA Tag / Sensor Channel", "Lab_Result_ID", "Source Timestamp / Timezone", "Quality / Freshness", "Loop Revision", "Method / Rule Version", "Approval Status"]} />}
        <h4 className="mt-4 text-xs font-semibold text-slate-800 dark:text-slate-200">Active Alarms</h4><IcUnknown>Unknown — no verified source or derived alert state.</IcUnknown>
        <h4 className="mb-2 text-xs font-semibold text-slate-800 dark:text-slate-200">Quick Actions</h4><div className="flex flex-wrap gap-2">{["View Trend", "View Findings", "Link Lab Report"].map(label => <IcUnavailableAction key={label}>{label}</IcUnavailableAction>)}</div><p className="mt-2 text-xs text-slate-500">Actions unavailable until verified source links and approved workflows exist.</p>
        <div className="mt-4 flex items-center justify-between gap-2"><h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Related Documents</h4><IcUnavailableAction>View All</IcUnavailableAction></div><IcUnknown>No verified Document_ID references available.</IcUnknown>
        <p className="mt-3 text-xs text-slate-500">Measurements retain their source units, timestamps, quality and lineage. Unit labels show the required display basis only; no conversion or measurement is implied. Raw source alarms remain separate from Internal Corrosion interpretations.</p>
      </IcPanel>}
    </div>
  </div>;
}
