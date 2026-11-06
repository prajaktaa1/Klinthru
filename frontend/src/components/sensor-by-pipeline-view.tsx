"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, BarChart3, CalendarDays, ChevronDown, ChevronRight, Map as MapIcon, Radio, RefreshCw, Route, Search, Table2, WifiOff, Wrench } from "lucide-react";
import { Panel } from "@/components/ui";
import { loadLeaflet } from "@/components/segment-map-card";
import { fetchMasterSegments, fetchPipelines } from "@/lib/apiClient";
import { savedMapRoute } from "@/lib/dashboard-map-data";
import { PIPELINE_BLUE } from "@/lib/saved-pipeline-overlay";
import { attachBasemap, GEOGRAPHIC_MAP_OPTIONS, UAE_VIEW } from "@/lib/map-provider";
import type { AssetMasterSegmentRecord, DeviceRecord, PipelineRecord } from "@/lib/types";

const na = "Not Available";
const button = "inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slateblue-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";

function Kpi({ label, value, detail, Icon }: { label: string; value: string | number; detail?: string; Icon: typeof Radio }) {
  return <div className="flex min-h-[76px] items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-panel dark:border-slate-700 dark:bg-slate-900"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slateblue-600 dark:bg-slate-800"><Icon size={21} /></span><div className="min-w-0"><p className="text-xl font-bold leading-none text-slate-900 dark:text-white">{value}</p><p className="mt-1 truncate text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</p>{detail ? <p className="mt-0.5 text-[10px] text-slate-500">{detail}</p> : null}</div></div>;
}

function storedMatch(record: DeviceRecord, pipeline: PipelineRecord, segment?: AssetMasterSegmentRecord) {
  const value = record.pipelineOrLocation.toLowerCase();
  if (!value.includes(pipeline.pipelineCode.toLowerCase())) return false;
  return !segment || value.includes(segment.segmentId.toLowerCase());
}

function RouteMap({ pipeline, segment }: { pipeline: PipelineRecord | null; segment: AssetMasterSegmentRecord | null }) {
  const coordinates = segment?.routeGeometry?.coordinates ?? pipeline?.routeGeometry?.coordinates ?? [];
  if (coordinates.length < 2) return <div className="flex min-h-[220px] items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950">{na}<br /><span className="text-xs">No saved GIS route geometry is available for this selection.</span></div>;
  const xs = coordinates.map(point => point[0]); const ys = coordinates.map(point => point[1]); const minX = Math.min(...xs); const maxX = Math.max(...xs); const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const points = coordinates.map(([x, y]) => `${20 + ((x - minX) / Math.max(0.000001, maxX - minX)) * 560},${190 - ((y - minY) / Math.max(0.000001, maxY - minY)) * 150}`).join(" ");
  return <div className="relative min-h-[220px] overflow-hidden rounded-md border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950"><div className="absolute left-3 top-3 z-10 rounded bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-600 shadow-sm dark:bg-slate-900/90 dark:text-slate-300">Saved route geometry · {segment ? segment.segmentId : pipeline?.pipelineCode}</div><svg viewBox="0 0 600 220" className="h-full min-h-[220px] w-full" role="img" aria-label="Saved pipeline route map"><polyline points={points} fill="none" stroke="#2563eb" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /><circle cx={points.split(" ")[0].split(",")[0]} cy={points.split(" ")[0].split(",")[1]} r="6" fill="#16a34a" /><circle cx={points.split(" ").at(-1)?.split(",")[0]} cy={points.split(" ").at(-1)?.split(",")[1]} r="6" fill="#dc2626" /></svg><p className="absolute bottom-2 left-3 text-[10px] text-slate-500">Map uses saved coordinates only; segment boundaries and sensor locations are not inferred.</p></div>;
}

function LeafletRouteMap({ pipeline, segment }: { pipeline: PipelineRecord | null; segment: AssetMasterSegmentRecord | null }) {
  const mapElement = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const route = useMemo(() => savedMapRoute(segment?.routeGeometry) ?? savedMapRoute(pipeline?.routeGeometry, pipeline?.pipeLengthKm ?? NaN), [pipeline?.pipeLengthKm, pipeline?.routeGeometry, segment?.routeGeometry]);
  useEffect(() => {
    if (!route || route.length < 2 || !mapElement.current) return;
    let cancelled = false;
    let map: any;
    let basemap: ReturnType<typeof attachBasemap> | undefined;
    let resize: ResizeObserver | undefined;
    setState("loading");
    void loadLeaflet().then((L) => {
      if (cancelled || !mapElement.current) return;
      map = L.map(mapElement.current, { ...GEOGRAPHIC_MAP_OPTIONS, scrollWheelZoom: false }).setView(UAE_VIEW, 7);
      basemap = attachBasemap(map, L, "hybrid");
      L.polyline(route, { color: PIPELINE_BLUE, weight: 5, opacity: 1, className: "saved-pipeline-overlay" }).addTo(map);
      map.fitBounds(L.latLngBounds(route), { padding: [30, 30], maxZoom: 15 });
      resize = new ResizeObserver(() => map?.invalidateSize());
      resize.observe(mapElement.current);
      setState("ready");
    }).catch(() => { if (!cancelled) setState("error"); });
    return () => { cancelled = true; resize?.disconnect(); basemap?.remove(); map?.remove(); };
  }, [pipeline?.pipelineCode, route, segment?.segmentId]);
  if (!route || route.length < 2) return <div className="flex min-h-[250px] items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950"><div><p className="font-semibold">Location Not Available</p><p className="mt-1 text-xs">No saved GIS route geometry is available for this selection.</p></div></div>;
  return <div className="relative min-h-[250px] overflow-hidden rounded-md border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950" data-map-status={state}><div ref={mapElement} className="relative z-0 h-[250px] w-full font-[inherit] text-xs" role="region" aria-label="Saved pipeline route map" /><div className="pointer-events-none absolute left-3 top-3 z-10 rounded bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-600 shadow-sm dark:bg-slate-900/90 dark:text-slate-300">Saved route geometry · {segment ? segment.segmentId : pipeline?.pipelineCode}</div>{state === "loading" ? <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-slate-50/80 text-xs text-slate-600">Loading map...</div> : null}{state === "error" ? <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50/90 p-4 text-center text-xs text-slate-600">Map could not be loaded. Saved GIS geometry is unchanged.</div> : null}<p className="pointer-events-none absolute bottom-2 left-3 z-10 text-[10px] text-slate-500">Saved GIS geometry only; sensor markers and segment boundaries are not inferred.</p></div>;
}

export function SensorByPipelineView({ records, onViewSensors }: { records: DeviceRecord[]; onViewSensors: (query: string) => void }) {
  const [pipelines, setPipelines] = useState<PipelineRecord[]>([]);
  const [segments, setSegments] = useState<AssetMasterSegmentRecord[]>([]);
  const [pipelineId, setPipelineId] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const realRecords = records.filter(record => !record.isDemoData);

  useEffect(() => { let active = true; setLoading(true); setError(""); void fetchPipelines().then(items => { if (!active) return; setPipelines(items); setPipelineId(current => items.some(item => item.id === current) ? current : items[0]?.id ?? ""); }).catch(() => { if (active) { setPipelines([]); setPipelineId(""); setError("Pipeline records could not be loaded. Use Refresh to retry."); } }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [refresh]);
  useEffect(() => { if (!pipelineId) { setSegments([]); return; } let active = true; setSegments([]); void fetchMasterSegments(pipelineId).then(items => { if (active) {setSegments(items.filter(item=>item.pipelineId===pipelineId));setSegmentId(current=>items.some(item=>item.pipelineId===pipelineId&&item.id===current)?current:"");} }).catch(() => { if (active) setSegments([]); }); return () => { active = false; }; }, [pipelineId, refresh]);

  const pipeline = pipelines.find(item => item.id === pipelineId) ?? null;
  const selectedSegment = segments.find(item => item.id === segmentId) ?? null;
  const scopeSegments = selectedSegment ? [selectedSegment] : segments;
  const scopedRecords = pipeline ? realRecords.filter(record => storedMatch(record, pipeline, selectedSegment ?? undefined)) : [];
  const visibleSegments = scopeSegments.filter(item => `${item.segmentId} ${item.name ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  const count = (segment?: AssetMasterSegmentRecord) => pipeline ? realRecords.filter(record => storedMatch(record, pipeline, segment)).length : 0;
  const tableRows = visibleSegments;
  const maxCount = Math.max(1, ...scopeSegments.map(item => count(item)));

  return <div className="space-y-3" aria-label="Sensors by pipeline and segment view">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Sensors by Pipeline / Segment</h2><p className="mt-0.5 text-xs text-slate-500">Scope sensor registry records to saved Pipeline / Asset Master structure.</p></div><button type="button" className={button} onClick={() => setRefresh(value => value + 1)} disabled={loading}><RefreshCw size={14} />Refresh</button></div>
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"><Kpi label="Total Sensors" value={pipeline ? scopedRecords.length : na} Icon={Radio} /><Kpi label="Online" value={na} detail="Connectivity unavailable" Icon={WifiOff} /><Kpi label="Offline" value={na} detail="Connectivity unavailable" Icon={WifiOff} /><Kpi label="Attention" value={na} detail="Health source unavailable" Icon={AlertTriangle} /><Kpi label="Calibration Due" value={na} detail="Next 90 days" Icon={CalendarDays} /><Kpi label="Maintenance Due" value={na} detail="Next 90 days" Icon={Wrench} /></div>
    {error ? <Panel><p role="alert" className="text-sm text-rose-700">{error}</p></Panel> : null}
    <div className="grid gap-3 lg:grid-cols-[300px_minmax(0,1fr)]"><Panel className="!p-3"><h3 className="flex items-center gap-2 text-sm font-semibold"><Route size={18} className="text-slateblue-600" />Select Pipeline</h3><select aria-label="Sensor pipeline" value={pipelineId} onChange={event => { setPipelineId(event.target.value); setSegmentId(""); }} disabled={loading || !pipelines.length} className="mt-2 w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"><option value="">{loading ? "Loading pipelines..." : pipelines.length ? "Select pipeline" : na}</option>{pipelines.map(item => <option value={item.id} key={item.id}>{item.pipelineCode} · {item.pipelineName}</option>)}</select><div className="mt-3 border-t border-slate-200 pt-2 dark:border-slate-700"><h3 className="flex items-center gap-2 text-sm font-semibold"><Table2 size={18} className="text-slateblue-600" />Pipeline Segments</h3><div className="mt-2 space-y-1">{pipelines.map(item => <div key={item.id}><button type="button" className={`flex w-full items-center gap-1 rounded px-1.5 py-1.5 text-left text-xs font-semibold ${pipelineId === item.id ? "bg-slateblue-50 text-slateblue-800 dark:bg-slateblue-950 dark:text-slateblue-200" : "text-slate-600 dark:text-slate-300"}`} onClick={() => { setPipelineId(item.id); setSegmentId(""); setExpanded(current => pipelineId === item.id ? !current : true); }}>{pipelineId === item.id && expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}<span className="truncate">{item.pipelineCode} · {item.pipelineName}</span><span className="ml-auto">({realRecords.filter(record => storedMatch(record, item)).length})</span></button>{pipelineId === item.id && expanded ? <div className="ml-4 border-l border-slate-200 pl-2 dark:border-slate-700">{segments.map(segment => <button type="button" key={segment.id} onClick={() => setSegmentId(segment.id)} className={`flex w-full items-center gap-2 rounded px-1.5 py-1.5 text-left text-xs ${segment.id === segmentId ? "bg-slateblue-100 font-semibold text-slateblue-800 dark:bg-slateblue-950 dark:text-slateblue-200" : "text-slate-600 dark:text-slate-300"}`}><span className={`h-2 w-2 rounded-full ${count(segment) ? "bg-slateblue-600" : "bg-slate-300"}`} />{segment.segmentId}<span className="truncate">{segment.name ? `· ${segment.name}` : ""}</span><span className="ml-auto">({count(segment)})</span></button>)}{!segments.length ? <p className="px-1.5 py-2 text-xs text-slate-500">{na}</p> : null}</div> : null}</div>)}</div></div></Panel>
      <Panel className="!p-3"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-sm font-semibold"><MapIcon size={18} className="text-slateblue-600" />{pipeline ? `${pipeline.pipelineCode} · ${pipeline.pipelineName}` : na}</h3><span className="text-[10px] text-slate-500">{selectedSegment ? selectedSegment.segmentId : "All segments"}</span></div><LeafletRouteMap pipeline={pipeline} segment={selectedSegment} /></Panel></div>
    <div className="grid gap-3 lg:grid-cols-3"><Panel className="!p-3"><h3 className="flex items-center gap-2 text-sm font-semibold"><BarChart3 size={18} className="text-slateblue-600" />Sensors by Segment</h3><div className="relative mt-3 h-36 border-b border-l border-slate-200 dark:border-slate-700"><div className="absolute inset-x-3 bottom-0 top-1 flex items-end gap-2">{scopeSegments.map(segment => { const value = count(segment); return <div key={segment.id} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"><span className="text-[10px] font-semibold">{value}</span><div className="w-full max-w-8 rounded-t bg-blue-500" style={{ height: `${Math.max(value ? 5 : 1, value / maxCount * 100)}%` }} /><span className="w-full truncate text-center text-[9px] text-slate-500">{segment.segmentId}</span></div>; })}</div></div></Panel><Panel className="!p-3"><h3 className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle size={18} className="text-rose-500" />Coverage Gaps</h3><div className="mt-3 rounded-md border border-dashed border-slate-300 p-5 text-center dark:border-slate-700"><p className="text-2xl font-bold text-slate-500">{na}</p><p className="mt-1 text-xs text-slate-500">Physical coverage inputs and verified gap rules are unavailable.</p></div></Panel><Panel className="!p-3"><h3 className="flex items-center gap-2 text-sm font-semibold"><BarChart3 size={18} className="text-slateblue-600" />Online vs Offline by Segment</h3><div className="mt-3 space-y-2">{scopeSegments.map(segment => <div key={segment.id} className="flex items-center gap-2 text-[10px]"><span className="w-16 truncate text-slate-500">{segment.segmentId}</span><div className="h-3 flex-1 rounded bg-slate-100 dark:bg-slate-800" /><span className="w-20 text-right text-slate-500">{na}</span></div>)}{!scopeSegments.length ? <p className="text-sm text-slate-500">{na}</p> : null}</div></Panel></div>
    <Panel className="!p-3"><div className="flex flex-wrap items-end justify-between gap-2"><div><h3 className="text-base font-bold">Pipeline Segments ({tableRows.length})</h3><p className="text-xs text-slate-500">Rows are sourced from Asset Master; sensor counts use exact stored pipeline/segment location matches.</p></div><label className="text-xs text-slate-500"><span className="sr-only">Search segments</span><Search size={14} className="mr-1 inline" /><input aria-label="Search segments" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search segments..." className="w-48 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900" /></label></div><div className="mt-2 overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700"><table className="min-w-[980px] w-full text-left text-[11px]"><caption className="sr-only">Pipeline segments sensor coverage</caption><thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><tr>{["Pipeline ID", "Segment ID", "Segment Name", "KP Range", "Total Sensors", "Active Sensors", "Coverage Status", "Critical Offline", "Actions"].map(label => <th key={label} className="whitespace-nowrap px-2.5 py-2 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{tableRows.map(segment => { const total = count(segment); return <tr key={segment.id} className={segment.id === segmentId ? "bg-slateblue-50 dark:bg-slateblue-950/30" : ""} onClick={() => setSegmentId(segment.id)}><td className="px-2.5 py-2">{pipeline?.pipelineCode ?? na}</td><td className="px-2.5 py-2 font-semibold">{segment.segmentId}</td><td className="px-2.5 py-2">{segment.name || na}</td><td className="px-2.5 py-2">{segment.startKp !== undefined && segment.endKp !== undefined ? `KP ${segment.startKp} – ${segment.endKp}` : na}</td><td className="px-2.5 py-2">{total}</td><td className="px-2.5 py-2 text-slate-500">{total ? na : 0}</td><td className="px-2.5 py-2 text-slate-500">{na}</td><td className="px-2.5 py-2 text-slate-500">{na}</td><td className="px-2.5 py-2"><button type="button" className={button} onClick={event => { event.stopPropagation(); onViewSensors(segment.segmentId); }}>View Sensors</button></td></tr>; })}{!tableRows.length ? <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-500">{loading ? "Loading pipeline records..." : na}</td></tr> : null}</tbody></table></div></Panel>
  </div>;
}
