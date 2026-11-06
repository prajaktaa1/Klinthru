"use client";
import { assetLayerCounts, assetMapLayer } from "@/lib/asset-map-layers";
import { useAssetMapLayers } from "@/lib/use-asset-map-layers";
import { savedMapCoordinate, savedMapEndpoints, savedMapRoute, savedSegmentMapRoute } from "@/lib/dashboard-map-data";
import type { AssetMasterAssetRecord, AssetMasterSegmentRecord, PipelineRecord } from "@/lib/types";

export function SavedMapRecords({ pipeline, segments, assets }: { pipeline: PipelineRecord | null; segments: AssetMasterSegmentRecord[]; assets: AssetMasterAssetRecord[] }) {
  const [layers, setLayers] = useAssetMapLayers(pipeline?.id);
  if (!pipeline) return null;
  const scopedSegments = [...new Map(segments.filter(s => s.pipelineId === pipeline.id).map(s => [s.id, s])).values()];
  const scopedAssets = [...new Map(assets.filter(a => a.pipelineId === pipeline.id).map(a => [a.id, a])).values()];
  const route = savedMapEndpoints(pipeline.routeGeometry);
  const complete = Boolean(savedMapRoute(pipeline.routeGeometry, pipeline.pipeLengthKm ?? NaN));
  const gpsCount = scopedAssets.filter(a => savedMapCoordinate(a.latitude, a.longitude)).length;
  return <details open className="mt-3 rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-700" aria-label="Saved map records" data-record-pipeline-id={pipeline.id}>
    <summary className="cursor-pointer font-semibold">{pipeline.pipelineCode} / {pipeline.pipelineName} / {scopedSegments.length} segments / {scopedAssets.length} assets / {gpsCount} with GPS</summary>
    <p className="mt-2 font-semibold" role="status">{pipeline.pipeLengthKm ?? "Unknown"} km configured{complete ? " / Saved geometry" : " — GIS Route Data Required / Incomplete Route"}</p>
    <p className="mt-1 break-all">Database ID: {pipeline.id}</p>
    <p className="mt-1">{route ? `Saved start: ${route[0].join(", ")} / Saved end: ${route[route.length - 1].join(", ")} / ${route.length} saved vertices` : "Endpoints and geometry not recorded"}</p>
    <div className="mt-2 flex flex-wrap gap-2" aria-label="Saved asset layer counts">{assetLayerCounts(scopedAssets, pipeline.id).map(layer => <label key={layer.key} data-saved-layer={layer.key} className="rounded border border-slate-200 px-2 py-1"><input type="checkbox" aria-label={`Saved map layer ${layer.label}`} checked={layers[layer.key]} onChange={() => setLayers(current => ({ ...current, [layer.key]: !current[layer.key] }))} className="mr-1 accent-slateblue-600" />{layer.label}: Saved {layer.saved} / GPS Located {layer.located} / GPS Missing {layer.missing}</label>)}</div>
    <div className="mt-2 max-h-56 overflow-auto">
      <table className="w-full text-left" aria-label="Saved segment map records"><thead><tr><th className="py-1">Segment</th><th>Actual KP range</th><th>Route status</th></tr></thead><tbody>{scopedSegments.map(s => <tr key={s.id} data-segment-record-id={s.id}><td className="py-1 pr-2">{s.segmentId}</td><td className="pr-2">{s.startKp ?? "Not recorded"} – {s.endKp ?? "Not recorded"}</td><td>{savedSegmentMapRoute(s) ? "Saved route" : s.routeGeometry ? "Incomplete Route" : "GIS Route Data Required"}</td></tr>)}</tbody></table>
      <table className="mt-2 w-full text-left" aria-label="Saved asset map records"><thead><tr><th className="py-1">Asset ID</th><th>Type</th><th>Segment</th><th>KP</th><th>GPS status</th></tr></thead><tbody>{scopedAssets.filter(a => layers[assetMapLayer(a)]).map(a => <tr key={a.id} data-asset-record-id={a.id}><td className="py-1 pr-2">{a.assetId}</td><td className="pr-2">{a.assetType}</td><td className="pr-2">{scopedSegments.find(s => s.id === a.segmentId || s.segmentId === a.segmentId)?.segmentId ?? a.segmentId ?? "Not recorded"}</td><td className="pr-2">{a.kp ?? "Not recorded"}</td><td>{savedMapCoordinate(a.latitude, a.longitude) ? `${a.latitude}, ${a.longitude}` : "GPS Required / Missing GPS — not plotted"}</td></tr>)}</tbody></table>
    </div>
  </details>;
}
