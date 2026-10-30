"use client";

import { useState } from "react";
import { Bell, FileText, FlaskConical, Settings, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { IcFields, IcPanel, IcUnavailableAction, IcUnknown } from "@/components/internal-corrosion-ui";

const metrics = [
  { label: "Configured Loops", icon: Settings },
  { label: "Active Thresholds", icon: FileText },
  { label: "Configured Inhibitor Profiles", icon: FlaskConical },
  { label: "Parameter Mappings", icon: SlidersHorizontal },
  { label: "Pending Configuration Changes", icon: Bell },
  { label: "Configuration Compliance", icon: ShieldCheck }
];
const subtabs = ["Corrosion Mechanisms Library", "Threshold Rules", "Data Confidence Rules", "Inhibitor Libraries", "Loop Setup", "Parameter Mappings", "Notification Rules", "Display Settings"];
const columns = ["Mechanism / Category", "Description", "Current Setting", "Source", "Status", "Last Updated", "Actions"];

export function InternalCorrosionConfiguration() {
  const [activeSubtab, setActiveSubtab] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);
  return <div className="space-y-3">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">{metrics.map(({ label, icon: Icon }) => <IcPanel key={label} title={label}><div className="flex items-center gap-2"><Icon aria-hidden="true" className="h-10 w-10 shrink-0 rounded-lg bg-slateblue-50 p-2 text-slateblue-600 dark:bg-slate-800" /><div><p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Not Available</p><p className="mt-1 text-xs text-slate-500">Trend / compliance: Unknown</p></div></div></IcPanel>)}</div>
    <nav aria-label="Internal Corrosion configuration sections" className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900"><div className="flex min-w-max">{subtabs.map((tab, index) => <button key={tab} type="button" onClick={() => setActiveSubtab(index)} aria-current={index === activeSubtab ? "page" : undefined} className={`px-3 py-2.5 text-xs ${index === activeSubtab ? "border-b-2 border-slateblue-600 bg-white font-semibold text-slateblue-700 dark:bg-slate-800 dark:text-slateblue-300" : "text-slate-500"}`}>{tab}</button>)}</div></nav>
    <p className="text-xs text-slate-500">Configuration data is unavailable. Nothing shown here represents saved or approved settings. Integration Hub retains connector and credential ownership.</p>
    {activeSubtab !== 0 ? <IcPanel title={subtabs[activeSubtab]}><IcUnknown>Not Available</IcUnknown><p className="text-xs text-slate-500">The original reference does not show this section’s layout. No fields, options, rules or saved settings are inferred.</p></IcPanel> : <div className={`grid min-w-0 gap-3 ${panelOpen ? "2xl:grid-cols-[minmax(0,3fr)_minmax(280px,1.2fr)]" : ""}`}>
      <div className="min-w-0 space-y-3">
        <IcPanel title="Corrosion Mechanisms Library" action={<div className="flex gap-2"><IcUnavailableAction>Add Mechanism</IcUnavailableAction><IcUnavailableAction>More</IcUnavailableAction></div>}>
          <p className="mb-4 text-xs text-slate-500">Configure and manage internal corrosion mechanisms, definitions, models and associated parameters.</p>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"><label className="text-xs text-slate-500">Search mechanisms<input disabled placeholder="Search mechanisms..." title="Verified mechanism records are not available." className="mt-1 block w-full rounded border border-slate-200 bg-slate-50 p-2 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800" /></label>{["Mechanism Type", "Status"].map(label => <label key={label} className="text-xs text-slate-500">{label}<select disabled title="Approved configuration filter options are not available." className="mt-1 block w-full rounded border border-slate-200 bg-slate-50 p-2 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800"><option>Not Available</option></select></label>)}<div className="flex items-end gap-2"><IcUnavailableAction>Apply</IcUnavailableAction><IcUnavailableAction>Reset</IcUnavailableAction></div></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs"><caption className="sr-only">Corrosion Mechanisms Library — verified approved configuration unavailable</caption><thead className="bg-slateblue-50 text-slateblue-800 dark:bg-slate-800 dark:text-slate-300"><tr><th scope="col" className="p-2"><input type="checkbox" disabled aria-label="Select all mechanisms unavailable" /></th>{columns.map(column => <th key={column} scope="col" className="p-2 font-medium">{column}</th>)}</tr></thead><tbody><tr><td colSpan={columns.length + 1} className="p-5 text-center text-slate-500">Not Available — no verified mechanism configuration records. Record count: Unknown.</td></tr></tbody></table></div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><label>Show <select disabled className="rounded border border-slate-200 bg-transparent p-1 dark:border-slate-700"><option>Not Available</option></select> entries</label><span>Pagination: Not Available</span><div className="flex gap-1"><IcUnavailableAction>Previous</IcUnavailableAction><IcUnavailableAction>Next</IcUnavailableAction></div></div><p className="mt-3 text-xs text-slate-500">Search, filters, selection and configuration changes are unavailable without verified records and approved workflows.</p>
        </IcPanel>
        {!panelOpen && <button type="button" onClick={() => setPanelOpen(true)} className="rounded border border-slate-200 px-3 py-2 text-xs text-slateblue-700 dark:border-slate-700 dark:text-slateblue-300">Show Selected Configuration Item panel</button>}
      </div>
      {panelOpen && <IcPanel title="Selected Configuration Item" className="self-start" action={<button type="button" aria-label="Close Selected Configuration Item panel" onClick={() => setPanelOpen(false)} className="px-2 text-slate-500">×</button>}>
        <p className="mb-3 text-xs text-slate-500">Mechanism / Category: Not Available · Status / Approval: Unknown</p><div className="mb-3 flex flex-wrap gap-2">{["Edit", "View Rules", "Open Related Mapping"].map(label => <IcUnavailableAction key={label}>{label}</IcUnavailableAction>)}</div><p className="mb-3 text-xs text-slate-500">Editing, rule navigation and mapping actions require a verified item and approved workflow. No saved configuration is implied.</p>
        <IcFields fields={["Description", "Model", "Version", "Source", "Applicable Phases", "Key Parameters", "Last Updated"]} />
        <div className="mt-4 flex items-center justify-between gap-2"><h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Change History</h4><IcUnavailableAction>View All</IcUnavailableAction></div><IcUnknown>No verified configuration change-history entries available.</IcUnknown>
        <div className="mt-3 flex items-center justify-between gap-2"><h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Linked Standards & Documents</h4><IcUnavailableAction>View All</IcUnavailableAction></div><IcUnknown>No verified Document_ID or approved standard references available.</IcUnknown>
        <h4 className="mt-3 text-xs font-semibold text-slate-800 dark:text-slate-200">Approval & revision lineage</h4><IcFields fields={["Mechanism_ID", "Configuration Revision", "Model_ID / Model_Version", "Rule Version", "Effective From / To", "Approval Status / Approver", "Audit Event / Actor / Timestamp", "Document_ID / Version_ID"]} /><p className="mt-3 text-xs text-slate-500">Engineering approval, immutable version history and effective-dated revisions require future approved backend support. Historical assessments must retain their original method and loop revisions. Configuration changes must not silently recalculate history.</p>
      </IcPanel>}
    </div>}
  </div>;
}
