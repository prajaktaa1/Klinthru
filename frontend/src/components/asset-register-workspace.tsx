"use client";

import Link from "next/link";
import { ChainageDetails } from "@/components/chainage-details";
import { chainageSummary, tryKp } from "@/lib/chainage";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Activity, ArrowDownToLine, BatteryCharging, Building2, ChevronLeft, ChevronRight, Cog, Edit3, ExternalLink, Eye, FileText, GitFork, ImageIcon, Link2, Map, MapPin, Monitor, MoreHorizontal, Plus, Search, Upload, Wifi, X, type LucideIcon } from "lucide-react";
import { Panel } from "@/components/ui";
import { AssetLocationMap } from "@/components/asset-location-map";
import { downloadDocumentVersion, type DocumentRepositoryItem } from "@/lib/apiClient";
import type { AssetMasterAssetRecord, AssetMasterSegmentRecord, PipelineRecord } from "@/lib/types";

type Asset = AssetMasterAssetRecord & { serialNumber?: string; condition?: string; criticality?: string };
export const assetTypeLabels: Record<Asset["assetType"], string> = { STATION: "Station", VALVE: "Valve", RECTIFIER: "Rectifier", TEST_POST: "Test Post", COMPRESSOR: "Compressor", SENSOR: "Sensor", PUMP: "Pump", METER: "Meter", PIG_LAUNCHER: "Pig Launcher", PIG_RECEIVER: "Pig Receiver", PIPELINE_FITTING: "Pipeline Fitting", FLANGE: "Flange", INSULATING_JOINT: "Insulating Joint", PIPELINE_CROSSING: "Pipeline Crossing", OTHER: "Other" };
const labels = assetTypeLabels;
const groups: Array<{ label: string; type: string; icon: LucideIcon; color: string }> = [
  { label: "Stations", type: "STATION", icon: Building2, color: "text-slateblue-600" },
  { label: "Valves", type: "VALVE", icon: GitFork, color: "text-emerald-600" },
  { label: "Rectifiers", type: "RECTIFIER", icon: BatteryCharging, color: "text-amber-500" },
  { label: "Test Posts", type: "TEST_POST", icon: MapPin, color: "text-violet-600" },
  { label: "Compressors", type: "COMPRESSOR", icon: Cog, color: "text-red-600" },
  { label: "Sensors", type: "SENSOR", icon: Wifi, color: "text-slateblue-600" },
  { label: "Others", type: "OTHERS", icon: MoreHorizontal, color: "text-slate-500" }
];
const primaryTypes = new Set(groups.slice(0, 6).map((group) => group.type));
const category = (asset: Asset) => primaryTypes.has(asset.assetType) ? asset.assetType : "OTHERS";
const text = (value: unknown) => value === undefined || value === null || value === "" ? "Not recorded" : String(value);
const secondary = "inline-flex items-center justify-center gap-1.5 rounded-md border border-slateblue-300 px-3 py-2 text-xs font-semibold text-slateblue-700 hover:bg-slateblue-50 disabled:cursor-not-allowed disabled:opacity-50";
const primary = "inline-flex items-center justify-center gap-1.5 rounded-md bg-slateblue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-slateblue-700 disabled:opacity-50";
const control = "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-normal text-slate-800 outline-none focus:border-slateblue-500 focus:ring-2 focus:ring-slateblue-100";

function csvCell(value: unknown) { const cell = value === undefined || value === null ? "" : String(value); return /[",\n]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell; }
export function exportAssetRegister(assets: Asset[]) {
  const headers = ["assetId", "assetType", "name", "segmentId", "kp", "parentAssetId", "manufacturer", "model", "installationDate", "physicalStatus", "latitude", "longitude", "coordinates", "facilityType", "equipmentType", "side"] as const;
  const csv = [[...headers, "pipelineId", "chainage", "chainage_meters", "chainage_km"].join(","), ...assets.map((asset) => [...headers.map((key) => csvCell(key === "assetType" ? labels[asset.assetType] : asset[key])), csvCell(asset.pipelineId), csvCell(chainageSummary(asset.kp)?.chainage), csvCell(chainageSummary(asset.kp)?.chainage_meters), csvCell(chainageSummary(asset.kp)?.chainage_km)].join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = "klinthru-assets.csv"; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function AssetRegisterActions({ assets, disabled, onAdd, onImport }: { assets: Asset[]; disabled: boolean; onAdd: () => void; onImport: (file: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return <div className="flex flex-wrap gap-2 pb-2">
    <button type="button" className={primary} disabled={disabled} onClick={onAdd}><Plus size={16} />Add Asset</button>
    <button type="button" className={secondary} disabled={disabled} onClick={() => input.current?.click()}><Upload size={16} />Bulk Import</button>
    <input ref={input} type="file" accept=".json,.csv,application/json,text/csv" aria-label="Import assets" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) onImport(file); }} />
    <button type="button" className={secondary} disabled={!assets.length} onClick={() => exportAssetRegister(assets)}><ArrowDownToLine size={16} />Export</button>
  </div>;
}

export function AssetIcon({ asset, size = 18 }: { asset: Asset; size?: number }) { const group = groups.find((item) => item.type === category(asset))!; const Icon = group.icon; return <Icon size={size} className={`shrink-0 ${group.color}`} aria-label={labels[asset.assetType]} />; }
function Status({ value }: { value: string }) { return <span className={`inline-flex rounded-full px-3 py-0.5 text-xs font-semibold ${value === "Active" ? "bg-emerald-100 text-emerald-700" : value === "Maintenance" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{value}</span>; }
function timestamp(value?: string) { if (!value) return "Not recorded"; const date = new Date(value); if (Number.isNaN(date.getTime())) return "Not recorded"; const pad = (part: number) => String(part).padStart(2, "0"); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`; }
function Card({ title, icon, action, children }: { title: string; icon: ReactNode; action?: ReactNode; children: ReactNode }) { return <Panel className="min-w-0 !p-3"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><span aria-hidden="true" className="text-slateblue-600">{icon}</span>{title}</h2>{action}</div>{children}</Panel>; }

export function AssetRegisterWorkspace({ pipeline, assets, segments, documents, error, selectedAssetId, onSelectAsset, onEdit, onViewMap, onOpenSegment }: {
  pipeline: PipelineRecord | null; assets: Asset[]; segments: AssetMasterSegmentRecord[]; documents: DocumentRepositoryItem[]; error: boolean; selectedAssetId: string;
  onSelectAsset: (id: string) => void; onEdit: (id: string) => void; onViewMap: (id: string) => void; onOpenSegment: (id: string) => void;
}) {
  const [type, setType] = useState("ALL"), [segment, setSegment] = useState("ALL"), [status, setStatus] = useState("ALL"), [criticality, setCriticality] = useState("ALL");
  const [draft, setDraft] = useState(""), [query, setQuery] = useState("");
  const [page, setPage] = useState(() => { const index = assets.findIndex((asset) => asset.id === selectedAssetId); return index < 0 ? 1 : Math.floor(index / 5) + 1; }), [pageSize, setPageSize] = useState(5);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const linkedCard = useRef<HTMLDivElement>(null);
  const segmentRecord = (id?: string) => segments.find((item) => item.id === id || item.segmentId === id);
  const parentRecord = (id?: string) => assets.find((item) => item.id === id || item.assetId === id);
  const visible = assets.filter((asset) => (type === "ALL" || (type === "OTHERS" ? category(asset) === "OTHERS" : asset.assetType === type))
    && (segment === "ALL" || segmentRecord(asset.segmentId)?.id === segment)
    && (status === "ALL" || asset.physicalStatus === status)
    && (criticality === "ALL" || text(asset.criticality) === criticality)
    && (!query || [asset.assetId, asset.name, asset.kp, chainageSummary(asset.kp)?.chainage, asset.manufacturer, segmentRecord(asset.segmentId)?.segmentId].some((value) => String(value ?? "").toLowerCase().includes(query.toLowerCase()))));
  visible.sort((a, b) => (tryKp(a.kp) ?? Infinity) - (tryKp(b.kp) ?? Infinity));
  const pages = Math.max(1, Math.ceil(visible.length / pageSize)), current = Math.min(page, pages);
  const pageRows = visible.slice((current - 1) * pageSize, current * pageSize);
  const selected = pageRows.find((asset) => asset.id === selectedAssetId) ?? pageRows[0] ?? null;
  const selectedSegment = segmentRecord(selected?.segmentId);
  const linkedDocuments = documents.filter((document) => document.links.some((link) => link.asset?.id === selected?.id));
  const pageNumbers = [...new Set([1, pages, current - 1, current, current + 1].filter((value) => value >= 1 && value <= pages))].sort((a, b) => a - b);
  const allChecked = pageRows.length > 0 && pageRows.every((asset) => checked.has(asset.id));
  const clear = () => { setType("ALL"); setSegment("ALL"); setStatus("ALL"); setCriticality("ALL"); setDraft(""); setQuery(""); setPage(1); };
  const select = (id: string) => onSelectAsset(id);
  const showLinks = (id: string) => { select(id); window.requestAnimationFrame(() => linkedCard.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })); };
  return <div className="min-w-0 space-y-3 text-xs [&_input]:text-xs [&_select]:text-xs" aria-label="Assets workspace">
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">{groups.map(({ label, type: groupType, icon: Icon, color }) => <button key={groupType} type="button" onClick={() => { setType(type === groupType ? "ALL" : groupType); setPage(1); }} aria-pressed={type === groupType} aria-label={`Filter ${label}`} className={`flex min-h-[62px] items-center gap-3 rounded-lg border bg-white px-4 py-3 text-left shadow-panel ${type === groupType ? "border-slateblue-500 ring-1 ring-slateblue-500" : "border-slate-200 hover:border-slateblue-500"}`}><Icon size={28} className={color} /><span><strong className="block text-lg font-semibold text-slate-900">{assets.filter((asset) => category(asset) === groupType).length}</strong><span className="text-slate-500">{label}</span></span></button>)}</div>
    <form onSubmit={(event) => { event.preventDefault(); setQuery(draft.trim()); setPage(1); }} className="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_1.4fr_auto_auto]">
      <label className="font-semibold text-slate-600">Asset Type<select aria-label="Asset Type" value={type} onChange={(event) => { setType(event.target.value); setPage(1); }} className={control}><option value="ALL">All Types</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}<option value="OTHERS">Other asset types</option></select></label>
      <label className="font-semibold text-slate-600">Segment<select aria-label="Asset segment" value={segment} onChange={(event) => { setSegment(event.target.value); setPage(1); }} className={control}><option value="ALL">All Segments</option>{segments.map((item) => <option value={item.id} key={item.id}>{item.segmentId}</option>)}</select></label>
      <label className="font-semibold text-slate-600">Status<select aria-label="Asset status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className={control}><option value="ALL">All Status</option>{["Active", "Inactive", "Maintenance", "Decommissioned", "Unknown"].map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="font-semibold text-slate-600">Criticality<select aria-label="Criticality" value={criticality} onChange={(event) => { setCriticality(event.target.value); setPage(1); }} className={control}><option value="ALL">All Criticality</option>{[...new Set(assets.map((asset) => text(asset.criticality)))].sort().map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="font-semibold text-slate-600">Search by Asset ID, Name or KP<span className="relative block"><Search size={15} className="pointer-events-none absolute bottom-2.5 left-3 text-slate-400" /><input aria-label="Search assets" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Enter asset ID, name or KP..." className={`${control} pl-9`} /></span></label>
      <button type="submit" className={primary}><Search size={15} />Search</button><button type="button" onClick={clear} className={secondary}>Clear</button>
    </form>
    <Panel className="min-w-0 overflow-hidden !p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-3"><h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><Building2 size={20} className="text-slateblue-600" />Asset Register ({visible.length.toLocaleString()} {visible.length === 1 ? "asset" : "assets"})</h2>{checked.size ? <button type="button" className={secondary} onClick={() => exportAssetRegister(assets.filter((asset) => checked.has(asset.id)))}><ArrowDownToLine size={14} />Export selected ({checked.size})</button> : null}</div>
      <div className="max-w-full overflow-x-auto" role="region" aria-label="Asset register"><table className="w-full min-w-[1100px] text-left text-xs"><thead className="bg-slate-50 text-slate-700"><tr><th className="w-9 px-3 py-2"><input type="checkbox" checked={allChecked} disabled={!pageRows.length} aria-label="Select all visible assets" onChange={(event) => setChecked((previous) => { const next = new Set(previous); pageRows.forEach((asset) => event.target.checked ? next.add(asset.id) : next.delete(asset.id)); return next; })} /></th>{["Asset ID", "Type", "Name", "Segment", "KP", "Parent Asset", "Manufacturer", "Status", "Last Updated", "Actions"].map((heading) => <th key={heading} className="whitespace-nowrap px-3 py-2 font-semibold">{heading}</th>)}</tr></thead><tbody>{error || !pageRows.length ? <tr><td colSpan={11} className="px-3 py-8 text-center text-slate-500">{error ? "Asset data could not be loaded. Refresh to try again." : assets.length ? "No assets match these filters. Use Clear to show all assets." : "No saved assets for this pipeline. Use Add Asset to get started."}</td></tr> : pageRows.map((asset) => <tr key={asset.id} className={`border-t border-slate-100 ${asset.id === selected?.id ? "bg-slateblue-50" : "hover:bg-slate-50"}`}>
        <td className="px-3 py-2"><input type="checkbox" checked={checked.has(asset.id)} aria-label={`Select ${asset.assetId}`} onChange={(event) => { select(asset.id); setChecked((previous) => { const next = new Set(previous); event.target.checked ? next.add(asset.id) : next.delete(asset.id); return next; }); }} /></td>
        <td className="px-3 py-2 font-semibold text-slateblue-700"><button type="button" onClick={() => select(asset.id)}>{asset.assetId}</button></td><td className="px-3 py-2"><span title={labels[asset.assetType]} className="inline-flex"><AssetIcon asset={asset} /></span></td>
        <td className="px-3 py-2">{text(asset.name)}</td><td className="px-3 py-2"><button type="button" disabled={!segmentRecord(asset.segmentId)} onClick={() => onOpenSegment(segmentRecord(asset.segmentId)!.id)} className="font-semibold text-slateblue-700 disabled:font-normal disabled:text-slate-500">{text(segmentRecord(asset.segmentId)?.segmentId)}</button></td>
        <td className="whitespace-nowrap px-3 py-2">{asset.kp ? `KP ${asset.kp}` : "Not recorded"}</td><td className="px-3 py-2">{text(parentRecord(asset.parentAssetId)?.assetId ?? asset.parentAssetId)}</td><td className="px-3 py-2">{text(asset.manufacturer)}</td><td className="px-3 py-2"><Status value={asset.physicalStatus} /></td><td className="whitespace-nowrap px-3 py-2">{timestamp(asset.updatedAt ?? asset.createdAt)}</td>
        <td className="px-3 py-2"><div className="flex items-center gap-3 text-slateblue-700"><button type="button" aria-label={`View ${asset.assetId}`} title="Select asset details" onClick={() => select(asset.id)}><Eye size={16} /></button><button type="button" aria-label={`Linked records for ${asset.assetId}`} onClick={() => showLinks(asset.id)}><Link2 size={16} /></button><details className="relative" onToggle={(event) => { const details = event.currentTarget; if (!details.open) return; const rect = details.getBoundingClientRect(); const menu = details.querySelector<HTMLDivElement>("[data-asset-actions]"); if (menu) { menu.style.top = `${Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - 175))}px`; menu.style.left = `${Math.max(8, Math.min(rect.right - 160, window.innerWidth - 168))}px`; } }} onKeyDown={(event) => { if (event.key === "Escape") event.currentTarget.open = false; }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) event.currentTarget.open = false; }}><summary aria-label={`More actions for ${asset.assetId}`} className="flex cursor-pointer list-none"><MoreHorizontal size={17} /></summary><div data-asset-actions className="fixed z-[100] min-w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-panel" onClick={(event) => { const details = event.currentTarget.closest("details"); if (details) details.open = false; }}> <button type="button" className="block w-full rounded px-3 py-2 text-left hover:bg-slate-50" onClick={() => onEdit(asset.id)}>Edit Asset</button><Link href={`/asset-master/assets/${encodeURIComponent(asset.id)}`} className="block rounded px-3 py-2 hover:bg-slate-50">View Details</Link><button type="button" className="block w-full rounded px-3 py-2 text-left hover:bg-slate-50" onClick={() => onViewMap(asset.id)}>View in Full Map</button><button type="button" className="block w-full rounded px-3 py-2 text-left hover:bg-slate-50" onClick={() => exportAssetRegister([asset])}>Export Asset</button></div></details></div></td>
      </tr>)}</tbody></table></div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-3 py-2 text-xs text-slate-500"><span>Showing {visible.length ? (current - 1) * pageSize + 1 : 0} to {Math.min(current * pageSize, visible.length)} of {visible.length.toLocaleString()} assets</span><div className="flex flex-wrap items-center gap-2"><nav aria-label="Asset register pages" className="flex items-center gap-1"><button type="button" aria-label="Previous asset page" disabled={current === 1} onClick={() => setPage(current - 1)} className="rounded border border-slate-200 p-1 disabled:opacity-40"><ChevronLeft size={16} /></button>{pageNumbers.map((value, index) => <span key={value} className="inline-flex items-center gap-1">{index > 0 && value - pageNumbers[index - 1] > 1 ? <span className="px-1">...</span> : null}<button type="button" aria-label={`Asset page ${value}`} aria-current={current === value ? "page" : undefined} onClick={() => setPage(value)} className={`rounded px-2.5 py-1 ${current === value ? "bg-slateblue-600 font-semibold text-white" : "hover:bg-slate-50"}`}>{value}</button></span>)}<button type="button" aria-label="Next asset page" disabled={current === pages} onClick={() => setPage(current + 1)} className="rounded border border-slate-200 p-1 disabled:opacity-40"><ChevronRight size={16} /></button></nav><label className="flex items-center gap-2 border-l border-slate-200 pl-3">Rows per page<select aria-label="Rows per page" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="rounded border border-slate-300 bg-white px-2 py-1">{[5, 10, 25, 50].map((value) => <option key={value}>{value}</option>)}</select></label></div></div>
    </Panel>
    <div className="grid items-start gap-3 xl:grid-cols-[1.1fr_0.65fr_1.1fr]">
      <Card title="Selected Asset Details" icon={selected ? <AssetIcon asset={selected} size={21} /> : <Building2 size={21} />} action={<button type="button" disabled={!selected} onClick={() => selected && onEdit(selected.id)} className={secondary}><Edit3 size={14} />Edit</button>}>
        {selected ? <div className="grid gap-3 sm:grid-cols-[minmax(100px,0.7fr)_minmax(0,1.3fr)] xl:grid-cols-[minmax(90px,0.6fr)_minmax(0,1.4fr)]"><AssetPhoto key={selected.id} asset={selected} documents={linkedDocuments} /><div className="min-w-0"><div className="mb-2 flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-900">{selected.name || selected.assetId}</h3><Status value={selected.physicalStatus} /></div><dl className="space-y-1.5">{[["Asset ID", selected.assetId], ["Asset Type", labels[selected.assetType]], ["Segment", selectedSegment?.segmentId], ["KP", selected.kp], ["Parent Asset", parentRecord(selected.parentAssetId)?.assetId ?? selected.parentAssetId], ["Manufacturer", selected.manufacturer], ["Serial Number", selected.serialNumber], ["Model", selected.model], ["Installation Date", selected.installationDate?.slice(0, 10)], ["Condition", selected.condition]].map(([label, value]) => <div key={label} className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-2"><dt className="text-slate-500">{label}</dt><dd className="break-words text-slate-900">{text(value)}</dd></div>)}</dl></div></div> : <p className="py-6 text-center text-slate-500">Select an asset from the register.</p>}
        {selected ? <ChainageDetails key={selected.id} asset={selected} assets={assets} pipeline={pipeline} /> : null}
      </Card>
      <div ref={linkedCard}><Card title="Linked Records" icon={<Link2 size={21} />}><div className="divide-y divide-slate-100">
        <RecordLink icon={<Activity size={23} />} title="CP Monitoring" detail="View CP data and history" href={selected ? `/cp-monitoring?pipelineId=${encodeURIComponent(selected.pipelineId)}` : undefined} />
        <RecordLink icon={<Monitor size={23} />} title="SCADA" detail="Open live data and trends" href={selected ? "/scada" : undefined} />
        <RecordLink icon={<FileText size={23} />} title="Documents" detail={`View related documents${linkedDocuments.length ? ` (${linkedDocuments.length})` : ""}`} href={selected ? `/document-upload?assetId=${encodeURIComponent(selected.id)}` : undefined} />
        <button type="button" disabled={!selectedSegment} onClick={() => selectedSegment && onOpenSegment(selectedSegment.id)} className="flex w-full items-center gap-3 py-3 text-left disabled:opacity-50"><MapPin size={23} className="shrink-0 text-slateblue-600" /><span className="min-w-0 flex-1"><strong className="block font-semibold text-slate-900">Segment</strong><span className="text-slate-500">{selectedSegment ? `View segment ${selectedSegment.segmentId}` : "No segment linked"}</span></span><ChevronRight size={15} className="text-slateblue-600" /></button>
      </div></Card></div>
      <Card title="Asset Location" icon={<Map size={21} />} action={<button type="button" disabled={!selected} onClick={() => selected && onViewMap(selected.id)} className="inline-flex items-center gap-1 font-semibold text-slateblue-700 disabled:opacity-50">View in Full Map <ChevronRight size={14} /></button>}>
        {selected ? <AssetLocationMap asset={selected} assets={assets} pipeline={pipeline} segments={segments} /> : <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">Select an asset to view its location.</div>}
      </Card>
    </div>
  </div>;
}

function RecordLink({ icon, title, detail, href }: { icon: ReactNode; title: string; detail: string; href?: string }) {
  const content = <><span className="shrink-0 text-slateblue-600">{icon}</span><span className="min-w-0 flex-1"><strong className="block font-semibold text-slate-900">{title}</strong><span className="text-slate-500">{detail}</span></span><ChevronRight size={15} className="text-slateblue-600" /></>;
  return href ? <Link href={href} className="flex items-center gap-3 py-3">{content}</Link> : <div className="flex items-center gap-3 py-3 opacity-50">{content}</div>;
}

export function AssetPhoto({ asset, documents, compact = false }: { asset: Asset; documents: DocumentRepositoryItem[]; compact?: boolean }) {
  const [photo, setPhoto] = useState("");
  const modal = useRef<HTMLDialogElement>(null);
  const image = documents.flatMap((document) => document.versions.map((version) => ({ documentId: document.documentId, version }))).find(({ version }) => ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(version.mimeType));
  useEffect(() => {
    setPhoto("");
    if (!image) return;
    let active = true;
    let url = "";
    void downloadDocumentVersion(image.documentId, image.version.documentVersionId).then((blob) => { if (active) { url = URL.createObjectURL(blob); setPhoto(url); } }).catch(() => {});
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [image?.documentId, image?.version.documentVersionId]);
  return <div>
    <div className={`flex ${compact ? "h-[120px]" : "h-[160px]"} flex-col items-center justify-center gap-2 overflow-hidden rounded-md border border-slate-200 bg-slate-50 text-slate-500`}>{photo ? <img src={photo} alt={asset.name || asset.assetId} className="h-full w-full object-cover" onError={() => setPhoto("")} /> : <><ImageIcon size={32} className="text-slate-400" /><span className="px-2 text-center">No asset photo</span></>}</div>
    {!compact ? <button type="button" disabled={!photo} onClick={() => modal.current?.showModal()} className={`${secondary} mt-2 w-full px-2 py-1.5`}>View Full Size <ExternalLink size={12} /></button> : null}
    <dialog ref={modal} aria-label={`Photo of ${asset.assetId}`} className="max-h-[90vh] max-w-[90vw] rounded-xl border border-slate-200 bg-white p-3 backdrop:bg-slate-950/50"><div className="mb-2 flex items-center justify-between gap-4 text-sm"><strong>{asset.name || asset.assetId}</strong><button type="button" aria-label="Close asset photo" onClick={() => modal.current?.close()}><X size={20} /></button></div>{photo ? <img src={photo} alt={asset.name || asset.assetId} className="max-h-[75vh] max-w-full object-contain" /> : null}</dialog>
  </div>;
}
