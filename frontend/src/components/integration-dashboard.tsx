"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Activity, ArrowRight, Check, CircleCheck, Clock, Database, FileText, GitBranch, MoreHorizontal, Network, Plug, Search, ShieldCheck, TriangleAlert, X } from "lucide-react";

type Destination = "Data Flow" | "Data Quality" | "Processing Logs";
type Source = { name: string; type: string; system: string; time: string; records: number; active: boolean };
const sources: Source[] = [
  { name: "SCADA OPC", type: "OPC UA", system: "AVEVA PI", time: "14:25", records: 256432, active: true },
  { name: "CP Monitoring", type: "API", system: "CPView", time: "14:20", records: 48921, active: true },
  { name: "GIS System", type: "REST API", system: "Esri ArcGIS", time: "14:15", records: 12584, active: true },
  { name: "SAP", type: "API", system: "SAP S/4HANA", time: "14:10", records: 6432, active: true },
  { name: "Maximo (CMMS)", type: "API", system: "IBM Maximo", time: "13:55", records: 4221, active: true },
  { name: "Laboratory (LIMS)", type: "SFTP", system: "LabWare", time: "13:40", records: 2876, active: true },
  { name: "ILI Vendor", type: "File Upload", system: "ROSEN", time: "12:30", records: 1245, active: true },
  { name: "Document System", type: "API", system: "SharePoint", time: "14:05", records: 842, active: true },
  { name: "Weather Data", type: "API", system: "OpenWeather", time: "13:50", records: 320, active: true },
  { name: "Third Party Reports", type: "SFTP", system: "Partner Portal", time: "10:15", records: 0, active: false },
  { name: "Legacy Database", type: "ODBC", system: "SQL Server", time: "14:18", records: 18334, active: true },
  { name: "Manual Uploads", type: "UI Upload", system: "CSV / Excel", time: "14:12", records: 421, active: true }
];
const events = [
  ["14:25", "SCADA OPC", "Data received (12,441 records)", "Success"],
  ["14:20", "CP Monitoring", "Data processed (2,318 records)", "Success"],
  ["14:18", "SAP", "Data sync completed", "Success"],
  ["14:15", "GIS", "Geometry updated (156 assets)", "Success"],
  ["14:12", "Manual Upload", "File processed (421 records)", "Success"],
  ["14:10", "Maximo", "Data mapping warning (12 records)", "Warning"],
  ["13:55", "Laboratory", "Data received (876 records)", "Success"],
  ["13:40", "ILI Vendor", "File import completed", "Success"]
].slice(0, 6);
const panel = "min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#111821]";
const control = "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200";
function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return <section className={panel}><div className="flex min-h-10 items-center justify-between gap-3 border-b border-slate-200 px-3 py-2 dark:border-slate-800"><h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>{action}</div>{children}</section>;
}
function Badge({ children, warning = false }: { children: ReactNode; warning?: boolean }) {
  return <span className={`inline-flex min-w-16 justify-center rounded-full px-2 py-0.5 text-[10px] font-medium ${warning ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"}`}>{children}</span>;
}

export function IntegrationDashboardMetrics() {
  const metrics = [
    { label: "Connected Sources", value: "12", helper: "10 Active | 2 Inactive", icon: Plug, color: "text-cyan-600 dark:text-cyan-400" },
    { label: "Successful Data Processing", value: "98.4%", helper: "Last 24 Hours", icon: CircleCheck, color: "text-emerald-500" },
    { label: "Records Processed", value: "1.2 M", helper: "Last 24 Hours", icon: Database, color: "text-cyan-600 dark:text-cyan-400" },
    { label: "Average Latency", value: "5 min", helper: "Real-time Sources", icon: Clock, color: "text-cyan-600 dark:text-cyan-400" },
    { label: "Data Exceptions", value: "24", helper: "Requires Attention", icon: TriangleAlert, color: "text-rose-500" },
    { label: "System Health", value: "100%", helper: "Integration Services", icon: Activity, color: "text-cyan-600 dark:text-cyan-400" }
  ];
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{metrics.map(({ label, value, helper, icon: Icon, color }) => <article key={label} className={`${panel} flex items-start gap-3 p-3`}><Icon aria-hidden="true" className={`mt-1 h-7 w-7 shrink-0 ${color}`} /><div className="min-w-0"><p className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{value}</p><h3 className="mt-0.5 text-xs leading-4 text-slate-700 dark:text-slate-300">{label}</h3><p className="mt-1 text-[10px] leading-4 text-slate-500">{helper}</p></div></article>)}</div>;
}

function FlowOverview({ onNavigate }: { onNavigate: (tab: Destination) => void }) {
  const external = ["SCADA / Historian", "CP Monitoring", "GIS", "SAP / Maximo", "Laboratory (LIMS)", "ILI Vendor", "Documents", "Other Sources"];
  const modules = ["Pipeline / Asset Master", "CP Monitoring", "Internal Corrosion", "External Corrosion", "ECDA Assessment", "ILI Analysis", "Defect Manager", "Risk Assessment", "AI Predictions", "Reports & Analytics"];
  const stages = [["Data Ingestion", "Real-time / Scheduled"], ["Validation", "Quality & Rules"], ["Mapping", "Standard Format"], ["Transformation", "Clean & Enrich"], ["Routing", "Distribute to Modules"]];
  return <Panel title="Data Flow Overview" action={<button type="button" className="text-cyan-700 dark:text-cyan-300" aria-label="Open Data Flow" onClick={() => onNavigate("Data Flow")}><ArrowRight size={16} /></button>}><div className="overflow-x-auto p-3"><div className="grid min-w-[430px] grid-cols-[1fr_24px_1.18fr_24px_1.1fr] gap-y-4 text-[10px]">
    <h4 className="font-semibold">External Systems</h4><span /><h4 className="text-center font-semibold">Integration Hub</h4><span /><h4 className="font-semibold">KLINTHRU Modules</h4>
    <div className="flex flex-col justify-center gap-2">{external.slice(0, 6).map((name, i) => <div key={name} className="flex min-h-8 items-center gap-2 rounded-md border border-cyan-100 bg-slate-50 px-2 py-2 dark:border-slate-700 dark:bg-[#172233]">{i > 4 ? <FileText size={14} className="shrink-0 text-cyan-600" /> : <Database size={14} className="shrink-0 text-cyan-600" />}<span>{name}</span></div>)}</div>
    <div aria-hidden="true" className="relative my-7 mr-2 rounded-r-xl border-y border-r border-cyan-400/60"><ArrowRight className="absolute -right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-500" /></div>
    <ol className="flex flex-col justify-center gap-2">{stages.map(([title, description], i) => <li key={title} className="flex min-h-12 items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50/50 p-2 dark:border-cyan-900 dark:bg-[#172233]"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-xs font-bold text-white">{i + 1}</span><div><p className="font-semibold">{title}</p><p className="mt-0.5 text-[9px] text-slate-500 dark:text-slate-400">({description})</p></div></li>)}</ol>
    <div aria-hidden="true" className="relative my-7 ml-2 rounded-l-xl border-y border-l border-cyan-400/60"><ArrowRight className="absolute -left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-500" /></div>
    <div className="flex flex-col justify-center">{modules.slice(0, 6).map((name, i) => <div key={name} className="flex min-h-8 items-center gap-2 border-b border-slate-100 py-2 last:border-0 dark:border-slate-800">{i === 0 ? <GitBranch size={14} className="shrink-0 text-cyan-600" /> : <Network size={14} className="shrink-0 text-cyan-600" />}<span>{name}</span></div>)}</div>
  </div></div></Panel>;
}

function ProcessingChart() {
  const values = [60, 45, 72, 104, 118, 143, 174, 123, 98, 40, 36, 42, 48, 41, 33, 36, 53, 72, 55];
  return <Panel title="Processing Status (Last 24 Hours)"><div className="p-4"><div className="mb-3 flex justify-center gap-4 text-[10px] text-slate-500">{[["Successful", "bg-emerald-500"], ["Failed", "bg-rose-400"], ["Pending", "bg-slate-400"]].map(([label, color]) => <span key={label} className="flex items-center gap-1"><span className={`h-2 w-2 rounded-sm ${color}`} />{label}</span>)}</div><svg viewBox="0 0 360 190" role="img" aria-label="Sample processing volumes over 24 hours, peaking near 08:00 at 174 thousand records" className="w-full text-slate-400"><title>Processing status: sample records per hour</title>{[0, 50, 100, 150, 200].map(value => <g key={value}><line x1="36" x2="350" y1={160 - value * .65} y2={160 - value * .65} stroke="currentColor" opacity=".15" /><text x="29" y={164 - value * .65} textAnchor="end" fill="currentColor" fontSize="10">{value ? `${value}K` : "0"}</text></g>)}{values.map((value, i) => <g key={i}><title>{`${String(Math.round(i * 24 / values.length)).padStart(2, "0")}:00: ${value},000 records`}</title><rect x={40 + i * 16} y={160 - value * .65} width="11" height={value * .65} fill="#94a3b8" opacity=".55" /><rect x={40 + i * 16} y={160 - value * .60} width="11" height={value * .60} fill="#fb7185" /><rect x={40 + i * 16} y={160 - value * .56} width="11" height={value * .56} fill="#22c55e" opacity=".8" /></g>)}{["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"].map((time, i) => <text key={time} x={42 + i * 57} y="179" fill="currentColor" fontSize="10" textAnchor="middle">{time}</text>)}</svg></div></Panel>;
}

export function IntegrationDashboard({ onNavigate }: { onNavigate: (tab: Destination) => void }) {
  const [search, setSearch] = useState(""), [type, setType] = useState("all"), [status, setStatus] = useState("all");
  const [sort, setSort] = useState<"name" | "time">("name"), [sorted, setSorted] = useState(false), [ascending, setAscending] = useState(true);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Source | null>(null);
  const filtered = useMemo(() => {
    const rows = sources.filter(source => `${source.name} ${source.system}`.toLowerCase().includes(search.toLowerCase()) && (type === "all" || source.type === type) && (status === "all" || source.active === (status === "active")));
    return (sorted ? rows.sort((a, b) => (ascending ? 1 : -1) * a[sort].localeCompare(b[sort])) : rows);
  }, [search, type, status, sort, sorted, ascending]);
  const pages = Math.max(1, Math.ceil(filtered.length / 6)), currentPage = Math.min(page, pages), visible = filtered.slice((currentPage - 1) * 6, currentPage * 6);
  function changeSort(key: "name" | "time") { setSort(key); setSorted(true); setAscending(sort === key && sorted ? !ascending : true); }
  return <div className="min-w-0 space-y-3">
    <div className="grid min-w-0 items-start gap-3 xl:grid-cols-[minmax(0,1.22fr)_minmax(0,1fr)]">
      <Panel title="Data Sources" action={<div className="relative w-44 sm:w-56"><Search aria-hidden="true" size={13} className="absolute left-2 top-2 text-slate-400" /><input aria-label="Search sample data sources" placeholder="Search data source..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className={`${control} w-full pl-7`} /></div>}>
        <div className="flex flex-wrap gap-2 px-3 py-2"><select aria-label="Sample source type" className={`${control} min-w-0 flex-1`} value={type} onChange={e => { setType(e.target.value); setPage(1); }}><option value="all">All Types</option>{Array.from(new Set(sources.map(s => s.type))).map(value => <option key={value}>{value}</option>)}</select><select aria-label="Sample source status" className={`${control} flex-1`} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option></select><button type="button" className={`${control} border-cyan-600 text-cyan-700 dark:text-cyan-300`} onClick={() => { setSearch(""); setType("all"); setStatus("all"); setSorted(false); setPage(1); }}>Reset</button></div>
        <div className="overflow-x-auto px-3 pb-3"><table className="w-full min-w-[620px] whitespace-nowrap text-left text-[11px]"><thead className="bg-slate-100 text-slate-600 dark:bg-[#172233] dark:text-slate-300"><tr>{["Source Name", "Type", "System", "Last Sync", "Status", "Records (24h)", "Actions"].map((label, i) => <th key={label} scope="col" className="whitespace-nowrap px-2 py-2" aria-sort={i === 0 || i === 3 ? sorted && sort === (i === 0 ? "name" : "time") ? ascending ? "ascending" : "descending" : "none" : undefined}>{i === 0 || i === 3 ? <button type="button" onClick={() => changeSort(i === 0 ? "name" : "time")}>{label} <span aria-hidden="true">↕</span></button> : label}</th>)}</tr></thead><tbody>{visible.map((source, i) => <tr key={source.name} className="border-b border-slate-100 text-slate-600 hover:bg-cyan-50/50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/50"><td className="px-2 py-1"><button type="button" onClick={() => setSelected(source)} className="flex items-center gap-2 text-left font-medium text-slate-800 dark:text-slate-200"><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-white ${["bg-indigo-500", "bg-cyan-700", "bg-blue-500", "bg-cyan-500", "bg-blue-700", "bg-pink-500"][i % 6]}`}><Database size={12} /></span>{source.name}</button></td><td className="px-2 py-1">{source.type}</td><td className="px-2 py-1">{source.system}</td><td className="whitespace-nowrap px-2 py-1">06 Oct 2026 {source.time}</td><td className="px-2 py-1">{source.active ? <Badge>Active</Badge> : <span className="rounded-full bg-rose-100 px-3 py-0.5 text-[10px] text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">Inactive</span>}</td><td className="px-2 py-1 text-right tabular-nums">{source.records.toLocaleString("en-US")}</td><td className="px-2 py-1 text-center"><button type="button" aria-label={`View sample ${source.name}`} className="rounded border border-slate-200 px-1 text-slate-500 dark:border-slate-700" onClick={() => setSelected(source)}><MoreHorizontal size={15} /></button></td></tr>)}{!filtered.length && <tr><td colSpan={7} className="p-8 text-center text-slate-500">No sources match your filters.</td></tr>}</tbody></table></div>
        <nav aria-label="Sample source pagination" className="flex items-center justify-between gap-2 p-3 text-xs"><span>{filtered.length} sources | 6 per page</span><div className="flex items-center gap-2"><button type="button" aria-label="Previous sample source page" className={control} disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><span>{currentPage} / {pages}</span><button type="button" aria-label="Next sample source page" className={control} disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</button></div></nav>
      </Panel>
      <FlowOverview onNavigate={onNavigate} />
    </div>
    <div className="grid min-w-0 gap-3 xl:grid-cols-[1fr_1.1fr_1.25fr]">
      <ProcessingChart />
      <Panel title="Data Quality Summary"><div className="flex flex-wrap items-center justify-center gap-4 p-4"><div role="img" aria-label="Sample data quality: 98.4 percent valid records" className="relative h-36 w-36 shrink-0 rounded-full" style={{ background: "conic-gradient(#16a34a 0% 98.4%, #fb7185 98.4% 99.6%, #fbbf24 99.6% 99.9%, #64748b 99.9% 100%)" }}><div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-white dark:bg-[#111821]"><strong className="text-2xl">98.4%</strong><span className="mt-1 text-[10px] text-slate-500">Valid Records</span></div></div><div className="min-w-[180px] flex-1"><dl className="text-[11px]">{[["Valid Records", "1,180,432", "98.4%", "bg-emerald-500"], ["Invalid Records", "14,221", "1.2%", "bg-rose-400"], ["Duplicates", "3,542", "0.3%", "bg-amber-400"], ["Missing Data", "1,805", "0.1%", "bg-slate-500"]].map(([label, value, percentage, color]) => <div key={label} className="flex items-center justify-between gap-2 border-b border-slate-100 py-2.5 dark:border-slate-800"><dt className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-sm ${color}`} />{label}</dt><dd className="flex gap-3 tabular-nums"><span>{value}</span><span>{percentage}</span></dd></div>)}</dl><button type="button" className={`${control} mt-4 inline-flex items-center gap-2 text-cyan-700 dark:text-cyan-300`} onClick={() => onNavigate("Data Quality")}>View Data Quality Details <ArrowRight size={13} /></button></div></div></Panel>
      <Panel title="Recent Integration Events" action={<button type="button" className={control} onClick={() => onNavigate("Processing Logs")}>View All</button>}><div className="overflow-x-auto p-3"><table className="w-full min-w-[370px] text-left text-[10px]"><thead className="bg-slate-100 dark:bg-[#172233]"><tr>{["Time", "Source", "Event", "Status"].map(label => <th key={label} scope="col" className="px-2 py-1.5">{label}</th>)}</tr></thead><tbody>{events.map(([time, source, event, status]) => <tr key={`${time}-${source}`} className="border-b border-slate-100 dark:border-slate-800"><td className="px-2 py-1.5 tabular-nums">{time}</td><td className="px-2 py-1.5">{source}</td><td className="px-2 py-1.5">{event}</td><td className="px-2 py-1.5"><Badge warning={status === "Warning"}>{status}</Badge></td></tr>)}</tbody></table></div></Panel>
    </div>
    {selected && <section aria-label="Sample source details" className={`${panel} p-5`}><div className="flex items-center justify-between"><h3 className="flex items-center gap-2 font-semibold"><ShieldCheck size={18} className="text-cyan-600" />{selected.name}</h3><button type="button" aria-label="Close sample source details" className={control} onClick={() => setSelected(null)}><X size={16} /></button></div><p className="mt-2 text-xs text-slate-500">Sample source from the reference image. Switch to Live sources to configure or test a connector.</p><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-4">{[["System", selected.system], ["Type", selected.type], ["Records (24h)", selected.records.toLocaleString("en-US")], ["Status", selected.active ? "Active" : "Inactive"]].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1">{value}</dd></div>)}</dl></section>}
    <p className="flex items-center gap-1.5 text-[10px] text-slate-500"><Check size={12} />Reference snapshot · 06 October 2026 · Sample data for design review</p>
  </div>;
}
