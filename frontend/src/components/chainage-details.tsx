"use client";
import { useState } from "react";
import { ChainageAgent, chainageSummary } from "@/lib/chainage";
import type { AssetMasterAssetRecord, PipelineRecord } from "@/lib/types";

export function ChainageFeedback({ value }: { value: string }) {
  const location = chainageSummary(value);
  return <span className="mt-1 block text-xs font-normal text-slate-500" role="status">{!value.trim() ? "Enter KM+METRES, m/km units, or numeric KP in km." : location ? `CH ${location.chainage} | ${location.chainage_meters.toLocaleString(undefined, { maximumFractionDigits: 9 })} m | ${location.chainage_km} km` : "Invalid chainage. Example: 18+900 or 18.9 km."}</span>;
}
export function ChainageDetails({ asset, assets, pipeline }: { asset: AssetMasterAssetRecord; assets: AssetMasterAssetRecord[]; pipeline: PipelineRecord | null }) {
  const [targetId, setTargetId] = useState("");
  const location = chainageSummary(asset.kp);
  if (!location || !pipeline || asset.pipelineId !== pipeline.id) return <p className="mt-3 text-xs text-slate-500">Chainage is not recorded or is invalid for this pipeline.</p>;
  const agent = new ChainageAgent({ pipelineId: pipeline.id, lengthMeters: pipeline.pipeLengthKm === undefined ? undefined : pipeline.pipeLengthKm * 1000 });
  const features = assets.flatMap(item => { const position = chainageSummary(item.kp); return position && item.pipelineId === pipeline.id ? [{ ...item, meters: position.chainage_meters }] : []; });
  const target = features.find(item => item.id === targetId), current = features.find(item => item.id === asset.id);
  const previous = agent.getPreviousAsset(features, location.chainage_meters), next = agent.getNextAsset(features, location.chainage_meters);
  return <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs" aria-label="Chainage Agent location details">
    <p className="font-semibold text-slate-800">Chainage Agent · CH {location.chainage}</p>
    <p className="text-slate-600">{location.chainage_meters.toLocaleString(undefined, { maximumFractionDigits: 9 })} m | {location.chainage_km} km along pipeline {pipeline.pipelineCode}</p>
    {pipeline.pipeLengthKm !== undefined && <p className="text-slate-500">Remaining: {pipeline.pipeLengthKm * 1000 - location.chainage_meters} m · {pipeline.pipeLengthKm > 0 ? `Approximately ${(location.chainage_km / pipeline.pipeLengthKm * 100).toFixed(2)}% along pipeline` : "Progress unavailable"}</p>}
    <p className="text-slate-500">Previous: {previous.map(f => `${f.assetId} (${location.chainage_meters - f.meters} m)`).join(", ") || "None recorded"}</p>
    <p className="text-slate-500">Next: {next.map(f => `${f.assetId} (${f.meters - location.chainage_meters} m)`).join(", ") || "None recorded"}</p>
    <label className="block text-slate-600">Distance to asset<select aria-label="Chainage distance target" value={targetId} onChange={event => setTargetId(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"><option value="">Select saved asset</option>{features.filter(f => f.id !== asset.id).map(f => <option key={f.id} value={f.id}>{f.assetId}</option>)}</select></label>
    {target && current && <p role="status">Along-pipeline distance: {agent.distance(current, target)} m ({agent.distance(current, target) / 1000} km)</p>}
    <p className="text-slate-500">Physical origin and flow direction are not recorded. Previous/next follow increasing chainage.</p>
  </div>;
}
