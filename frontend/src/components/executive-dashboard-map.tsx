"use client";
import { drawSavedPipelineOverlay, pipelineOverlayLabel } from "@/lib/saved-pipeline-overlay";
import { useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, RefreshCw } from "lucide-react";
import { attachBasemap, GEOGRAPHIC_MAP_OPTIONS, UAE_VIEW } from "@/lib/map-provider";
import { loadLeaflet } from "@/components/segment-map-card";
import { fetchMasterAssets, fetchMasterSegments, fetchPipelineById } from "@/lib/apiClient";
import { savedMapEndpoints, savedMapCoordinate, savedMapRoute, savedSegmentMapRoute, scopeMasterMap, type DashboardMasterMapBundle } from "@/lib/dashboard-map-data";
import type { PipelineRecord, AssetMasterSegmentRecord } from "@/lib/types";

export type DashboardMapPoint = { id: string; latitude: number; longitude: number; label: string; kind: "risk" | "cp"; status?: string };
const button = "rounded-md border border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold text-slateblue-700 hover:bg-slateblue-50";
const text = (value: unknown) => value === undefined || value === null || value === "" ? "Not Available" : String(value);

export function ExecutiveDashboardMap({ pipelines, selectedPipelineId, selectedSegmentId, refreshing, onSelectPipeline, points }: { pipelines: PipelineRecord[]; selectedPipelineId: string; selectedSegmentId: string; refreshing: boolean; onSelectPipeline: (id: string) => void; points: DashboardMapPoint[] }) {
  const element = useRef<HTMLDivElement>(null), mapRef = useRef<any>(null), boundsRef = useRef<any>(null), context = useRef({ pipeline: "", segment: "" });
  const [all, setAll] = useState(() => !selectedPipelineId), [bundles, setBundles] = useState<DashboardMasterMapBundle[]>([]), [masterLoading, setMasterLoading] = useState(true);
  const [layers, setLayers] = useState({ route: true, segments: true, assets: true, risk: true, cp: true, sensors: true }), [satellite, setSatellite] = useState(true), [attempt, setAttempt] = useState(0), [state, setState] = useState("loading");
  useEffect(() => {
    const previous = context.current;
    if (selectedPipelineId && (!previous.pipeline || previous.pipeline !== selectedPipelineId || previous.segment !== selectedSegmentId)) setAll(false);
    context.current = { pipeline: selectedPipelineId, segment: selectedSegmentId };
  }, [selectedPipelineId, selectedSegmentId]);
  useEffect(() => {
    let active = true; setBundles([]);
    if (refreshing) { setMasterLoading(true); return; }
    if (!pipelines.length) { setMasterLoading(false); return; }
    setMasterLoading(true);
    void Promise.all(pipelines.map(async (listed) => {
      const [pipeline, segments, assets] = await Promise.allSettled([fetchPipelineById(listed.id), fetchMasterSegments(listed.id), fetchMasterAssets(listed.id)]);
      const errors: string[] = [];
      const verified = pipeline.status === "fulfilled" && pipeline.value.id === listed.id;
      if (!verified) errors.push("Pipeline details unavailable");
      if (segments.status === "rejected") errors.push("Segments unavailable");
      if (assets.status === "rejected") errors.push("Assets unavailable");
      return { pipeline: verified && pipeline.status === "fulfilled" ? pipeline.value : { ...listed, routeGeometry: undefined }, segments: segments.status === "fulfilled" ? segments.value.filter((item) => item.pipelineId === listed.id) : [], assets: assets.status === "fulfilled" ? assets.value.filter((item) => item.pipelineId === listed.id) : [], errors };
    })).then((result) => { if (active) { setBundles(result); setMasterLoading(false); } });
    return () => { active = false; };
  }, [pipelines, refreshing, attempt]);
  const scoped = useMemo(() => scopeMasterMap(bundles, all ? null : selectedPipelineId, all ? "" : selectedSegmentId), [bundles, all, selectedPipelineId, selectedSegmentId]);
  const mappedPoints = useMemo(() => !all && !selectedSegmentId ? points.filter((point) => savedMapCoordinate(point.latitude, point.longitude)) : [], [all, selectedSegmentId, points]);
  const routes = useMemo(() => scoped.flatMap((bundle) => {
    const route = !all && selectedSegmentId ? null : savedMapEndpoints(bundle.pipeline.routeGeometry);
    return route ? [{ pipeline: bundle.pipeline, segment: null as AssetMasterSegmentRecord | null, coordinates: route }] : [];
  }), [scoped, all, selectedSegmentId]);
  const segmentRoutes = useMemo(() => scoped.flatMap((bundle) => {
    return bundle.segments.flatMap((segment) => {
      const coordinates = savedSegmentMapRoute(segment);
      return coordinates ? [{ pipeline: bundle.pipeline, segment, coordinates }] : [];
    });
  }), [scoped, selectedSegmentId]);
  const located = useMemo(() => scoped.flatMap((bundle) => bundle.assets.filter((asset) => savedMapCoordinate(asset.latitude, asset.longitude))), [scoped]);
  const missing = scoped.filter((bundle) => !bundle.errors.includes("Pipeline details unavailable") && !savedMapRoute(bundle.pipeline.routeGeometry, bundle.pipeline.pipeLengthKm ?? NaN));
  const missingSegment = !all && selectedSegmentId && !segmentRoutes.length;
  const hasLocation = Boolean(routes.length || segmentRoutes.length || located.length || mappedPoints.length);
  useEffect(() => {
    if (!hasLocation || !element.current || masterLoading) return;
    let cancelled = false, map: any, resize: ResizeObserver | undefined, base: ReturnType<typeof attachBasemap> | undefined;
    setState("loading");
    void loadLeaflet().then((L) => {
      if (cancelled || !element.current) return;
      map = L.map(element.current, { ...GEOGRAPHIC_MAP_OPTIONS, scrollWheelZoom: false, zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false }).setView(UAE_VIEW, 7); mapRef.current = map;
      base = attachBasemap(map, L, satellite ? "hybrid" : "street");
      L.control.scale({ imperial: false }).addTo(map);
      const primary = getComputedStyle(element.current).getPropertyValue("--app-primary").trim() || "#0891b2", bounds = L.latLngBounds([]);
      const label = (value: string) => { const node = document.createElement("span"); node.textContent = value; node.style.cssText = "display:block;width:140px;white-space:normal"; return node; };
      const routeDetails = (pipeline: PipelineRecord, segment: AssetMasterSegmentRecord | null) => {
        const node = document.createElement("div"), title = document.createElement("strong"), fields = document.createElement("dl"), link = document.createElement("a");
        node.setAttribute("aria-label", `Saved ${segment ? "segment" : "pipeline"} details ${segment?.segmentId ?? pipeline.pipelineCode}`);
        title.textContent = segment ? `${segment.segmentId} — ${pipeline.pipelineName}` : pipeline.pipelineName;
        const metadata = [["Pipeline ID", pipeline.pipelineCode], ["Saved Record ID", pipeline.id], ["Pipeline Length (km)", pipeline.pipeLengthKm], ["Pipeline Status", pipeline.status], ...(segment ? [["Segment ID", segment.segmentId], ["Segment Record ID", segment.id], ["Segment Status", segment.status], ["From KP", segment.startKp], ["To KP", segment.endKp]] : [])];
        metadata.forEach(([name, value]) => { const dt = document.createElement("dt"), dd = document.createElement("dd"); dt.textContent = text(name); dt.style.fontWeight = "600"; dd.textContent = text(value); fields.append(dt, dd); });
        link.href = "/asset-master"; link.textContent = "Open Pipeline / Asset Master"; node.append(title, fields, link); return node;
      };
      const drawRoute = (route: { pipeline: PipelineRecord; segment: AssetMasterSegmentRecord | null; coordinates: [number, number][] }, segment: boolean) => {
        route.coordinates.forEach((point) => bounds.extend(point));
        if (segment ? !layers.segments : !layers.route) return;
        const name = route.segment?.segmentId ?? route.pipeline.pipelineCode;
        const line = L.polyline(route.coordinates, { color: primary, weight: segment ? 2 : 4, dashArray: segment ? "6 5" : undefined }).addTo(map).bindTooltip(label(`${name} — ${route.pipeline.pipelineName}`)).bindPopup(routeDetails(route.pipeline, route.segment), { maxHeight: 120, autoPanPaddingTopLeft: [10, 42], autoPanPaddingBottomRight: [10, 10] });
        const decorate = () => { const path = line.getElement();
        if (path) { path.setAttribute("role", "button"); path.setAttribute("tabindex", "0"); path.setAttribute("aria-label", `Open saved ${segment ? "segment" : "pipeline"} ${name}`); path.addEventListener("keydown", (event: KeyboardEvent) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); line.openPopup(); } }); } };
        line.on("add", decorate); decorate();
      };
      routes.forEach((route) => { drawSavedPipelineOverlay(L, map, route.pipeline, layer => { if (layers.route) layer.addTo(map); return layer; }); route.coordinates.forEach(point => bounds.extend(point)); }); segmentRoutes.forEach((route) => drawRoute(route, true));
      located.forEach((asset) => {
        bounds.extend([asset.latitude, asset.longitude]);
        if (asset.assetType === "SENSOR" ? !layers.sensors : !layers.assets) return;
        const marker = L.circleMarker([asset.latitude, asset.longitude], { radius: 6, color: "#ffffff", weight: 2, fillColor: primary, fillOpacity: 1 }).addTo(map);
        marker.bindTooltip(label(`${asset.assetId}${asset.kp ? ` / KP ${asset.kp}` : ""}`), { permanent: true, direction: "left", offset: [-8, 0] });
        const popup = document.createElement("div"), detail = document.createElement("p"), link = document.createElement("a"); popup.setAttribute("aria-label", `Saved asset details ${asset.assetId}`); detail.textContent = `${asset.assetId} · ${text(asset.name)} · ${asset.assetType} · ${asset.physicalStatus}${asset.kp ? ` · KP ${asset.kp}` : ""}`; link.textContent = "Open asset record"; link.href = `/asset-master/assets/${encodeURIComponent(asset.id)}`; popup.append(detail, link); marker.bindPopup(popup); const decorate = () => { const path = marker.getElement(); if (path) path.setAttribute("aria-label", `Saved asset ${asset.assetId}`); }; marker.on("add", decorate); decorate();
      });
      mappedPoints.forEach((point) => {
        bounds.extend([point.latitude, point.longitude]); if (point.kind === "risk" ? !layers.risk : !layers.cp) return;
        const fillColor = point.kind === "risk" ? /high|critical/i.test(point.status ?? "") ? "#be123c" : /medium|moderate/i.test(point.status ?? "") ? "#b45309" : /low/i.test(point.status ?? "") ? "#047857" : primary : primary;
        L.circleMarker([point.latitude, point.longitude], { radius: 8, color: "#ffffff", weight: 2, fillColor, fillOpacity: 1 }).addTo(map).bindTooltip(label(`${point.label}${point.status ? ` · ${point.status}` : ""}`));
      });
      boundsRef.current = bounds; if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 }); resize = new ResizeObserver(() => map?.invalidateSize()); resize.observe(element.current); setState("ready");
    }).catch(() => { if (!cancelled) setState("error"); });
    return () => { cancelled = true; resize?.disconnect(); base?.remove(); map?.remove(); mapRef.current = null; boundsRef.current = null; };
  }, [routes, segmentRoutes, located, mappedPoints, layers, satellite, attempt, hasLocation, masterLoading]);
  return <div aria-label="Saved Asset Master dashboard map" aria-busy={masterLoading}>
    <div className="mb-2 flex flex-wrap items-end gap-2"><label className="min-w-0 flex-1 text-[10px] font-semibold text-slate-600">Map Pipeline<select aria-label="Dashboard map pipeline" value={all ? "ALL" : selectedPipelineId} onChange={(event) => { if (event.target.value === "ALL") setAll(true); else { setAll(false); onSelectPipeline(event.target.value); } }} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"><option value="ALL">All Pipelines</option>{pipelines.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.pipelineCode} - {pipeline.pipelineName}</option>)}</select></label></div>
    <div className="mb-2 flex flex-wrap gap-1">{([["route", "Pipeline Route"], ["segments", "Segments"], ["assets", "Assets"], ["risk", "Risk & Defects"], ["cp", "CP Status"], ["sensors", "Sensors"]] as const).map(([key, label]) => <button key={key} type="button" aria-pressed={layers[key]} onClick={() => setLayers((previous) => ({ ...previous, [key]: !previous[key] }))} className={`${button} ${layers[key] ? "!bg-slateblue-50" : ""}`}>{label}</button>)}</div>
     {masterLoading ? <div className="flex h-[245px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-600">Loading saved map data...</div> : hasLocation ? <div className="relative overflow-hidden rounded-lg border border-slate-200" data-dashboard-map-status={state} data-pipeline-route-count={routes.length} data-segment-route-count={segmentRoutes.length} data-located-asset-count={located.length}><div ref={element} role="region" aria-label="Dashboard pipeline map" className="relative z-0 h-[245px]" /><div className="absolute right-2 top-2 z-10 flex gap-1"><button type="button" className={button} aria-pressed={!satellite} onClick={() => setSatellite(false)}>Map</button><button type="button" className={button} aria-pressed={satellite} onClick={() => setSatellite(true)}>Satellite + English labels</button><button type="button" aria-label="Fit dashboard route" className={button} onClick={() => { if (boundsRef.current?.isValid()) mapRef.current?.fitBounds(boundsRef.current, { padding: [24, 24], maxZoom: 14 }); }}><Crosshair size={14} /></button></div>{state === "loading" ? <p className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-xs text-slate-600">Loading map...</p> : state === "error" ? <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-50 text-xs text-slate-600"><p>Map could not be loaded.</p><button type="button" className={button} onClick={() => setAttempt((value) => value + 1)}><RefreshCw size={14} />Retry map</button></div> : null}</div> : <div className="flex h-[245px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500">{scoped.some((bundle) => bundle.errors.includes("Pipeline details unavailable")) ? "Saved route data could not be loaded. Use Refresh to retry." : "GIS Route Data Required"}</div>}
    {!masterLoading ? <div className="mt-2 space-y-1 text-[10px] text-slate-500"><p>{all ? "All pipelines" : selectedSegmentId ? "Selected segment" : "Selected pipeline"}: {scoped.length} pipeline records · {routes.length} pipeline routes · {segmentRoutes.length} segment routes · {located.length} located assets.</p>{missingSegment ? <p role="status">GIS Route Data Required — selected segment has no valid saved route.</p> : missing.map((bundle) => <p role="status" key={bundle.pipeline.id}>Incomplete Route / GIS Route Data Required — {bundle.pipeline.pipelineCode}: {bundle.pipeline.pipelineName}</p>)}{scoped.filter((bundle) => bundle.errors.length).map((bundle) => <p role="status" key={bundle.pipeline.id}>{bundle.pipeline.pipelineCode}: {bundle.errors.join("; ")}. Use Refresh to retry.</p>)}<details><summary className="cursor-pointer font-semibold text-slateblue-700">Selected pipeline details ({scoped.length})</summary><ul aria-label="Mapped pipeline records" className="mt-1 space-y-1">{scoped.map(({ pipeline }) => <li key={pipeline.id} className="break-words">{pipeline.pipelineCode} · {pipeline.pipelineName} · {text(pipeline.pipeLengthKm)} km · {text(pipeline.status)}</li>)}</ul></details><p>Read-only map; saved endpoint pairs are displayed as Incomplete Route.</p></div> : null}
  </div>;
}
