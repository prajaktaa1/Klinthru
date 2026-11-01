"use client";
import { drawSavedPipelineOverlay, pipelineOverlayLabel } from "@/lib/saved-pipeline-overlay";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, RefreshCw } from "lucide-react";
import { attachBasemap, GEOGRAPHIC_MAP_OPTIONS, UAE_VIEW } from "@/lib/map-provider";
import { savedMapEndpoints, savedMapCoordinate, savedMapRoute, savedSegmentMapRoute } from "@/lib/dashboard-map-data";
import { loadLeaflet } from "@/components/segment-map-card";
import type { AssetMasterAssetRecord, AssetMasterSegmentRecord, GeoJsonLineString, PipelineRecord } from "@/lib/types";

export function AssetLocationMap({ asset, assets, pipeline, segments }: { asset: AssetMasterAssetRecord; assets: AssetMasterAssetRecord[]; pipeline: PipelineRecord | null; segments: AssetMasterSegmentRecord[] }) {
  const element = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const sourceSegments = segments;
  segments = useMemo(() => sourceSegments.filter(segment => segment.pipelineId === pipeline?.id).map(segment => ({ ...segment, routeGeometry: savedSegmentMapRoute(segment) ? segment.routeGeometry : undefined })), [sourceSegments, pipeline?.id]);
  const located = savedMapCoordinate(asset.latitude, asset.longitude);
  const hasRoute = Boolean(savedMapEndpoints(pipeline?.routeGeometry) || segments.some(segment => segment.pipelineId === pipeline?.id && savedMapRoute(segment.routeGeometry)));
  useEffect(() => {
    if ((!located && !hasRoute) || !element.current) return;
    let cancelled = false;
    let map: any;
    let base: ReturnType<typeof attachBasemap> | undefined;
    let resize: ResizeObserver | undefined;
    setState("loading");
    void loadLeaflet().then((L) => {
      if (cancelled || !element.current) return;
      map = L.map(element.current, { ...GEOGRAPHIC_MAP_OPTIONS, scrollWheelZoom: false }).setView(UAE_VIEW, 7);
      base = attachBasemap(map, L, "hybrid");
      L.control.scale({ imperial: false }).addTo(map);
      const primary = getComputedStyle(element.current).getPropertyValue("--app-primary").trim() || "#0891b2";
      const bounds = L.latLngBounds([]);
      const text = (value: string) => { const span = document.createElement("span"); span.textContent = value; span.style.cssText = "display:block;width:140px;white-space:normal"; return span; };
      const draw = (geometry: GeoJsonLineString | undefined, selected: boolean, label: string) => {
        const coordinates = savedMapRoute(geometry) ?? [];
        if (coordinates.length < 2) return;
        const line = L.polyline(coordinates, { color: selected ? primary : "#94a3b8", weight: selected ? 5 : 3 }).addTo(map).bindTooltip(text(label));
        coordinates.forEach((point) => bounds.extend(point));
        if (selected) line.bringToFront();
      };
      drawSavedPipelineOverlay(L, map, pipeline).forEach(point => bounds.extend(point));
      segments.filter(segment => segment.pipelineId === pipeline?.id).forEach((segment) => draw(segment.routeGeometry, segment.id === asset.segmentId || segment.segmentId === asset.segmentId, segment.segmentId));
      assets.filter((item) => item.pipelineId === pipeline?.id && savedMapCoordinate(item.latitude, item.longitude)).forEach((item) => {
        const selected = item.id === asset.id;
        const marker = L.circleMarker([item.latitude, item.longitude], { radius: selected ? 9 : 5, color: "#ffffff", weight: selected ? 3 : 2, fillColor: selected ? primary : "#16a34a", fillOpacity: 1 }).addTo(map);
        marker.bindTooltip(text(`${item.assetId}${item.kp ? ` · KP ${item.kp}` : ""}`), { permanent: true, direction: "left", offset: [-8, 0] });
        bounds.extend([item.latitude, item.longitude]);
      });
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
      resize = new ResizeObserver(() => map?.invalidateSize());
      resize.observe(element.current);
      setState("ready");
    }).catch(() => { if (!cancelled) setState("error"); });
    return () => { cancelled = true; resize?.disconnect(); base?.remove(); map?.remove(); };
  }, [asset, assets, pipeline, segments, located, hasRoute, attempt]);
  if (!located && !hasRoute) return <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-5 text-center text-xs text-slate-500"><MapPin size={30} className="text-slateblue-600" /><p className="font-semibold text-slate-800">Location not recorded</p><p>Add coordinates in Edit Asset to show this asset on the map.</p>{asset.kp ? <p>KP {asset.kp}</p> : null}</div>;
  return <div>
    <p className="mb-1 text-xs font-semibold text-slate-700">{pipeline?.pipelineCode} / {pipelineOverlayLabel(pipeline)}</p>
    <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50" data-asset-map-status={state}>
      <div ref={element} className="relative z-0 h-[240px] font-[inherit] text-xs" role="region" aria-label={`Asset location map for ${asset.assetId}`} />
      <div className="pointer-events-none absolute right-3 top-3 z-10 max-w-[60%] rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm"><p className="break-words font-semibold text-slateblue-700">{asset.name || asset.assetId}</p><p className="text-slate-600">{asset.assetId}{asset.kp ? ` ? KP ${asset.kp}` : ""}</p></div>
      {state === "loading" ? <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-slate-50/80 text-xs text-slate-600">Loading asset map...</div> : null}
      {state === "error" ? <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-50 p-4 text-xs text-slate-600"><p>Map could not be loaded.</p><button type="button" onClick={() => setAttempt((value) => value + 1)} className="inline-flex items-center gap-1 font-semibold text-slateblue-700"><RefreshCw size={14} />Retry map</button></div> : null}
    </div>
    <p className="mt-2 text-xs text-slate-500">{located ? `${asset.latitude}, ${asset.longitude}${asset.kp ? ` · KP ${asset.kp}` : ""}` : "Pipeline route shown; asset coordinates are not recorded."}</p>
  </div>;
}
