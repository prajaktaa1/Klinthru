"use client";

import { useState } from "react";
import { Clock, FileText, FolderOpen, Search, TriangleAlert } from "lucide-react";
import { IcFields, IcPanel, IcUnavailableAction, IcUnknown } from "@/components/internal-corrosion-ui";

const metrics = [
  { label: "Total Findings", icon: FileText },
  { label: "Open Findings", icon: FolderOpen },
  { label: "High-Priority Findings", icon: TriangleAlert },
  { label: "Under Review", icon: Search },
  { label: "Actions Overdue", icon: Clock }
];
const columns = ["Finding ID", "Pipeline", "Segment", "Source", "Mechanism", "Description", "Severity", "Confidence", "Status", "Owner", "Due Date", "Overdue", "Actions"];
const severities = [{ label: "Critical", color: "bg-rose-500" }, { label: "High", color: "bg-orange-500" }, { label: "Medium", color: "bg-amber-400" }, { label: "Low", color: "bg-emerald-500" }];

export function InternalCorrosionFindings() {
  const [panelOpen, setPanelOpen] = useState(true);
  return <div className="space-y-3">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{metrics.map(({ label, icon: Icon }) => <IcPanel key={label} title={label}><div className="flex items-center gap-2"><Icon aria-hidden="true" className="h-10 w-10 shrink-0 rounded-lg bg-slateblue-50 p-2 text-slateblue-600 dark:bg-slate-800" /><div><p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Not Available</p><p className="mt-1 text-xs text-slate-500">Trend / proportion: Unknown</p></div></div></IcPanel>)}</div>
    <IcPanel title="Filters" action={<IcUnavailableAction>Advanced Filters</IcUnavailableAction>}><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">{["Pipeline", "Segment", "Finding Type", "Severity", "Status", "Source", "Date Range"].map(label => <label key={label} className="text-xs text-slate-600 dark:text-slate-400">{label}<select disabled title="Verified finding filter options are not available." className="mt-1 block w-full rounded border border-slate-200 bg-slate-50 p-2 text-xs disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800"><option>Not Available</option></select></label>)}<div className="flex items-end gap-2"><IcUnavailableAction>Apply</IcUnavailableAction><IcUnavailableAction>Reset</IcUnavailableAction></div></div><p className="mt-2 text-xs text-slate-500">Filters unavailable until verified findings exist. Severity describes corrosion concern, not official risk. Overdue is a separate date/action condition.</p></IcPanel>
    <div className={`grid min-w-0 gap-3 ${panelOpen ? "2xl:grid-cols-[minmax(0,3fr)_minmax(280px,1fr)]" : ""}`}>
      <div className="min-w-0 space-y-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <IcPanel title="Findings by Severity"><div className="flex flex-wrap items-center justify-center gap-4 py-4"><div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full border-[16px] border-slate-100 text-center text-xs text-slate-500 dark:border-slate-800" aria-label="Finding severity distribution unavailable">Not Available<br />Findings</div><ul className="space-y-3 text-xs text-slate-500">{severities.map(({ label, color }) => <li key={label} className="flex items-center gap-2"><span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}: Not Available</li>)}</ul></div></IcPanel>
          <IcPanel title="Findings by Status"><div className="flex min-h-44 gap-2"><span className="text-xs text-slate-500 [writing-mode:vertical-rl]">Number of Findings</span><div className="flex min-w-0 flex-1 flex-col"><div className="flex flex-1 items-center justify-center border-b border-l border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"><IcUnknown>No verified workflow-status counts available.</IcUnknown></div><p className="pt-2 text-center text-xs text-slate-500">Workflow Status: Not Available</p></div></div><p className="mt-3 text-xs text-slate-500">Open / Under Review / Monitoring / Action Required / Escalated / Closed / Deferred: Not Available. Overdue is not a workflow-status series.</p></IcPanel>
        </div>
        <IcPanel title="Findings Register" action={<div className="flex flex-wrap gap-2"><IcUnavailableAction>Columns</IcUnavailableAction><IcUnavailableAction>Export</IcUnavailableAction><IcUnavailableAction>Add Finding</IcUnavailableAction></div>}>
          <label className="mb-3 block text-xs text-slate-500">Search findings<input disabled placeholder="Search findings..." title="Verified finding records are not available." className="mt-1 block w-full rounded border border-slate-200 bg-slate-50 p-2 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800" /></label>
          <div className="overflow-x-auto"><table className="w-full min-w-[1200px] text-left text-xs"><caption className="sr-only">Findings Register — verified engineering findings unavailable</caption><thead className="bg-slateblue-50 text-slateblue-800 dark:bg-slate-800 dark:text-slate-300"><tr><th scope="col" className="p-2"><input type="checkbox" disabled aria-label="Select all findings unavailable" /></th>{columns.map(column => <th key={column} scope="col" className="p-2 font-medium">{column}</th>)}</tr></thead><tbody><tr><td colSpan={columns.length + 1} className="p-5 text-center text-slate-500">Not Available — no verified finding records. Record count: Unknown.</td></tr></tbody></table></div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><label>Show <select disabled className="rounded border border-slate-200 bg-transparent p-1 dark:border-slate-700"><option>Not Available</option></select> entries</label><span>Pagination / sorting: Not Available</span><div className="flex flex-wrap gap-1">{["First", "Previous", "Next", "Last"].map(label => <IcUnavailableAction key={label}>{label}</IcUnavailableAction>)}</div></div><p className="mt-3 text-xs text-slate-500">Search, selection, column settings, export and finding creation are unavailable without approved data contracts and workflows.</p>
        </IcPanel>
        {!panelOpen && <button type="button" onClick={() => setPanelOpen(true)} className="rounded border border-slate-200 px-3 py-2 text-xs text-slateblue-700 dark:border-slate-700 dark:text-slateblue-300">Show Selected Finding panel</button>}
      </div>
      {panelOpen && <IcPanel title="Selected Finding" className="self-start" action={<button type="button" aria-label="Close Selected Finding panel" onClick={() => setPanelOpen(false)} className="px-2 text-slate-500">×</button>}>
        <p className="mb-3 text-xs text-slate-500">Finding: Not Available · Priority / Severity / Confidence: Unknown</p><div className="mb-3 grid grid-cols-2 gap-2">{["View Details", "View Evidence", "Create Action", "Send to Defect Manager"].map(label => <IcUnavailableAction key={label}>{label}</IcUnavailableAction>)}</div>
        <p className="mb-3 text-xs text-slate-500">Actions unavailable: no verified selected finding or approved workflow. Create Action requires one Central Action_ID. Defect escalation requires existing-defect correlation and engineering/physical confirmation before any new Defect_ID.</p>
        <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Summary</h4><IcFields fields={["Finding ID", "Pipeline", "Segment / KP (km)", "Source", "Mechanism", "Severity", "Confidence", "Status", "Owner", "Due Date"]} /><p className="mt-2 text-xs text-slate-500">Overdue: Unknown — separate from workflow status.</p>
        <h4 className="mt-4 text-xs font-semibold text-slate-800 dark:text-slate-200">Description</h4><IcUnknown>No verified finding description available.</IcUnknown>
        <h4 className="mt-3 text-xs font-semibold text-slate-800 dark:text-slate-200">Root Cause Hypothesis</h4><IcUnknown>Not Available — no engineering hypothesis or confirmation recorded.</IcUnknown><p className="text-xs text-slate-500">A hypothesis must remain distinct from a confirmed cause.</p>
        <div className="mt-4 flex items-center justify-between gap-2"><h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Related Loop</h4><IcUnavailableAction>View Loop</IcUnavailableAction></div><IcUnknown>No verified loop/revision reference available.</IcUnknown>
        <div className="mt-3 flex items-center justify-between gap-2"><h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Evidence / Supporting Data</h4><IcUnavailableAction>View All</IcUnavailableAction></div><IcUnknown>No verified source evidence references available.</IcUnknown>
        <div className="mt-3 flex items-center justify-between gap-2"><h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Linked Documents</h4><IcUnavailableAction>View All</IcUnavailableAction></div><IcUnknown>No verified Document_ID references available.</IcUnknown>
        <h4 className="mt-3 text-xs font-semibold text-slate-800 dark:text-slate-200">Source lineage & review</h4><IcFields fields={["Source Record IDs", "Source Timestamp / Timezone", "Quality / Freshness", "Loop Revision / Effective Dates", "Method / Rule Version", "Created Date / Review Date", "Engineer Validation / Approval", "Central Action_ID", "Confirmed Defect_ID Reference"]} /><p className="mt-3 text-xs text-slate-500">Internal Corrosion owns Finding_ID, not confirmed Defect_ID or official Risk_ID. Evidence stays source-owned and documents remain stored once in Document Management.</p>
      </IcPanel>}
    </div>
  </div>;
}
