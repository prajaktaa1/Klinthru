"use client";

import { BatteryCharging, Building2, Cog, GitFork, MapPin, Route, Wifi } from "lucide-react";
import { parseKp } from "@/lib/chainage";
import type { AssetMasterAssetRecord, AssetMasterSegmentRecord, PipelineRecord } from "@/lib/types";

type Props = { pipeline: PipelineRecord | null; segments: AssetMasterSegmentRecord[]; assets: AssetMasterAssetRecord[]; selectedSegmentId?: string; selectedAssetId?: string; onSelectSegment: (segment: AssetMasterSegmentRecord) => void; onSelectAsset: (asset: AssetMasterAssetRecord) => void; };
const chainage = (value?: string | null) => { try { return parseKp(value ?? "").kilometers; } catch { return null; } };
const assetVisual = (type: AssetMasterAssetRecord["assetType"]) => {
  if (type === "STATION") return { Icon: Building2, color: "bg-blue-600", label: "Station" };
  if (type === "VALVE") return { Icon: GitFork, color: "bg-emerald-600", label: "Valve" };
  if (type === "RECTIFIER") return { Icon: BatteryCharging, color: "bg-orange-500", label: "Rectifier" };
  if (type === "TEST_POST") return { Icon: MapPin, color: "bg-violet-600", label: "Test post" };
  if (type === "COMPRESSOR") return { Icon: Cog, color: "bg-red-600", label: "Compressor" };
  if (type === "SENSOR") return { Icon: Wifi, color: "bg-cyan-500", label: "Sensor" };
  return { Icon: MapPin, color: "bg-slate-500", label: "Other asset" };
};

export function ChainageSchematic({ pipeline, segments, assets, selectedSegmentId, selectedAssetId, onSelectSegment, onSelectAsset }: Props) {
  const length = pipeline?.pipeLengthKm ?? 0;
  const ordered = [...segments].map(segment => ({ segment, start: chainage(segment.startKp), end: chainage(segment.endKp) })).filter((item): item is { segment: AssetMasterSegmentRecord; start: number; end: number } => item.start !== null && item.end !== null && item.end > item.start).sort((a, b) => a.start - b.start);
  const boundaries = [...new Set([0, ...ordered.flatMap(item => [item.start, item.end]), length])].filter(kp => kp >= 0 && kp <= length).sort((a, b) => a - b);
  const positioned = assets.map(asset => ({ asset, kp: chainage(asset.kp) })).filter((item): item is { asset: AssetMasterAssetRecord; kp: number } => item.kp !== null && item.kp >= 0 && item.kp <= length).sort((a, b) => a.kp - b.kp || a.asset.assetId.localeCompare(b.asset.assetId));
  const unlocated = assets.filter(asset => chainage(asset.kp) === null);
  // Alternating lanes are display-only; every saved KP remains unchanged.
  const markers = positioned.map((item, index) => ({ ...item, lane: index % 4, above: index % 2 === 0 }));
  if (!pipeline || !length) return null;
  const at = (kp: number) => `calc(2rem + ${(kp / length) * 100}% - ${(kp / length) * 4}rem)`;

  return <section className="mt-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900" aria-label="Chainage schematic">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Route size={20} className="text-slateblue-600" /><h2 className="text-base font-semibold text-slate-900 dark:text-white">Chainage schematic</h2></div><p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Saved KP engineering view — not a geographic map.</p></div><span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">GIS Route Data Required</span></div>
    <div className="mt-5 overflow-x-auto pb-2"><div className="relative min-w-[820px] px-8 pt-28 pb-28" data-chainage-schematic="true">
      <div className="absolute left-8 right-8 top-[138px] h-2 rounded-full bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
      {ordered.map(({ segment, start, end }, index) => <button key={segment.id} type="button" onClick={() => onSelectSegment(segment)} title={`${segment.segmentId}: KP ${start}–${end} (${end - start} km)`} className={`absolute top-[134px] h-10 border-y-2 transition focus:outline-none focus:ring-2 focus:ring-slateblue-500 ${selectedSegmentId === segment.id || selectedSegmentId === segment.segmentId ? "border-slateblue-700 bg-slateblue-600" : index % 2 ? "border-amber-500 bg-amber-400" : "border-cyan-600 bg-cyan-500"}`} style={{ left: at(start), width: `calc(${((end - start) / length) * 100}% - ${((end - start) / length) * 4}rem)` }} aria-label={`Select ${segment.segmentId}, KP ${start} to ${end}`}><span className="sr-only">{segment.segmentId}</span></button>)}
      {boundaries.map(kp => <div key={kp} className="absolute top-[116px] -translate-x-1/2 text-center" style={{ left: at(kp) }}><div className="mx-auto h-7 w-px bg-slate-700 dark:bg-slate-300" /><span className="mt-1 block whitespace-nowrap text-xs font-bold text-slate-800 dark:text-slate-100">KP {kp}</span></div>)}
      {ordered.map(({ segment, start, end }) => <button key={`${segment.id}-label`} type="button" onClick={() => onSelectSegment(segment)} className="absolute top-[184px] -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-slateblue-700 hover:underline dark:text-slateblue-300" style={{ left: at((start + end) / 2) }}>{segment.segmentId} · {end - start} km</button>)}
      {markers.map(({ asset, kp, lane, above }) => { const { Icon, color, label } = assetVisual(asset.assetType); return <button key={asset.id} type="button" onClick={() => onSelectAsset(asset)} title={`${asset.assetId} · ${label} · KP ${asset.kp}`} className="absolute -translate-x-1/2 text-center focus:outline-none focus:ring-2 focus:ring-slateblue-500" style={{ top: above ? 18 + lane * 12 : 205 + lane * 12, left: at(kp) }} aria-label={`Select ${asset.assetId}, KP ${asset.kp}`}><span className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-white shadow ${color} ${selectedAssetId === asset.id ? "ring-2 ring-slateblue-300" : ""}`}><Icon size={14} /></span><span className="mt-1 block max-w-24 truncate text-[10px] font-bold text-slate-800 dark:text-slate-100">{asset.assetId}</span></button>; })}
    </div></div>
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300"><span><i className="mr-1 inline-block h-3 w-3 rounded-sm bg-cyan-500 align-[-1px]" />Segment</span><span><i className="mr-1 inline-block h-3 w-3 rounded-full bg-blue-600 align-[-1px]" />Station</span><span><i className="mr-1 inline-block h-3 w-3 rounded-full bg-emerald-600 align-[-1px]" />Valve</span><span><i className="mr-1 inline-block h-3 w-3 rounded-full bg-orange-500 align-[-1px]" />Rectifier</span><span><i className="mr-1 inline-block h-3 w-3 rounded-full bg-violet-600 align-[-1px]" />Test post</span><span><i className="mr-1 inline-block h-3 w-3 rounded-full bg-red-600 align-[-1px]" />Compressor</span><span><i className="mr-1 inline-block h-3 w-3 rounded-full bg-cyan-500 align-[-1px]" />Sensor</span></div>
    {unlocated.length ? <div className="mt-3 rounded-md border border-dashed border-slate-300 p-3 text-xs dark:border-slate-600"><p className="font-semibold text-slate-800 dark:text-slate-100">Unlocated Assets ({unlocated.length})</p><div className="mt-2 flex flex-wrap gap-2">{unlocated.map(asset => <button key={asset.id} type="button" onClick={() => onSelectAsset(asset)} className="rounded border border-slate-200 px-2 py-1 font-semibold text-slateblue-700 hover:bg-slateblue-50 dark:border-slate-600 dark:text-slateblue-300">{asset.assetId}</button>)}</div></div> : null}
  </section>;
}
