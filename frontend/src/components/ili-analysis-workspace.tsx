"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, ClipboardList, TriangleAlert, Check, Clock3, Workflow, FileText, Upload, Plus, Scale, MoreVertical, Database, Hourglass, Download, ExternalLink, Search, MapPin, Link2, X, Columns3, Maximize } from "lucide-react";

import { PipelineSelector } from "@/components/pipeline-selector";
import { Panel } from "@/components/ui";
import { fetchIliReadiness, fetchIliRuns, fetchIliAnomalies, isBackendUnavailableError, isUnauthorizedError, type IliReadiness, type IliRunSummary, type IliAnomalySummary, type IliDataResponse, fetchPipelines } from "@/lib/apiClient";
import { PipelineRecord } from "@/lib/types";

type IliWorkspaceAnomaly = IliAnomalySummary & {
  type: string;
  rsf: null;
  failurePressureBar: null;
  status: null;
  growthRateMmYear: null;
};
type AnomalyFilter = "All" | "Repair" | "Monitor" | "Safe";
type ReadinessState = "idle" | "loading" | "success" | "error";

type IliRunSource = {
  pipeline: PipelineRecord;
  runs: IliDataResponse<IliRunSummary> | null;
  anomalies: IliDataResponse<IliAnomalySummary> | null;
  readiness: IliReadiness | null;
};
type IliRunFilters = { pipeline: string; tool: string; year: string; status: string };
const emptyRunFilters: IliRunFilters = { pipeline: "", tool: "", year: "", status: "" };
const iliTabs = ["Overview", "ILI Runs", "Anomalies", "Metal Loss Analysis", "Geometry Analysis", "Crack Analysis", "Run Comparison & Growth", "Data Quality", "Findings", "Actions", "Documents", "Trends & Historical", "Configuration"];
const unavailable = "Not Available";
const iliExtendedTabs = ["Geometry Analysis", "Crack Analysis", "Run Comparison & Growth", "Data Quality", "Findings", "Trends & Historical", "Configuration", "Actions", "Documents"];
const iliMissing = "MISSING FIELD — APPROVAL NEEDED";

function iliDate(value: string | null | undefined, withTime = false) {
  if (!value || !Number.isFinite(Date.parse(value))) return unavailable;
  const date = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC", ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}) }).format(new Date(value));
  return withTime ? `${date} UTC` : date;
}

function iliSourceAvailable<T>(source: IliDataResponse<T> | null, pipelineId: string): source is IliDataResponse<T> {
  return source?.pipelineId === pipelineId && source.status === "available" && source.tableAvailable;
}

function iliRunCount(run: IliRunSummary | null, sources: IliRunSource[]): number | string {
  if (!run) return unavailable;
  const source = sources.find((item) => item.pipeline.id === run.pipelineId)?.anomalies ?? null;
  return iliSourceAvailable(source, run.pipelineId)
    ? source.data.filter((item) => item.pipelineId === run.pipelineId && item.inspectionRunId === run.id).length
    : unavailable;
}

export function IliAnalysisWorkspace() {
  const [tab, setTab] = useState("ILI Runs");
  const [pipelines, setPipelines] = useState<PipelineRecord[]>([]);
  const [sources, setSources] = useState<IliRunSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<IliRunFilters>(emptyRunFilters);
  const [applied, setApplied] = useState<IliRunFilters>(emptyRunFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [selectedId, setSelectedId] = useState("");
  const [detailTab, setDetailTab] = useState("Summary");
  const [newestFirst, setNewestFirst] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const records = await fetchPipelines();
        if (cancelled) return;
        setPipelines(records);
        const loaded: IliRunSource[] = [];
        // Bound concurrent reads while preserving each endpoint's access checks.
        for (let offset = 0; offset < records.length; offset += 4) {
          const batch = await Promise.all(records.slice(offset, offset + 4).map(async (pipeline) => {
            const [runs, anomalies, readiness] = await Promise.allSettled([fetchIliRuns(pipeline.id), fetchIliAnomalies(pipeline.id), fetchIliReadiness(pipeline.id)]);
            return { pipeline, runs: runs.status === "fulfilled" ? runs.value : null, anomalies: anomalies.status === "fulfilled" ? anomalies.value : null, readiness: readiness.status === "fulfilled" ? readiness.value : null };
          }));
          if (cancelled) return;
          loaded.push(...batch);
        }
        setSources(loaded);
      } catch {
        if (!cancelled) setLoadError("Not Available. Pipeline records could not be loaded. Check your connection and sign-in.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const allRuns = useMemo(() => sources.flatMap((source) => iliSourceAvailable(source.runs, source.pipeline.id) ? source.runs.data.filter((run) => run.pipelineId === source.pipeline.id) : []), [sources]);
  const scope = sources.filter((source) => !applied.pipeline || source.pipeline.id === applied.pipeline);
  const scopedRuns = allRuns.filter((run) => !applied.pipeline || run.pipelineId === applied.pipeline);
  const filteredRuns = scopedRuns.filter((run) => (!applied.tool || run.toolType === applied.tool) && (!applied.year || run.inspectionDate.slice(0, 4) === applied.year) && (!applied.status || run.status === applied.status)).slice().sort((a, b) => {
    const order = a.inspectionDate.localeCompare(b.inspectionDate) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
    return newestFirst ? -order : order;
  });
  const pages = Math.max(1, Math.ceil(filteredRuns.length / pageSize));
  const currentPage = Math.min(page, pages);
  const visibleRuns = filteredRuns.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => { setPage(1); setSelectedId(""); }, [sources, applied.pipeline, applied.tool, applied.year, applied.status, filteredRuns.length]);
  const selected = filteredRuns.find((run) => run.id === selectedId) ?? visibleRuns[0] ?? null;
  const selectedPipeline = pipelines.find((pipeline) => pipeline.id === selected?.pipelineId) ?? null;
  const history = scopedRuns.slice().sort((a, b) => a.inspectionDate.localeCompare(b.inspectionDate) || a.createdAt.localeCompare(b.createdAt));
  const latest = scopedRuns.slice().sort((a, b) => b.inspectionDate.localeCompare(a.inspectionDate) || b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  const runsAvailable = !loading && !loadError && scope.every((source) => iliSourceAvailable(source.runs, source.pipeline.id));
  const anomaliesAvailable = !loading && !loadError && scope.every((source) => iliSourceAvailable(source.anomalies, source.pipeline.id));
  const anomalyTotal = anomaliesAvailable ? scope.reduce((total, source) => total + source.anomalies!.data.filter((item) => item.pipelineId === source.pipeline.id).length, 0) : unavailable;
  const partial = !loading && sources.some((source) => !iliSourceAvailable(source.runs, source.pipeline.id) || !iliSourceAvailable(source.anomalies, source.pipeline.id));
  const pipelineCode = (id: string | undefined) => formatValue(pipelines.find((pipeline) => pipeline.id === id)?.pipelineCode);
  const selectRun = (run: IliRunSummary) => { setSelectedId(run.id); setDetailTab("Summary"); };
  const blocked = "Not Available: this control requires a supported workflow or additional source fields.";
  const details: Array<[string, string | number]> = [
    ["Run ID", formatValue(selected?.runReference)], ["Pipeline", pipelineCode(selected?.pipelineId)], ["Segment", unavailable],
    ["Tool Type", formatValue(selected?.toolType)], ["Vendor", formatValue(selected?.vendor)], ["Inspection Date", iliDate(selected?.inspectionDate)],
    ["Length (km)", unavailable], ["Status", formatValue(selected?.status)], ["Data Quality", unavailable],
    ["Total Anomalies", iliRunCount(selected, sources)], ["High Severity", unavailable], ["Imported Files", unavailable], ["Imported Logs", unavailable],
    ["Created By", unavailable], ["Created On", iliDate(selected?.createdAt, true)]
  ];

  return (
    <section className="ili-runs" aria-label="ILI Analysis">
      <header className="ili-heading">
        <div className="ili-heading-copy"><span className="ili-module-icon" aria-hidden="true"><Workflow size={34} /></span><div><h2>ILI Analysis</h2><p>Manage ILI runs, analyze anomalies, track metal loss, geometry, cracks and growth, and provide data to corrosion, ECDA, defect management and risk assessment.</p></div></div>
        <div className="ili-heading-actions"><div className="ili-breadcrumb">Home <span>›</span> Integrity Assessment <span>›</span> ILI Analysis</div><div><button disabled title={blocked}><Upload size={14} aria-hidden="true" /> Export</button><button className="ili-primary" disabled title={blocked}><Plus size={16} aria-hidden="true" /> New ILI Run</button></div></div>
      </header>
      <div className="ili-kpis">
        {[
          { label: "ILI Runs", value: runsAvailable ? scopedRuns.length : unavailable, helper: unavailable, icon: ClipboardList, color: "blue" },
          { label: "Total Anomalies", value: anomalyTotal, helper: unavailable, icon: Activity, color: "orange" },
          { label: "High Severity", value: unavailable, helper: unavailable, icon: TriangleAlert, color: "red" },
          { label: "Run Data Quality", value: unavailable, helper: unavailable, icon: Check, color: "green" },
          { label: "Latest Run", value: runsAvailable ? iliDate(latest?.inspectionDate) : unavailable, helper: latest ? `${pipelineCode(latest.pipelineId)} | ${formatValue(latest.toolType)}` : unavailable, icon: Clock3, color: "blue" }
        ].map((card) => <Panel className="ili-kpi" key={card.label}><span className={`ili-kpi-icon ${card.color}`} aria-hidden="true"><card.icon size={30} /></span><div><strong>{card.value}</strong><span>{card.label}</span><small title={card.helper === unavailable ? "No supported source for this indicator or comparison" : undefined}>{card.helper}</small></div></Panel>)}
      </div>
      <nav className="ili-tabs" aria-label="ILI sections">
        {iliTabs.map((name) => <button key={name} aria-current={tab === name ? "page" : undefined} className={tab === name ? "active" : ""} disabled={name !== "ILI Runs" && name !== "Overview" && name !== "Anomalies" && name !== "Metal Loss Analysis" && !iliExtendedTabs.includes(name)} title={name !== "ILI Runs" && name !== "Overview" && name !== "Anomalies" && name !== "Metal Loss Analysis" && !iliExtendedTabs.includes(name) ? blocked : undefined} onClick={() => setTab(name)}>{name}</button>)}
      </nav>
      {tab === "Overview" ? <IliRecordWorkspace /> : iliExtendedTabs.includes(tab) ? <IliAdditionalView key={`${tab}:${applied.pipeline}`} view={tab} sources={sources} pipelines={pipelines} pipelineId={applied.pipeline} loading={loading} loadError={loadError} onPipelineChange={(pipeline) => { setDraft({ ...emptyRunFilters, pipeline }); setApplied({ ...emptyRunFilters, pipeline }); setPage(1); setSelectedId(""); }} /> : tab === "Metal Loss Analysis" ? <IliMetalLossView key={applied.pipeline} sources={sources} pipelines={pipelines} pipelineId={applied.pipeline} loading={loading} loadError={loadError} onPipelineChange={(pipeline) => { setDraft({ ...emptyRunFilters, pipeline }); setApplied({ ...emptyRunFilters, pipeline }); setPage(1); setSelectedId(""); }} /> : tab === "Anomalies" ? <IliAnomaliesView sources={sources} pipelines={pipelines} pipelineId={applied.pipeline} loading={loading} loadError={loadError} onPipelineChange={(pipeline) => { setDraft({ ...emptyRunFilters, pipeline }); setApplied({ ...emptyRunFilters, pipeline }); setPage(1); setSelectedId(""); }} /> : <>
        {(loading || loadError || partial) && <p className="ili-notice" role="status">{loading ? "Loading authenticated ILI records…" : loadError ?? "Not Available for some sources. Showing only accessible records; missing counts and fields remain unavailable."}</p>}
        <div className="ili-columns">
          <div className="ili-main-column">
            <Panel className="ili-panel ili-register">
              <div className="ili-panel-heading"><h3>ILI Run Register</h3><div className="ili-tools"><button className="ili-primary" disabled title={blocked}><Upload size={14} aria-hidden="true" /> Upload ILI Data</button><button disabled title={blocked}><Scale size={14} aria-hidden="true" /> Compare Runs</button><button disabled title={blocked}><FileText size={14} aria-hidden="true" /> Generate Report</button><button disabled title={blocked} aria-label="More run actions"><MoreVertical size={16} aria-hidden="true" /></button></div></div>
              <form className="ili-filters" onSubmit={(event) => { event.preventDefault(); setApplied(draft); setPage(1); setSelectedId(""); setDetailTab("Summary"); }}>
                <label>Pipeline<select aria-label="Pipeline" value={draft.pipeline} onChange={(event) => setDraft({ ...draft, pipeline: event.target.value, tool: "", year: "", status: "" })} disabled={loading || !!loadError}><option value="">All Pipelines</option>{pipelines.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.pipelineCode} — {pipeline.pipelineName}</option>)}</select></label>
                <label>Segment<select aria-label="Segment" disabled title="Not Available: runs have no segment association"><option>All Segments</option></select></label>
                <label>Tool Type<select aria-label="Tool Type" value={draft.tool} onChange={(event) => setDraft({ ...draft, tool: event.target.value })} disabled={loading}><option value="">All Tool Types</option>{Array.from(new Set(allRuns.filter((run) => !draft.pipeline || run.pipelineId === draft.pipeline).map((run) => run.toolType).filter(Boolean))).sort().map((value) => <option key={value}>{value}</option>)}</select></label>
                <label>Year<select aria-label="Year" value={draft.year} onChange={(event) => setDraft({ ...draft, year: event.target.value })} disabled={loading}><option value="">All Years</option>{Array.from(new Set(allRuns.filter((run) => !draft.pipeline || run.pipelineId === draft.pipeline).map((run) => run.inspectionDate.slice(0, 4)).filter((value) => /^\d{4}$/.test(value)))).sort().reverse().map((value) => <option key={value}>{value}</option>)}</select></label>
                <label>Run Status<select aria-label="Run Status" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })} disabled={loading}><option value="">All Statuses</option>{Array.from(new Set(allRuns.filter((run) => !draft.pipeline || run.pipelineId === draft.pipeline).map((run) => run.status).filter(Boolean))).sort().map((value) => <option key={value}>{value}</option>)}</select></label>
                <button type="button" className="ili-clear" onClick={() => { setDraft(emptyRunFilters); setApplied(emptyRunFilters); setPage(1); setSelectedId(""); setDetailTab("Summary"); }}>Clear</button><button type="submit" className="ili-primary" disabled={loading}>Apply</button>
              </form>
              <div className="ili-table-scroll"><table className="ili-register-table"><thead><tr><th><input type="checkbox" disabled aria-label="Select all runs unavailable" title={blocked} /></th>{["Run ID", "Pipeline", "Segment", "Tool Type", "Vendor"].map((label) => <th key={label}>{label}</th>)}<th><button className="ili-sort" onClick={() => { setNewestFirst(!newestFirst); setPage(1); }} aria-label={`Sort inspection date ${newestFirst ? "ascending" : "descending"}`}>Inspection Date {newestFirst ? "↓" : "↑"}</button></th>{["Length (km)", "Status", "Data Quality", "Actions"].map((label) => <th key={label}>{label}</th>)}</tr></thead>
                <tbody>{visibleRuns.map((run) => <tr key={run.id} className={selected?.id === run.id ? "selected" : ""} onClick={() => selectRun(run)}><td><input type="checkbox" aria-label={`Select run ${formatValue(run.runReference)}`} checked={selected?.id === run.id} onChange={() => selectRun(run)} onClick={(event) => event.stopPropagation()} /></td><td><button className="ili-link" onClick={() => selectRun(run)}>{formatValue(run.runReference)}</button></td><td>{pipelineCode(run.pipelineId)}</td><td>{unavailable}</td><td>{formatValue(run.toolType)}</td><td>{formatValue(run.vendor)}</td><td>{iliDate(run.inspectionDate)}</td><td>{unavailable}</td><td><span className="ili-run-status">{formatValue(run.status)}</span></td><td>{unavailable}</td><td><button disabled title={blocked} aria-label={`Actions unavailable for ${run.runReference}`}>⋯</button></td></tr>)}
                  {!visibleRuns.length && <tr><td colSpan={11} className="ili-empty">{loading ? "Loading ILI runs…" : filteredRuns.length === 0 && runsAvailable ? "No ILI runs match the current filters." : unavailable}</td></tr>}
                </tbody></table></div>
              <div className="ili-pagination"><span>{runsAvailable ? `Showing ${filteredRuns.length ? (currentPage - 1) * pageSize + 1 : 0} - ${Math.min(currentPage * pageSize, filteredRuns.length)} of ${filteredRuns.length} ILI runs` : `Showing ${filteredRuns.length} accessible ILI runs; total ${unavailable}`}</span><div><button disabled={currentPage <= 1} aria-label="Previous page" onClick={() => setPage(currentPage - 1)}>‹</button><span className="ili-page-number" aria-label={`Page ${currentPage} of ${pages}`}>{currentPage}</span><button disabled={currentPage >= pages} aria-label="Next page" onClick={() => setPage(currentPage + 1)}>›</button><label>Rows per page<select aria-label="Rows per page" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option value={6}>6</option></select></label></div></div>
            </Panel>
            <div className="ili-bottom-panels">
              <Panel className="ili-panel"><h3>Run Statistics</h3><div className="ili-statistics">{[{ label: "Completed Runs", icon: ClipboardList, color: "green" }, { label: "Pending Validation", icon: Hourglass, color: "orange" }, { label: "Uploaded Files", icon: ClipboardList, color: "blue" }, { label: "Imported Logs", icon: Database, color: "purple" }].map((item) => <div className={item.color} key={item.label}><span className="ili-stat-icon" aria-hidden="true"><item.icon size={27} /></span><strong>{unavailable}</strong><span>{item.label}</span><small>{unavailable}</small></div>)}</div></Panel>
              <Panel className="ili-panel"><h3>Historical Runs Timeline</h3>{history.length ? <div className="ili-timeline" aria-label="Runs in chronological order">{history.map((run) => <button key={run.id} title={`${formatValue(run.runReference)} | ${iliDate(run.inspectionDate)} | ${formatValue(run.status)}`} aria-label={`View historical run ${run.runReference}`} onClick={() => { setDraft({ ...emptyRunFilters, pipeline: run.pipelineId }); setApplied({ ...emptyRunFilters, pipeline: run.pipelineId }); setPage(1); selectRun(run); }}><span className={selected?.id === run.id ? "ili-timeline-dot chosen" : "ili-timeline-dot"} /><strong>{Number.isFinite(Date.parse(run.inspectionDate)) ? run.inspectionDate.slice(0, 4) : unavailable}</strong><span>{formatValue(run.toolType)}</span><small>{pipelineCode(run.pipelineId)}</small></button>)}</div> : <p className="ili-empty">{unavailable}</p>}</Panel>
            </div>
          </div>
          <aside className="ili-side-column" aria-label="Selected ILI run">
            <Panel className="ili-panel ili-details">
              <div className="ili-panel-heading"><h3>Run Details</h3><button disabled title={blocked}>View Details</button></div>
              <div className="ili-selected-run"><span className="ili-run-icon" aria-hidden="true"><Workflow size={34} /></span><div><strong title={selected?.id}>{formatValue(selected?.runReference)}</strong><span className="ili-run-status">{formatValue(selected?.status)}</span><p>{pipelineCode(selected?.pipelineId)} | {unavailable}</p><p>{formatValue(selected?.toolType)} | {formatValue(selected?.vendor)}</p></div></div>
              <nav className="ili-detail-tabs" aria-label="Run detail sections">{["Summary", "Data Quality", "Tool Configuration", "Files", "Notes"].map((name) => <button key={name} aria-current={detailTab === name ? "page" : undefined} disabled={name !== "Summary" && name !== "Notes"} className={detailTab === name ? "active" : ""} title={name !== "Summary" && name !== "Notes" ? blocked : undefined} onClick={() => setDetailTab(name)}>{name === "Files" ? `Files (${unavailable})` : name}</button>)}</nav>
              {detailTab === "Notes" ? <div className="ili-notes"><h4>Notes</h4><p>{formatValue(selected?.notes)}</p></div> : <dl className="ili-summary">{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{label === "Status" ? <span className="ili-run-status">{value}</span> : value}</dd></div>)}<div><dt>Internal Run ID</dt><dd>{formatValue(selected?.id)}</dd></div></dl>}
              <div className="ili-detail-actions"><button className="ili-primary" disabled title={blocked}>View Full Details <ExternalLink size={13} aria-hidden="true" /></button><button disabled title={blocked}><Download size={13} aria-hidden="true" /> Download Run Data</button></div>
            </Panel>
            <Panel className="ili-panel ili-coverage"><div className="ili-panel-heading"><h3>Pipeline Coverage ({formatValue(selectedPipeline?.pipelineCode)})</h3><button disabled title={blocked}>View Full Map</button></div><div className="ili-coverage-labels"><span>KP {unavailable}</span><span>KP {unavailable}</span></div><div className="ili-coverage-track" aria-label="Coverage data not available">{unavailable}</div><div className="ili-coverage-legend">{["Covered (Latest Run)", "Previously Covered", "No ILI Data", "High Severity"].map((label, index) => <span key={label}><i className={`legend-${index}`} />{label}</span>)}</div></Panel>
          </aside>
        </div>
      </>}
      <style jsx global>{`
        .ili-runs  { --ili-blue:var(--app-primary-text); --ili-ink:var(--app-text-strong); --ili-line:var(--app-border); color:var(--ili-ink); min-width:0; }
        .ili-runs *:where(:not([aria-label="M2 ILI analysis workspace"] *)) { box-sizing:border-box; }
        .ili-runs button:where(:not([aria-label="M2 ILI analysis workspace"] *)),.ili-runs select:where(:not([aria-label="M2 ILI analysis workspace"] *)) { font:inherit; }
        .ili-runs button:where(:not([aria-label="M2 ILI analysis workspace"] *)) { display:inline-flex; align-items:center; justify-content:center; gap:6px; border:1px solid var(--app-border); background:var(--app-surface); border-radius:5px; color:var(--ili-blue); padding:8px 12px; cursor:pointer; white-space:nowrap; transition:background .15s; }
        .ili-runs button:hover:not(:disabled):where(:not([aria-label="M2 ILI analysis workspace"] *)) { background:var(--app-surface-muted); }
        .ili-runs button:focus-visible:where(:not([aria-label="M2 ILI analysis workspace"] *)),.ili-runs select:focus-visible:where(:not([aria-label="M2 ILI analysis workspace"] *)) { outline:2px solid var(--app-border); outline-offset:3px; }
        .ili-runs button:disabled:where(:not([aria-label="M2 ILI analysis workspace"] *)) { opacity:.58; cursor:not-allowed; }
        .ili-runs select:disabled:where(:not([aria-label="M2 ILI analysis workspace"] *)) { color:var(--app-text); background:var(--app-surface-muted); cursor:not-allowed; }
        .ili-runs .ili-primary  { color:var(--app-surface); background:var(--app-primary-text); border-color:var(--app-border); }
        .ili-runs .ili-primary:hover:not(:disabled)  { background:var(--app-primary-text); }
        .ili-runs .ili-heading  { display:flex; align-items:center; justify-content:space-between; gap:18px; margin-bottom:15px; }
        .ili-runs .ili-heading-copy  { display:flex; align-items:center; gap:15px; min-width:0; }
        .ili-runs h2:where(:not([aria-label="M2 ILI analysis workspace"] *)) { font-size:var(--font-size-heading); font-weight:600; line-height:1.2; }
        .ili-runs .ili-heading p  { margin:0; color:var(--app-text-muted); font-size:var(--font-size-body); line-height:1.5; }
        .ili-runs .ili-module-icon  { flex-shrink:0; display:grid; place-items:center; color:var(--app-surface); background:var(--app-primary-text); width:56px; height:56px; border-radius:12px; font-size:var(--font-size-heading); }
        .ili-runs .ili-heading-actions  { text-align:right; flex-shrink:0; }.ili-runs .ili-heading-actions button+button  { margin-left:10px; }
        .ili-runs .ili-breadcrumb  { color:var(--app-primary-text); font-size:var(--font-size-body); margin-bottom:10px; }.ili-runs .ili-breadcrumb span  { margin:0 12px; color:var(--app-primary-text); }
        .ili-runs .ili-kpis  { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)) minmax(210px,1.2fr); gap:10px; margin-bottom:10px; }
        .ili-runs .ili-kpi  { display:flex; align-items:center; gap:16px; min-width:0; }
        .ili-runs .ili-kpi-icon  { width:48px; height:54px; border-radius:11px; color:var(--app-surface); display:grid; place-items:center; font-size:var(--font-size-heading); flex-shrink:0; box-shadow:none; }
        .ili-runs .ili-kpi-icon.blue  { background:var(--app-primary-text); }.ili-runs .ili-kpi-icon.orange  { background:var(--app-primary-text); }.ili-runs .ili-kpi-icon.red  { background:var(--app-primary-text); }.ili-runs .ili-kpi-icon.green  { background:var(--app-primary-text); }
        .ili-runs .ili-kpi strong  { display:block; font-size:var(--font-size-heading); line-height:1.2; overflow-wrap:anywhere; }.ili-runs .ili-kpi span:not(.ili-kpi-icon)  { display:block; margin-top:5px; color:var(--app-text); }.ili-runs .ili-kpi small  { display:block; margin-top:8px; color:var(--app-text-muted); font-size:var(--font-size-body); overflow-wrap:anywhere; }
        .ili-runs .ili-tabs  { display:flex; overflow-x:auto; background:var(--app-surface-muted); border-radius:5px; margin-bottom:14px; gap:0; }
        .ili-runs .ili-tabs button  { padding:13px 12px; font-size:var(--font-size-body); border:1px solid transparent; border-radius:4px; background:transparent; flex:1 0 auto; }.ili-runs .ili-tabs .active  { background:var(--app-surface); border-top-color:var(--app-border); border-bottom-color:var(--app-border); }
        .ili-runs .ili-columns  { display:grid; grid-template-columns:minmax(0,2.45fr) minmax(330px,1fr); gap:12px; align-items:start; }
        .ili-runs .ili-main-column,.ili-runs .ili-side-column  { min-width:0; }.ili-runs .ili-side-column  { display:grid; gap:10px; }
        .ili-runs .ili-panel  { background:var(--app-surface); border:1px solid var(--ili-line); border-radius:16px; padding:20px; box-shadow:var(--app-shadow); min-width:0; }
        .ili-runs h3:where(:not([aria-label="M2 ILI analysis workspace"] *)) { font-size:var(--font-size-label); line-height:1.4; font-weight:600; }.ili-runs .ili-panel-heading  { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:20px; }.ili-runs .ili-panel-heading button  { font-size:var(--font-size-body); padding:20px; }
        .ili-runs .ili-tools  { display:flex; gap:8px; flex-wrap:wrap; }.ili-runs .ili-tools button  { padding:8px 10px; font-size:var(--font-size-body); }
        .ili-runs .ili-filters  { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)) auto auto; align-items:end; gap:9px; margin-bottom:18px; }
        .ili-runs .ili-filters label  { font-size:var(--font-size-body); min-width:0; }.ili-runs select:where(:not([aria-label="M2 ILI analysis workspace"] *)) { border:1px solid var(--app-border); color:var(--app-text); background:var(--app-surface); border-radius:5px; padding:8px 9px; min-width:0; }.ili-runs .ili-filters select  { display:block; width:100%; margin-top:5px; height:33px; }.ili-runs .ili-clear  { background:var(--app-surface-muted); border-color:transparent; }
        .ili-runs .ili-table-scroll  { overflow-x:auto; width:100%; }.ili-runs .ili-register-table  { width:100%; min-width:890px; border-collapse:collapse; font-size:var(--font-size-body); text-align:left; }
        .ili-runs th:where(:not([aria-label="M2 ILI analysis workspace"] *)) { font-weight:600; padding:9px 6px; background:var(--app-surface-muted); white-space:nowrap; }.ili-runs td:where(:not([aria-label="M2 ILI analysis workspace"] *)) { border-bottom:1px solid var(--app-border); padding:8px 6px; color:var(--app-text); overflow-wrap:anywhere; }.ili-runs .ili-register-table td:last-child button  { padding:0 7px; border:0; background:transparent; line-height:1; font-size:var(--font-size-label); }.ili-runs td:first-child:where(:not([aria-label="M2 ILI analysis workspace"] *)) { width:25px; }.ili-runs td:nth-child(2):where(:not([aria-label="M2 ILI analysis workspace"] *)) { min-width:115px; }
        .ili-runs tbody tr:where(:not([aria-label="M2 ILI analysis workspace"] *)) { cursor:pointer; }.ili-runs tbody tr:hover:where(:not([aria-label="M2 ILI analysis workspace"] *)) { background:var(--app-surface-muted); }.ili-runs tbody tr.selected:where(:not([aria-label="M2 ILI analysis workspace"] *)) { background:var(--app-primary-soft); box-shadow:none; }
        .ili-runs input[type=checkbox]:where(:not([aria-label="M2 ILI analysis workspace"] *)) { accent-color:var(--app-primary); width:13px; height:13px; }.ili-runs .ili-link,.ili-runs .ili-sort  { border:0; background:transparent; padding:0; font-size:inherit; }.ili-runs .ili-sort  { color:inherit; }
        .ili-runs .ili-run-status  { display:inline-block; background:var(--app-surface-muted); color:var(--app-text); padding:3px 8px; border-radius:5px; font-size:var(--font-size-body); white-space:nowrap; }
        .ili-runs .ili-pagination  { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-top:18px; font-size:var(--font-size-body); color:var(--app-text-muted); }.ili-runs .ili-pagination>div  { display:flex; gap:7px; align-items:center; }.ili-runs .ili-pagination button  { padding:5px 10px; font-size:var(--font-size-heading); }.ili-runs .ili-page-number  { display:inline-grid; place-items:center; color:var(--app-text); background:var(--app-surface-muted); border-radius:5px; min-width:31px; height:32px; }.ili-runs .ili-pagination label  { display:flex; align-items:center; gap:12px; margin-left:15px; }
        .ili-runs .ili-bottom-panels  { display:grid; grid-template-columns:1fr 1.15fr; gap:10px; margin-top:12px; }.ili-runs .ili-statistics  { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:9px; margin-top:14px; }.ili-runs .ili-statistics>div  { border:1px solid var(--app-border); border-radius:5px; padding:9px 7px; background:var(--app-surface-muted); }.ili-runs .ili-statistics strong  { display:block; margin:9px 0 5px; font-size:var(--font-size-label); overflow-wrap:anywhere; }.ili-runs .ili-statistics span:not(.ili-stat-icon),.ili-runs .ili-statistics small  { display:block; font-size:var(--font-size-body); color:var(--app-text-muted); line-height:1.6; }.ili-runs .ili-stat-icon  { font-size:var(--font-size-heading); }.ili-runs .green .ili-stat-icon  { color:var(--app-text); }.ili-runs .orange .ili-stat-icon  { color:var(--app-text); }.ili-runs .blue .ili-stat-icon  { color:var(--app-text); }.ili-runs .purple .ili-stat-icon  { color:var(--app-text); }
        .ili-runs .ili-timeline  { display:flex; overflow-x:auto; padding:30px 4px 4px; margin-top:7px; }.ili-runs .ili-timeline button  { position:relative; display:flex; flex-direction:column; align-items:center; gap:6px; min-width:85px; flex:1 0 85px; border:0; padding:0 5px; border-radius:0; color:var(--app-text); background:transparent; white-space:normal; font-size:var(--font-size-body); }.ili-runs .ili-timeline button::before  { content:""; position:absolute; height:2px; background:var(--app-surface-muted); top:7px; left:0; right:0; }.ili-runs .ili-timeline button:first-child::before  { left:50%; }.ili-runs .ili-timeline button:last-child::before  { right:50%; }.ili-runs .ili-timeline-dot  { width:15px; height:15px; background:var(--app-primary); border-radius:50%; z-index:1; margin-bottom:5px; }.ili-runs .ili-timeline-dot.chosen  { background:var(--app-primary-text); outline:3px solid var(--app-border); }.ili-runs .ili-timeline small  { color:var(--app-text-muted); }
        .ili-runs .ili-selected-run  { display:flex; gap:12px; margin-bottom:14px; }.ili-runs .ili-run-icon  { display:grid; place-items:center; flex-shrink:0; background:var(--app-surface-muted); color:var(--app-primary-text); border-radius:7px; width:51px; height:51px; font-size:var(--font-size-heading); }.ili-runs .ili-selected-run strong  { display:inline-block; font-size:var(--font-size-label); margin:0 8px 6px 0; overflow-wrap:anywhere; }.ili-runs .ili-selected-run p  { color:var(--app-text-muted); margin:4px 0; font-size:var(--font-size-body); }
        .ili-runs .ili-detail-tabs  { display:flex; gap:0; overflow-x:auto; border-bottom:1px solid var(--app-border); margin:18px -5px 15px; }.ili-runs .ili-detail-tabs button  { border:0; border-bottom:2px solid transparent; border-radius:0; padding:10px 7px; font-size:var(--font-size-body); flex:1 0 auto; }.ili-runs .ili-detail-tabs button.active  { border-bottom-color:var(--app-border); }
        .ili-runs .ili-summary  { display:grid; gap:8px; margin:0; font-size:var(--font-size-body); }.ili-runs .ili-summary>div  { display:grid; grid-template-columns:116px minmax(0,1fr); gap:10px; }.ili-runs dt:where(:not([aria-label="M2 ILI analysis workspace"] *)) { color:var(--app-text-muted); }.ili-runs dd:where(:not([aria-label="M2 ILI analysis workspace"] *)) { margin:0; overflow-wrap:anywhere; }.ili-runs .ili-detail-actions  { display:flex; gap:10px; margin-top:18px; }.ili-runs .ili-detail-actions button  { flex:1; font-size:var(--font-size-body); padding:9px 7px; }.ili-runs .ili-notes  { min-height:310px; }.ili-runs .ili-notes p  { white-space:pre-wrap; overflow-wrap:anywhere; line-height:1.7; }
        .ili-runs .ili-coverage h3  { font-size:var(--font-size-label); }.ili-runs .ili-coverage-labels  { display:flex; justify-content:space-between; font-size:var(--font-size-body); margin-bottom:8px; gap:10px; }.ili-runs .ili-coverage-track  { height:26px; border-radius:4px; border:1px dashed var(--app-border); background:var(--app-surface-muted); color:var(--app-text); text-align:center; line-height:24px; font-size:var(--font-size-body); }.ili-runs .ili-coverage-legend  { display:flex; flex-wrap:wrap; gap:10px; margin-top:18px; font-size:var(--font-size-body); color:var(--app-text-muted); }.ili-runs .ili-coverage-legend span  { display:flex; align-items:center; gap:5px; }.ili-runs .ili-coverage-legend i  { width:10px; height:10px; border-radius:50%; background:var(--app-surface-muted); }.ili-runs .ili-coverage-legend .legend-0  { background:var(--app-surface-muted); }.ili-runs .ili-coverage-legend .legend-1  { background:var(--app-surface-muted); }.ili-runs .ili-coverage-legend .legend-3  { background:var(--app-surface-muted); }
        .ili-runs .ili-notice  { background:var(--app-surface-muted); border:1px solid var(--ili-line); padding:10px 12px; border-radius:5px; color:var(--app-text); margin:0 0 12px; }.ili-runs .ili-empty  { text-align:center; padding:40px 15px; color:var(--app-text-muted); }
        @media(min-width:1500px) { .ili-runs .ili-register  { min-height:470px; }.ili-runs .ili-register-table td  { padding-top:10px; padding-bottom:10px; } }
        @media(max-width:1250px) { .ili-runs .ili-kpis  { grid-template-columns:repeat(3,minmax(0,1fr)); }.ili-runs .ili-columns  { grid-template-columns:minmax(0,1fr); }.ili-runs .ili-side-column  { grid-template-columns:1.3fr 1fr; align-items:start; }.ili-runs .ili-heading  { align-items:flex-start; }.ili-runs .ili-heading-actions  { max-width:230px; }.ili-runs .ili-filters  { grid-template-columns:repeat(5,minmax(0,1fr)) auto auto; } }
        @media(max-width:760px) { .ili-runs .ili-heading  { flex-direction:column; }.ili-runs .ili-heading-actions  { max-width:none; text-align:left; width:100%; }.ili-runs .ili-heading h2  { font-size:var(--font-size-heading); }.ili-runs .ili-kpis  { grid-template-columns:repeat(2,minmax(0,1fr)); }.ili-runs .ili-kpi  { gap:9px; }.ili-runs .ili-kpi strong  { font-size:var(--font-size-label); }.ili-runs .ili-kpi-icon  { width:36px; height:44px; font-size:var(--font-size-heading); }.ili-runs .ili-side-column,.ili-runs .ili-bottom-panels  { grid-template-columns:minmax(0,1fr); }.ili-runs .ili-panel-heading  { align-items:flex-start; flex-wrap:wrap; }.ili-runs .ili-filters  { grid-template-columns:repeat(2,minmax(0,1fr)); }.ili-runs .ili-filters button  { min-height:34px; }.ili-runs .ili-pagination  { flex-wrap:wrap; }.ili-runs .ili-pagination>div  { flex-wrap:wrap; }.ili-runs .ili-panel  { padding:20px; }.ili-runs .ili-detail-actions  { flex-wrap:wrap; }.ili-runs .ili-summary>div  { grid-template-columns:110px minmax(0,1fr); } }
        @media(prefers-reduced-motion:reduce) { .ili-runs button:where(:not([aria-label="M2 ILI analysis workspace"] *)) { transition:none; } }
      `}</style>
    </section>
  );
}

type IliAdditionalProps = {
  view: string; sources: IliRunSource[]; pipelines: PipelineRecord[]; pipelineId: string;
  loading: boolean; loadError: string | null; onPipelineChange: (id: string) => void;
};

function IliUnavailablePanel({ title, reason, labels = [], actions = [] }: { title: string; reason: string; labels?: string[]; actions?: string[] }) {
  return <Panel className="ili-panel"><div className="ili-panel-heading"><h3>{title}</h3><div className="ili-ext-actions">{actions.map((label) => <button key={label} disabled title={`${iliMissing}: ${reason}`}>{label}</button>)}</div></div><div className="ili-ext-unavailable"><strong>{unavailable}</strong><p>{reason}</p></div>{labels.length > 0 && <dl className="ili-ext-metrics">{labels.map((label) => <div key={label}><dt>{label}</dt><dd>{unavailable}</dd></div>)}</dl>}</Panel>;
}

function IliEmptyTable({ title, columns, reason, actions = [] }: { title: string; columns: string[]; reason: string; actions?: string[] }) {
  return <Panel className="ili-panel"><div className="ili-panel-heading"><h3>{title}</h3><div className="ili-ext-actions">{actions.map((label) => <button key={label} disabled title={`${iliMissing}: ${reason}`}>{label}</button>)}</div></div><p className="ili-ext-note">{reason}</p><div className="ili-table-scroll"><table><thead><tr>{columns.map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody><tr><td colSpan={columns.length} className="ili-empty">{unavailable} · {iliMissing}</td></tr></tbody></table></div></Panel>;
}

function IliReferenceFieldsTable({ title, columns, labels }: { title: string; columns: string[]; labels: string[] }) {
  return <Panel className="ili-panel"><h3>{title}</h3><p className="ili-ext-note">Reference field labels only. Configured rules, source values and results: {unavailable} · {iliMissing}.</p><div className="ili-table-scroll"><table><thead><tr>{columns.map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>{labels.map((label) => <tr key={label}><td>{label}</td>{columns.slice(1).map((column) => <td key={column}>{unavailable}</td>)}</tr>)}</tbody></table></div></Panel>;
}

function IliAdditionalView({ view, sources, pipelines, pipelineId, loading, loadError, onPipelineChange }: IliAdditionalProps) {
  const [draftRun, setDraftRun] = useState("");
  const [runId, setRunId] = useState("");
  const [query, setQuery] = useState("");
  const [rawType, setRawType] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [selectedId, setSelectedId] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [detailSection, setDetailSection] = useState("Overview");
  const [sort, setSort] = useState<"id" | "kpKm" | "lengthMm" | "depthMm">("kpKm");
  const [ascending, setAscending] = useState(true);
  const scope = sources.filter((source) => !pipelineId || source.pipeline.id === pipelineId);
  const available = !loading && !loadError && scope.every((source) => iliSourceAvailable(source.anomalies, source.pipeline.id));
  const observations = scope.flatMap((source) => iliSourceAvailable(source.anomalies, source.pipeline.id) ? source.anomalies.data.filter((item) => item.pipelineId === source.pipeline.id) : []);
  const runs = scope.flatMap((source) => iliSourceAvailable(source.runs, source.pipeline.id) ? source.runs.data.filter((item) => item.pipelineId === source.pipeline.id) : []).sort((a, b) => b.inspectionDate.localeCompare(a.inspectionDate));
  const runOptions = new Map(runs.map((run) => [run.id, `${iliDate(run.inspectionDate)} — ${formatValue(run.runReference)}`]));
  observations.forEach((item) => { if (!runOptions.has(item.inspectionRunId)) runOptions.set(item.inspectionRunId, formatValue(item.runReference)); });
  const records = observations.filter((item) => (!runId || item.inspectionRunId === runId) && (!rawType || item.anomalyType === rawType) && (!query.trim() || [item.id, item.featureId, item.kpKm, item.location, item.anomalyType].some((value) => value != null && String(value).toLowerCase().includes(query.trim().toLowerCase())))).sort((a, b) => {
    const left = a[sort], right = b[sort];
    if (left == null) return right == null ? a.id.localeCompare(b.id) : 1;
    if (right == null) return -1;
    const order = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right));
    return (ascending ? order : -order) || a.id.localeCompare(b.id);
  });
  const pages = Math.max(1, Math.ceil(records.length / pageSize));
  const currentPage = Math.min(page, pages);
  const visible = records.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selected = visible.find((item) => item.id === selectedId) ?? visible[0] ?? null;
  const selectedIndex = selected ? visible.indexOf(selected) : -1;
  const pipeline = pipelines.find((item) => item.id === selected?.pipelineId);
  const resetSelection = () => { setPage(1); setSelectedId(""); setDetailsOpen(true); setDetailSection("Overview"); };
  const reset = () => { setDraftRun(""); setRunId(""); setQuery(""); setRawType(""); resetSelection(); };
  const sortBy = (field: typeof sort) => { setSort(field); setAscending(sort === field ? !ascending : true); resetSelection(); };
  const blocked = `${unavailable}: ${iliMissing}. No verified source or approved workflow.`;
  const category = view === "Geometry Analysis" ? "Geometry" : "Crack";
  const selectedFields: Array<[string, string]> = [["ILI Anomaly ID", formatValue(selected?.id)], ["Vendor Feature ID", formatValue(selected?.featureId)], ["Pipeline", pipeline ? `${pipeline.pipelineCode} - ${pipeline.pipelineName}` : unavailable], ["ILI Run", formatValue(selected?.runReference)], ["KP", formatValue(selected?.kpKm, "km")], ["Raw Vendor Type", formatValue(selected?.anomalyType)], [category === "Geometry" ? "Geometry Type" : "Crack Type", unavailable], [category === "Geometry" ? "Dent Depth (mm)" : "Linked Finding", unavailable], ["Raw Depth", formatValue(selected?.depthMm, "mm")], ["Length", formatValue(selected?.lengthMm, "mm")], ["Width", formatValue(selected?.widthMm, "mm")], ["Orientation (°)", unavailable], ["Raw Clock Position", formatValue(selected?.clockPosition)], ["Vendor Classification", unavailable], ["Engineering Classification", unavailable], ["Severity", unavailable], ["Confidence", unavailable], ["Circumferential Position", unavailable], ["Comments", unavailable]];
  const filters = <form className="ili-ext-filters ili-panel" onSubmit={(event) => { event.preventDefault(); setRunId(draftRun); resetSelection(); }}>
    {view === "Geometry Analysis" && <label>Geometry Type<select disabled title={blocked}><option>{unavailable}</option></select></label>}
    <label>Pipeline<select aria-label={`${category} Pipeline`} value={pipelineId} disabled={loading || !!loadError} onChange={(event) => onPipelineChange(event.target.value)}><option value="">All Pipelines</option>{pipelines.map((item) => <option key={item.id} value={item.id}>{item.pipelineCode} - {item.pipelineName}</option>)}</select></label>
    <label>ILI Run<select aria-label={`${category} ILI Run`} value={draftRun} disabled={loading || !runOptions.size} onChange={(event) => setDraftRun(event.target.value)}><option value="">All Runs</option>{Array.from(runOptions, ([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
    {view === "Crack Analysis" && <label>Crack Type<select disabled title={blocked}><option>{unavailable}</option></select></label>}
    {["Severity", "Segment"].map((label) => <label key={label}>{label}<select disabled title={blocked}><option>{unavailable}</option></select></label>)}
    <button type="submit" className="ili-primary" disabled={loading}>Apply Filters</button><button type="button" onClick={reset}>{view === "Crack Analysis" ? "Clear All" : "Reset"}</button>
  </form>;
  const register = <Panel className="ili-panel"><div className="ili-panel-heading"><h3>{category === "Geometry" ? "Geometry Anomalies" : "Crack Features"} ({unavailable})</h3><div className="ili-ext-actions">{(category === "Geometry" ? ["View Geometry Profile", "Compare Runs", "Generate Report"] : ["Export"]).map((label) => <button key={label} disabled title={blocked}>{label}</button>)}<button disabled={!selected} onClick={() => { setDetailsOpen(true); setDetailSection("Overview"); }}>Open Detail</button></div></div>
    <p className="ili-ext-note">Classification and analysis: {unavailable}. This is an accessible raw ILI observation register, not a classified {category.toLowerCase()} population. Vendor measurements are unchanged.</p>
    <div className="ili-ext-search"><label>Search by KP, ID or description<input aria-label={`${category} raw search`} placeholder="Search by KP, ID or description..." value={query} onChange={(event) => { setQuery(event.target.value); resetSelection(); }} /></label><label>Raw Vendor Type<select aria-label={`${category} raw vendor type`} value={rawType} onChange={(event) => { setRawType(event.target.value); resetSelection(); }}><option value="">All reported types</option>{Array.from(new Set(observations.map((item) => item.anomalyType).filter(Boolean))).sort().map((type) => <option key={type}>{type}</option>)}</select></label></div>
    <div className="ili-table-scroll"><table><thead><tr><th>#</th><th><button className="ili-sort" onClick={() => sortBy("id")}>ILI Anomaly ID {sort === "id" ? ascending ? "↑" : "↓" : ""}</button></th><th>Feature ID (Vendor)</th><th><button className="ili-sort" onClick={() => sortBy("kpKm")}>{category === "Crack" ? "Chainage (km)" : "KP (km)"} {sort === "kpKm" ? ascending ? "↑" : "↓" : ""}</button></th><th>{category} Type</th>{category === "Geometry" && <th>Dent Depth (mm)</th>}<th><button className="ili-sort" onClick={() => sortBy("lengthMm")}>Length (mm)</button></th><th>{category === "Geometry" ? "Width (mm)" : "Depth (mm)"}</th><th>Orientation (°)</th>{category === "Geometry" && <th>Ovality (%)</th>}<th>Severity</th><th>{category === "Geometry" ? "Run" : "Confidence"}</th>{category === "Crack" && <th>Linked Records</th>}<th>Raw Vendor Type</th><th>Actions</th></tr></thead><tbody>{visible.map((item, index) => <tr key={item.id} className={selected?.id === item.id ? "selected" : ""} onClick={() => { setSelectedId(item.id); setDetailsOpen(true); setDetailSection("Overview"); }}><td>{(currentPage - 1) * pageSize + index + 1}</td><td><button className="ili-link" aria-label={`Select ${category.toLowerCase()} raw anomaly ${item.id}`} onClick={() => { setSelectedId(item.id); setDetailsOpen(true); }}>{item.id}</button></td><td>{formatValue(item.featureId)}</td><td>{formatValue(item.kpKm)}</td><td>{unavailable}</td>{category === "Geometry" && <td>{unavailable}</td>}<td>{formatValue(item.lengthMm)}</td><td>{formatValue(category === "Geometry" ? item.widthMm : item.depthMm)}</td><td>{unavailable}</td>{category === "Geometry" && <td>{unavailable}</td>}<td>{unavailable}</td><td>{category === "Geometry" ? formatValue(item.runReference) : unavailable}</td>{category === "Crack" && <td>{unavailable}</td>}<td>{formatValue(item.anomalyType)}</td><td><button disabled title={blocked} aria-label={`Unavailable actions for ${item.id}`}>⋯</button></td></tr>)}{!visible.length && <tr><td colSpan={category === "Geometry" ? 14 : 13} className="ili-empty">{loading ? "Loading accessible raw observations…" : available ? "No raw observations match the filters. Classified population is Not Available." : unavailable}</td></tr>}</tbody></table></div>
    <div className="ili-ext-pagination"><span>{available ? `${records.length} raw observations` : `${records.length} accessible raw observations; total ${unavailable}`} · Page {currentPage} of {pages}</span><div><button aria-label={`${category} previous page`} disabled={currentPage <= 1} onClick={() => { setPage(currentPage - 1); setSelectedId(""); }}>‹</button><button aria-label={`${category} next page`} disabled={currentPage >= pages} onClick={() => { setPage(currentPage + 1); setSelectedId(""); }}>›</button><label>Rows per page<select aria-label={`${category} rows per page`} value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); resetSelection(); }}>{[8, 25, 50, 100].map((size) => <option key={size}>{size}</option>)}</select></label></div></div>
  </Panel>;
  const detail = detailsOpen && <Panel className="ili-panel"><div className="ili-panel-heading"><h3>{category === "Geometry" ? "Selected Geometry Feature" : "Selected Crack Detail"}</h3><button aria-label={`Close ${category.toLowerCase()} details`} onClick={() => setDetailsOpen(false)}>×</button></div><p className="ili-ext-note">Raw record · Classification: {unavailable}</p><div className="ili-ext-pagination"><button aria-label={`${category} previous feature`} disabled={selectedIndex <= 0} onClick={() => setSelectedId(visible[selectedIndex - 1].id)}>‹</button><strong>{formatValue(selected?.featureId)}</strong><button aria-label={`${category} next feature`} disabled={selectedIndex < 0 || selectedIndex >= visible.length - 1} onClick={() => setSelectedId(visible[selectedIndex + 1].id)}>›</button></div><nav className="ili-detail-tabs" aria-label={`${category} detail sections`}>{["Overview", category === "Geometry" ? "Geometry Profile" : "Crack Profile", "Images", "Run Comparison", "Notes"].map((label) => <button key={label} disabled={label !== "Overview"} title={label !== "Overview" ? blocked : undefined} aria-current={detailSection === label ? "page" : undefined} className={detailSection === label ? "active" : ""} onClick={() => setDetailSection(label)}>{label}</button>)}</nav><dl className="ili-ext-fields">{selectedFields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><IliUnavailablePanel title={category === "Geometry" ? "Cross-section View" : "View ILI Image / View 3D Model"} reason="No linked image, profile or model is available." /><div className="ili-ext-actions">{(category === "Geometry" ? ["View Geometry Profile", "Compare Runs"] : ["View Details", "View ILI Image", "View 3D Model", "Open in GIS", "Create Finding", "Compare with Previous Run"]).map((label) => <button disabled title={blocked} key={label}>{label}</button>)}</div></Panel>;
  return <section className="ili-extended" aria-label={`${view} workspace`}>
    {!["Geometry Analysis", "Crack Analysis"].includes(view) ? <IliDomainView view={view} sources={sources} pipelines={pipelines} pipelineId={pipelineId} loading={loading} loadError={loadError} onPipelineChange={onPipelineChange} /> : <>{filters}<p className="ili-notice" role="status">{loading ? "Loading authenticated records… " : loadError ?? (!available ? "Some sources are Not Available. " : "")}{iliMissing}: approved {category.toLowerCase()} classification, severity, confidence, segment, orientation in degrees, profiles, linked records and engineering assessments. Raw types are never inferred as categories.</p>
    {category === "Crack" ? <div className="ili-ext-grid four"><IliUnavailablePanel title="Crack Feature Summary" reason="Approved crack category mapping and engineering concerns are missing." labels={["Total Cracks", "High Concern", "Max Depth", "Avg Depth (mm)", "Max Length", "Avg Length (mm)"]} /><IliUnavailablePanel title="Crack Type Distribution" reason="No approved crack type dictionary or classified population." labels={["Cracks", "Longitudinal", "Circumferential", "Helical", "Complex", "Other"]} /><IliUnavailablePanel title="Crack Length vs Depth" reason="Raw measurements cannot be plotted as cracks without approved classification." labels={["Length (mm)", "Depth (mm)", "Low", "Medium", "High"]} /><IliUnavailablePanel title="Crack Locations" reason="Verified coordinates and crack classifications are missing." labels={["High", "Medium", "Low", "Selected"]} actions={["Open in GIS"]} /></div> : <>
    <div className="ili-ext-grid four"><IliUnavailablePanel title="Dent Overview" reason="Approved geometry classification and severity rules are missing." labels={["Dents Detected", "Total", "High", "Medium", "Low"]} actions={["View Details"]} /><IliUnavailablePanel title="Ovality Statistics" reason="No verified ovality measurements or assessment." labels={["Max Ovality", "Average Ovality", "Distance (km)", "%"]} actions={["View Details"]} /><IliUnavailablePanel title="Bend Strain / Geometric Deformation" reason="No verified strain measurements or design limit." labels={["Max Bend Strain", "Average Strain", "Bend Strain", "Design Limit", "Distance (km)", "%"]} actions={["View Details"]} /><IliUnavailablePanel title="Geometry Feature Location" reason="No verified feature coordinates or route mapping." labels={["High", "Medium", "Low"]} actions={["View Full Map"]} /></div>
    <Panel className="ili-panel"><h3>Geometry Feature Categories</h3><div className="ili-ext-categories">{["Dents", "Ovality", "Bends / Strain", "Wrinkles", "Buckles", "Other Deformations"].map((label) => <div key={label}><span>{label}</span><strong>{unavailable}</strong><button disabled title={blocked}>View →</button></div>)}</div></Panel>
    </>}
    <div className="ili-ext-grid register"><div>{register}</div><aside>{detail}{category === "Crack" && <IliUnavailablePanel title="Comparison with Previous Run" reason="ILI_Feature_Group_ID, accepted matches, overlapping coverage and growth provenance are missing." labels={["Previous Run", "Length Change", "Depth Change", "Growth Rate (mm/year)", "Status"]} actions={["View Trend"]} />}</aside></div>
    {category === "Crack" && <footer className="ili-ext-pagination"><span>KLINTHRU ? ? {new Date().getUTCFullYear()} Klinthru. All rights reserved.</span><div><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/contact">Support</a><span>Version: {unavailable}</span></div></footer>}
    </>}
    <style jsx global>{`
      .ili-runs .ili-extended  { min-width:0; }.ili-runs .ili-extended .ili-panel  { padding:20px; margin-bottom:12px; background:var(--app-surface); border:1px solid var(--ili-line); border-radius:16px; box-shadow:var(--app-shadow); }.ili-runs .ili-extended h3  { font-size:var(--font-size-label); }.ili-runs .ili-extended .ili-panel-heading  { margin-bottom:12px; flex-wrap:wrap; }.ili-runs .ili-ext-grid  { display:grid; gap:12px; align-items:start; }.ili-runs .ili-ext-grid.four  { grid-template-columns:repeat(4,minmax(0,1fr)); }.ili-runs .ili-ext-grid.three  { grid-template-columns:repeat(3,minmax(0,1fr)); }.ili-runs .ili-ext-grid.two  { grid-template-columns:repeat(2,minmax(0,1fr)); }.ili-runs .ili-ext-grid.register  { grid-template-columns:minmax(0,2.4fr) minmax(300px,1fr); }.ili-runs .ili-ext-grid>div,.ili-runs .ili-ext-grid>aside  { min-width:0; }
      .ili-runs .ili-ext-filters  { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)) auto auto; align-items:end; gap:12px; }.ili-runs .ili-ext-filters label,.ili-runs .ili-ext-search label  { font-size:var(--font-size-body); min-width:0; }.ili-runs .ili-ext-filters select,.ili-runs .ili-ext-search input,.ili-runs .ili-ext-search select  { display:block; width:100%; margin-top:5px; height:35px; }.ili-runs .ili-ext-search  { display:grid; grid-template-columns:minmax(0,2fr) minmax(0,1fr); gap:12px; margin-bottom:12px; }.ili-runs .ili-ext-search input,.ili-runs .ili-extended input  { border:1px solid var(--app-border); border-radius:5px; padding:8px; color:var(--app-text); min-width:0; background:var(--app-surface); }.ili-runs .ili-ext-actions  { display:flex; gap:7px; flex-wrap:wrap; }.ili-runs .ili-ext-actions button  { font-size:var(--font-size-body); padding:7px 9px; }.ili-runs .ili-extended a  { color:var(--app-text); text-decoration:underline; font-size:var(--font-size-label); }
      .ili-runs .ili-ext-unavailable  { min-height:100px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; padding:15px; border:1px dashed var(--app-border); background:var(--app-surface-muted); border-radius:5px; text-align:center; color:var(--app-text-muted); }.ili-runs .ili-ext-unavailable p  { font-size:var(--font-size-body); line-height:1.6; margin:0; }.ili-runs .ili-ext-metrics  { font-size:var(--font-size-body); margin:10px 0 0; }.ili-runs .ili-ext-metrics>div  { display:flex; justify-content:space-between; gap:9px; margin-top:8px; }.ili-runs .ili-ext-metrics dd  { margin:0; color:var(--app-text); }.ili-runs .ili-ext-note  { font-size:var(--font-size-body); line-height:1.6; color:var(--app-text-muted); margin:10px 0; }.ili-runs .ili-ext-categories  { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:8px; margin-top:12px; }.ili-runs .ili-ext-categories>div  { background:var(--app-surface-muted); border:1px solid var(--app-border); border-radius:5px; padding:10px; font-size:var(--font-size-body); min-width:0; }.ili-runs .ili-ext-categories strong  { display:block; font-size:var(--font-size-label); margin:8px 0; }.ili-runs .ili-ext-categories button  { font-size:var(--font-size-body); padding:3px 8px; }
      .ili-runs .ili-extended .ili-table-scroll  { position:relative; max-width:100%; overflow:auto; contain:layout paint; }.ili-runs .ili-extended table  { width:100%; min-width:800px; border-collapse:collapse; font-size:var(--font-size-body); text-align:left; }.ili-runs .ili-extended td,.ili-runs .ili-extended th  { padding:9px 7px; }.ili-runs .ili-extended td  { min-width:78px; white-space:nowrap; }.ili-runs .ili-extended td:first-child  { min-width:30px; }.ili-runs .ili-extended td .ili-link  { min-width:140px; }.ili-runs .ili-ext-chart-scroll  { max-width:100%; overflow:auto; contain:layout paint; }.ili-runs .ili-ext-chart-scroll svg  { min-width:500px; }.ili-runs .ili-extended td .ili-link  { white-space:normal; text-align:left; overflow-wrap:anywhere; }.ili-runs .ili-ext-pagination  { display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; margin:12px 0; font-size:var(--font-size-body); }.ili-runs .ili-ext-pagination>div,.ili-runs .ili-ext-pagination label  { display:flex; align-items:center; flex-wrap:wrap; gap:7px; }.ili-runs .ili-ext-fields  { font-size:var(--font-size-body); margin:12px 0; }.ili-runs .ili-ext-fields>div  { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.4fr); gap:10px; margin-bottom:9px; }.ili-runs .ili-ext-fields dt  { color:var(--app-text-muted); }.ili-runs .ili-ext-fields dd  { margin:0; overflow-wrap:anywhere; font-weight:600; }.ili-runs .ili-extended strong  { overflow-wrap:anywhere; }.ili-runs .ili-extended .ili-detail-tabs  { overflow-x:auto; }.ili-runs .ili-extended .ili-detail-tabs button  { flex-shrink:0; }
      @media(max-width:1450px) { .ili-runs .ili-ext-grid.four,.ili-runs .ili-ext-grid.three  { grid-template-columns:repeat(2,minmax(0,1fr)); }.ili-runs .ili-ext-grid.register  { grid-template-columns:minmax(0,1fr); }.ili-runs .ili-ext-filters  { grid-template-columns:repeat(4,minmax(0,1fr)); }.ili-runs .ili-ext-categories  { grid-template-columns:repeat(3,minmax(0,1fr)); } }
      @media(max-width:760px) { .ili-runs .ili-ext-grid.four,.ili-runs .ili-ext-grid.three,.ili-runs .ili-ext-grid.two,.ili-runs .ili-ext-grid.register  { grid-template-columns:minmax(0,1fr); }.ili-runs .ili-ext-filters,.ili-runs .ili-ext-categories  { grid-template-columns:repeat(2,minmax(0,1fr)); }.ili-runs .ili-ext-search  { grid-template-columns:minmax(0,1fr); } }
    `}</style>
  </section>;
}

function IliRunCountsChart({ runs, sources }: { runs: IliRunSummary[]; sources: IliRunSource[] }) {
  const sorted = runs.slice().sort((a, b) => a.inspectionDate.localeCompare(b.inspectionDate) || a.id.localeCompare(b.id));
  const values = sorted.map((run) => iliRunCount(run, sources));
  if (!sorted.length || sorted.some((run) => !Number.isFinite(Date.parse(run.inspectionDate))) || values.some((value) => typeof value !== "number")) return <div className="ili-ext-unavailable"><strong>{unavailable}</strong><p>Complete accessible run dates and anomaly counts are required.</p></div>;
  const counts = values as number[];
  const max = Math.max(...counts);
  const denominator = max || 1;
  const x = (index: number) => sorted.length === 1 ? 300 : 55 + index * 490 / (sorted.length - 1);
  const y = (value: number) => 155 - value / denominator * 120;
  return <><div className="ili-ext-chart-scroll"><svg viewBox="0 0 600 225" role="img" aria-label="Accessible raw anomaly counts by inspection run; not matched-feature growth" style={{ width: "100%", minHeight: 180 }}><title>Raw ILI observation counts by inspection run</title><line x1="55" x2="545" y1="155" y2="155" stroke="var(--app-border)" /><line x1="55" x2="55" y1="25" y2="155" stroke="var(--app-border)" /><text x="43" y="160" textAnchor="end" fontSize="11" fill="var(--app-text-muted)">0</text>{max > 0 && <text x="43" y="40" textAnchor="end" fontSize="11" fill="var(--app-text-muted)">{max}</text>}<polyline points={counts.map((count, index) => `${x(index)},${y(count)}`).join(" ")} fill="none" stroke="var(--app-primary)" strokeWidth="2" />{sorted.map((run, index) => <g key={run.id}><circle cx={x(index)} cy={y(counts[index])} r="4" fill="var(--app-primary)"><title>{run.runReference}: {counts[index]} raw observations · {iliDate(run.inspectionDate)}</title></circle><text x={x(index)} y={y(counts[index]) - 10} fontSize="11" textAnchor="middle" fill="var(--app-text-strong)">{counts[index]}</text>{sorted.length <= 8 && <text x={x(index)} y="177" fontSize="9" textAnchor="middle" fill="var(--app-text-muted)">{iliDate(run.inspectionDate)}</text>}</g>)}<text x="300" y="210" fontSize="11" textAnchor="middle" fill="var(--app-text-muted)">Inspection Date · Total Anomalies</text></svg></div><p className="ili-ext-note">Each point counts accessible observations in one run, including measured zero counts. Counts do not establish physical-feature growth. High Severity: {unavailable}.</p></>;
}

function IliYearCountsChart({ runs, sources }: { runs: IliRunSummary[]; sources: IliRunSource[] }) {
  const years = new Map<string, number>();
  for (const run of runs) {
    const count = iliRunCount(run, sources);
    if (typeof count !== "number" || !Number.isFinite(Date.parse(run.inspectionDate))) return <div className="ili-ext-unavailable">{unavailable}: complete run dates and counts are required.</div>;
    const year = run.inspectionDate.slice(0, 4);
    years.set(year, (years.get(year) ?? 0) + count);
  }
  const points = Array.from(years).sort(([a], [b]) => a.localeCompare(b));
  if (!points.length) return <div className="ili-ext-unavailable">{unavailable}: no accessible inspection years.</div>;
  const max = Math.max(...points.map(([, value]) => value));
  const step = 490 / points.length;
  return <><div className="ili-ext-chart-scroll"><svg viewBox="0 0 600 225" role="img" aria-label="Raw observation counts summed by inspection year" style={{ width: "100%", minHeight: 180 }}><title>Accessible raw observations by inspection year</title><line x1="55" x2="545" y1="155" y2="155" stroke="var(--app-border)" /><text x="43" y="160" textAnchor="end" fontSize="11" fill="var(--app-text-muted)">0</text>{points.map(([year, count], index) => { const height = count / (max || 1) * 120; return <g key={year}><rect x={55 + index * step + step * .15} y={155 - height} width={step * .7} height={height} fill="var(--app-primary)"><title>{year}: {count} raw observations</title></rect><text x={55 + (index + .5) * step} y={145 - height} textAnchor="middle" fontSize="11" fill="var(--app-text-strong)">{count}</text><text x={55 + (index + .5) * step} y="180" textAnchor="middle" fontSize="10" fill="var(--app-text-muted)">{year}</text></g>; })}<text x="300" y="210" textAnchor="middle" fontSize="11" fill="var(--app-text-muted)">Inspection Year · Anomaly Count</text></svg></div><p className="ili-ext-note">Sum of accessible observations in each inspection year; repeat observations across runs are not deduplicated physical features.</p></>;
}

function IliDomainView({ view, sources, pipelines, pipelineId, loading, loadError, onPipelineChange }: IliAdditionalProps) {
  const [baseline, setBaseline] = useState("");
  const [comparison, setComparison] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [historyRun, setHistoryRun] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [historySelectedId, setHistorySelectedId] = useState("");
  const [historyAscending, setHistoryAscending] = useState(false);
  const [historyDetails, setHistoryDetails] = useState(false);
  const [historyQuery, setHistoryQuery] = useState("");
  const scope = sources.filter((source) => !pipelineId || source.pipeline.id === pipelineId);
  const runs = scope.flatMap((source) => iliSourceAvailable(source.runs, source.pipeline.id) ? source.runs.data.filter((run) => run.pipelineId === source.pipeline.id) : []).sort((a, b) => a.inspectionDate.localeCompare(b.inspectionDate));
  const blocked = `${iliMissing}: no approved source field, rule or workflow.`;
  const notice = <p className="ili-notice" role="status">{loading ? "Loading authenticated records… " : loadError ?? ""}{iliMissing}: Feature Group identity, approved matching, growth, coverage, QC, findings and versioned rule snapshots are not exposed by the existing ILI APIs. Missing analysis is never zero or approved.</p>;
  const pipelineFilter = <label>Pipeline<select aria-label={`${view} Pipeline`} value={pipelineId} disabled={loading || !!loadError} onChange={(event) => onPipelineChange(event.target.value)}><option value="">All Pipelines</option>{pipelines.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.pipelineCode} - {pipeline.pipelineName}</option>)}</select></label>;
  const runSelect = (label: string, value: string, change: (id: string) => void) => <label>{label}<select aria-label={label} value={value} onChange={(event) => change(event.target.value)} disabled={loading || !runs.length}><option value="">Select run</option>{runs.map((run) => <option key={run.id} value={run.id}>{formatValue(pipelines.find((pipeline) => pipeline.id === run.pipelineId)?.pipelineCode)} | {iliDate(run.inspectionDate)} ({formatValue(run.toolType)}) — {formatValue(run.runReference)}</option>)}</select></label>;
  if (view === "Actions" || view === "Documents") return <>{notice}<Panel className="ili-panel"><h3>{view}</h3><p className="ili-ext-note">{view === "Actions" ? "The Central Integrity Action Register owns Action_ID. No independent ILI action records or automatic actions are created." : "Document Management owns original files and Document_ID. ILI does not store a second file repository."}</p><div className="ili-ext-filters">{pipelineFilter}</div></Panel>{view === "Actions" ? <IliEmptyTable title="ILI Action References" columns={["Action_ID", "ILI_Finding_ID", "Status"]} reason="The central action register route and ILI action associations are not verified. No screenshot was supplied for this tab." /> : <><IliEmptyTable title="ILI Document References" columns={["Document_ID", "ILI_Run_ID", "ILI_Anomaly_ID"]} reason="Document Management exists, but typed ILI run/anomaly Document_ID associations are missing. Pipeline-linked documents cannot be assumed to be ILI source files." /><Panel className="ili-panel"><a href="/document-upload">Open Document Management</a><p className="ili-ext-note">Opens the existing repository; no ILI-filtered document list or source-file link is claimed.</p></Panel></>}</>;
  if (view === "Configuration") {
    const fields = (labels: string[]) => <dl className="ili-ext-fields">{labels.map((label) => <div key={label}><dt>{label}</dt><dd><select aria-label={label} disabled title={blocked}><option>{unavailable}</option></select></dd></div>)}</dl>;
    return <>{notice}<Panel className="ili-panel"><div className="ili-panel-heading"><div><h3>Configuration</h3><p className="ili-ext-note">Configure analysis parameters, classification rules, dictionaries, and system settings for ILI Analysis.</p></div><div className="ili-ext-actions">{["Manage Dictionaries", "Open Integration Mapping", "Reset Defaults", "Save Configuration"].map((label) => <button disabled key={label} title={blocked}>{label}</button>)}</div></div><p className="ili-ext-note">Configuration values, enabled states, recipients and approval snapshots are not exposed. No screenshot defaults are applied. Previously approved processing, Master revision, mapping and QC snapshots must remain immutable.</p></Panel>
      <div className="ili-ext-grid three"><div><IliReferenceFieldsTable title="Analysis Thresholds" columns={["Anomaly Type", "Report Threshold", "High Severity Threshold", "Units"]} labels={["Metal Loss (Wall Loss)", "Geometry (Dent)", "Geometry (Buckle)", "Crack (Axial)", "Crack (Circumferential)"]} /><p className="ili-ext-note">Set detection and reporting thresholds for anomaly types. Reference unit labels: % WT, % OD, mm. Configured units: {unavailable}.</p></div><div><IliReferenceFieldsTable title="Anomaly Classification Rules" columns={["Rule Name", "Condition", "Severity", "Action"]} labels={["Deep Metal Loss", "Moderate Metal Loss", "Large Dent", "Moderate Dent", "Axial Crack"]} /><p className="ili-ext-note">Define rules for automatic classification and severity assignment. Listed rule names are reference labels, not installed rules.</p><button disabled title={blocked}>+ Add Classification Rule</button></div><Panel className="ili-panel"><h3>Correlation &amp; Matching Tolerances</h3><p className="ili-ext-note">Set tolerances for matching anomalies between runs and data sources.</p>{fields(["Axial Correlation Tolerance", "Circumferential Correlation Tolerance", "Feature Matching Tolerance (Length)", "Feature Matching Tolerance (Depth)", "Multi-Tool Correlation Window"])}</Panel>
      <Panel className="ili-panel"><h3>Crack &amp; Geometry Dictionaries</h3><p className="ili-ext-note">Manage defect type dictionaries, mappings and attributes.</p>{["Crack Dictionary", "Geometry Dictionary"].map((label) => <div key={label}><h4>{label}</h4><p className="ili-ext-note">{label === "Crack Dictionary" ? "Types, orientations, morphology and attributes." : "Dents, buckles, wrinkles and other geometry features."}</p><button disabled title={blocked}>Manage Dictionary</button></div>)}</Panel><Panel className="ili-panel"><h3>Growth Analysis Settings</h3><p className="ili-ext-note">Configure parameters for anomaly growth calculation.</p>{fields(["Minimum Growth Threshold", "Minimum Time Between Runs", "Growth Model", "Consider Measurement Uncertainty", "Flag for Review (Low Confidence)"])}</Panel><Panel className="ili-panel"><h3>Data Validation Controls</h3><p className="ili-ext-note">Set quality checks and validation rules for imported ILI data.</p>{fields(["Validate Tool Configuration", "Check for Missing Channels", "Outlier Detection", "Geometric Consistency Check", "Minimum Data Coverage", "Block Import on Critical Errors"])}</Panel>
      <Panel className="ili-panel"><h3>Workflow &amp; Permissions</h3><p className="ili-ext-note">Manage user access and approval workflows for ILI Analysis.</p>{fields(["Configuration Edit Permission", "Rule Change Approval", "Allow User-Defined Classifications", "Audit Configuration Changes"])}</Panel><Panel className="ili-panel"><h3>Notification Settings</h3><p className="ili-ext-note">Configure alerts and notifications for key events.</p>{fields(["Notify on High Severity Anomalies", "Notify on Data Quality Issues", "Notify on Growth Exceedance", "Notify on Import Completion", "Email Recipients"])}</Panel><Panel className="ili-panel"><h3>Integration &amp; Data Mapping</h3><p className="ili-ext-note">Configure data exchange with external systems. Connector, staging and mapping administration belongs to Integration Hub.</p>{fields(["ECDA System Mapping", "Risk Assessment Mapping", "Data Export Format"])}<button disabled title={blocked}>Open Integration Mapping</button><p><a href="/integration-hub">Open Integration Hub</a></p><p className="ili-ext-note">Opens existing connector administration. An ILI mapping editor and configured/sync status are not verified.</p></Panel></div>
    </>;
  }
  if (view === "Trends & Historical") {
    const runsAvailable = !loading && !loadError && scope.every((source) => iliSourceAvailable(source.runs, source.pipeline.id));
    const filtered = runs.filter((run) => (!historyRun || run.id === historyRun) && (!dateRange.from || run.inspectionDate.slice(0, 10) >= dateRange.from) && (!dateRange.to || run.inspectionDate.slice(0, 10) <= dateRange.to) && (!historyQuery.trim() || [run.id, run.runReference, run.toolType, run.vendor].some((value) => value?.toLowerCase().includes(historyQuery.trim().toLowerCase())))).sort((a, b) => (historyAscending ? 1 : -1) * (a.inspectionDate.localeCompare(b.inspectionDate) || a.id.localeCompare(b.id)));
    const pages = Math.max(1, Math.ceil(filtered.length / 8));
    const current = Math.min(historyPage, pages);
    const visible = filtered.slice((current - 1) * 8, current * 8);
    const selected = visible.find((run) => run.id === historySelectedId) ?? visible[0] ?? null;
    const pipeline = pipelines.find((item) => item.id === pipelineId);
    return <>{notice}<form className="ili-ext-filters ili-panel" onSubmit={(event) => { event.preventDefault(); setHistoryRun(baseline); setDateRange({ from: fromDate, to: toDate }); setHistoryPage(1); setHistorySelectedId(""); }}>{pipelineFilter}<label>Segment<select disabled title={blocked}><option>{unavailable}</option></select></label>{runSelect("Run Range", baseline, setBaseline)}<label>Anomaly Type<select disabled title={blocked}><option>{unavailable}</option></select></label><label>Date Range ? From<input aria-label="Historical from date" type="date" value={fromDate} max={toDate || undefined} onChange={(event) => setFromDate(event.target.value)} /></label><label>To<input aria-label="Historical to date" type="date" value={toDate} min={fromDate || undefined} onChange={(event) => setToDate(event.target.value)} /></label><button className="ili-primary" type="submit">Apply Filters</button><button type="button" onClick={() => { setBaseline(""); setHistoryRun(""); setFromDate(""); setToDate(""); setDateRange({ from: "", to: "" }); setHistoryQuery(""); setHistoryPage(1); setHistorySelectedId(""); }}>Reset</button></form>
      <div className="ili-ext-grid three"><Panel className="ili-panel"><h3>Year-over-Year Anomaly Trend</h3>{runsAvailable ? <IliYearCountsChart runs={filtered} sources={scope} /> : <div className="ili-ext-unavailable">{unavailable}</div>}<p className="ili-ext-note">Total: accessible observation counts by inspection year. Metal Loss, Geometry and Crack series: {unavailable}.</p></Panel><Panel className="ili-panel"><h3>Anomalies by ILI Run</h3>{runsAvailable ? <IliRunCountsChart runs={filtered} sources={scope} /> : <div className="ili-ext-unavailable">{unavailable}</div>}<p className="ili-ext-note">Severity stacks (Low, Medium, High, Critical): {unavailable}.</p></Panel><IliUnavailablePanel title="Historical Severity Trend" reason="Historical engineering severity and immutable rule versions are missing." labels={["Percentage of Anomalies", "Low", "Medium", "High", "Critical"]} /></div>
      <div className="ili-ext-grid three"><Panel className="ili-panel"><h3>Inspection History Timeline</h3><div className="ili-timeline">{filtered.slice().reverse().map((run) => <button key={run.id} aria-label={`Select historical run ${run.runReference}`} onClick={() => { setHistorySelectedId(run.id); setHistoryPage(Math.floor(filtered.indexOf(run) / 8) + 1); setHistoryDetails(true); }}><span className="ili-timeline-dot" /><strong>{iliDate(run.inspectionDate)}</strong><span>{formatValue(run.runReference)}</span><small>{formatValue(run.toolType)}</small><small>Coverage: {unavailable}</small></button>)}</div>{!filtered.length && <p className="ili-empty">{runsAvailable ? "No accessible runs match the filters." : unavailable}</p>}</Panel><IliUnavailablePanel title="Anomaly Growth Summary" reason="Run counts do not establish physical-feature growth; accepted Feature Group matches are required." labels={["Total Growth", "Metal Loss", "Geometry", "Crack", "vs. previous run"]} /><IliUnavailablePanel title="Historical Coverage" reason="Run coverage and overlap are missing. Pipeline length is Master context only." labels={["Cumulative Coverage", "Remaining", "%", "km"]} /><Panel className="ili-panel"><h3>Total Pipeline Length</h3><strong>{typeof pipeline?.pipeLengthKm === "number" && Number.isFinite(pipeline.pipeLengthKm) ? formatValue(pipeline.pipeLengthKm, "km") : unavailable}</strong><p className="ili-ext-note">Current selected Pipeline Master; not inspected or cumulative coverage.</p></Panel></div>
      <Panel className="ili-panel"><div className="ili-panel-heading"><h3>Historical ILI Runs</h3><div className="ili-ext-actions"><button disabled={!selected} onClick={() => setHistoryDetails(!historyDetails)}>View History</button><button disabled title={blocked}>Compare Years</button><button disabled={!selected} onClick={() => setHistoryDetails(true)}>Open Historical Run</button><button disabled title={blocked}>Export Trend Report</button></div></div><div className="ili-ext-search"><label>Search historical runs<input aria-label="Search historical runs" value={historyQuery} placeholder="Run ID, reference, tool or vendor" onChange={(event) => { setHistoryQuery(event.target.value); setHistoryPage(1); setHistorySelectedId(""); }} /></label></div><div className="ili-table-scroll"><table><thead><tr><th>Run ID</th><th><button className="ili-sort" onClick={() => { setHistoryAscending(!historyAscending); setHistoryPage(1); }}>Inspection Date {historyAscending ? "?" : "?"}</button></th>{["Pipeline", "Segment", "Tool Type", "Distance (km)", "Total Anomalies", "Low", "Medium", "High", "Critical", "Data Quality", "Actions"].map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>{visible.map((run) => <tr key={run.id} className={selected?.id === run.id ? "selected" : ""} onClick={() => { setHistorySelectedId(run.id); setHistoryDetails(true); }}><td><button className="ili-link" onClick={() => { setHistorySelectedId(run.id); setHistoryDetails(true); }}>{formatValue(run.runReference)}</button></td><td>{iliDate(run.inspectionDate)}</td><td>{formatValue(pipelines.find((item) => item.id === run.pipelineId)?.pipelineCode)}</td><td>{unavailable}</td><td>{formatValue(run.toolType)}</td><td>{unavailable}</td><td>{iliRunCount(run, scope)}</td>{["low", "medium", "high", "critical", "qc"].map((key) => <td key={key}>{unavailable}</td>)}<td><button disabled title={blocked}>?</button></td></tr>)}{!visible.length && <tr><td colSpan={13} className="ili-empty">{runsAvailable ? "No accessible runs match the filters." : unavailable}</td></tr>}</tbody></table></div><div className="ili-ext-pagination"><span>{runsAvailable ? filtered.length : unavailable} accessible runs ? Page {current} of {pages}</span><div><button aria-label="Previous historical page" disabled={current <= 1} onClick={() => setHistoryPage(current - 1)}>?</button><button aria-label="Next historical page" disabled={current >= pages} onClick={() => setHistoryPage(current + 1)}>?</button></div></div></Panel>
      {historyDetails && <Panel className="ili-panel"><div className="ili-panel-heading"><h3>Historical Run Details</h3><button onClick={() => setHistoryDetails(false)}>Close</button></div><dl className="ili-ext-fields">{[["ILI Run ID", formatValue(selected?.id)], ["Run Reference", formatValue(selected?.runReference)], ["Inspection Date", iliDate(selected?.inspectionDate)], ["Status", formatValue(selected?.status)], ["Vendor", formatValue(selected?.vendor)], ["Tool Type", formatValue(selected?.toolType)], ["Notes", formatValue(selected?.notes)], ["Created", iliDate(selected?.createdAt)], ["Total Anomalies", String(iliRunCount(selected, scope))]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></Panel>}
    </>;
  }
  if (view === "Findings") return <>{notice}<Panel className="ili-panel"><div className="ili-panel-heading"><div><h3>Findings</h3><p className="ili-ext-note">Review, manage and track ILI findings, link to defects, ECDA and risk, and drive actions to closure.</p></div><div className="ili-ext-actions">{["Create Finding", "View Details", "Link to Defect", "Assign Action", "Generate Report"].map((label) => <button key={label} disabled title={blocked}>{label}</button>)}</div></div><div className="ili-ext-filters">{["Finding Status", "Severity"].map((label) => <label key={label}>{label}<select disabled title={blocked}><option>{unavailable}</option></select></label>)}{runSelect("ILI Run", baseline, setBaseline)}{pipelineFilter}<label>Owner<select disabled title={blocked}><option>{unavailable}</option></select></label><button onClick={() => setBaseline("")}>Clear Filters</button></div><div className="ili-ext-search"><label>Search findings<input disabled placeholder="Search findings, anomaly ID or location..." title={blocked} /></label></div></Panel>
    <div className="ili-ext-grid register"><div><div className="ili-ext-grid three"><IliUnavailablePanel title="Findings Summary" reason="No ILI_Finding_ID model or read API is available." labels={["Total Findings", "Closed", "Open", "Overdue"]} /><IliUnavailablePanel title="Open vs Closed Findings" reason="Anomaly and assessment status cannot substitute for finding workflow status." labels={["Findings", "Closed", "Open", "Overdue"]} /><IliUnavailablePanel title="Findings by Severity" reason="No engineering finding severity or approved rules." labels={["Critical", "High", "Medium", "Low", "Info"]} /></div><IliEmptyTable title="Findings Register (Not Available)" columns={["Finding ID", "Source Anomaly", "Pipeline / KP", "Feature Type", "Severity", "Status", "Owner", "Linked Items", "Created", "Due Date", "Actions"]} reason="ILI_Anomaly_ID is not ILI_Finding_ID or Defect_ID. No findings are inferred from raw observations." /><div className="ili-ext-pagination"><span>Finding count: {unavailable}</span><div><button disabled title={blocked}>Previous page</button><span>{unavailable}</span><button disabled title={blocked}>Next page</button><label>Rows per page<select disabled title={blocked}><option>{unavailable}</option></select></label></div></div></div><aside><IliUnavailablePanel title="Selected Finding" reason="No accessible ILI finding record or accepted downstream linkage is exposed." labels={["Finding ID", "Source Anomaly", "ILI Run", "Pipeline / KP", "Feature Type", "Severity", "Status", "Owner", "Created", "Last Updated", "Description", "Tags"]} /><nav className="ili-detail-tabs" aria-label="Finding detail sections">{["Details", "Linked Items", "Actions", "History"].map((label) => <button disabled title={blocked} key={label}>{label}</button>)}</nav><p className="ili-ext-note">Confirmed defects use Defect_ID; official risk uses Risk_ID; actions use central Action_ID. No defect or action is created automatically.</p></aside></div>
  </>;
  if (view === "Data Quality") return <>{notice}<Panel className="ili-panel"><div className="ili-panel-heading"><div><h3>Run Data Quality</h3><p className="ili-ext-note">Validate and assess ILI run data quality, completeness, and consistency before analysis.</p></div><div className="ili-ext-actions">{["View Validation Log", "Resolve Issue", "Reprocess", "Export QC Report"].map((label) => <button key={label} disabled title={blocked}>{label}</button>)}</div></div><div className="ili-ext-filters">{runSelect("ILI Run", baseline, setBaseline)}{pipelineFilter}{["Status", "Issue Type", "Date Range"].map((label) => <label key={label}>{label}<select disabled title={blocked}><option>{unavailable}</option></select></label>)}<button onClick={() => setBaseline("")}>Clear Filters</button></div><p className="ili-ext-note">Run selection sets context only; no QC results are exposed. Source readiness is not a QC score.</p><dl className="ili-ext-fields">{scope.map((source) => <div key={source.pipeline.id}><dt>{source.pipeline.pipelineCode} · Source readiness</dt><dd>{source.readiness?.pipelineId === source.pipeline.id ? formatValue(source.readiness.reason) : unavailable}</dd></div>)}</dl></Panel>
    <div className="ili-ext-grid four"><IliUnavailablePanel title="Data Validation Score" reason="Version-controlled QC rule set, checks and approved scores are missing." labels={["Overall", "Pass", "Warning", "Fail", "Checks Performed"]} /><IliUnavailablePanel title="Completeness Checks" reason="Expected channels, coverage and completeness results are not available." labels={["Geometry Data", "MFL Data", "Caliper Data", "Position Data", "Metadata"]} /><IliEmptyTable title="File Import Status" columns={["File", "Status", "Size"]} reason="Source files belong to Document Management; verified Document_ID links are missing." /><IliReferenceFieldsTable title="Channel / Data Field Quality" columns={["Channel / Field", "Quality Score", "Status"]} labels={["Axial Position", "MFL X", "MFL Y", "Caliper (OD)", "Tool Orientation", "Temperature", "Pressure"]} /></div>
    <div className="ili-ext-grid two"><IliUnavailablePanel title="Data Quality Timeline" reason="Processing versions, execution times and approval snapshots are missing." labels={["File Import", "Format Validation", "Completeness Check", "Data Mapping", "Unit Validation", "QC Rules", "Final Score"]} /><IliEmptyTable title="Recent Data Quality Exceptions" columns={["#", "Date/Time", "Channel / Field", "Issue Type", "Description", "Severity", "Status"]} reason="No typed QC exception model or API." actions={["View All"]} /></div>
    <Panel className="ili-panel"><div className="ili-ext-search"><label>Search validation results<input placeholder="Search validation results..." disabled title={blocked} /></label><label>Category<select disabled title={blocked}><option>{unavailable}</option></select></label></div><IliReferenceFieldsTable title="Run Validation Results" columns={["Category", "Checks Performed", "Passed", "Warnings", "Failed", "Score", "Status", "Details", "Actions"]} labels={["File Format Validation", "Data Completeness", "Channel Mapping", "Unit & Scale Validation", "Data Consistency", "Tool Configuration", "QC Rule Engine"]} /></Panel>
  </>;
  return <>{notice}<Panel className="ili-panel"><div className="ili-panel-heading"><div><h3>Run Comparison &amp; Growth</h3><p className="ili-ext-note">Compare ILI runs over time, track anomaly growth, and identify new and changing features.</p></div><div className="ili-ext-actions">{["Compare Runs", "View Matched Features", "Export Comparison", "Open Detail"].map((label) => <button key={label} disabled title={blocked}>{label}</button>)}</div></div><div className="ili-ext-filters">{pipelineFilter}{runSelect("Baseline Run", baseline, setBaseline)}{runSelect("Comparison Run", comparison, setComparison)}<label>Pipeline Section (Optional)<select disabled title={blocked}><option>{unavailable}</option></select></label><button className="ili-primary" disabled title={blocked}>Compare Runs</button></div><p className="ili-ext-note">Run selections are context only. Comparison requires the same pipeline, verified coverage overlap and accepted ILI_Feature_Group_ID matches; selecting two runs does not establish a match.</p></Panel>
    <div className="ili-ext-grid four"><Panel className="ili-panel"><h3>Anomaly Growth Trend</h3><p className="ili-ext-note">Total and high severity anomalies across runs</p>{loading || loadError || scope.some((source) => !iliSourceAvailable(source.runs, source.pipeline.id)) ? <div className="ili-ext-unavailable">{unavailable}</div> : <IliRunCountsChart runs={runs.filter((run) => (!baseline && !comparison) || run.id === baseline || run.id === comparison)} sources={scope} />}</Panel><IliUnavailablePanel title="Anomaly Correlation" reason="Feature matching between selected runs requires ILI_Feature_Group_ID and approved matches." labels={["Matched Features", "Matched", "New", "Not Matched"]} /><IliUnavailablePanel title="Growth Categories" reason="Change in metal loss for matched features requires approved category mapping and growth results." labels={["Features", "Significant Growth", "Moderate Growth", "No Significant Change", "Reduced"]} /><IliUnavailablePanel title="Coverage Overlap" reason="Spatial coverage comparison between runs is not available." labels={["Baseline Run", "Comparison Run", "Overlap", "km", "%"]} /></div>
    <div className="ili-ext-grid three"><IliEmptyTable title="Matched Features (Sample)" columns={["Feature ID", "KP (km)", "Type", "Baseline Depth (%)", "Baseline Length (mm)", "Comparison Depth (%)", "Comparison Length (mm)", "Growth", "Status", "Actions"]} reason="Matching requires ILI_Feature_Group_ID. Vendor Feature ID equality does not establish the same physical feature." actions={["View All Matched Features"]} /><IliUnavailablePanel title="Anomaly Change Summary" reason="Comparison of anomalies between selected runs requires accepted match records." labels={["New Anomalies", "Unchanged", "Growing Anomalies", "Significantly Growing", "% of total"]} /><IliEmptyTable title="Top Growing Features" columns={["Feature ID", "KP (km)", "Growth (Δ%)", "Final Depth (%)"]} reason="Features with highest metal loss growth are not available without approved matches and calculations." actions={["View All Growing Features"]} /></div>
  </>;
}

function IliMetalLossView({ sources, pipelines, pipelineId, loading, loadError, onPipelineChange }: {
  sources: IliRunSource[]; pipelines: PipelineRecord[]; pipelineId: string; loading: boolean; loadError: string | null; onPipelineChange: (id: string) => void;
}) {
  const [draftRun, setDraftRun] = useState("");
  const [runId, setRunId] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState("");
  const [expanded, setExpanded] = useState(false);
  const missing = "MISSING FIELD — APPROVAL NEEDED";
  const blocked = `${unavailable}: ${missing}. No verified source or approved workflow.`;
  const scope = sources.filter((source) => !pipelineId || source.pipeline.id === pipelineId);
  const available = !loading && !loadError && scope.every((source) => iliSourceAvailable(source.anomalies, source.pipeline.id));
  const observations = scope.flatMap((source) => iliSourceAvailable(source.anomalies, source.pipeline.id)
    ? source.anomalies.data.filter((record) => record.pipelineId === source.pipeline.id) : []);
  const runs = scope.flatMap((source) => iliSourceAvailable(source.runs, source.pipeline.id)
    ? source.runs.data.filter((run) => run.pipelineId === source.pipeline.id) : []);
  const runOptions = new Map(runs.map((run) => [run.id, `${iliDate(run.inspectionDate)} — ${formatValue(run.runReference)} (${formatValue(run.toolType)})`]));
  observations.forEach((record) => { if (!runOptions.has(record.inspectionRunId)) runOptions.set(record.inspectionRunId, `${iliDate(record.inspectionDate)} — ${formatValue(record.runReference)}`); });
  // Raw observations are browsable, but never treated as a classified metal-loss population.
  const records = observations.filter((record) => !runId || record.inspectionRunId === runId);
  const pages = Math.max(1, Math.ceil(records.length / 10));
  const currentPage = Math.min(page, pages);
  const visible = records.slice((currentPage - 1) * 10, currentPage * 10);
  const selected = visible.find((record) => record.id === selectedId) ?? visible[0] ?? null;
  const selectedRun = runs.find((run) => run.id === selected?.inspectionRunId && run.pipelineId === selected?.pipelineId);
  const pipeline = pipelines.find((item) => item.id === (selected?.pipelineId ?? pipelineId));
  const master = pipelines.find((item) => item.id === pipelineId);
  const nominalWt = (record: PipelineRecord | undefined) => typeof record?.nominalWallThickness === "number" && Number.isFinite(record.nominalWallThickness) && record.nominalWallThickness > 0
    ? formatValue(record.nominalWallThickness, "mm") : unavailable;
  const fields: Array<[string, string]> = [
    ["ILI Anomaly ID", formatValue(selected?.id)], ["Vendor Feature ID", formatValue(selected?.featureId)],
    ["KP (km)", formatValue(selected?.kpKm)], ["Depth (% WT)", formatValue(selected?.depthPercent)],
    ["Depth (mm)", formatValue(selected?.depthMm)], ["Remaining WT (mm)", unavailable],
    ["Length (mm)", formatValue(selected?.lengthMm)], ["Width (mm)", formatValue(selected?.widthMm)],
    ["Circ. Position (°)", unavailable], ["Raw Vendor Type", formatValue(selected?.anomalyType)],
    ["Pipeline", pipeline ? `${formatValue(pipeline.pipelineCode)} - ${formatValue(pipeline.pipelineName)}` : unavailable],
    ["Run", selected ? `${iliDate(selectedRun?.inspectionDate ?? selected.inspectionDate)} (${formatValue(selectedRun?.toolType)})` : unavailable],
    ["Nominal WT (current Master)", nominalWt(pipeline)], ["Segment", unavailable], ["Cluster", unavailable],
    ["Status", unavailable], ["Correlation", unavailable]
  ];
  const panels = [
    { title: "Metal Loss Depth Distribution", axes: "Count · Metal Loss Depth (% WT)", reason: "Approved metal-loss classification and depth-bin rules are not available.", legend: ["Total Anomalies"] },
    { title: "Anomalies by KP vs Depth", axes: "Metal Loss Depth (% WT) · Kilometre Point (KP)", reason: "Metal-loss population and engineering severity are not verified.", legend: ["Low", "Medium", "High", "Critical"] },
    { title: "Corrosion Cluster Heatmap", axes: "Kilometre Point (KP)", reason: "Cluster membership and heatmap metrics are not available.", legend: ["Low", "High"] },
    { title: "Remaining Wall Thickness", axes: "Wall Thickness (mm) · Kilometre Point (KP)", reason: "Applicable WT revisions, calculation provenance, measured series and minimum WT are not verified.", legend: ["Nominal WT", "Measured WT", "Minimum WT"] }
  ];
  return <section className="ili-metal" aria-label="Metal Loss Analysis workspace">
    <form className="ili-metal-filters ili-panel" onSubmit={(event) => { event.preventDefault(); setRunId(draftRun); setPage(1); setSelectedId(""); setExpanded(false); }}>
      <label>Pipeline<select aria-label="Metal Loss Pipeline" value={pipelineId} disabled={loading || !!loadError} onChange={(event) => onPipelineChange(event.target.value)}><option value="">All Pipelines</option>{pipelines.map((item) => <option key={item.id} value={item.id}>{item.pipelineCode} - {item.pipelineName}</option>)}</select></label>
      <label>ILI Run<select aria-label="Metal Loss ILI Run" value={draftRun} disabled={loading || !runOptions.size} onChange={(event) => setDraftRun(event.target.value)}><option value="">All Runs</option>{Array.from(runOptions, ([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      {["Segment", "Depth Band", "Feature Status", "Correlation State"].map((label) => <label key={label}>{label}<select aria-label={`Metal Loss ${label}`} disabled title={blocked}><option>{unavailable}</option></select></label>)}
      <button type="button" onClick={() => { setDraftRun(""); setRunId(""); setPage(1); setSelectedId(""); setExpanded(false); }}>Reset</button><button className="ili-primary" type="submit" disabled={loading || !!loadError}>Apply Filters</button>
    </form>
    <p className="ili-notice" role="status">{loading ? "Loading authenticated ILI records…" : loadError ?? (!available ? "Some source records are Not Available. Only accessible raw records are shown. " : "")}Metal-loss analysis: {unavailable}. {missing}: approved classification, severity, clustering, correlation, thresholds, segment association, circumferential degrees, growth and axial profile. Raw vendor measurements remain unchanged.</p>
    <div className="ili-metal-charts">{panels.map((panel) => <Panel className="ili-panel" key={panel.title}><h3>{panel.title}</h3><div className="ili-metal-unavailable"><strong>{unavailable}</strong><p>{panel.reason}</p><small>{panel.axes}</small></div><div className="ili-metal-legend" aria-label={`${panel.title} labels; data unavailable`}>{panel.legend.map((label) => <span key={label}>{label}{label === "Total Anomalies" ? `: ${unavailable}` : ""}</span>)}</div></Panel>)}</div>
    <div className="ili-metal-summaries">
      <Panel className="ili-panel"><h3>Severity Summary</h3><div className="ili-metal-severity">{["Low", "Medium", "High", "Critical"].map((label) => <div key={label}><strong>{unavailable}</strong><span>{label}</span><small>{unavailable}</small></div>)}</div><p className="ili-metal-total">{unavailable} · Total Metal Loss Features</p></Panel>
      <Panel className="ili-panel"><h3>Wall Loss Histogram (All Features)</h3><div className="ili-metal-unavailable"><strong>{unavailable}</strong><p>Population and bin rules are not verified.</p><small>Count · Wall Loss (% WT)</small></div></Panel>
      <Panel className="ili-panel"><h3>Average Remaining Wall Thickness</h3><strong className="ili-metal-value">{unavailable}</strong><div className="ili-metal-wt"><div>Nominal WT<strong>{nominalWt(master)}</strong><small>Current Pipeline Master · mm</small></div><div>Minimum WT (Design)<strong>{unavailable}</strong></div></div><p className="ili-metal-note">Current Master WT is not an approved historical calculation input.</p></Panel>
      <Panel className="ili-panel"><h3>Locations Exceeding Thresholds</h3><div className="ili-metal-wt">{["≥ 50% WT Loss", "≥ 30% WT Loss"].map((label) => <div key={label}><strong>{unavailable}</strong>{label}</div>)}</div><p className="ili-metal-note">Threshold rules and population: {unavailable}.</p></Panel>
    </div>
    <div className="ili-metal-bottom">
      <Panel className="ili-panel"><div className="ili-panel-heading"><h3>Top Metal Loss Locations</h3><button disabled title={blocked}><Download size={13} />Download</button></div>
        <p className="ili-metal-note">Metal-loss ranking: {unavailable}. The register below shows raw ILI observations only; no metal-loss classification or ranking is inferred.</p>
        <div className="ili-table-scroll"><table className="ili-metal-table"><thead><tr>{["#", "KP (km)", "Depth (% WT)", "Remaining WT (mm)", "Length (mm)", "Circ. Pos. (°)", "Severity", "Cluster", "Status", "Correlation", "Actions"].map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>
          {visible.map((record, index) => <tr key={record.id} className={selected?.id === record.id ? "selected" : ""} onClick={() => { setSelectedId(record.id); setExpanded(false); }}><td><button className="ili-link" aria-label={`Select raw ILI anomaly ${record.id}`} aria-pressed={selected?.id === record.id} onClick={() => { setSelectedId(record.id); setExpanded(false); }}>{(currentPage - 1) * 10 + index + 1}</button></td><td>{formatValue(record.kpKm)}</td><td>{formatValue(record.depthPercent)}</td><td>{unavailable}</td><td>{formatValue(record.lengthMm)}</td>{["circumference", "severity", "cluster", "status", "correlation"].map((field) => <td key={field}>{unavailable}</td>)}<td><button disabled title={blocked} aria-label={`Actions unavailable for raw anomaly ${record.id}`}><MoreVertical size={13} /></button></td></tr>)}
          {!visible.length && <tr><td colSpan={11} className="ili-empty">{loading ? "Loading raw ILI observations…" : available ? "No raw ILI observations match the current filters. Metal-loss population is Not Available." : unavailable}</td></tr>}
        </tbody></table></div>
        <div className="ili-metal-pagination"><span>{available ? `${records.length} raw ILI observations` : `${records.length} accessible raw ILI observations; total ${unavailable}`}</span><div><button aria-label="Previous raw ILI page" disabled={currentPage <= 1} onClick={() => { setPage(currentPage - 1); setSelectedId(""); setExpanded(false); }}>‹</button><span>Page {currentPage} of {pages}</span><button aria-label="Next raw ILI page" disabled={currentPage >= pages} onClick={() => { setPage(currentPage + 1); setSelectedId(""); setExpanded(false); }}>›</button></div></div>
      </Panel>
      <Panel className="ili-panel"><div className="ili-panel-heading"><h3>Selected Feature Details</h3><div className="ili-metal-pagination"><button aria-label="Previous raw feature" disabled={!selected || visible.indexOf(selected) <= 0} onClick={() => { setSelectedId(visible[visible.indexOf(selected!) - 1].id); setExpanded(false); }}>‹</button><span>{selected ? `${visible.indexOf(selected) + 1} of ${visible.length}` : unavailable}</span><button aria-label="Next raw feature" disabled={!selected || visible.indexOf(selected) >= visible.length - 1} onClick={() => { setSelectedId(visible[visible.indexOf(selected!) + 1].id); setExpanded(false); }}>›</button></div></div>
        <p className="ili-metal-note">Raw observation · Metal-loss classification: {unavailable}</p>
        <div className="ili-metal-detail-grid"><dl className="ili-metal-fields">{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><div><h4>Metal Loss Profile (Axial View)</h4><div className="ili-metal-unavailable"><strong>{unavailable}</strong><p>Axial samples are not available.</p><small>% WT Loss · Axial Position (mm)</small></div></div></div>
        <div className="ili-metal-actions"><button className="ili-primary" disabled={!selected} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}><FileText size={13} />View Details</button>{["View in GIS", "Compare with Previous Run", "Send to Defect Manager"].map((label) => <button key={label} disabled title={blocked}>{label}</button>)}</div>
        {expanded && <dl className="ili-metal-fields ili-metal-extra"><div><dt>Run Reference</dt><dd>{formatValue(selected?.runReference)}</dd></div><div><dt>Raw Clock Position</dt><dd>{formatValue(selected?.clockPosition)}</dd></div><div><dt>Raw Surface Orientation</dt><dd>{formatValue(selected?.orientation)}</dd></div><div><dt>Vendor Classification</dt><dd>{unavailable}</dd></div><div><dt>Engineering Classification</dt><dd>{unavailable}</dd></div><div><dt>Remaining WT Provenance</dt><dd>{unavailable}: applicable WT revision and calculation provenance are not verified.</dd></div></dl>}
      </Panel>
    </div>
    <style jsx global>{`
      .ili-runs .ili-metal  { min-width:0; }.ili-runs .ili-metal .ili-panel  { padding:20px; }.ili-runs .ili-metal h3  { font-size:var(--font-size-label); }.ili-runs .ili-metal h4  { font-size:var(--font-size-body); font-weight:600; margin:0 0 10px; }
      .ili-runs .ili-metal-filters  { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)) auto auto; gap:12px; align-items:end; margin-bottom:12px; }.ili-runs .ili-metal-filters label  { font-size:var(--font-size-body); min-width:0; }.ili-runs .ili-metal-filters select  { display:block; width:100%; margin-top:5px; height:34px; }.ili-runs .ili-metal-filters button  { min-height:34px; font-size:var(--font-size-body); }
      .ili-runs .ili-metal-charts  { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin-bottom:10px; }.ili-runs .ili-metal-unavailable  { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; min-height:155px; text-align:center; padding:14px; margin-top:12px; background:var(--app-surface-muted); border:1px dashed var(--app-border); border-radius:5px; color:var(--app-text-muted); }.ili-runs .ili-metal-unavailable strong  { font-size:var(--font-size-label); }.ili-runs .ili-metal-unavailable p  { font-size:var(--font-size-body); line-height:1.6; margin:0; }.ili-runs .ili-metal-unavailable small  { font-size:var(--font-size-body); }.ili-runs .ili-metal-legend  { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; color:var(--app-text-muted); font-size:var(--font-size-body); margin-top:12px; }
      .ili-runs .ili-metal-summaries  { display:grid; grid-template-columns:1.6fr 1.25fr 1fr 1fr; gap:10px; margin-bottom:10px; }.ili-runs .ili-metal-severity  { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:7px; margin-top:14px; }.ili-runs .ili-metal-severity>div,.ili-runs .ili-metal-wt>div  { background:var(--app-surface-muted); border:1px solid var(--app-border); border-radius:5px; padding:10px; font-size:var(--font-size-body); min-width:0; }.ili-runs .ili-metal-severity strong,.ili-runs .ili-metal-severity span,.ili-runs .ili-metal-severity small  { display:block; margin-bottom:6px; }.ili-runs .ili-metal-severity strong  { font-size:var(--font-size-label); }.ili-runs .ili-metal-total  { text-align:right; font-size:var(--font-size-body); margin:12px 0 0; }.ili-runs .ili-metal-value  { display:block; font-size:var(--font-size-heading); margin:14px 0; }.ili-runs .ili-metal-wt  { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px; margin-top:13px; }.ili-runs .ili-metal-wt strong  { display:block; margin:8px 0; font-size:var(--font-size-label); }.ili-runs .ili-metal-note  { font-size:var(--font-size-body); line-height:1.6; color:var(--app-text-muted); margin:10px 0; }.ili-runs .ili-metal-summaries .ili-metal-unavailable  { min-height:110px; }
      .ili-runs .ili-metal-bottom  { display:grid; grid-template-columns:minmax(0,1.25fr) minmax(0,1fr); gap:10px; align-items:start; }.ili-runs .ili-metal .ili-panel-heading  { margin-bottom:10px; }.ili-runs .ili-metal .ili-table-scroll  { position:relative; max-width:100%; overflow:auto; contain:layout paint; }.ili-runs .ili-metal-table  { width:100%; min-width:1050px; border-collapse:collapse; text-align:left; font-size:var(--font-size-body); }.ili-runs .ili-metal-table th,.ili-runs .ili-metal-table td  { padding:9px 7px; }.ili-runs .ili-metal-pagination  { display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; font-size:var(--font-size-body); margin-top:10px; }.ili-runs .ili-metal-pagination>div  { display:flex; align-items:center; gap:8px; }.ili-runs .ili-metal-pagination button  { padding:3px 9px; font-size:var(--font-size-heading); }.ili-runs .ili-metal-detail-grid  { display:grid; grid-template-columns:minmax(0,1.5fr) minmax(0,1fr); gap:14px; }.ili-runs .ili-metal-fields  { margin:0; font-size:var(--font-size-body); }.ili-runs .ili-metal-fields>div  { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.3fr); gap:9px; padding:5px 0; }.ili-runs .ili-metal-fields dt  { color:var(--app-text-muted); }.ili-runs .ili-metal-fields dd  { margin:0; font-weight:600; overflow-wrap:anywhere; }.ili-runs .ili-metal-actions  { display:flex; flex-wrap:wrap; gap:8px; border-top:1px solid var(--app-border); padding-top:12px; margin-top:14px; }.ili-runs .ili-metal-actions button  { font-size:var(--font-size-body); padding:8px; }.ili-runs .ili-metal-extra  { margin-top:14px; }.ili-runs .ili-metal strong  { overflow-wrap:anywhere; }
      @media(max-width:1450px) { .ili-runs .ili-metal-filters  { grid-template-columns:repeat(4,minmax(0,1fr)); }.ili-runs .ili-metal-charts,.ili-runs .ili-metal-summaries  { grid-template-columns:repeat(2,minmax(0,1fr)); }.ili-runs .ili-metal-bottom  { grid-template-columns:minmax(0,1fr); } }
      @media(max-width:760px) { .ili-runs .ili-metal-filters  { grid-template-columns:repeat(2,minmax(0,1fr)); }.ili-runs .ili-metal-charts,.ili-runs .ili-metal-summaries,.ili-runs .ili-metal-detail-grid  { grid-template-columns:minmax(0,1fr); }.ili-runs .ili-metal-severity  { grid-template-columns:repeat(2,minmax(0,1fr)); } }
    `}</style>
  </section>;
}

type IliAnomalySort = "id" | "kpKm" | "anomalyType" | "depthPercent";
const anomalyColumns = ["Anomaly ID", "Pipeline / KP", "Type", "Feature Class", "Dimensions (mm)", "Depth (%)", "Severity", "Correlation", "Linked Module"];

function iliDimensions(record: IliAnomalySummary | null, withUnit = false) {
  if (!record || (record.lengthMm == null && record.widthMm == null)) return unavailable;
  return `${formatValue(record.lengthMm)} x ${formatValue(record.widthMm)}${withUnit ? " mm" : ""}`;
}

function IliAnomaliesView({ sources, pipelines, pipelineId, loading, loadError, onPipelineChange }: {
  sources: IliRunSource[]; pipelines: PipelineRecord[]; pipelineId: string; loading: boolean; loadError: string | null; onPipelineChange: (id: string) => void;
}) {
  const [runId, setRunId] = useState("");
  const [rawType, setRawType] = useState("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<IliAnomalySort>("kpKm");
  const [ascending, setAscending] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [selectedId, setSelectedId] = useState("");
  const [closed, setClosed] = useState(false);
  const [shownColumns, setShownColumns] = useState(anomalyColumns);
  const blocked = "Not Available: no supported source field or approved workflow exists for this control.";

  useEffect(() => { setRunId(""); setRawType(""); setQuery(""); setSearch(""); setPage(1); setSelectedId(""); setClosed(false); }, [pipelineId]);

  const scope = sources.filter((source) => !pipelineId || source.pipeline.id === pipelineId);
  const available = !loading && !loadError && scope.every((source) => iliSourceAvailable(source.anomalies, source.pipeline.id));
  const observations = useMemo(() => sources.flatMap((source) => iliSourceAvailable(source.anomalies, source.pipeline.id)
    ? source.anomalies.data.filter((record) => record.pipelineId === source.pipeline.id) : []), [sources]);
  const scoped = observations.filter((record) => !pipelineId || record.pipelineId === pipelineId);
  const runOptions = new Map<string, string>();
  scope.forEach((source) => {
    if (iliSourceAvailable(source.runs, source.pipeline.id)) source.runs.data.filter((run) => run.pipelineId === source.pipeline.id).forEach((run) => runOptions.set(run.id, formatValue(run.runReference)));
  });
  scoped.forEach((record) => { if (!runOptions.has(record.inspectionRunId)) runOptions.set(record.inspectionRunId, formatValue(record.runReference)); });
  const pipelineCode = (id: string | undefined) => formatValue(pipelines.find((pipeline) => pipeline.id === id)?.pipelineCode);
  const filtered = scoped.filter((record) => (!runId || record.inspectionRunId === runId) && (!rawType || record.anomalyType === rawType)
    && (!search || record.id.toLowerCase().includes(search) || (record.kpKm != null && String(record.kpKm).includes(search)))).slice().sort((a, b) => {
      const left = a[sort], right = b[sort];
      if (left == null || left === "") return right == null || right === "" ? a.id.localeCompare(b.id) : 1;
      if (right == null || right === "") return -1;
      const result = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right));
      return (ascending ? result : -result) || a.id.localeCompare(b.id);
    });
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selected = closed ? null : filtered.find((record) => record.id === selectedId) ?? visible[0] ?? null;
  const master = pipelines.find((pipeline) => pipeline.id === selected?.pipelineId);
  const select = (record: IliAnomalySummary) => { setSelectedId(record.id); setClosed(false); };
  const resetSelection = () => { setPage(1); setSelectedId(""); setClosed(false); };
  const reset = () => { setRunId(""); setRawType(""); setQuery(""); setSearch(""); setSort("kpKm"); setAscending(true); resetSelection(); };
  const sortBy = (field: IliAnomalySort) => { setAscending(sort === field ? !ascending : true); setSort(field); setPage(1); };
  const count = available ? filtered.length.toLocaleString("en-GB") : unavailable;
  const detailFields: Array<[string, string | number]> = [
    ["Anomaly ID", formatValue(selected?.id)], ["Vendor Feature ID", formatValue(selected?.featureId)],
    ["ILI Run", formatValue(selected?.runReference)], ["Pipeline", master ? `${formatValue(master.pipelineCode)} - ${formatValue(master.pipelineName)}` : unavailable],
    ["KP", formatValue(selected?.kpKm, "km")], ["Type", formatValue(selected?.anomalyType)], ["Feature Class", unavailable],
    ["Vendor Classification", unavailable], ["Engineering Classification", unavailable], ["Dimensions (L x W)", iliDimensions(selected, true)],
    ["Depth", formatValue(selected?.depthPercent, "%WT")], ["Depth (mm)", formatValue(selected?.depthMm, "mm")],
    ["Severity", unavailable], ["Confidence", unavailable], ["Correlation Status", unavailable], ["Linked Module", unavailable], ["Comments", unavailable]
  ];
  const cell = (record: IliAnomalySummary, column: string) => {
    switch (column) {
      case "Anomaly ID": return <button className="ili-link" onClick={() => select(record)}>{formatValue(record.id)}</button>;
      case "Pipeline / KP": return `${pipelineCode(record.pipelineId)} / ${formatValue(record.kpKm)}`;
      case "Type": return formatValue(record.anomalyType);
      case "Dimensions (mm)": return iliDimensions(record);
      case "Depth (%)": return formatValue(record.depthPercent);
      default: return unavailable;
    }
  };
  const sortFields: Partial<Record<string, IliAnomalySort>> = { "Anomaly ID": "id", "Pipeline / KP": "kpKm", "Type": "anomalyType", "Depth (%)": "depthPercent" };

  return <section className="ili-anomalies" aria-label="ILI Anomalies workspace">
    {(loading || loadError || !available) && <p className="ili-notice" role="status">{loading ? "Loading authenticated ILI anomalies…" : loadError ?? "Not Available for some sources. Only accessible observation records are shown; a complete total is not available."}</p>}
    <form className="ili-anomaly-filters" onSubmit={(event) => { event.preventDefault(); setSearch(query.trim().toLowerCase()); resetSelection(); }}>
      <label>Pipeline<select aria-label="Anomaly Pipeline" value={pipelineId} disabled={loading || !!loadError} onChange={(event) => { reset(); onPipelineChange(event.target.value); }}><option value="">All Pipelines</option>{pipelines.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.pipelineCode} - {pipeline.pipelineName}</option>)}</select></label>
      <label>ILI Run<select aria-label="ILI Run" value={runId} disabled={loading} onChange={(event) => { setRunId(event.target.value); setRawType(""); resetSelection(); }}><option value="">All Runs</option>{Array.from(runOptions).map(([id, reference]) => <option key={id} value={id}>{reference} ({id})</option>)}</select></label>
      <label>Anomaly Type<select aria-label="Anomaly Type" title="Raw vendor/source type" value={rawType} disabled={loading} onChange={(event) => { setRawType(event.target.value); resetSelection(); }}><option value="">All Types</option>{Array.from(new Set(scoped.filter((record) => !runId || record.inspectionRunId === runId).map((record) => record.anomalyType).filter(Boolean))).sort().map((type) => <option key={type}>{type}</option>)}</select></label>
      <label>Severity<select aria-label="Severity" disabled title={blocked}><option>All Severities</option></select></label>
      <label>Status<select aria-label="Anomaly Status" disabled title={blocked}><option>All Statuses</option></select></label>
      <label className="ili-anomaly-search"><span className="sr-only">Search by Anomaly ID or KP</span><Search size={16} aria-hidden="true" /><input aria-label="Search by Anomaly ID or KP" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by Anomaly ID or KP..." /></label>
      <button className="ili-primary" type="submit" disabled={loading}><Search size={14} aria-hidden="true" />Search</button><button type="button" onClick={reset}>Reset</button>
    </form>
    <div className={closed ? "ili-anomaly-layout ili-anomaly-closed" : "ili-anomaly-layout"}>
      <div className="ili-anomaly-main">
        <div className="ili-anomaly-charts">
          <Panel className="ili-panel ili-anomaly-map"><h3>Anomaly Location Map</h3><div className="ili-map-controls"><div><button disabled title={blocked}>Map</button><button disabled title={blocked}>Satellite</button></div><div><button disabled title={blocked} aria-label="Zoom in unavailable">+</button><button disabled title={blocked} aria-label="Zoom out unavailable">−</button><button disabled title={blocked} aria-label="Fullscreen map unavailable"><Maximize size={13} /></button></div></div><div className="ili-visual-unavailable"><strong>{unavailable}</strong><span>Anomaly coordinates and route mapping are not available.</span></div><div className="ili-map-legend" aria-label="Map legend only; no mapped observations">{["High", "Medium", "Low", "Geometry", "Other"].map((label, index) => <span key={label}><i className={`anomaly-color-${index}`} />{label}</span>)}</div></Panel>
          <Panel className="ili-panel"><h3>Anomaly Distribution by Feature Class</h3><div className="ili-chart-unavailable"><strong>{unavailable}</strong><span>Total Anomalies</span><small>Feature-class distribution is not available.</small></div><dl className="ili-unavailable-values">{["Metal Loss", "Geometry", "Crack", "Construction", "Other"].map((label) => <div key={label}><dt>{label}</dt><dd>{unavailable}</dd></div>)}</dl></Panel>
          <Panel className="ili-panel"><h3>Anomalies by Severity</h3><div className="ili-chart-unavailable"><strong>{unavailable}</strong><small>Engineering severity is not available.</small></div><dl className="ili-unavailable-values">{["High", "Medium", "Low", "Info"].map((label) => <div key={label}><dt>{label}</dt><dd>{unavailable}</dd></div>)}</dl></Panel>
        </div>
        <Panel className="ili-panel ili-anomaly-register">
          <div className="ili-panel-heading"><h3>Anomalies ({count})</h3><div className="ili-anomaly-table-tools">
            <details className="ili-column-menu"><summary><Columns3 size={13} aria-hidden="true" /> Columns <span aria-hidden="true">⌄</span></summary><fieldset><legend>Visible columns</legend>{anomalyColumns.map((column) => <label key={column}><input type="checkbox" checked={shownColumns.includes(column)} disabled={shownColumns.length === 1 && shownColumns.includes(column)} onChange={() => setShownColumns(shownColumns.includes(column) ? shownColumns.filter((value) => value !== column) : anomalyColumns.filter((value) => value === column || shownColumns.includes(value)))} />{column}</label>)}</fieldset></details>
            <span aria-live="polite">{available ? `${filtered.length ? (currentPage - 1) * pageSize + 1 : 0}–${Math.min(currentPage * pageSize, filtered.length)} of ${count}` : `${visible.length} accessible; total ${unavailable}`}</span>
            <button disabled={currentPage <= 1} aria-label="Previous anomaly page" onClick={() => { setPage(currentPage - 1); setSelectedId(""); setClosed(false); }}>‹</button><button disabled={currentPage >= pages} aria-label="Next anomaly page" onClick={() => { setPage(currentPage + 1); setSelectedId(""); setClosed(false); }}>›</button>
          </div></div>
          <p className="ili-anomaly-source-note">Type displays the raw vendor/source value. Engineering classification and review status are {unavailable}.</p>
          <div className="ili-table-scroll"><table className="ili-anomaly-table"><thead><tr><th><input type="checkbox" disabled aria-label="Bulk anomaly selection unavailable" title={blocked} /></th>{shownColumns.map((column) => <th key={column} aria-sort={sortFields[column] === sort ? ascending ? "ascending" : "descending" : undefined}>{sortFields[column] ? <button className="ili-sort" onClick={() => sortBy(sortFields[column]!)} aria-label={`Sort anomalies by ${column}`}>{column}{sortFields[column] === sort ? ascending ? " ↑" : " ↓" : ""}</button> : column}</th>)}<th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{visible.map((record) => <tr key={record.id} className={selected?.id === record.id ? "selected" : ""} onClick={() => select(record)}><td><input type="checkbox" aria-label={`Select anomaly ${record.id}`} checked={selected?.id === record.id} onChange={() => select(record)} onClick={(event) => event.stopPropagation()} /></td>{shownColumns.map((column) => <td key={column}>{cell(record, column)}</td>)}<td><button disabled title={blocked} aria-label={`Actions unavailable for anomaly ${record.id}`}><MoreVertical size={14} /></button></td></tr>)}{!visible.length && <tr><td colSpan={shownColumns.length + 2} className="ili-empty">{loading ? "Loading ILI anomalies…" : available ? "No anomalies match the current filters." : unavailable}</td></tr>}</tbody>
          </table></div>
          <div className="ili-anomaly-footer"><span>Page {currentPage} of {pages}</span><label>Rows per page<select aria-label="Anomaly rows per page" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); resetSelection(); }}><option value={6}>6</option></select></label></div>
        </Panel>
      </div>
      {!closed && <aside className="ili-panel ili-anomaly-details" aria-label="Anomaly Details">
        <div className="ili-anomaly-detail-heading"><h3>{formatValue(selected?.id)}</h3><span className="ili-run-status" title="Severity is not available">{unavailable}</span><button aria-label="Close anomaly details" onClick={() => setClosed(true)}><X size={15} /></button></div>
        <p className="ili-anomaly-subtitle">{pipelineCode(selected?.pipelineId)} | KP {formatValue(selected?.kpKm)} | {formatValue(selected?.anomalyType)} — {unavailable}</p>
        <nav className="ili-detail-tabs" aria-label="Anomaly detail sections">{["Details", "Images & Plots", "Trend & Growth", "Related", "History"].map((name) => <button key={name} className={name === "Details" ? "active" : ""} aria-current={name === "Details" ? "page" : undefined} disabled={name !== "Details"} title={name !== "Details" ? blocked : undefined}>{name}</button>)}</nav>
        <div className="ili-anomaly-detail-body"><dl className="ili-summary">{detailFields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><div className="ili-anomaly-image"><h4>Cross-section View</h4><div><strong>{unavailable}</strong><span>No linked source image is available.</span></div><footer><button disabled title={blocked} aria-label="Previous anomaly image unavailable">‹</button><button disabled title={blocked} aria-label="Next anomaly image unavailable">›</button></footer></div></div>
        {!selected && <p className="ili-empty">Select an accessible anomaly to view its details.</p>}
        <div className="ili-anomaly-actions"><button className="ili-primary" disabled title={blocked}><Plus size={13} />Create Finding</button><button disabled title={blocked}><MapPin size={13} />View in GIS</button><button disabled title={blocked}><Link2 size={13} />Link to Defect</button><button disabled title={blocked}><Upload size={13} />Export</button><button disabled title={blocked} aria-label="More anomaly actions unavailable"><MoreVertical size={13} /></button></div>
      </aside>}
    </div>
    <style jsx global>{`
      .ili-runs .ili-anomalies  { min-width:0; }
      .ili-runs .ili-anomaly-filters  { display:grid; grid-template-columns:minmax(150px,1.2fr) repeat(4,minmax(110px,1fr)) minmax(175px,1.5fr) auto auto; gap:12px; align-items:end; padding:13px; border:1px solid var(--ili-line); border-radius:6px; background:var(--app-surface); margin-bottom:14px; }
      .ili-runs .ili-anomaly-filters label  { display:block; font-size:var(--font-size-body); min-width:0; }.ili-runs .ili-anomaly-filters select  { display:block; width:100%; margin-top:6px; height:34px; }
      .ili-runs .ili-anomaly-search  { display:flex!important; align-items:center; position:relative; }.ili-runs .ili-anomaly-search>svg  { position:absolute; left:10px; color:var(--app-text); pointer-events:none; }.ili-runs .ili-anomaly-search input  { width:100%; min-width:0; height:36px; border:1px solid var(--app-border); border-radius:5px; padding:8px 10px 8px 33px; font-size:var(--font-size-body); color:var(--app-text); background:var(--app-surface-muted); }.ili-runs .ili-anomaly-search input:focus-visible  { outline:2px solid var(--app-border); outline-offset:2px; }
      .ili-runs .ili-anomaly-layout  { display:grid; grid-template-columns:minmax(0,2.9fr) minmax(330px,1fr); gap:12px; align-items:start; }.ili-runs .ili-anomaly-closed  { grid-template-columns:minmax(0,1fr); }.ili-runs .ili-anomaly-main  { min-width:0; }
      .ili-runs .ili-anomaly-charts  { display:grid; grid-template-columns:minmax(0,1.7fr) minmax(0,1.15fr) minmax(0,.9fr); gap:10px; margin-bottom:12px; }.ili-runs .ili-anomaly-charts h3  { font-size:var(--font-size-label); }.ili-runs .ili-anomaly-charts .ili-panel  { padding:20px; }
      .ili-runs .ili-anomaly-map  { position:relative; display:flex; flex-direction:column; min-height:235px; }.ili-runs .ili-map-controls  { display:flex; justify-content:space-between; gap:8px; margin-top:12px; }.ili-runs .ili-map-controls>div  { display:flex; gap:3px; }.ili-runs .ili-map-controls button  { padding:4px 7px; font-size:var(--font-size-body); }.ili-runs .ili-visual-unavailable  { display:flex; flex:1; flex-direction:column; justify-content:center; align-items:center; gap:9px; text-align:center; min-height:120px; color:var(--app-text-muted); border:1px dashed var(--app-border); border-radius:5px; background:var(--app-surface-muted); padding:15px; margin-top:10px; }.ili-runs .ili-visual-unavailable span  { font-size:var(--font-size-body); line-height:1.6; }
      .ili-runs .ili-map-legend  { display:flex; flex-wrap:wrap; gap:10px; margin-top:12px; font-size:var(--font-size-body); }.ili-runs .ili-map-legend span  { display:flex; align-items:center; gap:5px; }.ili-runs .ili-map-legend i  { height:9px; width:9px; border-radius:50%; background:var(--app-surface-muted); }.ili-runs .ili-map-legend .anomaly-color-0  { background:var(--app-surface-muted); }.ili-runs .ili-map-legend .anomaly-color-1  { background:var(--app-surface-muted); }.ili-runs .ili-map-legend .anomaly-color-2  { background:var(--app-surface-muted); }.ili-runs .ili-map-legend .anomaly-color-3  { background:var(--app-surface-muted); }
      .ili-runs .ili-chart-unavailable  { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; min-height:90px; margin-top:10px; text-align:center; background:var(--app-surface-muted); color:var(--app-text-muted); border:1px dashed var(--app-border); border-radius:5px; padding:10px; }.ili-runs .ili-chart-unavailable strong  { font-size:var(--font-size-label); }.ili-runs .ili-chart-unavailable small  { font-size:var(--font-size-body); line-height:1.4; }.ili-runs .ili-unavailable-values  { margin:12px 0 0; font-size:var(--font-size-body); }.ili-runs .ili-unavailable-values>div  { display:flex; justify-content:space-between; flex-wrap:wrap; gap:5px; margin-top:8px; }.ili-runs .ili-unavailable-values dd  { color:var(--app-text-muted); }
      .ili-runs .ili-anomaly-register  { padding:12px; }.ili-runs .ili-anomaly-register>.ili-panel-heading  { margin-bottom:8px; flex-wrap:wrap; }.ili-runs .ili-anomaly-source-note  { color:var(--app-text-muted); font-size:var(--font-size-body); margin:0 0 12px; line-height:1.5; }.ili-runs .ili-anomaly-table-tools  { display:flex; flex-wrap:wrap; gap:9px; align-items:center; font-size:var(--font-size-body); }.ili-runs .ili-anomaly-table-tools>button  { padding:3px 9px; font-size:var(--font-size-heading); }
      .ili-runs .ili-column-menu  { position:relative; }.ili-runs .ili-column-menu summary  { display:flex; align-items:center; gap:7px; color:var(--app-text); cursor:pointer; padding:7px 10px; border:1px solid var(--app-border); border-radius:4px; background:var(--app-surface); list-style:none; }.ili-runs .ili-column-menu summary::-webkit-details-marker  { display:none; }.ili-runs .ili-column-menu fieldset  { position:absolute; z-index:20; top:100%; right:0; width:200px; background:var(--app-surface); border:1px solid var(--app-border); box-shadow:var(--app-shadow); border-radius:5px; padding:10px; }.ili-runs .ili-column-menu legend  { font-size:var(--font-size-body); color:var(--app-text-muted); background:var(--app-surface); }.ili-runs .ili-column-menu label  { display:flex; align-items:center; gap:8px; margin:8px 0; font-size:var(--font-size-body); }
      .ili-runs .ili-anomalies .ili-table-scroll  { position:relative; max-width:100%; overflow:auto; contain:layout paint; }.ili-runs .ili-anomaly-table  { width:100%; min-width:1030px; border-collapse:collapse; font-size:var(--font-size-body); text-align:left; }.ili-runs .ili-anomaly-table th  { padding:9px 6px; }.ili-runs .ili-anomaly-table td  { padding:9px 6px; vertical-align:middle; }.ili-runs .ili-anomaly-table td:nth-child(2)  { min-width:140px; }.ili-runs .ili-anomaly-table td:last-child button  { border:0; padding:0 5px; background:transparent; }.ili-runs .ili-anomaly-table tr.selected  { background:var(--app-surface-muted); box-shadow:none; }.ili-runs .ili-anomaly-table td .ili-link  { white-space:normal; text-align:left; overflow-wrap:anywhere; }
      .ili-runs .ili-anomaly-footer  { display:flex; justify-content:space-between; align-items:center; gap:10px; margin-top:12px; color:var(--app-text); font-size:var(--font-size-body); }.ili-runs .ili-anomaly-footer label  { display:flex; align-items:center; gap:9px; }
      .ili-runs .ili-anomaly-details  { padding:12px; min-width:0; }.ili-runs .ili-anomaly-detail-heading  { display:flex; align-items:flex-start; gap:8px; }.ili-runs .ili-anomaly-detail-heading h3  { flex:1; min-width:0; overflow-wrap:anywhere; font-size:var(--font-size-label); }.ili-runs .ili-anomaly-detail-heading>button  { border:0; padding:2px; }.ili-runs .ili-anomaly-subtitle  { font-size:var(--font-size-body); line-height:1.6; color:var(--app-text-muted); margin:8px 0 0; overflow-wrap:anywhere; }
      .ili-runs .ili-anomaly-details .ili-detail-tabs  { margin:16px 0 12px; }.ili-runs .ili-anomaly-details .ili-detail-tabs button  { font-size:var(--font-size-body); padding:10px 7px; }.ili-runs .ili-anomaly-detail-body  { display:grid; gap:14px; }.ili-runs .ili-anomaly-details .ili-summary  { font-size:var(--font-size-body); gap:9px; }.ili-runs .ili-anomaly-details .ili-summary>div  { grid-template-columns:108px minmax(0,1fr); gap:8px; }
      .ili-runs .ili-anomaly-image  { border:1px solid var(--app-border); border-radius:5px; padding:9px; background:var(--app-surface-muted); }.ili-runs .ili-anomaly-image h4  { margin:0 0 8px; font-size:var(--font-size-body); font-weight:600; }.ili-runs .ili-anomaly-image>div  { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:7px; min-height:105px; color:var(--app-text); background:var(--app-surface-muted); border:1px dashed var(--app-border); text-align:center; padding:10px; }.ili-runs .ili-anomaly-image span  { font-size:var(--font-size-body); }.ili-runs .ili-anomaly-image footer  { display:flex; justify-content:space-between; margin-top:7px; }.ili-runs .ili-anomaly-image button  { padding:2px 8px; font-size:var(--font-size-label); }
      .ili-runs .ili-anomaly-actions  { display:flex; flex-wrap:wrap; gap:5px; margin-top:18px; padding-top:12px; border-top:1px solid var(--app-border); }.ili-runs .ili-anomaly-actions button  { padding:7px 6px; font-size:var(--font-size-body); }
      @media(min-width:1700px) { .ili-runs .ili-anomaly-layout  { grid-template-columns:minmax(0,2.5fr) minmax(440px,1fr); }.ili-runs .ili-anomaly-closed  { grid-template-columns:minmax(0,1fr); }.ili-runs .ili-anomaly-detail-body  { grid-template-columns:minmax(0,1.3fr) minmax(135px,1fr); align-items:start; } }
      @media(max-width:1450px) { .ili-runs .ili-anomaly-filters  { grid-template-columns:repeat(5,minmax(0,1fr)); }.ili-runs .ili-anomaly-search  { grid-column:span 3; }.ili-runs .ili-anomaly-layout  { grid-template-columns:minmax(0,1fr); }.ili-runs .ili-anomaly-detail-body  { grid-template-columns:minmax(0,1.5fr) minmax(170px,1fr); align-items:start; } }
      @media(max-width:760px) { .ili-runs .ili-anomaly-filters  { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }.ili-runs .ili-anomaly-search  { grid-column:span 2; }.ili-runs .ili-anomaly-charts  { grid-template-columns:minmax(0,1fr); }.ili-runs .ili-anomaly-detail-body  { grid-template-columns:minmax(0,1fr); }.ili-runs .ili-anomaly-table-tools  { width:100%; }.ili-runs .ili-column-menu fieldset  { left:0; right:auto; }.ili-runs .ili-anomaly-detail-heading  { flex-wrap:wrap; }.ili-runs .ili-anomaly-filters button  { min-height:36px; } }
    `}</style>
  </section>;
}

const filters: AnomalyFilter[] = ["All", "Repair", "Monitor", "Safe"];

function formatValue(value: string | number | null | undefined, unit?: string | null) {
  if (value === undefined || value === null || value === "") return "Not Available";
  return unit ? `${value} ${unit}` : String(value);
}

function statusClasses(status: string | null) {
  if (status === "Repair") return "border-rose-400/50 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  if (status === "Monitor") return "border-amber-400/50 bg-amber-500/10 text-amber-800 dark:text-amber-300";
  if (status === "Safe") return "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  return "border-slate-300 bg-slate-500/10 text-slate-700 dark:border-slate-700 dark:text-slate-300";
}

function selectedPipelineFields(pipeline: PipelineRecord | null) {
  return [
    ["Pipeline", formatValue(pipeline?.pipelineName)],
    ["Code", formatValue(pipeline?.pipelineCode)],
    ["OD", formatValue(pipeline?.pipeOutsideDiameter, pipeline?.diameterUnit)],
    ["Wall", formatValue(pipeline?.wallThicknessInputValue ?? pipeline?.nominalWallThickness, pipeline?.wallThicknessUnit)],
    ["Grade", pipeline?.pipeGradeOther || pipeline?.pipeGrade || "Not Available"],
    ["SMYS", formatValue(pipeline?.smysMpa, "MPa")],
    ["MAOP", formatValue(pipeline?.maopBar, "bar")],
    ["Operating", formatValue(pipeline?.operatingPressureInputValue ?? pipeline?.operatingPressure, pipeline?.operatingPressureUnit)]
  ];
}

function IliRecordWorkspace() {
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineRecord | null>(null);
  const [activeFilter, setActiveFilter] = useState<AnomalyFilter>("All");
  const [selectedAnomalyId, setSelectedAnomalyId] = useState("");
  const [readinessResponse, setReadiness] = useState<IliReadiness | null>(null);
  const [readinessState, setReadinessState] = useState<ReadinessState>("idle");
  const [readinessError, setReadinessError] = useState<string | null>(null);
  const isDemo = false;
  const [runsResponse, setRunsResponse] = useState<IliDataResponse<IliRunSummary> | null>(null);
  const [anomaliesResponse, setAnomaliesResponse] = useState<IliDataResponse<IliAnomalySummary> | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const readiness = readinessResponse?.pipelineId === selectedPipeline?.id ? readinessResponse : null;
  const runs = runsResponse?.pipelineId === selectedPipeline?.id && runsResponse?.status === "available" && runsResponse.tableAvailable ? runsResponse : null;
  const anomalyData = anomaliesResponse?.pipelineId === selectedPipeline?.id && anomaliesResponse?.status === "available" && anomaliesResponse.tableAvailable ? anomaliesResponse : null;
  const anomalies = useMemo<IliWorkspaceAnomaly[]>(() => (anomalyData?.data ?? []).map((item) => ({
    ...item, type: item.anomalyType, rsf: null, failurePressureBar: null, status: null, growthRateMmYear: null
  })), [anomalyData]);
  const filteredAnomalies = useMemo(
    () => activeFilter === "All" ? anomalies : anomalies.filter((item) => item.status === activeFilter),
    [activeFilter, anomalies]
  );
  const selectedAnomaly = anomalies.find((item) => item.id === selectedAnomalyId) ?? anomalies[0] ?? null;
  const realFeatureCount = anomalyData ? anomalyData.count : "Not Available";
  const realRunCount = runs ? runs.count : "Not Available";
  const latestRun = runs?.data[0] ?? null;

  useEffect(() => {
    setRunsResponse(null);
    setAnomaliesResponse(null);
    setDataError(null);
    setSelectedAnomalyId("");
    setReadiness(null);
    if (!selectedPipeline?.id) {
      setReadiness(null);
      setReadinessState("idle");
      setReadinessError(null);
      return;
    }

    let cancelled = false;
    setReadinessState("loading");
    setReadinessError(null);

    Promise.allSettled([
      fetchIliReadiness(selectedPipeline.id),
      fetchIliRuns(selectedPipeline.id),
      fetchIliAnomalies(selectedPipeline.id)
    ]).then(([readinessResult, runsResult, anomaliesResult]) => {
      if (cancelled) return;
      if (readinessResult.status === "fulfilled") {
        setReadiness(readinessResult.value);
        setReadinessState("success");
      } else {
        setReadinessState("error");
        setReadinessError(isUnauthorizedError(readinessResult.reason)
          ? "Authentication is required to load ILI readiness."
          : isBackendUnavailableError(readinessResult.reason)
            ? "ILI readiness service is unavailable because the backend cannot be reached."
            : "ILI readiness status unavailable.");
      }
      if (runsResult.status === "fulfilled") setRunsResponse(runsResult.value);
      if (anomaliesResult.status === "fulfilled") setAnomaliesResponse(anomaliesResult.value);
      if (runsResult.status === "rejected" || anomaliesResult.status === "rejected") {
        setDataError("Not Available. One or more authenticated ILI record requests failed.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isDemo, selectedPipeline?.id]);

  return (
    <section aria-label="M2 ILI analysis workspace" className="space-y-5">
      <Panel className="overflow-hidden p-0">
        <div className="border-b border-slate-200 bg-gradient-to-br from-slateblue-950 via-slateblue-900 to-cyan-950 px-5 py-5 text-white dark:border-slate-800 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">M2 Inline Inspection</p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight">ILI Analysis Workspace</h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-cyan-50/80">PipeGuard-style anomaly review with traceable pipeline metadata, anomaly registry, calculator shell, charts, and methodology panel.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ${isDemo ? "border-amber-300/60 bg-amber-400/15 text-amber-100" : "border-cyan-300/40 bg-cyan-400/10 text-cyan-100"}`}>
                {isDemo ? "DEMO DATA" : readinessState === "success" && readiness ? readiness.status : "Real readiness"}
              </span>
            </div>
          </div>
        </div>
        <div className="p-5 sm:p-6">
          <PipelineSelector mode="select-only" onSelect={setSelectedPipeline} selectedPipeline={selectedPipeline} onClear={() => setSelectedPipeline(null)} />
        </div>
      </Panel>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Anomalies" value={realFeatureCount} helper="Authenticated records for the selected pipeline; all inspection runs." />
        <MetricCard label="ILI Runs" value={realRunCount} tone="red" helper="Authenticated inspection runs for the selected pipeline." />
        <MetricCard label="High Severity" value="Not Available" tone="amber" helper="Engineering severity is not available from the ILI read API." />
        <MetricCard label="Run Data Quality" value="Not Available" tone="green" helper="A versioned ILI quality result is not available." />
      </div>

      <ReadinessPanel readiness={readiness} state={readinessState} error={readinessError} selectedPipeline={selectedPipeline} isDemo={isDemo} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
        <MetadataPanel selectedPipeline={selectedPipeline} isDemo={isDemo} />
        <RunPanel isDemo={isDemo} run={latestRun} runs={runs?.data ?? []} pipeline={selectedPipeline} anomalyData={anomalyData} detail={dataError ?? runsResponse?.reason ?? "Select a pipeline to load ILI runs."} />
      </div>

      <AnomalyRegistry
        detail={dataError ?? anomaliesResponse?.reason ?? "Select a pipeline to load ILI anomalies."}
        activeFilter={activeFilter}
        anomalies={filteredAnomalies}
        isDemo={isDemo}
        onFilter={setActiveFilter}
        onSelect={setSelectedAnomalyId}
        selectedAnomalyId={selectedAnomaly?.id ?? ""}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <CalculatorPanel selectedPipeline={selectedPipeline} anomaly={selectedAnomaly} isDemo={isDemo} />
        <ResultPanel anomaly={selectedAnomaly} isDemo={isDemo} />
      </div>

      <MethodologyPanel anomaly={selectedAnomaly} isDemo={isDemo} />

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartPanel title="Depth / d-t comparison" anomalies={anomalies} valueKey="depthPercent" unit="%" isDemo={isDemo} />
        <ChartPanel title="RSF vs acceptance reference" anomalies={anomalies} valueKey="rsf" unit="RSF" isDemo={isDemo} />
      </div>

      <CorrosionGrowthPanel anomalies={anomalies} selected={selectedAnomaly} isDemo={isDemo} />
    </section>
  );
}


function ReadinessPanel({ readiness, state, error, selectedPipeline, isDemo }: { readiness: IliReadiness | null; state: ReadinessState; error: string | null; selectedPipeline: PipelineRecord | null; isDemo: boolean }) {
  if (isDemo) return null;

  if (!selectedPipeline) {
    return <Panel className="p-5"><SectionTitle eyebrow="Backend readiness" title="Select a pipeline" detail="Choose a pipeline to load real ILI readiness from the backend." /><UnavailableBox message="No pipeline selected" /></Panel>;
  }

  if (state === "loading") {
    return <Panel className="p-5"><SectionTitle eyebrow="Backend readiness" title="Loading ILI readiness" detail="Checking ILI table availability, counts, calculation service status, and A7 corrosion-growth source." /><UnavailableBox message="Loading readiness status" /></Panel>;
  }

  if (state === "error") {
    return <Panel className="p-5"><SectionTitle eyebrow="Backend readiness" title="Readiness unavailable" detail={error ?? "ILI readiness status unavailable."} /><UnavailableBox message="Readiness status unavailable" /></Panel>;
  }

  if (!readiness) {
    return <Panel className="p-5"><SectionTitle eyebrow="Backend readiness" title="Real ILI readiness" detail="Readiness has not been loaded yet." /><UnavailableBox message="ILI readiness not loaded" /></Panel>;
  }

  return (
    <Panel className="p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <SectionTitle eyebrow="Backend readiness" title="Real ILI data availability" detail={readiness.reason} />
        <span className={`w-fit rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ${readiness.ready ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-amber-400/50 bg-amber-500/10 text-amber-800 dark:text-amber-300"}`}>{readiness.status}</span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <InfoTile label="Inspection runs" value={readiness.tables.available ? readiness.counts.inspectionRuns : "Not Available"} />
        <InfoTile label="Anomalies" value={readiness.tables.available ? readiness.counts.anomalies : "Not Available"} />
        <InfoTile label="Assessment results" value={readiness.tables.available ? readiness.counts.assessmentResults : "Not Available"} />
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <ReadinessTile label="ILI tables" available={readiness.tables.available} status={readiness.tables.available ? "available" : "unavailable"} reason="IliInspectionRun, IliAnomaly, and IliAssessmentResult table availability." />
        <ReadinessTile label="B31G service" available={readiness.services.b31gCalculation.available} status={readiness.services.b31gCalculation.status} reason={readiness.services.b31gCalculation.reason} />
        <ReadinessTile label="Corrosion growth source" available={readiness.services.corrosionGrowthSource.available} status={readiness.services.corrosionGrowthSource.status} reason={readiness.services.corrosionGrowthSource.reason} />
        <ReadinessTile label="RUL" available={readiness.services.remainingUsefulLife.available} status={readiness.services.remainingUsefulLife.status} reason={readiness.services.remainingUsefulLife.reason} />
      </div>
      {readiness.blockers.length > 0 ? <div className="mt-4 rounded-2xl border border-dashed border-amber-300/50 bg-amber-500/10 p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">Blockers</p><ul className="mt-2 space-y-1 text-sm text-slate-600">{readiness.blockers.map((blocker) => <li key={blocker}>Blocked: {blocker}</li>)}</ul></div> : null}
    </Panel>
  );
}

function ReadinessTile({ label, available, status, reason }: { label: string; available: boolean; status: string; reason: string }) {
  return <div className="rounded-2xl border pipeguard-surface-muted px-4 py-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p><span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${available ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-slate-300 bg-slate-500/10 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}>{status}</span></div><p className="mt-2 text-sm leading-5 text-slate-500">{reason}</p></div>;
}

function ModeButton({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return <button className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition ${active ? "bg-cyan-400 text-slate-950" : "border border-white/20 bg-white/5 text-cyan-50 hover:bg-white/10"}`} onClick={onClick} type="button">{children}</button>;
}

function MetricCard({ label, value, helper, tone = "blue" }: { label: string; value: string | number; helper: string; tone?: "blue" | "red" | "amber" | "green" }) {
  const border = { blue: "border-cyan-400/40", red: "border-rose-400/50", amber: "border-amber-400/50", green: "border-emerald-400/40" }[tone];
  return <Panel className={`rounded-2xl border-l-4 ${border} p-4`}><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p><p className="mt-3 text-xl font-semibold text-slate-900">{value}</p><p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p></Panel>;
}

function MetadataPanel({ selectedPipeline, isDemo }: { selectedPipeline: PipelineRecord | null; isDemo: boolean }) {
  const fields = selectedPipelineFields(selectedPipeline);

  return (
    <Panel className="p-5">
      <SectionTitle eyebrow="Pipeline information" title="Assessment parameters" detail={isDemo ? "Demo mode uses only the centralized fixture and does not mix selected real pipeline values." : "Pipeline properties come from Pipeline master data in real mode."} />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map(([label, value]) => <InfoTile key={label} label={label} value={value} />)}
      </div>
    </Panel>
  );
}

function RunPanel({ isDemo, run, runs, pipeline, anomalyData, detail }: { isDemo: boolean; run: IliRunSummary | null; runs: IliRunSummary[]; pipeline: PipelineRecord | null; anomalyData: IliDataResponse<IliAnomalySummary> | null; detail: string }) {
  function anomalyCount(record: IliRunSummary | null): string | number {
    if (!record || record.pipelineId !== pipeline?.id || anomalyData?.pipelineId !== record.pipelineId || anomalyData.status !== "available" || !anomalyData.tableAvailable) return "Not Available";
    return anomalyData.data.filter((anomaly) => anomaly.pipelineId === record.pipelineId && anomaly.inspectionRunId === record.id).length;
  }

  const history = runs.filter((record) => record.pipelineId === pipeline?.id).slice().reverse().map((record) =>
    `${formatValue(record.inspectionDate)} | ID: ${formatValue(record.id)} | Reference: ${formatValue(record.runReference)} | Tool: ${formatValue(record.toolType)} | Status: ${formatValue(record.status)} | Accessible anomalies: ${anomalyCount(record)}`
  ).join(" ; ");
  const fields: Array<[string, string | number]> = [
    ["Run", formatValue(run?.runReference)],
    ["Run ID", formatValue(run?.id)],
    ["Pipeline ID", formatValue(run?.pipelineId)],
    ["Pipeline", run && run.pipelineId === pipeline?.id ? formatValue(pipeline.pipelineCode) : "Not Available"],
    ["Tool", formatValue(run?.toolType)],
    ["Vendor", formatValue(run?.vendor)],
    ["Inspection", formatValue(run?.inspectionDate)],
    ["Status", formatValue(run?.status)],
    ["Notes", formatValue(run?.notes)],
    ["Created On", formatValue(run?.createdAt)],
    ["Standard", formatValue(run?.assessmentStandard)],
    ["Total Anomalies", anomalyCount(run)],
    ["Segment", "Not Available"],
    ["Coverage", "Not Available"],
    ["Data Quality", "Not Available"],
    ["Imported Files", "Not Available"],
    ["Imported Logs", "Not Available"],
    ["High Severity", "Not Available"],
    ["Tool Configuration", "Not Available"],
    ["Run History (oldest first)", formatValue(history)]
  ];

  return (
    <Panel className="p-5">
      <SectionTitle eyebrow="ILI metadata" title="Latest Run" detail={detail} />
      <div className="mt-4 space-y-2">{fields.map(([label, value]) => <InlineInfo key={label} label={label} value={value} />)}</div>
    </Panel>
  );
}

function AnomalyRegistry({ detail, anomalies, activeFilter, selectedAnomalyId, isDemo, onFilter, onSelect }: { detail: string; anomalies: IliWorkspaceAnomaly[]; activeFilter: AnomalyFilter; selectedAnomalyId: string; isDemo: boolean; onFilter: (filter: AnomalyFilter) => void; onSelect: (id: string) => void }) {
  return (
    <Panel className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <SectionTitle eyebrow="Anomaly registry" title="Feature list" detail={`${detail} Status filters require approved assessment data; no status is inferred.`} />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter anomaly status">
          {filters.map((filter) => <button aria-pressed={activeFilter === filter} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${activeFilter === filter ? "bg-slateblue-600 text-white" : "border pipeguard-surface text-slate-600 hover:border-cyan-400"}`} key={filter} onClick={() => onFilter(filter)} type="button">{filter}</button>)}
        </div>
      </div>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="min-w-[980px] w-full text-left text-sm">
          <thead className="pipeguard-surface-muted text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>{["Feature ID", "KP", "Type", "Depth", "d/t", "Length", "Clock", "Orientation", "RSF", "Status"].map((heading) => <th className="px-4 py-3 font-semibold" key={heading}>{heading}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100 pipeguard-surface dark:divide-slate-800">
            {anomalies.length > 0 ? anomalies.map((item) => (
              <tr className={`cursor-pointer transition hover:bg-cyan-500/10 ${item.id === selectedAnomalyId ? "bg-cyan-500/10" : ""}`} key={item.id} onClick={() => onSelect(item.id)}>
                <td className="px-4 py-3 font-semibold text-slate-900">{formatValue(item.featureId)}</td><td className="px-4 py-3 text-slate-600">{formatValue(item.kpKm, "km")}</td><td className="px-4 py-3 text-slate-600">{formatValue(item.type)}</td><td className="px-4 py-3 text-slate-600">{formatValue(item.depthMm, "mm")}</td><td className="px-4 py-3 text-slate-600">{formatValue(item.depthPercent, "%")}</td><td className="px-4 py-3 text-slate-600">{formatValue(item.lengthMm, "mm")}</td><td className="px-4 py-3 text-slate-600">{formatValue(item.clockPosition)}</td><td className="px-4 py-3 text-slate-600">{formatValue(item.orientation)}</td><td className="px-4 py-3 text-slate-600">{formatValue(item.rsf)}</td><td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(item.status)}`}>{formatValue(item.status)}</span></td>
              </tr>
            )) : <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={10}>Not Available</td></tr>}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function CalculatorPanel({ selectedPipeline, anomaly, isDemo }: { selectedPipeline: PipelineRecord | null; anomaly: IliWorkspaceAnomaly | null; isDemo: boolean }) {
  const inputs = [["Pipe OD", formatValue(selectedPipeline?.pipeOutsideDiameter, selectedPipeline?.diameterUnit)], ["Wall thickness", formatValue(selectedPipeline?.wallThicknessInputValue ?? selectedPipeline?.nominalWallThickness, selectedPipeline?.wallThicknessUnit)], ["SMYS", formatValue(selectedPipeline?.smysMpa, "MPa")], ["Defect depth", formatValue(anomaly?.depthMm, "mm")], ["Defect length", formatValue(anomaly?.lengthMm, "mm")], ["MAOP", formatValue(selectedPipeline?.maopBar, "bar")]];
  return (
    <Panel className="p-5">
      <SectionTitle eyebrow="B31G calculator UI" title="Selected feature inputs" detail="Frontend displays selected data only. Production formulas are not implemented here." />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{inputs.map(([label, value]) => <InfoTile key={label} label={label} value={value} />)}</div>
    </Panel>
  );
}

function ResultPanel({ anomaly, isDemo }: { anomaly: IliWorkspaceAnomaly | null; isDemo: boolean }) {
  const fields = [["Selected", formatValue(anomaly?.id)], ["d/t ratio", formatValue(anomaly?.depthPercent, "%")], ["RSF", "Not Available"], ["Pfail", "Not Available"], ["Verdict", "Not Available"]];
  return <Panel className="p-5"><SectionTitle eyebrow="Assessment result" title={isDemo && anomaly ? `${anomaly.id} result preview` : "Pending assessment"} detail={isDemo ? "Demo outputs are fixture values, not production B31G calculations." : "No result is generated until validated backend calculation exists."} /><div className="mt-4 space-y-2">{fields.map(([label, value]) => <InlineInfo key={label} label={label} value={value} />)}</div></Panel>;
}

function MethodologyPanel({ anomaly, isDemo }: { anomaly: IliWorkspaceAnomaly | null; isDemo: boolean }) {
  return (
    <Panel className="p-5">
      <SectionTitle eyebrow="Calculation methodology" title="Traceability and source control" detail="Methodology text is descriptive only until an approved backend ILI calculation service exists." />
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <InfoTile label="Source anomaly" value={formatValue(anomaly?.id)} />
        <InfoTile label="Calculation owner" value="Backend service required" />
        <InfoTile label="Production formula" value="Not implemented in frontend" />
      </div>
      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 pipeguard-surface-muted p-4 text-sm leading-6 text-slate-500 dark:border-slate-700">Do not use screenshot equations as approved methodology. Future values should be persisted in IliAssessmentResult with input snapshots, result JSON, methodology version, and calculation steps.</div>
    </Panel>
  );
}

function ChartPanel({ title, anomalies, valueKey, unit, isDemo }: { title: string; anomalies: IliWorkspaceAnomaly[]; valueKey: "depthPercent" | "rsf"; unit: string; isDemo: boolean }) {
  return <Panel className="p-5"><SectionTitle eyebrow="Visual analytics" title={title} detail={isDemo ? "Demo chart is derived from the same anomaly table dataset." : "An approved chart data mapping is not available."} />{isDemo ? <BarChart anomalies={anomalies} valueKey={valueKey} unit={unit} /> : <UnavailableBox message="Not Available" />}</Panel>;
}

function CorrosionGrowthPanel({ anomalies, selected, isDemo }: { anomalies: IliWorkspaceAnomaly[]; selected: IliWorkspaceAnomaly | null; isDemo: boolean }) {
  return (
    <Panel className="p-5">
      <SectionTitle eyebrow="Corrosion growth" title="Growth projection readiness" detail="Approved feature-group matches and growth results are not available." />
      {isDemo ? <><div className="mt-4 grid gap-3 md:grid-cols-3"><InfoTile label="Selected feature" value={selected?.id ?? "Not selected"} /><InfoTile label="Demo growth rate" value={selected ? `${selected.growthRateMmYear} mm/y` : "Not Available"} /><InfoTile label="Dataset max" value={`${Math.max(...anomalies.map((item) => Number(item.growthRateMmYear))).toFixed(2)} mm/y`} /></div><BarChart anomalies={anomalies} valueKey="growthRateMmYear" unit="mm/y" /></> : <UnavailableBox message="Not Available" />}
    </Panel>
  );
}

function BarChart({ anomalies, valueKey, unit }: { anomalies: IliWorkspaceAnomaly[]; valueKey: "depthPercent" | "rsf" | "growthRateMmYear"; unit: string }) {
  const max = Math.max(...anomalies.map((item) => Number(item[valueKey])), 1);
  return <div className="mt-4 space-y-2">{anomalies.map((item) => <div key={`${valueKey}:${item.id}`} className="grid grid-cols-[56px_1fr_72px] items-center gap-3 text-xs"><span className="font-semibold text-slate-600">{item.id}</span><div className="h-2 rounded-full pipeguard-surface-muted"><div className={`h-2 rounded-full ${item.status === "Repair" ? "bg-rose-500" : item.status === "Monitor" ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.max(5, (Number(item[valueKey]) / max) * 100)}%` }} /></div><span className="text-right text-slate-500">{Number(item[valueKey]).toFixed(valueKey === "rsf" ? 2 : 1)} {unit}</span></div>)}</div>;
}

function SectionTitle({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) {
  return <div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-slateblue-600">{eyebrow}</p><h3 className="mt-2 text-lg font-semibold text-slate-900">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{detail}</p></div>;
}

function InfoTile({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl border pipeguard-surface-muted px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p><p className="mt-2 text-sm font-semibold text-slate-800">{value}</p></div>;
}

function InlineInfo({ label, value }: { label: string; value: string | number }) {
  return <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-2 text-sm dark:border-slate-800"><dt className="text-slate-500">{label}</dt><dd className="text-right font-medium text-slate-800">{value}</dd></div>;
}

function UnavailableBox({ message }: { message: string }) {
  return <div className="mt-4 flex min-h-44 items-center justify-center rounded-2xl border border-dashed border-slate-300 pipeguard-grid-placeholder px-5 py-8 text-center text-sm font-medium text-slate-500 dark:border-slate-700">{message}</div>;
}


