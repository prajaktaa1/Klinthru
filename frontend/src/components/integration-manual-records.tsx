"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createIntegrationManualRecord, deleteIntegrationManualRecord, updateIntegrationManualRecord, type IntegrationConnectorRecord, type IntegrationManualModule, type IntegrationManualRecord, type IntegrationManualRecordInput } from "@/lib/apiClient";

type Field = { key: string; label: string; options?: string[]; numeric?: boolean; required?: boolean };
const definitions: Record<IntegrationManualModule, { title: string; description: string; fields: Field[]; statuses: string[] }> = {
  "Data Mapping": { title: "Mapping Rules", description: "Map source fields to KLINTHRU fields and record transformations.", statuses: ["Active", "Inactive"], fields: [
    { key: "sourceField", label: "Source Field", required: true }, { key: "sourceSystem", label: "Source System", required: true }, { key: "targetField", label: "Target Field", required: true }, { key: "transformation", label: "Transformation Type", options: ["Direct", "Scale", "Date/Time", "Lookup", "Custom"] }, { key: "unitConversion", label: "Unit Conversion" }, { key: "required", label: "Required", options: ["Yes", "No"] }, { key: "version", label: "Mapping Version" }
  ] },
  "Validation Rules": { title: "Validation Rules", description: "Define data checks and their action when a record fails.", statuses: ["Active", "Inactive"], fields: [
    { key: "ruleGroup", label: "Rule Group", options: ["General Data Quality", "Asset & Location", "Measurement & Readings", "Document & Files", "Reference & Lookup", "Business Rules"] }, { key: "severity", label: "Severity", options: ["Info", "Low", "Medium", "High", "Critical"] }, { key: "description", label: "Description", required: true }, { key: "targetDomain", label: "Target Domain" }, { key: "logic", label: "Logic Summary" }, { key: "failureAction", label: "Failure Action", options: ["Warning Only", "Accept with Flag", "Quarantine", "Reject", "Stop Batch"] }
  ] },
  "Processing Logs": { title: "Processing Logs", description: "Manually document processing activity. Connector test events are recorded separately by the service.", statuses: ["Success", "Failed", "Warning", "Pending"], fields: [
    { key: "syncRunId", label: "Sync Run ID" }, { key: "messageType", label: "Message Type" }, { key: "severity", label: "Severity", options: ["Info", "Warning", "Error"] }, { key: "records", label: "Records", numeric: true }, { key: "duration", label: "Duration" }, { key: "message", label: "Message / Error Details" }
  ] },
  "Data Quality": { title: "Data Quality Issues", description: "Track observed quality issues and remediation actions.", statuses: ["Open", "In Progress", "Resolved"], fields: [
    { key: "issueType", label: "Issue Type", options: ["Missing Value", "Invalid Format", "Duplicate Record", "Out of Range", "Other"] }, { key: "description", label: "Description", required: true }, { key: "domain", label: "Pipeline / Domain" }, { key: "sourceSystem", label: "Source System" }, { key: "records", label: "Affected Records", numeric: true }, { key: "rootCause", label: "Root Cause" }, { key: "recommendedAction", label: "Recommended Action" }
  ] },
  "Scheduler": { title: "Scheduled Jobs", description: "Store job definitions and planned times. This screen does not run jobs automatically.", statuses: ["Active", "Paused", "Failed"], fields: [
    { key: "jobType", label: "Job Type", options: ["Data Ingestion", "Data Sync", "File Download", "Document Sync", "Data Export", "Other"] }, { key: "frequency", label: "Frequency", options: ["Every 15 minutes", "Every 30 minutes", "Hourly", "Daily", "Weekly", "Monthly", "Manual"] }, { key: "nextRun", label: "Next Run (date and time)" }, { key: "lastRun", label: "Last Run (date and time)" }, { key: "duration", label: "Duration" }, { key: "owner", label: "Owner" }
  ] },
  "Notifications": { title: "Integration Notifications", description: "Record and acknowledge integration notices.", statuses: ["Unacknowledged", "Acknowledged"], fields: [
    { key: "severity", label: "Severity", options: ["Info", "Low", "Medium", "High", "Critical"] }, { key: "category", label: "Category", options: ["Data Ingestion", "Validation", "Mapping", "Transformation", "Data Quality", "Connection"] }, { key: "message", label: "Message", required: true }, { key: "assignee", label: "Assignee" }, { key: "impactedData", label: "Impacted Data" }, { key: "recommendedAction", label: "Recommended Action" }
  ] }
};

const panel = "min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#111821]";
const control = "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200";
const primary = "rounded-md bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-700 disabled:opacity-50";

export function IntegrationManualRecords({ module, records, connectors, canEdit, onChanged }: { module: IntegrationManualModule; records: IntegrationManualRecord[]; connectors: IntegrationConnectorRecord[]; canEdit: boolean; onChanged: () => Promise<void> }) {
  const config = definitions[module];
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [connectorFilter, setConnectorFilter] = useState("");
  const [editing, setEditing] = useState<IntegrationManualRecord | "new" | null>(null);
  const [name, setName] = useState("");
  const [status, setStatus] = useState(config.statuses[0]);
  const [connectorId, setConnectorId] = useState("");
  const [details, setDetails] = useState<Record<string, string | number | boolean | null>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const allRows = useMemo(() => records.filter(row => row.module === module && (!search || `${row.name} ${Object.values(row.details).join(" ")}`.toLowerCase().includes(search.toLowerCase())) && (!statusFilter || row.status === statusFilter) && (!connectorFilter || row.connectorId === connectorFilter)), [records, module, search, statusFilter, connectorFilter]);
  const pages = Math.max(1, Math.ceil(allRows.length / pageSize));
  const currentPage = Math.min(page, pages);
  const rows = allRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => { setPage(1); }, [module, search, statusFilter, connectorFilter]);
  const selected = rows.find(row => row.id === selectedId) ?? rows[0];
  function open(row: IntegrationManualRecord | "new") { setEditing(row); setName(row === "new" ? "" : row.name); setStatus(row === "new" ? config.statuses[0] : row.status); setConnectorId(row === "new" ? "" : row.connectorId ?? ""); setDetails(row === "new" ? {} : { ...row.details }); setMessage(""); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editing || busy) return;
    setBusy(true); setMessage("");
    try {
      const input: IntegrationManualRecordInput = { module, name: name.trim(), status, connectorId: connectorId || null, details };
      if (editing === "new") await createIntegrationManualRecord(input); else await updateIntegrationManualRecord(editing.id, input);
      await onChanged(); setEditing(null); setMessage("Record saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save record."); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (deleteId !== id) { setDeleteId(id); return; }
    setBusy(true); setMessage("");
    try { await deleteIntegrationManualRecord(id); await onChanged(); setDeleteId(null); if (selectedId === id) setSelectedId(null); setMessage("Record deleted."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to delete record."); }
    finally { setBusy(false); }
  }
  return <section aria-label={`${module} live records`} className="min-w-0 space-y-3">
    <section className={panel}><div className="flex min-h-10 flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-3 py-2 dark:border-slate-800"><div><h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{config.title}</h2><p className="mt-0.5 text-[10px] text-slate-500">{config.description}</p></div>{canEdit && <button type="button" className={primary} onClick={() => open("new")}>+ Add {module === "Scheduler" ? "Job" : "Record"}</button>}</div>
    <div className="flex flex-wrap gap-2 px-3 py-2"><input aria-label={`Search ${module}`} className={`${control} min-w-[200px] flex-1`} placeholder={`Search ${module.toLowerCase()}...`} value={search} onChange={event => setSearch(event.target.value)} /><select aria-label={`${module} status filter`} className={control} value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="">All Statuses</option>{config.statuses.map(value => <option key={value}>{value}</option>)}</select><select aria-label={`${module} connector filter`} className={control} value={connectorFilter} onChange={event => setConnectorFilter(event.target.value)}><option value="">All Sources</option>{connectors.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select><button type="button" className={`${control} border-cyan-600 text-cyan-700 dark:text-cyan-300`} onClick={() => { setSearch(""); setStatusFilter(""); setConnectorFilter(""); }}>Reset</button></div></section>
    {message && <p role="status" className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">{message}</p>}
    {editing && <form onSubmit={save} className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"><h3 className="font-semibold">{editing === "new" ? "Add" : "Edit"} {module === "Scheduler" ? "Job" : "Record"}</h3><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><label className="text-sm">{module === "Scheduler" ? "Job Name" : module === "Validation Rules" ? "Rule Name" : "Name"}<input required maxLength={120} className={`${control} mt-1 w-full`} value={name} onChange={event => setName(event.target.value)} /></label><label className="text-sm">Status<select className={`${control} mt-1 w-full`} value={status} onChange={event => setStatus(event.target.value)}>{config.statuses.map(value => <option key={value}>{value}</option>)}</select></label><label className="text-sm">Connector<select className={`${control} mt-1 w-full`} value={connectorId} onChange={event => setConnectorId(event.target.value)}><option value="">None</option>{connectors.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select></label>{config.fields.map(field => <label key={field.key} className="text-sm">{field.label}{field.options ? <select className={`${control} mt-1 w-full`} value={String(details[field.key] ?? "")} onChange={event => setDetails(previous => ({ ...previous, [field.key]: event.target.value }))}><option value="">Select</option>{field.options.map(value => <option key={value}>{value}</option>)}</select> : <input className={`${control} mt-1 w-full`} type={field.numeric ? "number" : "text"} min={field.numeric ? 0 : undefined} required={field.required} maxLength={field.numeric ? undefined : 2000} value={details[field.key] == null ? "" : String(details[field.key])} onChange={event => setDetails(previous => ({ ...previous, [field.key]: field.numeric && event.target.value !== "" ? Number(event.target.value) : event.target.value }))} />}</label>)}</div><div className="flex gap-2"><button type="submit" className={primary} disabled={busy}>{busy ? "Saving..." : "Save"}</button><button type="button" className={control} disabled={busy} onClick={() => setEditing(null)}>Cancel</button></div></form>}
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 dark:bg-slate-900"><tr><th className="p-3">Name</th><th className="p-3">Source</th>{config.fields.slice(0, 3).map(field => <th key={field.key} className="p-3">{field.label}</th>)}<th className="p-3">Status</th><th className="p-3">Updated</th><th className="p-3">Actions</th></tr></thead><tbody>{rows.map(row => <tr key={row.id} className={`border-t border-slate-200 dark:border-slate-800 ${selected?.id === row.id ? "bg-cyan-50/50 dark:bg-cyan-950/20" : ""}`}><td className="p-3"><button type="button" className="font-semibold text-cyan-700 dark:text-cyan-300" onClick={() => setSelectedId(row.id)}>{row.name}</button></td><td className="p-3">{connectors.find(value => value.id === row.connectorId)?.name ?? "—"}</td>{config.fields.slice(0, 3).map(field => <td key={field.key} className="max-w-[220px] truncate p-3">{String(row.details[field.key] ?? "—")}</td>)}<td className="p-3">{row.status}</td><td className="p-3">{new Date(row.updatedAt).toLocaleString()}</td><td className="p-3"><div className="flex gap-2">{canEdit && <><button type="button" className={control} onClick={() => open(row)}>Edit</button><button type="button" className={control} disabled={busy} onClick={() => void remove(row.id)}>{deleteId === row.id ? "Confirm delete" : "Delete"}</button></>}</div></td></tr>)}</tbody></table>{!rows.length && <p className="p-6 text-center text-sm text-slate-500">No saved {module.toLowerCase()} records. Use Add to enter one.</p>}</div>
    {selected && <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"><h3 className="mb-3 font-semibold">{selected.name} details</h3><dl className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-3">{config.fields.map(field => <div key={field.key}><dt className="text-slate-500">{field.label}</dt><dd className="break-words">{String(selected.details[field.key] ?? "—")}</dd></div>)}</dl>{module === "Scheduler" && <p className="mt-3 text-xs text-slate-500">Saved schedules are planning records. No job is executed from this screen.</p>}</section>}
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><span>Showing {allRows.length ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(currentPage * pageSize, allRows.length)} of {allRows.length} records</span><div className="flex items-center gap-2"><button type="button" className={control} disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><span>Page {currentPage} of {pages}</span><button type="button" className={control} disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</button><span>6 per page</span></div></div>
  </section>;
}
