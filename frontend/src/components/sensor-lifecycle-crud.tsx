"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Panel } from "@/components/ui";
import {
  createSensorLifecycleRecord,
  deleteSensorLifecycleRecord,
  fetchSensorCalibrations,
  fetchSensorConfigurationVersions,
  fetchSensorHardwareEvents,
  fetchSensorMaintenanceTasks,
  updateSensorLifecycleRecord
} from "@/lib/apiClient";

type Resource = "calibrations" | "maintenance" | "events" | "configuration";
type Field = { key: string; label: string; type?: "text" | "datetime-local" | "number" | "textarea"; required?: boolean };

const definitions: Record<Resource, { title: string; fields: Field[]; list: () => Promise<any[]> }> = {
  calibrations: { title: "Calibration Records", fields: [{ key: "sensorId", label: "Sensor ID", required: true }, { key: "status", label: "Status", required: true }, { key: "calibratedAt", label: "Calibrated At", type: "datetime-local" }, { key: "dueAt", label: "Due At", type: "datetime-local" }, { key: "provider", label: "Provider" }, { key: "result", label: "Result" }, { key: "notes", label: "Notes", type: "textarea" }], list: fetchSensorCalibrations },
  maintenance: { title: "Maintenance Tasks", fields: [{ key: "sensorId", label: "Sensor ID" }, { key: "maintenanceType", label: "Maintenance Type", required: true }, { key: "priority", label: "Priority", required: true }, { key: "status", label: "Status", required: true }, { key: "dueAt", label: "Due At", type: "datetime-local" }, { key: "workOrder", label: "Work Order" }, { key: "notes", label: "Notes", type: "textarea" }], list: fetchSensorMaintenanceTasks },
  events: { title: "Hardware Events", fields: [{ key: "sensorId", label: "Sensor ID" }, { key: "eventType", label: "Event Type", required: true }, { key: "severity", label: "Severity", required: true }, { key: "status", label: "Status", required: true }, { key: "occurredAt", label: "Occurred At", type: "datetime-local", required: true }, { key: "message", label: "Message", required: true }, { key: "source", label: "Source", required: true }], list: fetchSensorHardwareEvents },
  configuration: { title: "Configuration Versions", fields: [{ key: "version", label: "Version", type: "number", required: true }, { key: "status", label: "Status", required: true }, { key: "payload", label: "Payload (JSON)", type: "textarea", required: true }], list: fetchSensorConfigurationVersions }
};

export function SensorLifecycleCrud({ resource }: { resource: Resource }) {
  const definition = definitions[resource];
  const [records, setRecords] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("Not Available until the approved lifecycle migration is applied.");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try { setRecords(await definition.list()); setMessage(""); } catch (error) { setRecords([]); setMessage(error instanceof Error ? error.message : "Not Available"); }
  };
  useEffect(() => { void load(); }, [resource]);
  const visible = useMemo(() => records.filter((record) => JSON.stringify(record).toLowerCase().includes(search.toLowerCase())), [records, search]);
  const update = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const edit = (record: any) => {
    setSelected(record);
    setForm(Object.fromEntries(definition.fields.map((field) => [field.key, field.key === "payload" ? JSON.stringify(record[field.key] ?? {}, null, 2) : String(record[field.key] ?? "")] )));
  };
  const save = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const body: Record<string, unknown> = { ...form, ...(resource === "configuration" ? { version: Number(form.version), payload: JSON.parse(form.payload || "{}") } : {}) };
      const dateKeys = ["calibratedAt", "dueAt", "plannedAt", "completedAt", "occurredAt"] as const;
      for (const key of dateKeys) {
        const value = body[key];
        if (typeof value === "string" && value) body[key] = new Date(value).toISOString();
      }
      if (selected) await updateSensorLifecycleRecord(resource, selected.id, body); else await createSensorLifecycleRecord(resource, body);
      setSelected(null); setForm({}); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Lifecycle write unavailable."); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!selected) return;
    setBusy(true); setMessage("");
    try { await deleteSensorLifecycleRecord(resource, selected.id); setSelected(null); setForm({}); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Lifecycle delete unavailable."); }
    finally { setBusy(false); }
  };

  return <Panel>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-semibold text-slate-900 dark:text-white">{definition.title}</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Verified records only. Missing lifecycle data remains Not Available.</p></div><input aria-label={`Search ${resource}`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search records..." className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" /></div>
    {message ? <p role="status" className="mt-4 rounded-xl border border-dashed border-slate-200 p-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{message}</p> : null}
    <form onSubmit={save} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{definition.fields.map((field) => <label key={field.key} className="text-xs font-semibold text-slate-600 dark:text-slate-300">{field.label}{field.type === "textarea" ? <textarea required={field.required} value={form[field.key] ?? ""} onChange={(event) => update(field.key, event.target.value)} className="mt-1 min-h-20 w-full rounded-xl border border-slate-200 p-2 text-sm font-normal dark:border-slate-700 dark:bg-slate-950" /> : <input required={field.required} type={field.type ?? "text"} value={form[field.key] ?? ""} onChange={(event) => update(field.key, event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-2 py-2 text-sm font-normal dark:border-slate-700 dark:bg-slate-950" />}</label>)}<div className="flex items-end gap-2"><button type="submit" disabled={busy} className="rounded-xl bg-slateblue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{selected ? "Save Edit" : "Save"}</button>{selected ? <><button type="button" onClick={() => { setSelected(null); setForm({}); }} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-700">Cancel</button><button type="button" onClick={() => void remove()} disabled={busy} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600">Delete</button></> : null}</div></form>
    <div className="mt-5 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700"><tr><th className="px-3 py-3">ID</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Created</th><th className="px-3 py-3">Actions</th></tr></thead><tbody>{visible.length ? visible.map((record) => <tr key={record.id} className="border-b border-slate-100 dark:border-slate-800"><td className="px-3 py-3">{record[definition.fields[0].key] ?? record.id}</td><td className="px-3 py-3">{record.status ?? "Not Available"}</td><td className="px-3 py-3">{record.createdAt ?? "Not Available"}</td><td className="px-3 py-3"><button type="button" onClick={() => edit(record)} className="font-semibold text-slateblue-600">View / Edit</button></td></tr>) : <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-500">{message || "Not Available"}</td></tr>}</tbody></table></div>
  </Panel>;
}
