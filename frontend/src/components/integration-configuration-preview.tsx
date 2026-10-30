"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Check, ChevronDown, Copy, Database, Eye, EyeOff, FileText, LockKeyhole, MoreVertical, Save, Settings2, X } from "lucide-react";

type Status = "Active" | "Inactive";
type Config = {
  id: string; name: string; description: string; sourceType: string; system: string; owner: string; tags: string;
  environment: string; protocol: string; host: string; port: string; secure: boolean; authMethod: string; username: string; password: string;
  endpoint: string; timeout: string; readInterval: string; heartbeat: boolean; schema: string; updateMode: string;
  detectSchema: boolean; validateTypes: boolean; maxRetries: string; retryInterval: string; onFailure: string; deadLetter: boolean;
  notifyConnection: boolean; notifyExceptions: boolean; notifySchema: boolean; recipients: string;
  rawDays: string; errorDays: string; archive: boolean; purgeFiles: boolean;
  mappingTemplate: string; transformation: string; unitConversion: string; trim: boolean; nullValues: boolean; dates: boolean;
  status: Status; updated: string;
};
const initial: Config[] = [
  {
    id: "scada", name: "SCADA OPC Connector", description: "Ingest real-time operational data from SCADA system via OPC UA.",
    sourceType: "SCADA", system: "OPC UA", owner: "Operations Team", tags: "Operational Data, Real-time",
    environment: "Production", protocol: "OPC UA", host: "scada-prod.klinthru.com", port: "4840", secure: true,
    authMethod: "Username / Password", username: "${SCADA_USER}", password: "sample-password",
    endpoint: "opc.tcp://scada-prod.klinthru.com:4840", timeout: "30", readInterval: "10", heartbeat: true,
    schema: "SCADA_Operations", updateMode: "Upsert (Update or Insert)", detectSchema: true, validateTypes: true,
    maxRetries: "3", retryInterval: "60", onFailure: "Send to Error Queue", deadLetter: true,
    notifyConnection: true, notifyExceptions: true, notifySchema: true, recipients: "integrity@klinthru.com",
    rawDays: "30", errorDays: "90", archive: true, purgeFiles: false, mappingTemplate: "SCADA Standard Mapping",
    transformation: "Apply Standard Transformations", unitConversion: "Use System Default",
    trim: true, nullValues: true, dates: true, status: "Active", updated: "06 Oct 2026 14:25"
  },
  ...[
    ["gis", "GIS REST API", "GIS", "REST API", "https://gis.klinthru.com/arcgis", "M. Chen", "06 Oct 2026 14:15", "Active"],
    ["sap", "SAP (Production)", "SAP", "SAP API", "https://sap.klinthru.com/api", "R. Kumar", "06 Oct 2026 13:50", "Active"],
    ["lims", "Laboratory (LIMS)", "LIMS", "LIMS API", "sftp://lims.klinthru.com/inbound", "S. Patel", "05 Oct 2026 16:22", "Inactive"],
    ["weather", "Weather Data", "Weather", "OpenWeather API", "https://api.openweathermap.org/data", "T. Brown", "06 Oct 2026 12:05", "Active"]
  ].map(([id, name, system, protocol, endpoint, owner, updated, status]) => ({
    id, name, system, protocol, endpoint, owner, updated, status: status as Status,
    description: `Import ${system} data into KLINTHRU.`, sourceType: system, tags: system,
    environment: id === "lims" ? "Staging" : "Production",
    host: endpoint.replace(/^[^:]+:\/\//, "").split("/")[0].split(":")[0], port: id === "lims" ? "22" : "443",
    secure: true, authMethod: "Secret Reference", username: "", password: "", timeout: "30", readInterval: "60",
    heartbeat: true, schema: `${system}_Default`, updateMode: "Upsert (Update or Insert)",
    detectSchema: true, validateTypes: true, maxRetries: "3", retryInterval: "60", onFailure: "Send to Error Queue",
    deadLetter: true, notifyConnection: true, notifyExceptions: true, notifySchema: false,
    recipients: "integrity@klinthru.com", rawDays: "30", errorDays: "90", archive: true, purgeFiles: false,
    mappingTemplate: `${system} Standard Mapping`, transformation: "Apply Standard Transformations",
    unitConversion: "Use System Default", trim: true, nullValues: true, dates: true
  }))
];
const input = "mt-1 w-full min-w-0 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
const button = "rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800";
const card = "min-w-0 rounded-lg border border-slate-200 p-3 dark:border-slate-800";
const changes = [
  ["SCADA OPC updated", "John Doe", "Retry policy changed (3 → 5 attempts)", "06 Oct 2026 14:25"],
  ["Notification settings updated", "Jane Smith", "Added alert recipient: integrity@klinthru.com", "06 Oct 2026 11:42"],
  ["SAP connector updated", "Mark Wilson", "Endpoint URL and authentication method", "05 Oct 2026 16:10"],
  ["New connector created", "Jane Smith", "Laboratory (LIMS)", "04 Oct 2026 09:33"]
];
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="block min-w-0 text-[11px] font-medium text-slate-500 dark:text-slate-400"><span>{label}</span>{children}</div>;
}
function Box({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-200"><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="accent-blue-600" />{label}</label>;
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className={card}><h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>{children}</section>;
}

export function IntegrationConfigurationPreview({ onBack, onLive }: { onBack: () => void; onLive: () => void }) {
  const [profiles, setProfiles] = useState(initial);
  const [selectedId, setSelectedId] = useState("scada");
  const selected = profiles.find(p => p.id === selectedId) ?? profiles[0];
  const [draft, setDraft] = useState<Config>({ ...initial[0] });
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState<"new" | "profiles" | "changes" | "credentials" | "test" | null>(null);
  const [menu, setMenu] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);
  const edit = <K extends keyof Config>(key: K, value: Config[K]) => setDraft(previous => ({ ...previous, [key]: value }));
  const choose = (profile: Config) => { setSelectedId(profile.id); setDraft({ ...profile }); setMenu(false); setError(""); };
  const reset = () => { setDraft({ ...selected }); setError(""); setNotice("Unsaved changes discarded."); };
  const save = () => {
    if (!draft.name.trim() || !draft.endpoint.trim() || !draft.owner.trim()) { setError("Connector name, endpoint URL, and owner are required."); return; }
    for (const key of ["port", "timeout", "readInterval", "maxRetries", "retryInterval", "rawDays", "errorDays"] as const) {
      if (!/^\d+$/.test(draft[key])) { setError("Port, timeout, retry, and retention values must be non-negative whole numbers."); return; }
    }
    const saved = { ...draft, name: draft.name.trim(), endpoint: draft.endpoint.trim(), owner: draft.owner.trim(), updated: "Sample edit · current session" };
    setProfiles(previous => previous.map(p => p.id === saved.id ? saved : p)); setDraft(saved);
    setError(""); setNotice(`${saved.name} saved in this reference preview.`);
  };
  const create = (event: FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    if (profiles.some(p => p.name.toLowerCase() === name.toLowerCase())) { setError("A profile with this name already exists."); return; }
    const profile = { ...initial[0], id: `sample-${Date.now()}`, name, status: "Inactive" as Status, updated: "Sample edit · current session", endpoint: "", host: "", username: "", password: "" };
    setProfiles(previous => [profile, ...previous]); choose(profile); setModal(null); setNewName(""); setError(""); setNotice(`${name} created in this reference preview.`);
  };
  const duplicate = () => {
    const profile = { ...selected, id: `sample-${Date.now()}`, name: `${selected.name} Copy`, status: "Inactive" as Status, updated: "Sample edit · current session" };
    setProfiles(previous => [profile, ...previous]); choose(profile); setNotice(`${profile.name} created in this reference preview.`);
  };
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = modalRef.current;
    panel?.querySelector<HTMLElement>("button, input")?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModal(null);
      if (event.key !== "Tab" || !panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled)")];
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [modal]);
  const text = (key: keyof Config, label: string, type = "text") => <Field label={label}><input aria-label={label} type={type} className={input} value={String(draft[key])} onChange={e => edit(key, e.target.value)} /></Field>;
  const select = (key: keyof Config, label: string, options: string[]) => <Field label={label}><select aria-label={label} className={input} value={String(draft[key])} onChange={e => edit(key, e.target.value)}>{[...new Set([String(draft[key]), ...options])].map(value => <option key={value}>{value}</option>)}</select></Field>;
  const box = (key: keyof Config, label: string) => <Box label={label} checked={Boolean(draft[key])} onChange={value => edit(key, value)} />;
  return <section aria-label="Configuration reference preview" className="min-w-0 space-y-3">
    {notice && <div role="status" className="flex items-center justify-between rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950/30 dark:text-cyan-200"><span>{notice}</span><button type="button" aria-label="Dismiss notice" onClick={() => setNotice("")}><X size={14} /></button></div>}
    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
    <div className="grid min-w-0 items-start gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(260px,1fr)]">
      <div className="min-w-0 space-y-3">
        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-[#111821]">
          <button type="button" className="mb-2 text-xs font-medium text-blue-700 dark:text-cyan-300" onClick={onBack}>← Back to Data Sources</button>
          <header className="flex flex-wrap items-center justify-between gap-2">
            <div><h2 className="flex items-center gap-2 text-base font-bold"><Settings2 size={19} className="text-blue-600" />Configure Connector</h2><p className="text-xs text-slate-500">Set up and manage connection details, processing options and behavior for external data sources.</p></div>
            <div className="flex items-center gap-2">{select("status", "Status", ["Active", "Inactive"])}<button type="button" className={button} onClick={() => setModal("test")}>▶ Test Connection</button><div className="relative"><button type="button" aria-label="Configuration actions" aria-expanded={menu} className={button} onClick={() => setMenu(!menu)}><MoreVertical size={15} /></button>{menu && <div role="menu" aria-label="Configuration actions menu" className="absolute right-0 top-9 z-20 min-w-36 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-[#111821]"><button type="button" role="menuitem" className="block w-full px-2 py-1.5 text-left text-xs" onClick={() => { setMenu(false); duplicate(); }}><Copy size={12} className="mr-1 inline" />Duplicate Profile</button><button type="button" role="menuitem" className="block w-full px-2 py-1.5 text-left text-xs" onClick={() => { setMenu(false); reset(); }}>Discard Changes</button></div>}</div></div>
          </header>
          <div className="mt-3 space-y-3 text-xs">
            <Section title="Basic Information"><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">{text("name", "Connector Name *")}{text("description", "Description")}{select("sourceType", "Source Type *", ["SCADA", "GIS", "SAP", "LIMS", "Weather"])}{select("system", "System", ["OPC UA", "REST API", "SAP API", "LIMS API", "OpenWeather"])}{text("owner", "Owner *")}{text("tags", "Tags")}</div></Section>
            <div className="grid gap-3 lg:grid-cols-3">
              <Section title="Environment & Protocol"><div className="grid gap-2 sm:grid-cols-2">{select("environment", "Environment *", ["Production", "Staging", "Development"])}{select("protocol", "Protocol *", ["OPC UA", "REST API", "SAP API", "SFTP", "OpenWeather API"])}{text("host", "Host / Server *")}{text("port", "Port *", "number")}</div><div className="mt-2">{box("secure", "Use Secure Connection (SSL/TLS)")}</div></Section>
              <Section title="Authentication">{select("authMethod", "Authentication Method *", ["Username / Password", "Secret Reference", "API Key", "OAuth"])}<div className="mt-2 grid gap-2 sm:grid-cols-2">{text("username", "Username")}<Field label="Password"><div className="relative"><input aria-label="Password" className={input + " pr-8"} type={showPassword ? "text" : "password"} value={draft.password} onChange={e => edit("password", e.target.value)} /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-2 top-3" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={14} /> : <Eye size={14} />}</button></div></Field></div><button type="button" className="mt-2 text-xs font-medium text-blue-700 dark:text-cyan-300" onClick={() => setModal("credentials")}><LockKeyhole size={13} className="mr-1 inline" />Manage Credentials</button></Section>
              <Section title="API / Endpoint Settings">{text("endpoint", "Endpoint URL *")}<div className="mt-2 grid gap-2 sm:grid-cols-2">{text("timeout", "Connection Timeout (seconds)", "number")}{text("readInterval", "Read Interval (seconds)", "number")}</div><div className="mt-2">{box("heartbeat", "Enable Heartbeat / Keep Alive")}</div></Section>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
              <Section title="Schema & Data Settings"><div className="grid gap-2 sm:grid-cols-2">{select("schema", "Data Schema", ["SCADA_Operations", "GIS_Assets", "SAP_Maintenance"])}{select("updateMode", "Update Mode", ["Upsert (Update or Insert)", "Append Only", "Replace"])}</div><div className="mt-2 space-y-1">{box("detectSchema", "Auto-detect schema changes")}{box("validateTypes", "Validate data types")}</div></Section>
              <Section title="Retry & Error Handling"><div className="grid gap-2 sm:grid-cols-2">{text("maxRetries", "Max Retry Attempts", "number")}{text("retryInterval", "Retry Interval (seconds)", "number")}</div><div className="mt-2">{select("onFailure", "On Failure", ["Send to Error Queue", "Retry", "Stop Processing"])}</div><div className="mt-2">{box("deadLetter", "Enable Dead Letter Queue")}</div></Section>
              <Section title="Notifications"><div className="space-y-1">{box("notifyConnection", "Notify on Connection Failure")}{box("notifyExceptions", "Notify on Data Exceptions")}{box("notifySchema", "Notify on Schema Changes")}</div><div className="mt-2">{text("recipients", "Notification Recipients")}</div></Section>
              <Section title="Data Retention">{text("rawDays", "Retain Raw Data (days)", "number")}<div className="mt-2">{text("errorDays", "Retain Error Records (days)", "number")}</div><div className="mt-2 space-y-1">{box("archive", "Enable Data Archival")}{box("purgeFiles", "Purge Processed Files")}</div></Section>
            </div>
            <Section title="Transformation Defaults"><div className="grid gap-2 sm:grid-cols-3">{select("mappingTemplate", "Default Mapping Template", ["SCADA Standard Mapping", "GIS Standard Mapping", "SAP Standard Mapping"])}{select("transformation", "Data Transformation", ["Apply Standard Transformations", "No Transformation", "Custom Transformations"])}{select("unitConversion", "Unit Conversion", ["Use System Default", "Metric", "Imperial"])}</div><div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">{box("trim", "Trim Whitespace")}{box("nullValues", "Handle Null Values")}{box("dates", "Standardize Date Formats")}</div></Section>
          </div>
          <div className="mt-3 flex justify-end gap-2"><button type="button" className={button} onClick={reset}>Cancel</button><button type="button" className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700" onClick={save}><Save size={13} className="mr-1 inline" />Save Configuration</button></div>
        </section>
      </div>
      <aside className="min-w-0 space-y-3">
        <section aria-label="Configuration Profiles" className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-[#111821]"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold"><FileText size={15} className="mr-1 inline text-blue-600" />Configuration Profiles</h3><button type="button" className={button} onClick={() => { setError(""); setModal("new"); }}>+ New Profile</button></div><div className="mt-2 space-y-1.5">{profiles.slice(0, 5).map(profile => <button type="button" key={profile.id} aria-pressed={selectedId === profile.id} className={`w-full rounded-lg border p-2 text-left ${selectedId === profile.id ? "border-blue-300 bg-blue-50 dark:border-cyan-900 dark:bg-cyan-950/30" : "border-slate-200 dark:border-slate-800"}`} onClick={() => choose(profile)}><span className="flex justify-between gap-2 text-xs font-semibold"><span className="truncate">{profile.name === "SCADA OPC Connector" ? "SCADA OPC (Production)" : profile.name}</span><span className={`rounded-full px-2 py-0.5 text-[10px] ${profile.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{profile.status}</span></span><span className="mt-0.5 block text-[10px] text-slate-500">{profile.sourceType} | {profile.protocol}</span><span className="block text-[10px] text-slate-500">Last updated: {profile.updated}</span></button>)}</div><button type="button" className="mt-2 w-full text-right text-xs font-medium text-blue-700 dark:text-cyan-300" onClick={() => setModal("profiles")}>View All Profiles →</button></section>
        <section aria-label="Recent Configuration Changes" className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-[#111821]"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Recent Configuration Changes</h3><button type="button" className={button} onClick={() => setModal("changes")}>View All</button></div><div className="mt-2 space-y-2">{changes.map(([title, owner, detail, date]) => <button type="button" key={title} className="block w-full border-b border-slate-100 pb-2 text-left text-[10px] dark:border-slate-800" onClick={() => { setNotice(`${title}: ${detail}`); setModal("changes"); }}><span className="font-semibold">{title}</span><span className="ml-1 text-slate-500">by {owner}</span><span className="block text-slate-500">{detail}</span><span className="block text-slate-400">{date}</span></button>)}</div></section>
      </aside>
    </div>
    {modal && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={event => { if (event.target === event.currentTarget) setModal(null); }}><div ref={modalRef} role="dialog" aria-modal="true" aria-label={modal === "new" ? "New Configuration Profile" : modal === "profiles" ? "All Configuration Profiles" : modal === "changes" ? "All Configuration Changes" : modal === "test" ? "Test Connection" : "Manage Credentials"} className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-[#111821]"><div className="mb-3 flex items-center justify-between"><h3 className="text-base font-semibold">{modal === "new" ? "New Configuration Profile" : modal === "profiles" ? "All Configuration Profiles" : modal === "changes" ? "All Configuration Changes" : modal === "test" ? "Test Connection" : "Manage Credentials"}</h3><button type="button" aria-label="Close dialog" className={button} onClick={() => setModal(null)}><X size={14} /></button></div>
      {modal === "new" && <form onSubmit={create}><Field label="Profile name"><input aria-label="Profile name" className={input} required value={newName} onChange={e => setNewName(e.target.value)} /></Field><p className="mt-2 text-xs text-slate-500">Creates a local sample profile with inactive status. Complete its fields before saving.</p><div className="mt-3 flex justify-end gap-2"><button type="button" className={button} onClick={() => setModal(null)}>Cancel</button><button type="submit" className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white">Create Profile</button></div></form>}
      {modal === "profiles" && <div className="space-y-2">{profiles.slice(0, 6).map(profile => <button type="button" key={profile.id} className={button + " block w-full text-left"} onClick={() => { choose(profile); setModal(null); }}>{profile.name} · {profile.status}</button>)}</div>}
      {modal === "changes" && <div className="space-y-2">{changes.slice(0, 6).map(row => <div key={row[0]} className="rounded-lg border border-slate-200 p-2 text-xs dark:border-slate-800"><strong>{row[0]}</strong><p>{row[2]}</p><p className="text-slate-500">{row[1]} · {row[3]}</p></div>)}</div>}
      {modal === "credentials" && <div className="space-y-3 text-xs"><p>Sample credential settings for {selected.name}. Changes here are saved with the preview form.</p>{select("authMethod", "Authentication Method", ["Username / Password", "Secret Reference", "API Key", "OAuth"])}{text("username", "Username")}<Field label="Password"><input className={input} type="password" value={draft.password} onChange={e => edit("password", e.target.value)} /></Field><button type="button" className={button} onClick={() => setModal(null)}>Done</button></div>}
      {modal === "test" && <div className="space-y-3 text-xs"><p>Reference profiles contain sample endpoints. Open Live sources to test a configured connector through the backend.</p><div className="flex justify-end gap-2"><button type="button" className={button} onClick={() => setModal(null)}>Close</button><button type="button" className="rounded-md bg-blue-600 px-3 py-1.5 font-semibold text-white" onClick={onLive}>Open Live sources</button></div></div>}
    </div></div>}
  </section>;
}
