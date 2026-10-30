"use client";

import { useState } from "react";
import { Activity, CalendarDays, Radio, Tag, TriangleAlert } from "lucide-react";
import { IcFields, IcPanel, IcUnavailableAction, IcUnknown } from "@/components/internal-corrosion-ui";

const metrics = [
  { label: "Total Coupons", icon: Tag },
  { label: "Total Probes", icon: Radio },
  { label: "Due for Retrieval", icon: CalendarDays },
  { label: "Overdue Analysis", icon: TriangleAlert },
  { label: "Active ER/LPR Probes", icon: Radio },
  { label: "Probe Data Health", icon: Activity }
];
const distribution = [
  { label: "In Service", color: "bg-emerald-500" },
  { label: "Due for Retrieval", color: "bg-amber-400" },
  { label: "Overdue", color: "bg-rose-500" },
  { label: "Out of Service", color: "bg-slate-400" },
  { label: "Under Analysis", color: "bg-slateblue-500" }
];
const charts = [
  { title: "Coupon Corrosion Rate Results", y: "Corrosion Rate (mm/y)", x: "Pipeline", legends: ["Average", "Maximum", "Minimum"] },
  { title: "Probe Trends (ER/LPR)", y: "Corrosion Rate (mm/y)", x: "Date", legends: ["ER Probes", "LPR Probes"] },
  { title: "Retrieval Schedule (Next 6 Months)", y: "Number of Devices", x: "Scheduled month", legends: ["Coupons", "Probes"] }
];
const columns = ["Device ID", "Type", "Pipeline", "Segment", "Location (KP)", "Install Date", "Retrieve Date", "Analysis Status", "Corr. Rate (mm/y)", "Data Confidence", "Condition", "Action"];
const detailTabs = ["Details", "Latest Readings", "Documents"] as const;

export function InternalCorrosionCouponsProbes() {
  const [panelOpen, setPanelOpen] = useState(true);
  const [detailTab, setDetailTab] = useState<typeof detailTabs[number]>("Details");
  return <div className="space-y-3">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">{metrics.map(({ label, icon: Icon }) => <IcPanel key={label} title={label}><div className="flex items-center gap-2"><Icon aria-hidden="true" className="h-10 w-10 shrink-0 rounded-lg bg-slateblue-50 p-2 text-slateblue-600 dark:bg-slate-800" /><div><p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Not Available</p><p className="mt-1 text-xs text-slate-500">Trend / target: Unknown</p></div></div></IcPanel>)}</div>
    <IcPanel title="Filters"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-7">{["Pipeline", "Segment", "Loop", "Device Type", "Status", "Date Range"].map(label => <label key={label} className="text-xs text-slate-600 dark:text-slate-400">{label}<select disabled title="Verified device and monitoring filter options are not available." className="mt-1 block w-full rounded border border-slate-200 bg-slate-50 p-2 text-xs disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800"><option>Not Available</option></select></label>)}<div className="flex items-end gap-2"><IcUnavailableAction>Apply</IcUnavailableAction><IcUnavailableAction>Reset</IcUnavailableAction></div></div><p className="mt-2 text-xs text-slate-500">Filters unavailable until verified device, exposure and analysis records are linked.</p></IcPanel>
    <div className={`grid min-w-0 gap-3 ${panelOpen ? "2xl:grid-cols-[minmax(0,3fr)_minmax(260px,1fr)]" : ""}`}>
      <div className="min-w-0 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <IcPanel title="Device Status Distribution" action={<IcUnavailableAction>More</IcUnavailableAction>}><div className="flex flex-col items-center gap-3 py-3"><div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-[14px] border-slate-100 text-center text-xs text-slate-500 dark:border-slate-800" aria-label="Device status distribution unavailable">Not Available<br />Devices</div><ul className="space-y-2 text-xs text-slate-500">{distribution.map(({ label, color }) => <li key={label} className="flex items-center gap-1.5"><span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />{label}: Not Available</li>)}</ul></div></IcPanel>
          {charts.map(chart => <IcPanel key={chart.title} title={chart.title} action={<IcUnavailableAction>More</IcUnavailableAction>}><div className="flex min-h-44 gap-1"><span className="text-[10px] text-slate-500 [writing-mode:vertical-rl]">{chart.y}</span><div className="flex min-w-0 flex-1 flex-col"><div className="flex flex-1 items-center justify-center border-b border-l border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"><IcUnknown>Not Available</IcUnknown></div><p className="pt-2 text-center text-[10px] text-slate-500">{chart.x}: Not Available</p></div></div><p className="mt-3 text-xs text-slate-500">{chart.legends.join(" / ")}: Not Available</p></IcPanel>)}
        </div>
        <p className="text-xs text-slate-500">Charts and schedules require verified records. No dates, counts, percentages or rate series are inferred. Source history limits remain unchanged.</p>
        <IcPanel title="Coupons & Probes Register" action={<div className="flex gap-2"><IcUnavailableAction>Advanced Filters</IcUnavailableAction><IcUnavailableAction>Settings</IcUnavailableAction></div>}>
          <label className="mb-3 block text-xs text-slate-500">Search coupons, probes, IDs<input disabled placeholder="Search coupons, probes, IDs..." title="Verified monitoring records are not available." className="mt-1 block w-full rounded border border-slate-200 bg-slate-50 p-2 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800" /></label>
          <div className="overflow-x-auto"><table className="w-full min-w-[1150px] text-left text-xs"><caption className="sr-only">Coupons & Probes Register — verified records unavailable</caption><thead className="bg-slateblue-50 text-slateblue-800 dark:bg-slate-800 dark:text-slate-300"><tr><th scope="col" className="p-2"><input type="checkbox" disabled aria-label="Select all devices unavailable" /></th>{columns.map(column => <th key={column} scope="col" className="p-2 font-medium">{column}</th>)}</tr></thead><tbody><tr><td colSpan={columns.length + 1} className="p-5 text-center text-slate-500">Not Available — no verified device/result associations. Record count: Unknown.</td></tr></tbody></table></div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><label>Show <select disabled className="rounded border border-slate-200 bg-transparent p-1 dark:border-slate-700"><option>Not Available</option></select> entries</label><span>Pagination: Not Available</span><div className="flex gap-1"><IcUnavailableAction>First</IcUnavailableAction><IcUnavailableAction>Previous</IcUnavailableAction><IcUnavailableAction>Next</IcUnavailableAction><IcUnavailableAction>Last</IcUnavailableAction></div></div>
        </IcPanel>
        {!panelOpen && <button type="button" onClick={() => setPanelOpen(true)} className="rounded border border-slate-200 px-3 py-2 text-xs text-slateblue-700 dark:border-slate-700 dark:text-slateblue-300">Show Selected Device panel</button>}
      </div>
      {panelOpen && <IcPanel title="Selected Device" className="self-start" action={<button type="button" aria-label="Close Selected Device panel" onClick={() => setPanelOpen(false)} className="px-2 text-slate-500">×</button>}>
        <p className="mb-3 text-xs text-slate-500">Device / Location: Not Available</p><p className="mb-3 text-xs text-slate-500">Device Health: Unknown · Corrosion Condition: Unknown</p><div className="mb-3 grid grid-cols-2 gap-2">{["View Trend", "View Asset", "Schedule Retrieval", "Raise Action"].map(label => <IcUnavailableAction key={label}>{label}</IcUnavailableAction>)}</div>
        <p className="mb-3 text-xs text-slate-500">Actions unavailable until an authorized device association and approved workflows exist.</p>
        <div className="mb-3 flex overflow-x-auto border-b border-slate-200 dark:border-slate-700">{detailTabs.map(tab => <button key={tab} type="button" aria-pressed={detailTab === tab} onClick={() => setDetailTab(tab)} className={`whitespace-nowrap px-2 py-2 text-xs ${detailTab === tab ? "border-b-2 border-slateblue-600 font-semibold text-slateblue-700 dark:text-slateblue-300" : "text-slate-500"}`}>{tab}</button>)}</div>
        {detailTab === "Details" && <><h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Device identity & health</h4><IcFields fields={["Device ID", "Device Type", "Pipeline", "Segment", "Location (KP)", "Install Date", "Planned Retrieval", "Status", "Manufacturer", "Model", "Serial Number", "Last Communication", "Battery Level (%)"]} /><h4 className="mt-3 text-xs font-semibold text-slate-800 dark:text-slate-200">Engineering interpretation</h4><IcFields fields={["Data Confidence", "Current Corr. Rate (mm/y)", "Corrosion Condition", "Remarks"]} /></>}
        {detailTab === "Latest Readings" && <><IcUnknown>No verified source readings are available.</IcUnknown><p className="text-xs text-slate-500">The reference does not reveal this tab’s detailed layout. No measurement rows or inferred fields are presented.</p></>}
        {detailTab === "Documents" && <><div className="flex items-center justify-between gap-2"><h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Documents</h4><IcUnavailableAction>View All</IcUnavailableAction></div><IcUnknown>No verified Document_ID references available.</IcUnknown><p className="text-xs text-slate-500">Files remain in Document Management. Reference document counts and filenames are not treated as records.</p></>}
        <h4 className="mt-4 text-xs font-semibold text-slate-800 dark:text-slate-200">Source lineage</h4><IcFields fields={["Asset / Sensor / Channel IDs", "Source Reading / Analysis IDs", "Source Timestamp / Timezone", "Quality / Freshness", "Calibration Status", "Loop Revision", "Method / Version", "Approval Status"]} /><p className="mt-3 text-xs text-slate-500">Sensors / Asset Master own physical devices and device health. Internal Corrosion owns engineering interpretation. A healthy device can report a concerning corrosion rate. Raise Action requires one central Action_ID.</p>
      </IcPanel>}
    </div>
  </div>;
}
