"use client";
import { drawSavedPipelineOverlay, pipelineOverlayLabel } from "@/lib/saved-pipeline-overlay";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, MapPin, RefreshCw, Route } from "lucide-react";
import { Panel } from "@/components/ui";
import { savedMapEndpoints, savedMapCoordinate, savedMapRoute, savedSegmentMapRoute } from "@/lib/dashboard-map-data";
import { attachBasemap, GEOGRAPHIC_MAP_OPTIONS, UAE_VIEW } from "@/lib/map-provider";
import { segmentKp } from "@/lib/segment-data";
import type { AssetMasterAssetRecord, AssetMasterSegmentRecord, GeoJsonLineString, PipelineRecord } from "@/lib/types";

let leafletPromise: Promise<any> | undefined;
export function loadLeaflet(): Promise<any> {
  const win = window as unknown as { L?: any };
  if (win.L) return Promise.resolve(win.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.getElementById("leaflet-styles")) {
      const css = document.createElement("link");
      css.id = "leaflet-styles";
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(css);
    }
    let script = document.getElementById("leaflet-javascript-api") as HTMLScriptElement | null;
    if (script?.dataset.segmentLoadFailed === "true") { script.remove(); script = null; }
    const existing = Boolean(script);
    script ??= document.createElement("script");
    const target = script;
    const cleanup = () => { clearTimeout(timeout); target.removeEventListener("load", loaded); target.removeEventListener("error", failed); };
    const loaded = () => { cleanup(); win.L ? resolve(win.L) : failed(); };
    const failed = () => { cleanup(); target.dataset.segmentLoadFailed = "true"; reject(new Error("Map could not be loaded")); };
    const timeout = window.setTimeout(failed, 12000);
    target.addEventListener("load", loaded, { once: true });
    target.addEventListener("error", failed, { once: true });
    if (!existing) {
      target.id = "leaflet-javascript-api";
      target.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      target.async = true;
      document.body.appendChild(target);
    }
  }).catch((error) => { leafletPromise = undefined; throw error; });
  return leafletPromise;
}

function points(geometry?: GeoJsonLineString): [number, number][] {
  return savedMapRoute(geometry) ?? [];
}

export function SegmentMapCard({ pipeline, segment, segments, assets, onSelectSegment, onViewMap }: {
  pipeline: PipelineRecord | null;
  segment: AssetMasterSegmentRecord | null;
  segments: AssetMasterSegmentRecord[];
  assets: AssetMasterAssetRecord[];
  onSelectSegment: (id: string) => void;
  onViewMap: () => void;
}) {
  const mapElement = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);
  const sourceSegments = segments;
  segments = useMemo(() => sourceSegments.filter(segment => segment.pipelineId === pipeline?.id).map(segment => ({ ...segment, routeGeometry: savedSegmentMapRoute(segment) ? segment.routeGeometry : undefined })), [sourceSegments, pipeline?.id]);
  // Use the same scoped, distance-checked record for the selected preview.
  segment = segments.find(item => item.id === segment?.id) ?? null;
  const located = assets.filter((asset) => asset.pipelineId === pipeline?.id && savedMapCoordinate(asset.latitude, asset.longitude));
  const hasLocation = (savedMapEndpoints(pipeline?.routeGeometry) ?? []).length >= 2 || segments.some((item) => points(item.routeGeometry).length >= 2) || located.length > 0;
  const range = segment && segmentKp(segment.startKp) !== null && segmentKp(segment.endKp) !== null ? `KP ${segment.startKp} – ${segment.endKp}` : "KP range not recorded";

  useEffect(() => {
    if (!hasLocation || !mapElement.current) return;
    let cancelled = false;
    let map: any;
    let base: ReturnType<typeof attachBasemap> | undefined;
    let resize: ResizeObserver | undefined;
    setState("loading");
    void loadLeaflet().then((L) => {
      if (cancelled || !mapElement.current) return;
      map = L.map(mapElement.current, { ...GEOGRAPHIC_MAP_OPTIONS, scrollWheelZoom: false }).setView(UAE_VIEW, 7);
      base = attachBasemap(map, L, "hybrid");
      L.control.scale({ imperial: false }).addTo(map);
      const primary = getComputedStyle(mapElement.current).getPropertyValue("--app-primary").trim() || "#0891b2";
      const bounds = L.latLngBounds([]);
      const tooltip = (text: string) => { const element = document.createElement("span"); element.textContent = text; return element; };
      const draw = (geometry: GeoJsonLineString | undefined, color: string, weight: number, label: string, id?: string) => {
        const coordinates = points(geometry);
        if (coordinates.length < 2) return;
        const line = L.polyline(coordinates, { color, weight, opacity: 0.95 }).addTo(map).bindTooltip(tooltip(label));
        if (id) line.on("click", () => onSelectSegment(id));
        coordinates.forEach((point) => bounds.extend(point));
        [coordinates[0], coordinates[coordinates.length - 1]].forEach((point) => L.circleMarker(point, { radius: 5, color, weight: 2, fillColor: "#ffffff", fillOpacity: 1 }).addTo(map));
      };
      drawSavedPipelineOverlay(L, map, pipeline).forEach(point => bounds.extend(point));
      segments.filter((item) => item.id !== segment?.id).forEach((item) => draw(item.routeGeometry, "#fbbf24", 4, item.segmentId, item.id));
      draw(segment?.routeGeometry, primary, 7, `${segment?.segmentId} · ${range}`, segment?.id);
      located.forEach((asset) => {
        const marker = L.circleMarker([asset.latitude, asset.longitude], { radius: 6, color: "#ffffff", weight: 2, fillColor: "#16a34a", fillOpacity: 1 }).addTo(map);
        marker.bindTooltip(tooltip(`${asset.assetId}${asset.kp ? ` · KP ${asset.kp}` : ""}`));
        bounds.extend([asset.latitude, asset.longitude]);
      });
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [25, 25], maxZoom: 15 });
      resize = new ResizeObserver(() => map?.invalidateSize());
      resize.observe(mapElement.current);
      setState("ready");
    }).catch(() => { if (!cancelled) setState("error"); });
    return () => { cancelled = true; resize?.disconnect(); base?.remove(); map?.remove(); };
  }, [hasLocation, pipeline?.routeGeometry, segment, segments, assets, onSelectSegment, range, retry]);

  return <Panel className="min-w-0">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><MapPin size={20} className="shrink-0 text-slateblue-600" />Segment Map - {segment?.segmentId ?? "Select a segment"}</h2>
      <button type="button" onClick={onViewMap} disabled={!pipeline} className="inline-flex items-center gap-1 rounded-md border border-slateblue-300 px-3 py-1.5 text-xs font-semibold text-slateblue-700 hover:bg-slateblue-50 disabled:opacity-50">View Full Map <ExternalLink size={14} /></button>
    </div>
    <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50" data-map-status={hasLocation ? state : "unmapped"}>
      {hasLocation ? <>
        <div ref={mapElement} className="relative z-0 h-[280px] font-[inherit] text-xs" role="region" aria-label={`Segment map for ${segment?.segmentId ?? "pipeline"}`} />
        {state === "loading" ? <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-slate-50/80 text-xs text-slate-600">Loading map...</div> : null}
        {state === "error" ? <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-50 p-4 text-center text-xs text-slate-600"><Route size={28} className="text-slateblue-600" /><p>Map could not be loaded.</p><button type="button" onClick={() => setRetry((value) => value + 1)} className="inline-flex items-center gap-1 font-semibold text-slateblue-700"><RefreshCw size={14} />Retry map</button></div> : null}
        <div className="pointer-events-none absolute right-3 top-3 z-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm"><p className="font-semibold text-slateblue-700">{segment?.segmentId ?? pipeline?.pipelineCode}</p><p className="text-slate-600">{range}</p></div>
      </> : <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 p-5 text-center text-xs text-slate-600"><Route size={32} className="text-slateblue-600" /><p className="font-semibold text-slate-800">{segment ? "KP overview" : "Select a segment"}</p><p>{segment ? "No map coordinates saved for this pipeline yet." : "Choose a segment from the register to view its location."}</p><div className="w-full"><SegmentKpOverview segment={segment} segments={segments} onSelectSegment={onSelectSegment} /></div></div>}
    </div>
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
      <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-slate-400" />{pipelineOverlayLabel(pipeline)}</span>
      <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-amber-400" />Other segment</span>
      <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-slateblue-600" />Selected segment</span>
      <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 bg-emerald-600" />Major asset</span>
    </div>
    {hasLocation && segment && !segment.routeGeometry ? <p className="mt-3 text-xs text-slate-500">Pipeline location shown. {segment.segmentId}: {range}; segment route coordinates are not saved.</p> : null}
  </Panel>;
}

function SegmentKpOverview({ segment, segments, onSelectSegment }: { segment: AssetMasterSegmentRecord | null; segments: AssetMasterSegmentRecord[]; onSelectSegment: (id: string) => void }) {
  const ranges = segments.flatMap((item) => {
    const start = segmentKp(item.startKp), end = segmentKp(item.endKp);
    return start !== null && end !== null && end > start ? [{ item, start, end }] : [];
  });
  if (!ranges.length) return <p className="text-xs text-slate-500">{segment ? "KP range not recorded." : "No segment selected."}</p>;
  const min = Math.min(...ranges.map((range) => range.start));
  const max = Math.max(...ranges.map((range) => range.end));
  return <div aria-label="Segment KP overview" className="pt-2 text-xs">
    <div className="relative h-9 rounded bg-slate-200">{ranges.map(({ item, start, end }) => <button key={item.id} type="button" onClick={() => onSelectSegment(item.id)} aria-label={`Select ${item.segmentId}, KP ${start} to ${end}`} aria-pressed={item.id === segment?.id} style={{ left: `${(start - min) / (max - min) * 100}%`, width: `${(end - start) / (max - min) * 100}%` }} className={`absolute inset-y-0 overflow-hidden rounded border-2 border-white px-1 text-xs font-semibold ${item.id === segment?.id ? "bg-slateblue-600 text-white" : "bg-slateblue-100 text-slateblue-700"}`}>{item.segmentId}</button>)}</div>
    <div className="mt-2 flex justify-between text-slate-500"><span>KP {min}</span><span>KP {max}</span></div>
  </div>;
}
