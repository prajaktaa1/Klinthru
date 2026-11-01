"use client";
import { drawSavedPipelineOverlay, pipelineOverlayLabel } from "@/lib/saved-pipeline-overlay";
import { ChainageFeedback } from "@/components/chainage-details";
import { normalizeChainageImport, parseKp, tryKp } from "@/lib/chainage";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Activity, ArrowDownToLine, ArrowUpFromLine, Building2, Check, CheckCircle2, ChevronDown, ChevronRight, CircleGauge, Clock3, Database, Edit3, Eye, FileText, Gauge, MapPin, MoreVertical, Plus, RefreshCw, Ruler, Route, Search, ShieldCheck, Upload } from "lucide-react";

import { PageHeader, Panel } from "@/components/ui";
import { segmentChecks, segmentKp } from "@/lib/segment-data";
import { AssetRegisterActions, AssetRegisterWorkspace } from "@/components/asset-register-workspace";
import { MasterChangeLogWorkspace } from "@/components/master-change-log-workspace";
import { InspectionHistoryWorkspace } from "@/components/inspection-history-workspace";
import { DrawingsDocumentsWorkspace } from "@/components/drawings-documents-workspace";
import { savedMapEndpoints, savedMapCoordinate, savedMapRoute, savedSegmentMapRoute } from "@/lib/dashboard-map-data";
import { attachBasemap, GEOGRAPHIC_MAP_OPTIONS, UAE_VIEW } from "@/lib/map-provider";
import { watchMapDataChanged } from "@/lib/map-sync";
import { PipelineMapWorkspace } from "@/components/pipeline-map-workspace";
import { loadLeaflet, SegmentMapCard } from "@/components/segment-map-card";
import { RouteEditor } from "@/components/RouteEditor";
import { parseLineString as parseGisLineString } from "@/lib/gis-route";
import { routeGeometryForSave } from "@/lib/pipeline-save";
import { ApiError, createAssetPhoto, createMasterAsset, createMasterSegment, createPipeline, createRepositoryDocument, deleteMasterAsset, deleteMasterSegment, deletePipeline, deleteRepositoryDocument, fetchDocuments, fetchMasterAssets, fetchMasterSegments, fetchPipelineById, fetchPipelineHistory, fetchPipelines, updateMasterAsset, updateMasterSegment, updatePipeline, type DocumentRepositoryItem } from "@/lib/apiClient";
import type { AssetMasterAssetRecord, AssetMasterSegmentRecord, GeoJsonLineString, PipelineHistory, PipelineInput, PipelineRecord } from "@/lib/types";

const tabs = ["Overview", "Segments", "Assets", "Map View", "Drawings & Documents", "Inspection History", "Change Log"] as const;
type Tab = (typeof tabs)[number];
const unknown = "UNKNOWN";
const unavailable = unknown;
const ESRI_STREET_TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";
const ESRI_SATELLITE_TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_TERRAIN_TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}";
const ESRI_ATTRIBUTION = "Esri";

function apiFailure(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return `${fallback} (${error.status}): ${error.message}`;
  }
  return error instanceof Error ? `${fallback}: ${error.message}` : fallback;
}
const assetTypeOptions = ["Station", "Valve", "Rectifier", "Test Post", "Compressor", "Sensor", "Pump", "Meter", "Pig Launcher", "Pig Receiver", "Pipeline Fitting", "Flange", "Insulating Joint", "Pipeline Crossing", "Other"] as const;
type AssetDisplayType = (typeof assetTypeOptions)[number];
const equipmentTypeOptions: Record<AssetDisplayType, string[]> = {
  Station: ["Pipeline Station", "Terminal Station", "Block Valve Station", "Metering Station", "Pressure Reduction Station", "Control Room", "Pump Station", "Compressor Station"],
  Valve: ["Ball Valve", "Gate Valve", "Globe Valve", "Check Valve", "Butterfly Valve", "Plug Valve", "Slab Gate Valve", "Trunnion Ball Valve", "Control Valve", "Relief Valve", "ESD Valve", "MOV", "XV"],
  Rectifier: ["CP Rectifier", "Transformer Rectifier", "Solar Rectifier", "Impressed Current Rectifier"],
  "Test Post": ["Test Post", "Cathodic Protection Test Post", "Junction Test Post", "Test Station"],
  Compressor: ["Centrifugal Compressor", "Reciprocating Compressor", "Screw Compressor", "Gas Turbine Compressor", "Compressor Package"],
  Sensor: ["Pressure Sensor", "Temperature Sensor", "Flow Sensor", "Vibration Sensor", "Leak Sensor", "Corrosion Sensor", "Position Sensor"],
  Pump: ["Centrifugal Pump", "Positive Displacement Pump", "Reciprocating Pump", "Screw Pump", "Booster Pump", "Transfer Pump"],
  Meter: ["Ultrasonic Flow Meter", "Turbine Flow Meter", "Coriolis Flow Meter", "Magnetic Flow Meter", "Orifice Meter", "Custody Transfer Meter"],
  "Pig Launcher": ["Pig Launcher", "Horizontal Pig Launcher", "Vertical Pig Launcher", "Quick Opening Closure"],
  "Pig Receiver": ["Pig Receiver", "Horizontal Pig Receiver", "Vertical Pig Receiver", "Quick Opening Closure"],
  "Pipeline Fitting": ["Elbow", "Tee", "Reducer", "Cap", "Cross", "Bend", "Branch Connection", "Insulating Spool"],
  Flange: ["Weld Neck Flange", "Slip-On Flange", "Blind Flange", "Socket Weld Flange", "Threaded Flange", "Lap Joint Flange"],
  "Insulating Joint": ["Monolithic Insulating Joint", "Insulating Flange Set", "Insulating Spool", "Dielectric Isolation Joint"],
  "Pipeline Crossing": ["Road Crossing", "Railway Crossing", "River Crossing", "Canal Crossing", "Utility Crossing", "Horizontal Directional Drill"],
  Other: ["Other"]
};
const assetDisplayTypeByBackendType: Record<AssetMasterAssetRecord["assetType"], AssetDisplayType> = { STATION: "Station", VALVE: "Valve", TEST_POST: "Test Post", RECTIFIER: "Rectifier", COMPRESSOR: "Compressor", SENSOR: "Sensor", PUMP: "Pump", METER: "Meter", PIG_LAUNCHER: "Pig Launcher", PIG_RECEIVER: "Pig Receiver", PIPELINE_FITTING: "Pipeline Fitting", FLANGE: "Flange", INSULATING_JOINT: "Insulating Joint", PIPELINE_CROSSING: "Pipeline Crossing", OTHER: "Other" };

function assetDisplayType(asset: Pick<AssetMasterAssetRecord, "assetType" | "facilityType" | "equipmentType">): AssetDisplayType {
  return assetDisplayTypeByBackendType[asset.assetType] ?? "Other";
}

function assetTypeValue(type: AssetDisplayType): AssetMasterAssetRecord["assetType"] { return (Object.entries(assetDisplayTypeByBackendType).find(([, label]) => label === type)?.[0] ?? "OTHER") as AssetMasterAssetRecord["assetType"]; }

function assetTypeMetadata(type: AssetDisplayType, facilityType: string, equipmentType: string) {
  return { facilityType: optionalText(facilityType), equipmentType: optionalText(equipmentType), conflict: false };
}

export default function AssetMasterPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [pipelines, setPipelines] = useState<PipelineRecord[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedSegmentId, setSelectedSegmentId] = useState("");
  const [pipeline, setPipeline] = useState<PipelineRecord | null>(null);
  const [segments, setSegments] = useState<AssetMasterSegmentRecord[]>([]);
  const [assets, setAssets] = useState<AssetMasterAssetRecord[]>([]);
  const [history, setHistory] = useState<PipelineHistory | null>(null);
  const [documents, setDocuments] = useState<DocumentRepositoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailErrors, setDetailErrors] = useState<string[]>([]);
  const [pipelineError, setPipelineError] = useState(false);
  const [segmentsError, setSegmentsError] = useState(false);
  const [segmentsLoading, setSegmentsLoading] = useState(false);
  const [assetsError, setAssetsError] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [documentsError, setDocumentsError] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [segmentModal, setSegmentModal] = useState<"create" | "edit" | null>(null);
  const [assetModal, setAssetModal] = useState<"create" | "edit" | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [segmentStatusFilter, setSegmentStatusFilter] = useState("All");
  const [segmentSearch, setSegmentSearch] = useState("");
  const pendingMapRefresh = useRef(false);
  useEffect(() => {
    const editing = Boolean(modal || segmentModal || assetModal);
    if (!editing && pendingMapRefresh.current) { pendingMapRefresh.current = false; setRefreshVersion(value => value + 1); }
    return watchMapDataChanged(() => {
      if (editing) pendingMapRefresh.current = true;
      else setRefreshVersion(value => value + 1);
    });
  }, [modal, segmentModal, assetModal]);
  const importInputRef = useRef<HTMLInputElement>(null);
  const previousSelectedPipelineRef = useRef("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedPipelineId = params.get("pipelineId");
    const requestedAssetId = params.get("assetId");
    if (requestedPipelineId) setSelectedId(requestedPipelineId);
    if (requestedAssetId) setSelectedAssetId(requestedAssetId);
    if (requestedPipelineId || requestedAssetId) setActiveTab("Map View");
  }, []);

  useEffect(() => {
    if (previousSelectedPipelineRef.current && previousSelectedPipelineRef.current !== selectedId) {
      setSelectedSegmentId("");
      setSelectedAssetId("");
      setSegmentStatusFilter("All");
      setSegmentSearch("");
    }
    previousSelectedPipelineRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    let current = true;
    fetchPipelines().then((records) => {
      if (!current) return;
      setPipelines(records);
      setSelectedId((value) => {
        return records.some((record) => record.id === value) ? value : records[0]?.id || "";
      });
      setError(null);
    }).catch((requestError) => {
      if (current) setError(apiFailure(requestError, "Pipeline data is unavailable from the current API"));
    }).finally(() => {
      if (current) setLoading(false);
    });
    return () => { current = false; };
  }, [refreshVersion]);

  useEffect(() => {
    if (!selectedId) {
      setPipeline(null);
      setSegments([]);
      setSegmentsLoading(false);
      setAssets([]);
      setHistory(null);
      setDocuments([]);
      setSelectedSegmentId("");
      return;
    }
    let current = true;
    setDetailLoading(true);
    setDetailErrors([]);
    setPipeline(null);
    setSegments([]);
    setAssets([]);
    setHistory(null);
    setDocuments([]);
    setPipelineError(false);
    setSegmentsError(false);
    setSegmentsLoading(true);
    setAssetsError(false);
    setHistoryError(false);
    setDocumentsError(false);
    // Show the segment register as soon as its own request finishes.
    const segmentRequest = fetchMasterSegments(selectedId);
    void segmentRequest.then((records) => {
      if (current) setSegments(records.filter(record => record.pipelineId === selectedId));
    }, () => {
      if (current) setSegmentsError(true);
    }).finally(() => {
      if (current) setSegmentsLoading(false);
    });
    const recordFailure = (requestError: unknown, message: string) => {
      if (current) setDetailErrors((errors) => [...errors, apiFailure(requestError, message)]);
    };
    const pipelineRequest = fetchPipelineById(selectedId).then((record) => {
      if (record.id !== selectedId) throw new Error("Pipeline response does not match the selected pipeline.");
      if (current) setPipeline(record);
    }).catch((requestError) => {
      if (current) setPipelineError(true);
      recordFailure(requestError, "Pipeline details are unavailable");
    });
    // Overview totals and map layers always cover the entire selected pipeline.
    const assetRequest = fetchMasterAssets(selectedId).then((records) => {
      if (current) setAssets(records.filter(record => record.pipelineId === selectedId));
    }, (requestError) => {
      if (current) setAssetsError(true);
      recordFailure(requestError, "Asset data is unavailable");
    });
    void segmentRequest.catch((requestError) => recordFailure(requestError, "Segment data is unavailable"));
    // History and document requests must not hold up the master overview.
    void Promise.allSettled([pipelineRequest, segmentRequest, assetRequest]).then(() => {
      if (current) setDetailLoading(false);
    });
    void fetchPipelineHistory(selectedId).then((record) => {
      if (current) setHistory(record);
    }, (requestError) => {
      if (current) setHistoryError(true);
      recordFailure(requestError, "Inspection history is unavailable");
    });
    void fetchDocuments({ pipelineId: selectedId, page: 1, pageSize: 100 }).then((result) => {
      if (current) setDocuments(result.items);
    }, (requestError) => {
      if (current) setDocumentsError(true);
      recordFailure(requestError, "Document data is unavailable");
    });
    return () => { current = false; };
  }, [selectedId, refreshVersion]);

  const selectedPipeline = (pipeline?.id === selectedId ? pipeline : null) ?? pipelines.find((record) => record.id === selectedId) ?? null;
  const assetTypeSummary = useMemo(() => summarizeAssetTypes(assets), [assets]);
  const assetStatusSummary = useMemo(() => summarizeAssetStatuses(assets), [assets]);
  const completeness = useMemo(() => calculateCompleteness(selectedPipeline, segments, assets, pipelineError, segmentsError, assetsError), [selectedPipeline, segments, assets, pipelineError, segmentsError, assetsError]);
  const busy = loading || detailLoading;

  function beginCreate() { setActionError(null); setActionSuccess(null); setModal("create"); }
  function beginEdit() { if (selectedPipeline) { setActionError(null); setActionSuccess(null); setModal("edit"); } }
  function exportPipelines() {
    const headers = ["pipelineCode", "pipelineName", "serviceOrProduct", "pipeLengthKm", "pipeOutsideDiameter", "diameterUnit", "nominalWallThickness", "wallThicknessUnit", "pipeMaterial", "pipeGrade", "maopBar", "designPressure", "designPressureUnit", "coatingType", "installationDate", "installationYear", "status"];
    const rows = pipelines.map((record) => headers.map((header) => csvCell((record as unknown as Record<string, unknown>)[header])).join(","));
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = "klinthru-pipelines.csv"; link.click(); URL.revokeObjectURL(url);
  }
  async function importPipelines(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    setActionBusy(true); setActionError(null);
    try {
      const text = await file.text();
      const parsed = file.name.toLowerCase().endsWith(".json") ? JSON.parse(text) : parseCsv(text);
      const records = Array.isArray(parsed) ? parsed : [parsed];
      if (!records.length) throw new Error("The import file contains no pipeline records.");
      const created = await Promise.all(records.map((record) => createPipeline(normalizePipelineInput(record))));
      setSelectedId(created[0]?.id ?? selectedId); setRefreshVersion((value) => value + 1);
    } catch (error) { setActionError(error instanceof Error ? error.message : "Pipeline import failed."); }
    finally { setActionBusy(false); }
  }
  async function importSegments(file: File) {
    if (!selectedPipeline) return;
    setActionBusy(true); setActionError(null);
    try {
      const text = await file.text();
      const parsed = file.name.toLowerCase().endsWith(".json") ? JSON.parse(text) : parseCsv(text);
      const records = normalizeChainageImport(Array.isArray(parsed) ? parsed : [parsed], ["startKp", "endKp"], { pipelineId: selectedPipeline.id, lengthMeters: selectedPipeline.pipeLengthKm === undefined ? undefined : selectedPipeline.pipeLengthKm * 1000 });
      if (!records.length) throw new Error("The import file contains no segment records.");
      await Promise.all(records.map((record) => { const routeGeometryValue = record.routeGeometry; return createMasterSegment({ pipelineId: selectedPipeline.id, segmentId: String(record.segmentId ?? "").trim(), name: optionalText(String(record.name ?? "")), description: optionalText(String(record.description ?? "")), startKp: optionalText(String(record.startKp ?? "")), endKp: optionalText(String(record.endKp ?? "")), coatingType: optionalText(String(record.coatingType ?? "")), cpType: optionalText(String(record.cpType ?? "")), terrain: optionalText(String(record.terrain ?? "")), status: (record.status || undefined) as AssetMasterSegmentRecord["status"], routeGeometry: parseRouteGeometryJson(typeof routeGeometryValue === "string" ? routeGeometryValue : routeGeometryValue ? JSON.stringify(routeGeometryValue) : "") }); }));
      setRefreshVersion((value) => value + 1);
    } catch (error) { setActionError(error instanceof Error ? error.message : "Segment import failed."); }
    finally { setActionBusy(false); }
  }
  async function importAssets(file: File) {
    if (!selectedPipeline) return;
    setActionBusy(true); setActionError(null);
    try {
      const text = await file.text();
      const parsed = file.name.toLowerCase().endsWith(".json") ? JSON.parse(text) : parseCsv(text);
      const records = normalizeChainageImport(Array.isArray(parsed) ? parsed : [parsed], ["kp"], { pipelineId: selectedPipeline.id, lengthMeters: selectedPipeline.pipeLengthKm === undefined ? undefined : selectedPipeline.pipeLengthKm * 1000 });
      if (!records.length) throw new Error("The import file contains no asset records.");
      await Promise.all(records.map((record) => {
        const row = record as Record<string, unknown>;
        const segmentValue = String(row.segmentId ?? "").trim();
        const segmentId = segmentValue ? segments.find((item) => item.id === segmentValue || item.segmentId === segmentValue)?.id : undefined;
        if (segmentValue && !segmentId) throw new Error(`Segment ${segmentValue} was not found in the selected pipeline.`);
        const requestedType = String(row.assetType ?? "").trim();
        const displayType = assetTypeOptions.find((type) => type.toLowerCase() === requestedType.toLowerCase()) ?? Object.entries(assetDisplayTypeByBackendType).find(([value]) => value.toLowerCase() === requestedType.toLowerCase())?.[1];
        if (!displayType) throw new Error(`Asset ${String(row.assetId ?? "")} has an unsupported asset type.`);
        const metadata = assetTypeMetadata(displayType, String(row.facilityType ?? ""), String(row.equipmentType ?? ""));
        if (metadata.conflict) throw new Error(`Asset ${String(row.assetId ?? "")} cannot map ${displayType} without overwriting existing facility/equipment data.`);
        const latitude = String(row.latitude ?? "").trim() ? Number(row.latitude) : undefined;
        const longitude = String(row.longitude ?? "").trim() ? Number(row.longitude) : undefined;
        return createMasterAsset({ pipelineId: selectedPipeline.id, assetId: String(row.assetId ?? "").trim(), assetType: assetTypeValue(displayType), name: optionalText(String(row.name ?? "")), segmentId, kp: optionalText(String(row.kp ?? "")), facilityType: optionalText(metadata.facilityType ?? ""), equipmentType: optionalText(metadata.equipmentType ?? ""), parentAssetId: optionalText(String(row.parentAssetId ?? "")), latitude, longitude, coordinates: optionalText(String(row.coordinates ?? "")), side: (String(row.side ?? "").trim() || undefined) as AssetMasterAssetRecord["side"], installationDate: optionalText(String(row.installationDate ?? "")), manufacturer: optionalText(String(row.manufacturer ?? "")), model: optionalText(String(row.model ?? "")), physicalStatus: (String(row.physicalStatus ?? "Active").trim() || "Active") as AssetMasterAssetRecord["physicalStatus"] });
      }));
      setRefreshVersion((value) => value + 1);
    } catch (error) { setActionError(error instanceof Error ? error.message : "Asset import failed."); }
    finally { setActionBusy(false); }
  }
  async function savePipeline(input: PipelineInput) {
    setActionBusy(true); setActionError(null);
    try {
      const saved = modal === "edit" && selectedPipeline ? await updatePipeline(selectedPipeline.id, input) : await createPipeline(input);
      setSelectedId(saved.id); setActionSuccess(`Pipeline ${saved.pipelineCode} saved successfully.`); setModal(null); setRefreshVersion((value) => value + 1);
    } catch (error) { setActionError(error instanceof Error ? error.message : "Pipeline could not be saved."); }
    finally { setActionBusy(false); }
  }
  async function removeSelectedPipeline() {
    if (!selectedPipeline) return;
    if (!window.confirm(`Delete pipeline ${selectedPipeline.pipelineCode}? This cannot be undone.`)) return;
    setActionBusy(true); setActionError(null);
    try { await deletePipeline(selectedPipeline.id); setModal(null); setSelectedId(""); setSelectedSegmentId(""); setRefreshVersion((value) => value + 1); }
    catch (error) { setActionError(error instanceof Error ? error.message : "Pipeline could not be deleted. Linked records may exist."); }
    finally { setActionBusy(false); }
  }

  return (
    <div className="asset-master-page space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader eyebrow="" title="Pipeline / Asset Master" description="Manage your pipeline network, segments and assets. This is the foundation for all integrity assessments." />
        {activeTab === "Assets" ? <AssetRegisterActions assets={assets} disabled={!selectedPipeline || actionBusy} onAdd={() => { setSelectedAssetId(""); setActionError(null); setActionSuccess(null); setAssetModal("create"); }} onImport={(file) => { void importAssets(file); }} /> : <div className="flex flex-wrap gap-2 pb-2">
          <button type="button" onClick={beginCreate} className="inline-flex items-center gap-2 rounded-lg bg-slateblue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slateblue-700"><Plus size={16} />Add Pipeline</button>
          <button type="button" onClick={() => importInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-slateblue-300 px-4 py-2 text-sm font-semibold text-slateblue-700 hover:bg-slateblue-50"><Upload size={16} />Import</button>
          <input ref={importInputRef} type="file" accept=".json,.csv,application/json,text/csv" className="hidden" onChange={(event) => { void importPipelines(event); }} />
          <button type="button" onClick={exportPipelines} disabled={pipelines.length === 0} className="inline-flex items-center gap-2 rounded-lg border border-slateblue-300 px-4 py-2 text-sm font-semibold text-slateblue-700 hover:bg-slateblue-50 disabled:cursor-not-allowed disabled:opacity-50"><ArrowDownToLine size={16} />Export</button>
        </div>}
      </div>
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-panel sm:flex-row sm:items-center sm:justify-between">
        <label className="flex min-w-0 flex-1 items-center gap-3 text-sm font-semibold text-slate-700">
          <span className="shrink-0">Pipeline</span>
          <select className="min-w-0 max-w-full flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700 outline-none focus:border-slateblue-500 focus:ring-4 focus:ring-slateblue-100" disabled={loading || pipelines.length === 0} onChange={(event) => { setSelectedId(event.target.value); setSelectedSegmentId(""); }} value={selectedId}>
            {pipelines.length === 0 ? <option value="">No pipelines available</option> : null}
            {pipelines.map((record) => <option key={record.id} value={record.id}>{record.pipelineCode} - {record.pipelineName}</option>)}
          </select>
        </label>
        <label className="flex min-w-0 flex-1 items-center gap-3 text-sm font-semibold text-slate-700">
          <span className="shrink-0">Segment</span>
          <select className="min-w-0 max-w-full flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700 outline-none focus:border-slateblue-500 focus:ring-4 focus:ring-slateblue-100" disabled={loading || detailLoading || segments.length === 0} onChange={(event) => setSelectedSegmentId(event.target.value)} value={selectedSegmentId}>
            <option value="">All Segments</option>
            {segments.map((segment) => <option key={segment.id} value={segment.id}>{segment.segmentId}</option>)}
          </select>
        </label>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Read-only</span>
      </div>
      {actionSuccess ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{actionSuccess}</div> : null}
      {error ? <Unavailable title="Pipeline / Asset Master unavailable" detail={error} /> : null}
      {!loading && !error && pipelines.length === 0 ? <EmptyState title="No pipeline records available" detail="The pipeline API returned no records for this account." /> : null}
      {detailErrors.length > 0 ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{detailErrors.join(" ")}</div> : null}
      {actionError ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <OverviewStat icon={<Route size={26} />} label="Pipelines" value={pipelines.length ? String(pipelines.length) : unknown} />
        <OverviewStat icon={<MapPin size={26} />} label="Segments" value={selectedPipeline && !segmentsError ? String(segments.length) : unknown} />
        <OverviewStat icon={<Ruler size={26} />} label="Total Length" value={selectedPipeline ? unit(selectedPipeline.pipeLengthKm, "km") ?? unknown : unknown} />
        <OverviewStat icon={<Building2 size={26} />} label="Stations / Facilities" value={selectedPipeline && !assetsError ? String(assets.filter((asset) => asset.assetType === "STATION").length) : unknown} />
        <OverviewStat icon={<Database size={26} />} label="Assets" value={selectedPipeline && !assetsError ? String(assets.length) : unknown} />
        <OverviewStat icon={<CheckCircle2 size={28} />} label="Master Data Completeness" value={completeness.percentage === null ? unknown : `${completeness.percentage}%`} tone="green" />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-panel">
        <div className="flex min-w-max border-b border-slate-200 px-2" role="tablist" aria-label="Pipeline / Asset Master sections">
          {tabs.map((tab) => <button aria-selected={activeTab === tab} className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${activeTab === tab ? "border-slateblue-600 text-slateblue-700" : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"}`} key={tab} onClick={() => setActiveTab(tab)} role="tab" type="button">{tab}</button>)}
        </div>
      </div>
      {busy && activeTab !== "Segments" ? <Loading /> : null}
      {!busy && activeTab === "Overview" ? <Overview pipeline={selectedPipeline} segments={segments} assets={assets} assetTypeSummary={assetTypeSummary} assetStatusSummary={assetStatusSummary} completeness={completeness} segmentsError={segmentsError} assetsError={assetsError} onEdit={beginEdit} onViewMap={() => setActiveTab("Map View")} onViewSegments={() => setActiveTab("Segments")} /> : null}
      {!loading && activeTab === "Segments" ? <Segments key={selectedId} pipelines={pipelines} onPipelineChange={(id) => { setSelectedId(id); setSelectedSegmentId(""); }} loading={segmentsLoading} pipeline={selectedPipeline} segments={segments} assets={assets} error={segmentsError} selectedSegmentId={selectedSegmentId} statusFilter={segmentStatusFilter} search={segmentSearch} documents={documents} documentsError={documentsError} onStatusFilterChange={setSegmentStatusFilter} onSearchChange={setSegmentSearch} onSelectSegment={setSelectedSegmentId} onAdd={() => setSegmentModal("create")} onEdit={() => setSegmentModal("edit")} onDelete={(id) => { const segment = segments.find((item) => item.id === id); if (!segment || !window.confirm(`Delete segment ${segment.segmentId}? This cannot be undone.`)) return; void deleteMasterSegment(id).then(() => { setActionSuccess(`Segment ${segment.segmentId} deleted.`); setSelectedSegmentId(""); setRefreshVersion((value) => value + 1); }).catch((error) => setActionError(error instanceof Error ? error.message : "Segment could not be deleted.")); }} onBulkImport={(file) => { void importSegments(file); }} onViewHistory={() => setActiveTab("Inspection History")} onViewMap={() => setActiveTab("Map View")} /> : null}
      {!busy && activeTab === "Assets" ? <AssetRegisterWorkspace key={selectedId} pipeline={selectedPipeline} assets={assets} segments={segments} documents={documents} error={assetsError} selectedAssetId={selectedAssetId} onSelectAsset={setSelectedAssetId} onEdit={(id) => { setSelectedAssetId(id); setActionError(null); setActionSuccess(null); setAssetModal("edit"); }} onDelete={(id) => { const asset = assets.find((item) => item.id === id); if (!asset || !window.confirm(`Delete asset ${asset.assetId}? This cannot be undone.`)) return; void deleteMasterAsset(id).then(() => { setActionSuccess(`Asset ${asset.assetId} deleted.`); setSelectedAssetId(""); setRefreshVersion((value) => value + 1); }).catch((error) => setActionError(error instanceof Error ? error.message : "Asset could not be deleted.")); }} onViewMap={(id) => { setSelectedAssetId(id); setActiveTab("Map View"); }} onOpenSegment={(id) => { setSelectedSegmentId(id); setActiveTab("Segments"); }} /> : null}
      {!busy && activeTab === "Map View" ? <PipelineMapWorkspace initialSelectedSegmentId={selectedSegmentId} key={selectedId} initialSelectedAssetId={selectedAssetId} pipeline={selectedPipeline} assets={assets} segments={segments} onSelectAsset={setSelectedAssetId} onOpenAssetRegister={(id) => { setSelectedAssetId(id); setActiveTab("Assets"); }} onOpenHistory={() => setActiveTab("Inspection History")} /> : null}
      {!busy && activeTab === "Drawings & Documents" ? <DrawingsDocumentsWorkspace key={selectedId} pipeline={selectedPipeline} segments={segments} assets={assets} onDocumentsChange={setDocuments} /> : null}
      {!busy && activeTab === "Inspection History" ? <InspectionHistoryWorkspace key={selectedId} pipeline={selectedPipeline} history={history} error={historyError} segments={segments} segmentsError={segmentsError} /> : null}
      {!busy && activeTab === "Change Log" ? <MasterChangeLogWorkspace key={selectedId} pipeline={selectedPipeline} segments={segments} segmentsError={segmentsError} onOpenRecord={(entity, id) => { if (entity === "Pipeline") setActiveTab("Overview"); else if (entity === "Segment") { setSelectedSegmentId(id); setActiveTab("Segments"); } else { setSelectedSegmentId(""); setSelectedAssetId(id); setActiveTab("Assets"); } }} /> : null}
      {modal ? <PipelineModal mode={modal} pipeline={modal === "edit" ? selectedPipeline : null} busy={actionBusy} errorMessage={actionError} onClose={() => setModal(null)} onSave={savePipeline} onDelete={removeSelectedPipeline} /> : null}
      {segmentModal && selectedPipeline ? <SegmentModal mode={segmentModal} pipeline={selectedPipeline} segment={segmentModal === "edit" ? segments.find((segment) => segment.id === selectedSegmentId) ?? null : null} busy={actionBusy} errorMessage={actionError} onClose={() => setSegmentModal(null)} onSave={async (segment) => { setActionBusy(true); setActionError(null); setActionSuccess(null); try { const duplicate = segments.some((candidate) => candidate.id !== selectedSegmentId && candidate.segmentId.trim().toLowerCase() === segment.segmentId.trim().toLowerCase()); if (duplicate) throw new Error(`Segment ${segment.segmentId} already exists for this pipeline.`); const saved = segmentModal === "edit" && selectedSegmentId ? await updateMasterSegment(selectedSegmentId, segment) : await createMasterSegment(segment); setSelectedSegmentId(saved.id); setSegmentModal(null); setActionSuccess(`Segment ${saved.segmentId} saved successfully.`); setRefreshVersion((value) => value + 1); } catch (error) { setActionError(error instanceof Error ? error.message : "Segment could not be saved."); } finally { setActionBusy(false); } }} /> : null}
      {assetModal && selectedPipeline ? <AssetModal mode={assetModal} pipelineId={selectedPipeline.id} segments={segments} assets={assets} asset={assetModal === "edit" ? assets.find((item) => item.id === selectedAssetId) ?? null : null} photo={documents.find((item) => item.category === "Asset Photo" && item.links.some((link) => link.asset?.id === selectedAssetId)) ?? null} busy={actionBusy} errorMessage={actionError} onClose={() => setAssetModal(null)} onSave={async (asset, photoFile) => { setActionBusy(true); setActionError(null); setActionSuccess(null); try { const saved = assetModal === "edit" && selectedAssetId ? await updateMasterAsset(selectedAssetId, asset) : await createMasterAsset(asset); if (photoFile) { const dataUrl = await fileToDataUrl(photoFile); await createRepositoryDocument({ title: `Asset Photo - ${saved.assetId}`, documentType: "Asset Photo", category: "Asset Photo", description: `Photo for asset ${saved.assetId}`, isGlobal: false, assetId: saved.id, fileName: photoFile.name, mimeType: photoFile.type, fileData: dataUrl }); } setSelectedAssetId(saved.id); setAssetModal(null); setActionSuccess(`Asset ${saved.assetId} saved successfully.`); setRefreshVersion((value) => value + 1); } catch (error) { setActionError(error instanceof Error ? error.message : "Asset could not be saved."); } finally { setActionBusy(false); } }} onDeletePhoto={async (photo) => { await deleteRepositoryDocument(photo.documentId); setRefreshVersion((value) => value + 1); }} /> : null}
    </div>
  );
}

type CompletenessResult = { status: "calculated" | "unavailable"; percentage: number | null; missingFields: string[]; unsupportedFields: string[] };
type AssetTypeSummaryRow = { type: string; total: number; active: number; inactive: number };
type AssetStatusSummaryRow = { status: string; total: number };

function Overview({ pipeline, segments, assets, assetTypeSummary, assetStatusSummary, completeness, segmentsError, assetsError, onEdit, onViewMap, onViewSegments }: { pipeline: PipelineRecord | null; segments: AssetMasterSegmentRecord[]; assets: AssetMasterAssetRecord[]; assetTypeSummary: AssetTypeSummaryRow[]; assetStatusSummary: AssetStatusSummaryRow[]; completeness: CompletenessResult; segmentsError: boolean; assetsError: boolean; onEdit: () => void; onViewMap: () => void; onViewSegments: () => void }) {
  if (!pipeline) return <Unavailable title="No pipeline selected" detail="Select a pipeline with available master data to view the overview." />;
  return <div className="space-y-3">
    <div className="grid gap-3 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <MasterPanel title="Pipeline Information" action={<button type="button" onClick={onEdit} className="inline-flex items-center gap-1 rounded-md border border-slateblue-300 px-3 py-1.5 text-xs font-semibold text-slateblue-700 hover:bg-slateblue-50"><Edit3 size={14} />Edit</button>}>
        <div className="divide-y divide-slate-100 text-sm">
          <Info label="Pipeline ID" value={pipeline.pipelineCode} /><Info label="Name" value={pipeline.pipelineName} /><Info label="Product / Service" value={pipeline.serviceOrProduct} /><Info label="Total Length" value={unit(pipeline.pipeLengthKm, "km")} /><Info label="No. of Segments" value={segmentsError ? undefined : segments.length} /><Info label="Outside Diameter (OD)" value={unit(pipeline.pipeOutsideDiameter, pipeline.diameterUnit)} /><Info label="Wall Thickness (WT)" value={unit(wallThicknessInputValue(pipeline), pipeline.wallThicknessUnit)} /><Info label="Material / Grade" value={[pipeline.pipeMaterial, pipeline.pipeGrade].filter(Boolean).join(" / ") || undefined} /><Info label="Maximum Allowable Operating Pressure (MAOP)" value={unit(pipeline.maopBar, "bar")} /><Info label="Design Pressure" value={pressure(pipeline.designPressure, pipeline.designPressureUnit)} /><Info label="Coating Type" value={pipeline.coatingType} /><Info label="Commissioning / Installation Date" value={pipeline.installationDate ?? pipeline.installationYear} /><Info label="Status" value={pipeline.status} />
        </div>
      </MasterPanel>
      <MasterPanel title="Pipeline Route & Assets" action={<button type="button" onClick={onViewMap} className="inline-flex items-center gap-1 rounded-md border border-slateblue-300 px-3 py-1.5 text-xs font-semibold text-slateblue-700 hover:bg-slateblue-50">View Full Map <ArrowUpFromLine size={14} /></button>}>
        <div><OverviewRouteMap pipeline={pipeline} segments={segments} assets={assets} error={segmentsError || assetsError} onViewMap={onViewMap} onEdit={onEdit} />{!pipeline.routeGeometry ? <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-slate-900"><span className="font-semibold">Pipeline route geometry is not recorded.</span> Import a verified GeoJSON, KML or KMZ route in Edit Pipeline.<button type="button" onClick={onEdit} className="ml-2 font-semibold text-slateblue-700 underline">Edit Pipeline / Import GIS</button></p> : null}</div>
      </MasterPanel>
    </div>
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
      <SegmentsPreview segments={segments} assets={assets} error={segmentsError} onViewAll={onViewSegments} />
      <AssetTypeSummary summary={assetTypeSummary} error={assetsError} />
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><FooterMetric icon={<FileText size={23} />} label="Documents Linked" value={unknown} detail="Drawings, reports and documents" /><FooterMetric icon={<Activity size={23} />} label="Latest Inspection Date" value={unknown} detail="Inspection history unavailable" /><FooterMetric icon={<ShieldCheck size={23} />} label="Open Master Data Issues" value={completeness.missingFields.length || unknown} detail={completeness.missingFields.length ? "Fields require completion" : "Completeness source unavailable"} /><FooterMetric icon={<Gauge size={23} />} label="Last Change Log Update" value={unknown} detail="Change log unavailable" /></div>
    <div className="sr-only"><AssetStatusSummary summary={assetStatusSummary} error={assetsError} /><CompletenessPanel result={completeness} /></div>
  </div>;
}

function OverviewRouteMap({ pipeline, segments, assets, error, onViewMap, onEdit }: { pipeline: PipelineRecord; segments: AssetMasterSegmentRecord[]; assets: AssetMasterAssetRecord[]; error: boolean; onViewMap: () => void; onEdit: () => void }) {
  const mapElement = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const hasLocation = Boolean(savedMapEndpoints(pipeline.routeGeometry) || segments.some(segment => savedSegmentMapRoute(segment)) || assets.some(asset => asset.pipelineId === pipeline.id && savedMapCoordinate(asset.latitude, asset.longitude)));
  const routeName = [pipeline.pipelineName, pipeline.pipelineCode].filter(Boolean).join(" / ") || "Pipeline Route";

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
      const bounds = L.latLngBounds([]);
      const label = (value: string) => { const element = document.createElement("span"); element.textContent = value; element.style.cssText = "display:block;width:170px;white-space:normal"; return element; };
      const draw = (geometry: GeoJsonLineString | undefined, name: string, color: string, weight: number, dashed = false) => {
        const points = routeLatLngs(geometry);
        if (points.length < 2) return;
        L.polyline(points, { color, weight, opacity: 0.95, dashArray: dashed ? "7 5" : undefined }).addTo(map).bindTooltip(label(name), { permanent: true, direction: "center" });
        points.forEach((point) => bounds.extend(point));
      };
      drawSavedPipelineOverlay(L, map, pipeline).forEach(point => bounds.extend(point));
      segments.filter(segment => segment.pipelineId === pipeline.id && savedSegmentMapRoute(segment)).forEach((segment) => draw(segment.routeGeometry, segment.segmentId, "#0f766e", 3, true));
      assets.filter((asset) => asset.pipelineId === pipeline.id && savedMapCoordinate(asset.latitude, asset.longitude)).forEach((asset) => {
        const position = [asset.latitude!, asset.longitude!];
        const name = [asset.assetId, asset.name, asset.kp?.trim() ? `KP ${asset.kp}` : ""].filter(Boolean).join(" / ");
        L.circleMarker(position, { radius: 6, color: "#ffffff", weight: 2, fillColor: mapAssetColor(mapAssetCategory(asset)), fillOpacity: 1 }).addTo(map).bindTooltip(label(name), { permanent: true, direction: "left", offset: [-8, 0] });
        bounds.extend(position);
      });
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      resize = new ResizeObserver(() => map?.invalidateSize());
      resize.observe(mapElement.current);
      setState("ready");
    }).catch(() => { if (!cancelled) setState("error"); });
    return () => { cancelled = true; resize?.disconnect(); base?.remove(); map?.remove(); };
  }, [hasLocation, pipeline.routeGeometry, routeName, segments, assets, attempt]);

  return <div className="relative isolate overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
    <div ref={mapElement} className="relative z-0 h-[340px]" aria-label={`Pipeline route and linked assets overview map: ${routeName}`} />
    {!hasLocation ? <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50 p-5 text-center"><div><Route size={28} className="mx-auto text-slateblue-600" /><p className="mt-2 font-semibold text-slate-800">Pipeline location not available - GIS data required</p><p className="mt-1 text-xs leading-5 text-slate-500">Add route geometry or verified asset coordinates to display the map.</p><button type="button" onClick={onEdit} className="mt-3 rounded-md bg-slateblue-600 px-3 py-2 text-xs font-semibold text-white">Edit Pipeline / Import GIS</button></div></div> : state !== "ready" ? <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-50/95 p-5 text-sm text-slate-600"><p>{state === "error" ? "Map could not be loaded." : "Loading map..."}</p>{state === "error" ? <button type="button" onClick={() => setAttempt((value) => value + 1)} className="font-semibold text-slateblue-700">Retry map</button> : null}</div> : null}
    <div className="pointer-events-none absolute left-[52px] top-3 z-20 max-w-[calc(100%-4rem)] rounded-md border border-slate-200 bg-slate-900/90 px-3 py-2 text-xs text-white shadow-lg"><p className="break-words font-semibold">{routeName}</p><p className="mt-1">{pipelineOverlayLabel(pipeline)} / GPS assets / Available KP labels</p>{error ? <p className="mt-1">Some segment or asset data is unavailable.</p> : null}</div>
    <button type="button" onClick={onViewMap} className="absolute bottom-3 right-3 z-20 rounded-md bg-white px-3 py-2 text-xs font-semibold text-slateblue-700 shadow-lg hover:bg-slateblue-50">View Full Map <ArrowUpFromLine size={13} className="ml-1 inline" /></button>
  </div>;
}

function OverviewStat({ icon, label, value, tone = "blue" }: { icon: ReactNode; label: string; value: string | number; tone?: "blue" | "green" }) { return <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-panel"><span className={`shrink-0 ${tone === "green" ? "text-emerald-600" : "text-slateblue-600"}`}>{icon}</span><div className="min-w-0"><p className="truncate text-xl font-semibold text-slate-900">{value}</p><p className="truncate text-xs text-slate-500">{label}</p></div></div>; }
function RouteMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) { return <div className="rounded-md border border-slate-200 bg-white p-3"><div className="flex items-center gap-2 text-slateblue-600">{icon}<span className="text-xs text-slate-500">{label}</span></div><p className="mt-1 text-lg font-semibold text-slate-900">{value}</p></div>; }
function FooterMetric({ icon, label, value, detail, onClick }: { icon: ReactNode; label: string; value: string | number; detail: string; onClick?: () => void }) { const content = <><span className="text-slateblue-600">{icon}</span><div className="min-w-0"><p className="text-xs text-slate-500">{label}</p><p className="truncate text-lg font-semibold text-slate-900">{value}</p><p className="truncate text-xs text-slate-500">{detail}</p></div><ChevronRight className="ml-auto shrink-0 text-slate-400" size={16} /></>; return onClick ? <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-panel hover:border-slateblue-300 hover:bg-slateblue-50">{content}</button> : <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-panel">{content}</div>; }
function SegmentsPreview({ segments, assets, error, onViewAll }: { segments: AssetMasterSegmentRecord[]; assets: AssetMasterAssetRecord[]; error: boolean; onViewAll: () => void }) { return <MasterPanel title={`Pipeline Segments (${error ? unknown : segments.length})`} action={<button type="button" disabled={error || segments.length === 0} onClick={onViewAll} className="inline-flex items-center gap-1 text-xs font-semibold text-slateblue-700 disabled:cursor-not-allowed disabled:opacity-50">View All Segments <ChevronRight size={14} /></button>}><div className="max-h-80 overflow-auto"><table className="min-w-full text-left text-xs"><thead className="bg-slate-50 text-slate-600"><tr>{["Segment ID", "From KP", "To KP", "Length (km)", "Status", "Key Assets"].map((label) => <th className="px-3 py-2 font-semibold" key={label}>{label}</th>)}</tr></thead><tbody>{error || segments.length === 0 ? <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={6}>{error ? "Segment data unavailable." : "No segment records available."}</td></tr> : segments.map((segment) => <tr className="border-t border-slate-100" key={segment.id}><td className="px-3 py-2 font-semibold text-slateblue-700">{displayText(segment.segmentId)}</td><td className="px-3 py-2">{displayText(segment.startKp)}</td><td className="px-3 py-2">{displayText(segment.endKp)}</td><td className="px-3 py-2">{segment.startKp && segment.endKp ? displayText((tryKp(segment.endKp) ?? NaN) - (tryKp(segment.startKp) ?? NaN)) : unknown}</td><td className="px-3 py-2"><StatusBadge value={segment.status ?? "Unknown"} /></td><td className="px-3 py-2">{assets.filter((asset) => asset.segmentId === segment.id || asset.segmentId === segment.segmentId).length}</td></tr>)}</tbody></table></div></MasterPanel>; }

type PipelineFormValues = {
  pipelineCode: string; pipelineName: string; serviceOrProduct: string; pipeMaterial: string; pipeGrade: string;
  pipeLengthKm: string; pipeOutsideDiameter: string; diameterUnit: NonNullable<PipelineInput["diameterUnit"]> | "";
  nominalWallThickness: string; wallThicknessUnit: NonNullable<PipelineInput["wallThicknessUnit"]> | ""; maopBar: string; designPressure: string; designPressureUnit: NonNullable<PipelineInput["designPressureUnit"]> | ""; coatingType: NonNullable<PipelineInput["coatingType"]> | "";
  installationDate: string; installationYear: string; status: string; routeGeometryJson: string;
};

const materialOptions = ["Carbon Steel", "Stainless Steel", "Duplex Stainless Steel", "Alloy Steel", "Cast Iron", "Ductile Iron", "HDPE", "Other"];
const gradeOptionsByMaterial: Record<string, string[]> = {
  "Carbon Steel": ["API 5L A", "API 5L B", "X42", "X46", "X52", "X56", "X60", "X65", "X70", "X80", "Other"],
  "Stainless Steel": ["304", "304L", "316", "316L", "321", "347", "Other"],
  "Duplex Stainless Steel": ["2205", "2507", "2101", "Other"],
  "Alloy Steel": ["ASTM A335 P5", "ASTM A335 P9", "ASTM A335 P11", "ASTM A335 P22", "Other"],
  "Cast Iron": ["Class 40", "Class 50", "Other"],
  "Ductile Iron": ["350", "400", "500", "600", "Other"],
  HDPE: ["PE80", "PE100", "PE4710", "Other"],
  Other: ["Other"]
};

function PipelineModal({ mode, pipeline, busy, errorMessage, onClose, onSave, onDelete }: { mode: "create" | "edit"; pipeline: PipelineRecord | null; busy: boolean; errorMessage: string | null; onClose: () => void; onSave: (input: PipelineInput) => Promise<void>; onDelete: () => Promise<void> }) {
  const [form, setForm] = useState<PipelineFormValues>(() => pipeline ? formFromPipeline(pipeline) : emptyPipelineForm());
  const [error, setError] = useState<string | null>(null);
  const [routePointCount, setRoutePointCount] = useState(() => { try { return parseRouteGeometryJson(pipeline ? routeGeometryText(pipeline.routeGeometry) : "")?.coordinates.length ?? 0; } catch { return 0; } });
  const [formRevision, setFormRevision] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  function update<K extends keyof PipelineFormValues>(key: K, value: PipelineFormValues[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function refreshForm() {
    setForm(mode === "edit" && pipeline ? formFromPipeline(pipeline) : emptyPipelineForm());
    setRoutePointCount(mode === "edit" && pipeline ? pipeline.routeGeometry?.coordinates.length ?? 0 : 0);
    setFormRevision((current) => current + 1);
    setError(null);
  }
  function focusValidation(target?: HTMLElement) { window.requestAnimationFrame(() => { const invalid = target ?? formRef.current?.querySelector<HTMLElement>(":invalid"); invalid?.scrollIntoView({ block: "center", behavior: "smooth" }); invalid?.focus({ preventScroll: true }); }); }
  function handleInvalid(event: FormEvent<HTMLFormElement>) { const target = formRef.current?.querySelector<HTMLInputElement | HTMLSelectElement>(":invalid") ?? event.currentTarget.querySelector<HTMLInputElement | HTMLSelectElement>(":invalid"); if (target) { setError(invalidControlMessage(target)); focusValidation(target); } }
  useEffect(() => {
    if (!errorMessage) return;
    setError(errorMessage);
    const field = ["pipelineCode", "pipelineName", "pipeMaterial", "pipeGrade", "pipeLengthKm", "installationYear", "installationDate", "routeGeometry", "status"].find((candidate) => errorMessage.includes(`${candidate}:`));
    if (field) focusValidation(formRef.current?.querySelector<HTMLElement>(`[data-field-label="${backendFieldLabel(field)}"]`) ?? undefined);
  }, [errorMessage]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setError(null);
    try {
      if (routePointCount > 0 && routePointCount < 3) throw new Error("GIS Route Data Required: supply surveyed intermediate alignment points before saving.");
      void onSave(toPipelineInput(form, pipeline ? routeGeometryText(pipeline.routeGeometry) : "", pipeline?.routeGeometry));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Complete the required fields."); focusValidation(); }
  }
  return <div className="fixed inset-0 z-[9999] isolate flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="pipeline-modal-title">
    <form ref={formRef} onSubmit={submit} onInvalid={handleInvalid} className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-4"><div><h2 id="pipeline-modal-title" className="text-xl font-semibold text-slate-900">{mode === "create" ? "Add Pipeline" : "Edit Pipeline"}</h2><p className="mt-1 text-sm text-slate-500">Save verified pipeline master data. Fields are sent to the existing Pipeline API.</p></div><button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-xl text-slate-400 hover:bg-slate-100" aria-label="Close pipeline form">×</button></div>
      {error || errorMessage ? <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error ?? errorMessage}</p> : null}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <FormField label="Pipeline ID" required value={form.pipelineCode} onChange={(value) => update("pipelineCode", value)} />
        <FormField label="Name" required value={form.pipelineName} onChange={(value) => update("pipelineName", value)} />
        <FormField label="Product / Service" value={form.serviceOrProduct} onChange={(value) => update("serviceOrProduct", value)} />
        <SelectField label="Status" required value={form.status} options={["Active"]} placeholder="Select status" onChange={(value) => update("status", value)} />
        <SelectField label="Material" required value={form.pipeMaterial} options={optionsWithCurrent(materialOptions, form.pipeMaterial)} placeholder="Select material" onChange={(value) => { update("pipeMaterial", value); update("pipeGrade", ""); }} />
        <SelectField label="Grade" required value={form.pipeGrade} options={optionsWithCurrent(gradeOptionsByMaterial[form.pipeMaterial] ?? ["Other"], form.pipeGrade)} placeholder="Select grade" onChange={(value) => update("pipeGrade", value)} />
        <FormField label="Total Length (km)" required type="number" min="0" step="any" value={form.pipeLengthKm} onChange={(value) => update("pipeLengthKm", value)} />
        <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-2"><FormField label="Outside Diameter (OD)" type="number" min="0" step="any" value={form.pipeOutsideDiameter} onChange={(value) => update("pipeOutsideDiameter", value)} /><SelectField label="Unit" value={form.diameterUnit} options={["mm", "cm", "m", "inch", "ft"]} onChange={(value) => update("diameterUnit", value as PipelineFormValues["diameterUnit"])} /></div>
        <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-2"><FormField label="Wall Thickness (WT)" type="number" min="0" step="any" value={form.nominalWallThickness} onChange={(value) => update("nominalWallThickness", value)} /><SelectField label="Unit" value={form.wallThicknessUnit} options={["mm", "in"]} onChange={(value) => update("wallThicknessUnit", value as PipelineFormValues["wallThicknessUnit"])} /></div>
        <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-2"><FormField label="MAOP" type="number" min="0" step="any" value={form.maopBar} onChange={(value) => update("maopBar", value)} /><FixedUnitField label="Unit" value="bar" /></div>
        <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-2"><FormField label="Design Pressure" type="number" min="0" step="any" value={form.designPressure} onChange={(value) => update("designPressure", value)} /><SelectField label="Unit" value={form.designPressureUnit} options={["bar", "psi", "MPa"]} onChange={(value) => update("designPressureUnit", value as PipelineFormValues["designPressureUnit"])} /></div>
        <SelectField label="Coating Type" value={form.coatingType} options={["3LPE", "FBE", "3LPP", "Other"]} placeholder="Select coating type" onChange={(value) => update("coatingType", value as PipelineFormValues["coatingType"])} />
        <FormField label="Commissioning Date" type="date" value={form.installationDate} onChange={(value) => update("installationDate", value)} />
        <FormField label="Installation Year" type="number" min="1900" max="2100" step="1" value={form.installationYear} onChange={(value) => update("installationYear", value)} />
        <RouteEditor key={formRevision} pipelineName={[form.pipelineCode, form.pipelineName].filter(Boolean).join(" — ")} value={form.routeGeometryJson} onChange={(value) => update("routeGeometryJson", value)} onPointCountChange={setRoutePointCount} />
      </div>
      <div className="mt-6 flex items-center justify-between gap-2"><div>{mode === "edit" && pipeline ? <button type="button" onClick={() => { void onDelete(); }} disabled={busy} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-wait disabled:opacity-60">Delete Pipeline</button> : null}</div><div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={refreshForm} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-slateblue-300 px-4 py-2 text-sm font-semibold text-slateblue-700 hover:bg-slateblue-50 disabled:cursor-wait disabled:opacity-60"><RefreshCw size={15} />Refresh Form</button><button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button><button type="submit" disabled={busy} className="rounded-lg bg-slateblue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slateblue-700 disabled:cursor-wait disabled:opacity-60">{busy ? "Saving..." : "Save Pipeline"}</button></div></div>
    </form>
  </div>;
}

function FormField({ label, value, onChange, required = false, type = "text", placeholder, min, max, step, error = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; placeholder?: string; min?: string; max?: string; step?: string; error?: boolean }) { const id = fieldId(label); return <label htmlFor={id} className="text-sm font-semibold text-slate-700">{label}{required ? " *" : ""}<input id={id} name={id} data-field-label={label} required={required} type={type} min={min} max={max} step={step} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className={`mt-1 block w-full rounded-lg border bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-slateblue-500 focus:ring-4 focus:ring-slateblue-100 ${error ? "border-red-500 ring-2 ring-red-100" : "border-slate-300"}`} />{["KP", "From KP", "To KP"].includes(label) ? <ChainageFeedback value={value} /> : null}</label>; }
function SelectField({ label, value, options, onChange, required = false, placeholder = "Select unit" }: { label: string; value: string; options: string[]; onChange: (value: string) => void; required?: boolean; placeholder?: string }) { const id = fieldId(label); return <label htmlFor={id} className="text-sm font-semibold text-slate-700">{label}{required ? " *" : ""}<select id={id} name={id} data-field-label={label} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-slateblue-500 focus:ring-4 focus:ring-slateblue-100"><option value="">{placeholder}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>; }
function FixedUnitField({ label, value }: { label: string; value: string }) { const id = fieldId(label); return <label htmlFor={id} className="text-sm font-semibold text-slate-700">{label}<input id={id} name={id} data-field-label={label} value={value} readOnly title="The backend stores MAOP in bar." className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-600" /></label>; }
function MissingUnitField({ label }: { label: string }) { return <label className="text-sm font-semibold text-slate-700">{label}<input value="MISSING FIELD" readOnly title="Design-pressure unit is not supported by the current backend contract." className="mt-1 block w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700" /></label>; }
function MissingField({ label, detail }: { label: string; detail: string }) { return <label className="text-sm font-semibold text-slate-700">{label}<input value={detail} readOnly title="Coating Type is not supported by the current backend contract." className="mt-1 block w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700" /></label>; }
function fieldId(label: string) { return `pipeline-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`; }
function backendFieldLabel(field: string) { return ({ pipelineCode: "Pipeline ID", pipelineName: "Name", pipeMaterial: "Material", pipeGrade: "Grade", pipeLengthKm: "Total Length (km)", installationYear: "Installation Year", installationDate: "Commissioning Date", routeGeometry: "Route geometry", status: "Status" } as Record<string, string>)[field] ?? field; }
function invalidControlMessage(target: HTMLInputElement | HTMLSelectElement) { const label = target.dataset.fieldLabel ?? target.name ?? "This field"; const validity = target.validity; const input = target as HTMLInputElement; if (validity.valueMissing) return `${label} is required.`; if (validity.badInput || validity.typeMismatch) return `${label} must contain a valid value.`; if (validity.rangeUnderflow) return `${label} must be at least ${input.min}.`; if (validity.rangeOverflow) return `${label} must be at most ${input.max}.`; if (validity.stepMismatch) return `${label} must be a valid ${input.step === "1" ? "whole-number" : "numeric"} value.`; return `${label} is invalid.`; }
function emptyPipelineForm(): PipelineFormValues { return { pipelineCode: "", pipelineName: "", serviceOrProduct: "", pipeMaterial: "", pipeGrade: "", pipeLengthKm: "", pipeOutsideDiameter: "", diameterUnit: "", nominalWallThickness: "", wallThicknessUnit: "", maopBar: "", designPressure: "", designPressureUnit: "", coatingType: "", installationDate: "", installationYear: "", status: "Active", routeGeometryJson: "" }; }
function formFromPipeline(pipeline: PipelineRecord): PipelineFormValues { return { pipelineCode: pipeline.pipelineCode, pipelineName: pipeline.pipelineName, serviceOrProduct: pipeline.serviceOrProduct ?? "", pipeMaterial: pipeline.pipeMaterial ?? "", pipeGrade: pipeline.pipeGrade ?? "", pipeLengthKm: stringValue(pipeline.pipeLengthKm), pipeOutsideDiameter: stringValue(pipeline.pipeOutsideDiameter), diameterUnit: pipeline.diameterUnit ?? "", nominalWallThickness: stringValue(pipeline.wallThicknessInputValue ?? pipeline.nominalWallThickness), wallThicknessUnit: pipeline.wallThicknessUnit ?? "", maopBar: stringValue(pipeline.maopBar), designPressure: stringValue(pipeline.designPressure), designPressureUnit: pipeline.designPressureUnit ?? "", coatingType: pipeline.coatingType ?? "", installationDate: dateInputValue(pipeline.installationDate), installationYear: stringValue(pipeline.installationYear), status: pipeline.status, routeGeometryJson: routeGeometryText(pipeline.routeGeometry) }; }
function toPipelineInput(form: PipelineFormValues, originalRouteText = "", originalRouteGeometry?: GeoJsonLineString): PipelineInput { if (!form.pipelineCode.trim() || !form.pipelineName.trim() || !form.pipeMaterial.trim() || !form.pipeGrade.trim()) throw new Error("Pipeline ID, Name, Material, and Grade are required."); if (!form.pipeLengthKm.trim()) throw new Error("Total Length (km) is required."); if (!form.status.trim()) throw new Error("Pipeline status is required."); if (form.diameterUnit === "" && form.pipeOutsideDiameter.trim()) throw new Error("Select an outside diameter unit."); if (form.wallThicknessUnit === "" && form.nominalWallThickness.trim()) throw new Error("Select a wall thickness unit."); if (form.designPressure.trim() && form.designPressureUnit === "") throw new Error("Select a design pressure unit."); const wallThicknessInputValue = optionalNumber(form.nominalWallThickness); return { pipelineCode: form.pipelineCode.trim(), pipelineName: form.pipelineName.trim(), serviceOrProduct: optionalText(form.serviceOrProduct), pipeMaterial: form.pipeMaterial.trim(), pipeGrade: form.pipeGrade.trim(), pipeLengthKm: optionalNumber(form.pipeLengthKm), pipeOutsideDiameter: optionalNumber(form.pipeOutsideDiameter), diameterUnit: form.diameterUnit || undefined, nominalWallThickness: wallThicknessInputValue, wallThicknessInputValue, wallThicknessUnit: form.wallThicknessUnit || undefined, maopBar: optionalNumber(form.maopBar), designPressure: optionalNumber(form.designPressure), designPressureUnit: form.designPressureUnit || undefined, coatingType: form.coatingType || undefined, installationDate: optionalText(form.installationDate), installationYear: optionalNumber(form.installationYear), status: form.status.trim(), routeGeometry: routeGeometryForSave(form.routeGeometryJson, originalRouteText, originalRouteGeometry) }; }
function normalizePipelineInput(record: Record<string, unknown>): PipelineInput { const routeGeometryValue = record.routeGeometry; return toPipelineInput({ ...emptyPipelineForm(), ...Object.fromEntries(Object.keys(emptyPipelineForm()).map((key) => [key, key === "routeGeometryJson" ? (typeof routeGeometryValue === "string" ? routeGeometryValue : routeGeometryValue ? JSON.stringify(routeGeometryValue) : "") : record[key] === undefined || record[key] === null ? "" : String(record[key])])) } as PipelineFormValues); }
function optionalNumber(value: string) { if (!value.trim()) return undefined; const parsed = Number(value); if (!Number.isFinite(parsed)) throw new Error(`Invalid numeric value: ${value}`); return parsed; }
function optionalText(value: string) { return value.trim() || undefined; }
function optionsWithCurrent(options: string[], current: string) { return current && !options.includes(current) ? [current, ...options] : options; }
function stringValue(value: string | number | undefined) { return value === undefined ? "" : String(value); }
function dateInputValue(value: string | undefined) { if (!value) return ""; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? value.slice(0, 10) : parsed.toISOString().slice(0, 10); }
function csvCell(value: unknown) { const text = value === undefined || value === null ? "" : String(value); return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
function parseCsv(text: string): Record<string, string>[] { const rows = text.trim().split(/\r?\n/).filter(Boolean).map((row) => row.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""))); const headers = rows.shift() ?? []; return rows.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]))); }

function Segments({ pipelines, onPipelineChange, loading, pipeline, segments, assets, documents, documentsError, error, selectedSegmentId, statusFilter, search, onStatusFilterChange, onSearchChange, onSelectSegment, onAdd, onEdit, onDelete, onBulkImport, onViewHistory, onViewMap }: { pipelines: PipelineRecord[]; onPipelineChange: (id: string) => void; loading: boolean; pipeline: PipelineRecord | null; segments: AssetMasterSegmentRecord[]; assets: AssetMasterAssetRecord[]; documents: DocumentRepositoryItem[]; documentsError: boolean; error: boolean; selectedSegmentId: string; statusFilter: string; search: string; onStatusFilterChange: (value: string) => void; onSearchChange: (value: string) => void; onSelectSegment: (id: string) => void; onAdd: () => void; onEdit: () => void; onDelete: (id: string) => void; onBulkImport: (file: File) => void; onViewHistory: () => void; onViewMap: () => void }) {
  const [coatingFilter, setCoatingFilter] = useState("All");
  const [terrainFilter, setTerrainFilter] = useState("All");
  const selected = segments.find((segment) => segment.id === selectedSegmentId) ?? segments[0] ?? null;
  const visibleSegments = segments.filter((segment) => {
    const matchesSearch = !search.trim() || [segment.segmentId, segment.name, segment.startKp, segment.endKp].filter(Boolean).join(" ").toLowerCase().includes(search.trim().toLowerCase());
    return matchesSearch && (statusFilter === "All" || (segment.status ?? "Unknown") === statusFilter) && (coatingFilter === "All" || (segment.coatingType ?? pipeline?.coatingType ?? unknown) === coatingFilter) && (terrainFilter === "All" || (segment.terrain || unknown) === terrainFilter);
  });
  const clearFilters = () => { onStatusFilterChange("All"); onSearchChange(""); setCoatingFilter("All"); setTerrainFilter("All"); };
  const selectSegment = (id: string) => onSelectSegment(id);
  return <div className="min-w-0 space-y-3 text-xs [&_input]:text-xs [&_select]:text-xs">
    <MasterPanel title="Pipeline Segments" action={<div className="flex flex-wrap gap-2"><button type="button" onClick={onAdd} disabled={!pipeline} className="inline-flex items-center gap-1 rounded-md bg-slateblue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-slateblue-700 disabled:opacity-50"><Plus size={15} />Add Segment</button><button type="button" onClick={() => document.getElementById("segment-import-input")?.click()} disabled={!pipeline} className="inline-flex items-center gap-1 rounded-md border border-slateblue-300 px-3 py-2 text-xs font-semibold text-slateblue-700 hover:bg-slateblue-50 disabled:opacity-50"><Upload size={15} />Bulk Import</button><input id="segment-import-input" type="file" accept=".json,.csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) onBulkImport(file); }} /><button type="button" onClick={onViewHistory} className="inline-flex items-center gap-1 rounded-md border border-slateblue-300 px-3 py-2 text-xs font-semibold text-slateblue-700 hover:bg-slateblue-50"><Clock3 size={15} />View History</button></div>}>
      <div className="mb-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_2fr]"><label className="text-xs font-semibold text-slate-600">Pipeline<span className="relative mt-1 block"><select aria-label="Segment register pipeline" value={pipeline?.id ?? ""} onChange={(event) => onPipelineChange(event.target.value)} className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-8 text-sm font-normal text-slate-800 outline-none focus:border-slateblue-500 focus:ring-4 focus:ring-slateblue-100">{pipelines.length === 0 ? <option value="">No pipelines available</option> : null}{pipelines.map((item) => <option key={item.id} value={item.id}>{item.pipelineCode} - {item.pipelineName}</option>)}</select><ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" /></span></label><FilterControl label="Status" value={statusFilter} options={["All", "Active", "Inactive", "Maintenance", "Decommissioned", "Unknown"]} onChange={onStatusFilterChange} /><FilterControl label="Coating Type" value={coatingFilter} options={["All", ...unique(segments.map((item) => item.coatingType ?? pipeline?.coatingType ?? unknown))]} onChange={setCoatingFilter} /><FilterControl label="Terrain" value={terrainFilter} options={["All", ...unique(segments.map((item) => item.terrain || unknown))]} onChange={setTerrainFilter} /><label className="relative self-end md:col-span-2 xl:col-span-1"><span className="sr-only">Search by Segment ID or KP</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search by Segment ID or KP..." className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-slateblue-500 focus:ring-4 focus:ring-slateblue-100" /></label></div>
      <div className="max-w-full overflow-x-auto" role="region" aria-label="Segment register" aria-busy={loading}><table className="w-full min-w-[1260px] text-left text-xs"><thead className="bg-slate-50 text-slate-700"><tr><th className="w-10 px-3 py-3"><span className="sr-only">Select</span></th>{["Segment ID", "From KP", "To KP", "Length (km)", "OD (" + (pipeline?.diameterUnit ?? "unit") + ")", "WT (" + (pipeline?.wallThicknessUnit ?? "unit") + ")", "Material Grade", "Coating", "CP Type", "Terrain", "Status", "Actions"].map((heading) => <th className="px-3 py-3 font-semibold" key={heading}>{heading}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={13} className="px-3 py-6 text-center text-slate-500">Loading segments...</td></tr> : error ? <tr><td colSpan={13} className="px-3 py-6 text-center text-slate-500">Segment data could not be loaded. Refresh the page to try again.</td></tr> : visibleSegments.length === 0 ? <tr><td colSpan={13} className="px-3 py-6 text-center text-slate-500">{segments.length ? <>No segments match the current filters. <button type="button" onClick={clearFilters} className="ml-2 font-semibold text-slateblue-700 underline">Clear filters</button></> : "No segments for this pipeline. Select another pipeline or add a segment."}</td></tr> : visibleSegments.map((segment) => { const active = segment.id === (selected?.id ?? selectedSegmentId); return <tr className={`border-t border-slate-100 ${active ? "bg-slateblue-50" : "hover:bg-slate-50"}`} key={segment.id}><td className="px-3 py-2"><input type="checkbox" checked={active} onChange={() => selectSegment(segment.id)} aria-label={`Select ${segment.segmentId}`} /></td><td className="px-3 py-2 font-semibold text-slateblue-700">{displayText(segment.segmentId)}</td><td className="px-3 py-2">{displayText(segment.startKp)}</td><td className="px-3 py-2">{displayText(segment.endKp)}</td><td className="px-3 py-2">{segmentLength(segment)}</td><td className="px-3 py-2">{displayText(pipeline?.pipeOutsideDiameter)}</td><td className="px-3 py-2">{displayText(pipeline && wallThicknessInputValue(pipeline))}</td><td className="px-3 py-2">{displayText([pipeline?.pipeMaterial, pipeline?.pipeGrade].filter(Boolean).join(" / "))}</td><td className="px-3 py-2">{displayText(segment.coatingType ?? pipeline?.coatingType)}</td><td className="px-3 py-2">{displayText(segment.cpType)}</td><td className="px-3 py-2">{displayText(segment.terrain)}</td><td className="px-3 py-2"><StatusBadge value={segment.status ?? "Unknown"} /></td><td className="px-3 py-2"><div className="flex items-center gap-2 text-slateblue-700"><button type="button" title={`View ${segment.segmentId}`} onClick={() => selectSegment(segment.id)}><Eye size={16} /></button><button type="button" title={`Edit ${segment.segmentId}`} onClick={() => { selectSegment(segment.id); onEdit(); }}><Edit3 size={16} /></button></div></td></tr>; })}</tbody></table></div>
      <div className="flex items-center justify-between text-xs text-slate-500"><span>Showing {visibleSegments.length} of {segments.length} segments</span><span className="flex items-center gap-1"><button type="button" disabled className="rounded border border-slate-200 px-2 py-1 opacity-50">‹</button><span className="rounded bg-slateblue-600 px-2 py-1 font-semibold text-white">1</span><button type="button" disabled className="rounded border border-slate-200 px-2 py-1 opacity-50">›</button></span></div>
    </MasterPanel>
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)_minmax(260px,0.8fr)]"><SegmentDetails pipeline={pipeline} segment={selected} assets={assets} onEdit={() => { if (selected) onSelectSegment(selected.id); onEdit(); }} onDelete={onDelete} /><SegmentMapCard pipeline={pipeline} segment={selected} segments={segments} assets={assets} onSelectSegment={onSelectSegment} onViewMap={onViewMap} /><SegmentValidation pipeline={pipeline} segment={selected} segments={segments} documents={documents} documentsError={documentsError} /></div>
  </div>;
}

function FilterControl({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange?: (value: string) => void }) { return <label className="text-xs font-semibold text-slate-600">{label}<span className="relative mt-1 block"><select value={value} onChange={(event) => onChange?.(event.target.value)} className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-8 text-sm font-normal text-slate-800 outline-none focus:border-slateblue-500 focus:ring-4 focus:ring-slateblue-100">{options.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" /></span></label>; }

function SegmentDetails({ pipeline, segment, assets, onEdit, onDelete }: { pipeline: PipelineRecord | null; segment: AssetMasterSegmentRecord | null; assets: AssetMasterAssetRecord[]; onEdit: () => void; onDelete: (id: string) => void }) { return <MasterPanel icon={<Route size={20} />} title={`Segment Details - ${segment?.segmentId ?? unknown}`} action={<div className="flex gap-2"><button type="button" disabled={!segment} onClick={onEdit} className="inline-flex items-center gap-1 rounded-md border border-slateblue-300 px-3 py-1.5 text-xs font-semibold text-slateblue-700 hover:bg-slateblue-50 disabled:opacity-50"><Edit3 size={14} />Edit</button><button type="button" disabled={!segment} onClick={() => segment && onDelete(segment.id)} className="rounded-md border border-slateblue-300 px-3 py-1.5 text-xs font-semibold text-slateblue-700 disabled:opacity-50">Delete</button></div>}><div className="divide-y divide-slate-100 text-xs [&>div]:gap-2 [&>div]:py-1"><Info label="Pipeline ID" value={pipeline?.pipelineCode} /><Info label="Segment ID" value={segment?.segmentId} /><Info label="KP Range" value={segment ? `${displayText(segment.startKp)} - ${displayText(segment.endKp)}` : undefined} /><Info label="Length" value={typeof segmentLength(segment) === "number" ? `${segmentLength(segment)} km` : unknown} /><Info label="Outside Diameter (OD)" value={unit(pipeline?.pipeOutsideDiameter, pipeline?.diameterUnit)} /><Info label="Wall Thickness (WT)" value={unit(pipeline ? wallThicknessInputValue(pipeline) : undefined, pipeline?.wallThicknessUnit)} /><Info label="Material Grade" value={[pipeline?.pipeMaterial, pipeline?.pipeGrade].filter(Boolean).join(" / ") || undefined} /><Info label="Maximum Allowable Operating Pressure (MAOP)" value={unit(pipeline?.maopBar, "bar")} /><Info label="Coating" value={segment?.coatingType ?? pipeline?.coatingType} /><Info label="CP Type" value={segment?.cpType} /><Info label="Terrain" value={segment?.terrain} /><Info label="Status" value={segment?.status ?? "Unknown"} /><Info label="Nearest Upstream Asset" value={nearestSegmentAsset(segment, assets, "upstream")} /><Info label="Nearest Downstream Asset" value={nearestSegmentAsset(segment, assets, "downstream")} /><Info label="Linked Assets" value={segment ? assets.filter((asset) => asset.segmentId === segment.id || asset.segmentId === segment.segmentId).length : undefined} /><Info label="Notes" value={segment?.description} /></div></MasterPanel>; }

function nearestSegmentAsset(segment: AssetMasterSegmentRecord | null, assets: AssetMasterAssetRecord[], direction: "upstream" | "downstream") {
  const boundary = segmentKp(direction === "upstream" ? segment?.startKp : segment?.endKp);
  if (boundary === null) return undefined;
  const candidates = assets.filter((asset) => asset.pipelineId === segment?.pipelineId && segmentKp(asset.kp) !== null)
    .filter((asset) => direction === "upstream" ? Number(asset.kp) <= boundary : Number(asset.kp) >= boundary)
    .sort((a, b) => Math.abs(Number(a.kp) - boundary) - Math.abs(Number(b.kp) - boundary));
  const asset = candidates[0];
  return asset ? `KP ${asset.kp} - ${asset.name || asset.assetId}` : undefined;
}

function SegmentValidation({ pipeline, segment, segments, documents, documentsError }: { pipeline: PipelineRecord | null; segment: AssetMasterSegmentRecord | null; segments: AssetMasterSegmentRecord[]; documents: DocumentRepositoryItem[]; documentsError: boolean }) {
  const checks = segmentChecks(pipeline, segment, segments, documents, documentsError);
  const allPassed = checks.every(([, result]) => result === "Passed");
  const failed = checks.some(([, result]) => result === "Failed");
  return <MasterPanel icon={<ShieldCheck size={20} />} title="Segment Validation"><div className="space-y-3">{checks.map(([label, result]) => <div className="flex items-center gap-2 text-xs" key={label}><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${result === "Passed" ? "bg-emerald-500 text-white" : result === "Failed" ? "bg-red-100 text-red-700" : "bg-slate-200 text-slate-500"}`}>{result === "Passed" ? <Check size={13} /> : result === "Failed" ? "!" : "?"}</span><span className="min-w-0 flex-1 text-slate-600">{label}</span><span className={`font-semibold ${result === "Passed" ? "text-emerald-600" : result === "Failed" ? "text-red-600" : "text-slate-500"}`}>{result}</span></div>)}<div className="mt-5 border-t border-slate-100 pt-4"><p className="font-semibold text-slate-700">Validation Status</p><div className="mt-3 flex items-center gap-3"><ShieldCheck className={allPassed ? "text-emerald-600" : "text-slateblue-600"} size={38} /><div><p className="font-semibold text-slate-800">{!segment ? unknown : allPassed ? "Valid" : failed ? "Needs attention" : "Partial"}</p><p className="text-xs text-slate-500">{!segment ? "Select a segment to validate." : allPassed ? "All validation checks passed." : failed ? "Review the failed checks above." : "Route or source data is needed to complete validation."}</p></div></div></div></div></MasterPanel>;
}

type SegmentWrite = Omit<AssetMasterSegmentRecord, "id" | "createdAt" | "updatedAt">;

function SegmentModal({ mode, pipeline, segment, busy, errorMessage, onClose, onSave }: { mode: "create" | "edit"; pipeline: PipelineRecord; segment: AssetMasterSegmentRecord | null; busy: boolean; errorMessage: string | null; onClose: () => void; onSave: (segment: SegmentWrite) => Promise<void> }) {
  const [form, setForm] = useState({ segmentId: segment?.segmentId ?? "", name: segment?.name ?? "", startKp: segment?.startKp ?? "", endKp: segment?.endKp ?? "", description: segment?.description ?? "", coatingType: segment?.coatingType ?? pipeline.coatingType ?? "", cpType: segment?.cpType ?? "", terrain: segment?.terrain ?? "", status: segment?.status ?? "Unknown" });
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (errorMessage) setError(errorMessage);
    const field = ["segmentId", "startKp", "endKp"].find((candidate) => errorMessage?.includes(`${candidate}:`));
    if (field) { setErrorField(field); focusSegmentField(formRef.current?.querySelector<HTMLElement>(`[data-field-label="${segmentFieldLabel(field)}"]`) ?? undefined); }
  }, [errorMessage]);

  function updateSegmentField(field: keyof typeof form, value: string) { setForm((current) => ({ ...current, [field]: value })); setErrorField((current) => current === field ? null : current); }

  function focusSegmentField(target?: HTMLElement) {
    window.requestAnimationFrame(() => {
      const field = target ?? formRef.current?.querySelector<HTMLElement>(":invalid");
      field?.scrollIntoView({ block: "center", behavior: "smooth" });
      field?.focus({ preventScroll: true });
    });
  }

  function handleInvalid(event: FormEvent<HTMLFormElement>) {
    const target = formRef.current?.querySelector<HTMLInputElement>(":invalid") ?? event.currentTarget.querySelector<HTMLInputElement>(":invalid");
    if (target) {
      setError(invalidControlMessage(target));
      setErrorField(segmentFieldKey(target.dataset.fieldLabel));
      focusSegmentField(target);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    const validation = validateSegmentForm(form, pipeline);
    if (validation) {
      setError(validation.message);
      setErrorField(validation.field);
      focusSegmentField(formRef.current?.querySelector<HTMLElement>(`[data-field-label="${segmentFieldLabel(validation.field)}"]`) ?? undefined);
      return;
    }
    try {
      void onSave({ pipelineId: pipeline.id, segmentId: form.segmentId.trim(), name: optionalText(form.name), startKp: optionalText(form.startKp), endKp: optionalText(form.endKp), description: optionalText(form.description), coatingType: form.coatingType.trim(), cpType: form.cpType.trim(), terrain: form.terrain.trim(), status: form.status as NonNullable<AssetMasterSegmentRecord["status"]>, routeGeometry: segment?.routeGeometry });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Segment could not be saved.");
      focusSegmentField();
    }
  }

  return <div className="fixed inset-0 z-[9999] isolate flex items-center justify-center bg-slate-950/40 p-3 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="segment-modal-title">
    <form ref={formRef} onSubmit={submit} onInvalid={handleInvalid} className="relative z-10 max-h-[calc(100dvh-1.5rem)] w-full max-w-6xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-6">
      <div className="flex items-start justify-between gap-4"><div><h2 id="segment-modal-title" className="text-xl font-semibold text-slate-900">{mode === "create" ? "Add Segment" : "Edit Segment"}</h2><p className="mt-1 text-sm text-slate-500">Update segment details, coating, cathodic protection, terrain and status.</p></div><button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-xl text-slate-400 hover:bg-slate-100" aria-label="Close segment form">×</button></div>
      {error ? <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <div className="mt-5 grid gap-4 sm:grid-cols-2"><FormField label="Segment ID" required value={form.segmentId} error={errorField === "segmentId"} onChange={(value) => updateSegmentField("segmentId", value)} /><FormField label="Name" value={form.name} onChange={(value) => updateSegmentField("name", value)} /><FormField label="From KP" value={form.startKp} error={errorField === "startKp"} onChange={(value) => updateSegmentField("startKp", value)} /><FormField label="To KP" value={form.endKp} error={errorField === "endKp"} onChange={(value) => updateSegmentField("endKp", value)} /><FormField label="Coating Type" value={form.coatingType} onChange={(value) => updateSegmentField("coatingType", value)} /><FormField label="CP Type" value={form.cpType} onChange={(value) => updateSegmentField("cpType", value)} /><FormField label="Terrain" value={form.terrain} onChange={(value) => updateSegmentField("terrain", value)} /><FilterControl label="Status" value={form.status} options={["Unknown", "Active", "Inactive", "Maintenance", "Decommissioned"]} onChange={(value) => updateSegmentField("status", value)} /><label className="text-sm font-semibold text-slate-700 sm:col-span-2">Notes<textarea value={form.description} onChange={(event) => updateSegmentField("description", event.target.value)} className="mt-1 block min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-slateblue-500 focus:ring-4 focus:ring-slateblue-100" /></label></div>
      <div className="mt-6 flex flex-wrap justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button><button type="submit" disabled={busy} className="rounded-lg bg-slateblue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving..." : "Save Segment"}</button></div>
    </form>
  </div>;
}

function segmentFieldLabel(field: string) { return ({ segmentId: "Segment ID", startKp: "From KP", endKp: "To KP" } as Record<string, string>)[field] ?? field; }
function segmentFieldKey(label: string | undefined) { return ({ "Segment ID": "segmentId", "From KP": "startKp", "To KP": "endKp" } as Record<string, string>)[label ?? ""] ?? null; }

function validateSegmentForm(form: { segmentId: string; startKp: string; endKp: string }, pipeline: PipelineRecord): { field: "segmentId" | "startKp" | "endKp"; message: string } | null {
  if (!form.segmentId.trim()) return { field: "segmentId", message: "Segment ID is required." };
  const start = form.startKp.trim() ? (tryKp(form.startKp) ?? NaN) : undefined;
  const end = form.endKp.trim() ? (tryKp(form.endKp) ?? NaN) : undefined;
  if (form.startKp.trim() && (!Number.isFinite(start) || (start as number) < 0)) return { field: "startKp", message: "From KP must be a non-negative numeric value." };
  if (form.endKp.trim() && (!Number.isFinite(end) || (end as number) < 0)) return { field: "endKp", message: "To KP must be a non-negative numeric value." };
  if (start !== undefined && end !== undefined && end <= start) return { field: "endKp", message: "To KP must be greater than From KP." };
  const pipelineLength = pipeline.pipeLengthKm;
  if (pipelineLength !== undefined && Number.isFinite(pipelineLength)) {
    if (start !== undefined && start > pipelineLength) return { field: "startKp", message: `From KP must be within the parent pipeline range (0–${pipelineLength}).` };
    if (end !== undefined && end > pipelineLength) return { field: "endKp", message: `To KP must be within the parent pipeline range (0–${pipelineLength}).` };
  }
  return null;
}

function segmentLength(segment: AssetMasterSegmentRecord | null) { if (!segment?.startKp || !segment.endKp) return unknown; const start = (tryKp(segment.startKp) ?? NaN); const end = (tryKp(segment.endKp) ?? NaN); return Number.isFinite(start) && Number.isFinite(end) ? end - start : unknown; }

type AssetWrite = Omit<AssetMasterAssetRecord, "id" | "createdAt" | "updatedAt">;
function fileToDataUrl(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Photo could not be read.")); reader.readAsDataURL(file); }); }
function AssetModal({ mode, pipelineId, segments, assets, asset, photo, busy, errorMessage, onClose, onSave, onDeletePhoto }: { mode: "create" | "edit"; pipelineId: string; segments: AssetMasterSegmentRecord[]; assets: AssetMasterAssetRecord[]; asset: AssetMasterAssetRecord | null; photo: DocumentRepositoryItem | null; busy: boolean; errorMessage?: string | null; onClose: () => void; onSave: (asset: AssetWrite, photo?: File) => Promise<void>; onDeletePhoto: (photo: DocumentRepositoryItem) => Promise<void> }) {
  const [form, setForm] = useState({ assetId: asset?.assetId ?? "", assetType: asset ? assetDisplayType(asset) : "Other" as AssetDisplayType, name: asset?.name ?? "", segmentId: asset?.segmentId ?? "", kp: asset?.kp ?? "", facilityType: asset?.facilityType ?? "", equipmentType: asset?.equipmentType ?? "", parentAssetId: asset?.parentAssetId ?? "", latitude: asset?.latitude === undefined ? "" : String(asset.latitude), longitude: asset?.longitude === undefined ? "" : String(asset.longitude), coordinates: asset?.coordinates ?? "", side: asset?.side ?? "", installationDate: asset?.installationDate ?? "", manufacturer: asset?.manufacturer ?? "", model: asset?.model ?? "", physicalStatus: asset?.physicalStatus ?? "Active" });
  const [error, setError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | undefined>();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  useEffect(() => { const formElement = document.querySelector<HTMLFormElement>('[role="dialog"] form'); if (!formElement) return; const section = document.createElement("section"); section.className = "mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4"; section.innerHTML = '<p class="text-sm font-semibold text-slate-800">Asset Photo</p><p class="mt-1 text-xs text-slate-500">JPG, JPEG, PNG, or WebP. Stored in the authenticated document repository.</p>'; const inputElement = document.createElement("input"); inputElement.type = "file"; inputElement.accept = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"; inputElement.className = "mt-3 block w-full text-sm"; const previewElement = document.createElement("img"); previewElement.className = "mt-3 h-32 w-48 rounded-lg object-cover"; previewElement.alt = "Selected asset preview"; previewElement.hidden = true; inputElement.addEventListener("change", () => { const next = inputElement.files?.[0]; if (!next) return; if (!["image/jpeg", "image/png", "image/webp"].includes(next.type) || next.size > 8 * 1024 * 1024) { setError("Photo must be a JPG, JPEG, PNG, or WebP no larger than 8 MiB."); return; } setError(null); const url = URL.createObjectURL(next); previewElement.src = url; previewElement.hidden = false; setPhotoFile(next); setPhotoPreview(url); }); section.appendChild(inputElement); section.appendChild(previewElement); formElement.insertBefore(section, formElement.lastElementChild); return () => section.remove(); }, [photo]);
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const input = (label: string, key: keyof typeof form, required = false, type = "text") => key === "equipmentType" ? <label className="text-sm font-semibold text-slate-700">Equipment Type<input list={`equipment-type-${mode}`} value={form.equipmentType} onChange={(event) => update("equipmentType", event.target.value)} placeholder="Search or enter equipment type" className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" /><datalist id={`equipment-type-${mode}`}>{equipmentTypeOptions[form.assetType].map((equipment) => <option key={equipment} value={equipment} />)}</datalist></label> : <FormField label={label} required={required} type={type} step={key === "latitude" || key === "longitude" ? "any" : undefined} value={form[key]} onChange={(value) => update(key, value)} />;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const latitude = form.latitude.trim() ? Number(form.latitude) : undefined;
    const longitude = form.longitude.trim() ? Number(form.longitude) : undefined;
    if (form.kp.trim() && tryKp(form.kp) === null) { setError("Invalid chainage. Use 18+900 or 18.9 km."); return; }
    if (!form.assetId.trim()) { setError("Asset ID is required."); return; }
    if ((latitude === undefined) !== (longitude === undefined)) { setError("Latitude and longitude must be provided together."); return; }
    if (latitude !== undefined && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) { setError("Latitude must be between -90 and 90."); return; }
    if (longitude !== undefined && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) { setError("Longitude must be between -180 and 180."); return; }
    const metadata = assetTypeMetadata(form.assetType, form.facilityType, form.equipmentType);
    if (metadata.conflict) { setError(`Cannot save ${form.assetType} because the existing facility/equipment value would be overwritten. Clear or confirm that field first.`); return; }
    void onSave({ pipelineId, assetId: form.assetId.trim(), assetType: assetTypeValue(form.assetType), name: optionalText(form.name), facilityType: optionalText(metadata.facilityType ?? ""), equipmentType: optionalText(metadata.equipmentType ?? ""), segmentId: optionalText(form.segmentId), kp: form.kp.trim() ? String(parseKp(form.kp).kilometers) : undefined, latitude, longitude, coordinates: optionalText(form.coordinates), side: (form.side || undefined) as AssetMasterAssetRecord["side"], installationDate: optionalText(form.installationDate), manufacturer: optionalText(form.manufacturer), model: optionalText(form.model), physicalStatus: form.physicalStatus as AssetMasterAssetRecord["physicalStatus"], parentAssetId: optionalText(form.parentAssetId) }, photoFile);
  }
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true"><form onSubmit={submit} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"><div className="flex items-start justify-between"><div><h2 className="text-xl font-semibold text-slate-900">{mode === "create" ? "Add Asset" : "Edit Asset"}</h2><p className="mt-1 text-sm text-slate-500">Save verified Asset Master data for the selected pipeline.</p></div><button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-xl text-slate-400 hover:bg-slate-100" aria-label="Close asset form">×</button></div>{error || errorMessage ? <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error || errorMessage}</p> : null}<div className="mt-5 grid gap-4 sm:grid-cols-2">{input("Asset ID", "assetId", true)}<label className="text-sm font-semibold text-slate-700">Asset Type *<select required value={form.assetType} onChange={(event) => update("assetType", event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal">{assetTypeOptions.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>{input("Name", "name")}{input("KP", "kp")}{input("Facility Type", "facilityType")}{input("Equipment Type", "equipmentType")}<label className="text-sm font-semibold text-slate-700">Segment<select value={form.segmentId} onChange={(event) => update("segmentId", event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal"><option value="">Unassigned</option>{segments.map((segment) => <option key={segment.id} value={segment.id}>{segment.segmentId}</option>)}</select></label><label className="text-sm font-semibold text-slate-700">Parent Asset<select value={form.parentAssetId} onChange={(event) => update("parentAssetId", event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal"><option value="">None</option>{assets.filter((item) => item.id !== asset?.id).map((item) => <option key={item.id} value={item.id}>{item.assetId}</option>)}</select></label>{input("Latitude", "latitude", false, "number")}{input("Longitude", "longitude", false, "number")}{input("Coordinates", "coordinates")}{input("Installation Date", "installationDate", false, "date")}{input("Manufacturer", "manufacturer")}{input("Model", "model")}<label className="text-sm font-semibold text-slate-700">Side<select value={form.side} onChange={(event) => update("side", event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal"><option value="">Unassigned</option><option value="LHS">LHS</option><option value="RHS">RHS</option></select></label><label className="text-sm font-semibold text-slate-700">Status *<select required value={form.physicalStatus} onChange={(event) => update("physicalStatus", event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal"><option>Active</option><option>Inactive</option><option>Maintenance</option><option>Decommissioned</option><option>Unknown</option></select></label></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button><button type="submit" disabled={busy} className="rounded-lg bg-slateblue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving..." : "Save Asset"}</button></div></form></div>;
}

function Assets({ assets, segments, error }: { assets: AssetMasterAssetRecord[]; segments: AssetMasterSegmentRecord[]; error: boolean }) {
  const [type, setType] = useState("All Types"); const [segment, setSegment] = useState("All Segments"); const [status, setStatus] = useState("All Status"); const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(assets[0]?.id ?? "");
  const visible = assets.filter((asset) => (type === "All Types" || assetDisplayType(asset) === type) && (segment === "All Segments" || asset.segmentId === segment) && (status === "All Status" || asset.physicalStatus === status) && (!query || [asset.assetId, asset.name, asset.kp, asset.segmentId].some((value) => String(value ?? "").toLowerCase().includes(query.toLowerCase()))));
  const chosen = assets.find((asset) => asset.id === selected) ?? visible[0] ?? null;
  return <div className="space-y-3"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["Stations / Facilities", assets.filter((a) => a.facilityType).length], ["Valves", assets.filter((a) => a.equipmentType?.toLowerCase().includes("valve")).length], ["Rectifiers", assets.filter((a) => a.assetType === "RECTIFIER").length], ["Other Assets", assets.filter((a) => a.assetType === "OTHER").length]].map(([label, value]) => <OverviewStat key={String(label)} icon={<Database size={22} />} label={String(label)} value={String(value)} />)}</div><MasterPanel title={`Asset Register (${visible.length} assets)`}><div className="grid gap-3 md:grid-cols-4"><FilterControl label="Asset Type" value={type} options={["All Types", ...assetTypeOptions]} onChange={setType} /><FilterControl label="Segment" value={segment} options={["All Segments", ...unique(segments.map((s) => s.segmentId))]} onChange={setSegment} /><FilterControl label="Status" value={status} options={["All Status", ...unique(assets.map((a) => a.physicalStatus))]} onChange={setStatus} /><label className="relative self-end"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by Asset ID, Name or KP" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm" /></label></div>{error ? <Unavailable compact title="Asset register unavailable" detail="The Asset Master API could not be read." /> : visible.length === 0 ? <EmptyState compact title="No asset records match these filters" detail="The API returned no matching records." /> : <div className="mt-4 overflow-x-auto"><table className="min-w-[1180px] text-left text-xs"><thead className="bg-slate-50 text-slate-700"><tr>{["", "Asset ID", "Type", "Name", "Segment", "KP", "Parent Asset", "Manufacturer", "Status", "Last Updated", "Actions"].map((heading) => <th className="px-3 py-3 font-semibold" key={heading}>{heading}</th>)}</tr></thead><tbody>{visible.map((asset) => <tr className={`border-t border-slate-100 ${asset.id === chosen?.id ? "bg-slateblue-50" : ""}`} key={asset.id}><td className="px-3 py-2"><input type="checkbox" checked={asset.id === chosen?.id} onChange={() => setSelected(asset.id)} aria-label={`Select ${asset.assetId}`} /></td><td className="px-3 py-2 font-semibold text-slateblue-700">{asset.assetId}</td><td className="px-3 py-2">{assetDisplayType(asset)}</td><td className="px-3 py-2">{displayText(asset.name)}</td><td className="px-3 py-2">{displayText(asset.segmentId)}</td><td className="px-3 py-2">{displayText(asset.kp)}</td><td className="px-3 py-2">{displayText(asset.parentAssetId)}</td><td className="px-3 py-2">{displayText(asset.manufacturer)}</td><td className="px-3 py-2"><StatusBadge value={asset.physicalStatus} /></td><td className="px-3 py-2">{date(asset.updatedAt ?? asset.createdAt ?? "")}</td><td className="px-3 py-2"><Link href={`/asset-master/assets/${asset.id}`} className="text-slateblue-700"><Eye size={16} /></Link></td></tr>)}</tbody></table></div>}</MasterPanel>{chosen ? <div className="grid gap-3 lg:grid-cols-2"><MasterPanel title={`Selected Asset Details - ${chosen.assetId}`} action={<Link href={`/asset-master/assets/${chosen.id}`} className="rounded-md border border-slateblue-300 px-3 py-1.5 text-xs font-semibold text-slateblue-700">View Details</Link>}><div className="grid gap-x-5 gap-y-2 text-sm sm:grid-cols-2"><Info label="Asset ID" value={chosen.assetId} /><Info label="Asset Type" value={assetDisplayType(chosen)} /><Info label="Segment" value={chosen.segmentId} /><Info label="KP" value={chosen.kp} /><Info label="Manufacturer" value={chosen.manufacturer} /><Info label="Model" value={chosen.model} /><Info label="Installation Date" value={chosen.installationDate} /><Info label="Condition / Status" value={chosen.physicalStatus} /></div></MasterPanel><MasterPanel title="Asset Location"><Unavailable compact title="Map layer unavailable" detail="Coordinates are shown only when returned by Asset Master." /><div className="mt-3 grid grid-cols-2 gap-3 text-sm"><Info label="Latitude" value={chosen.latitude} /><Info label="Longitude" value={chosen.longitude} /></div></MasterPanel></div> : null}</div>;
}

function routeLatLngs(geometry?: GeoJsonLineString) { return savedMapRoute(geometry) ?? []; }

type MapAssetCategory = "station" | "valve" | "other";
function mapAssetCategory(asset: AssetMasterAssetRecord): MapAssetCategory { if (asset.assetType === "VALVE" || asset.equipmentType?.toLowerCase().includes("valve")) return "valve"; if (asset.assetType === "STATION" || Boolean(asset.facilityType)) return "station"; return "other"; }
function mapAssetColor(category: MapAssetCategory) { return category === "station" ? "#16a34a" : category === "valve" ? "#dc2626" : "#f59e0b"; }

function LeafletMapViewLegacy({ pipeline, assets, segments, onOpenAssetRegister, onOpenSegments }: { pipeline: PipelineRecord | null; assets: AssetMasterAssetRecord[]; segments: AssetMasterSegmentRecord[]; onOpenAssetRegister: () => void; onOpenSegments: () => void }) {
  const located = assets.filter((asset) => Number.isFinite(asset.latitude) && Number.isFinite(asset.longitude));
  const [selectedId, setSelectedId] = useState("");
  const [layers, setLayers] = useState({ stations: true, valves: true, rectifiers: true, testPosts: true, compressors: true, sensors: true, other: true });
  const [query, setQuery] = useState("");
  const [mapType, setMapType] = useState<"street" | "satellite" | "terrain">("satellite");
  const [showRoute, setShowRoute] = useState(true);
  const [showSegments, setShowSegments] = useState(true);
  const mapElement = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markers = useRef<any[]>([]);
  const tileLayer = useRef<any>(null);
  const geometryLayers = useRef<any[]>([]);
  const selected = assets.find((asset) => asset.id === selectedId) ?? null;
  const routeDataAvailable = Boolean(pipeline?.routeGeometry?.coordinates?.length);
  const searched = located.filter((asset) => !query.trim() || `${asset.assetId} ${asset.name ?? ""} ${asset.kp ?? ""} ${asset.coordinates ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  const visible = located.filter((asset) => {
    const text = `${asset.assetType} ${asset.facilityType ?? ""} ${asset.equipmentType ?? ""}`.toLowerCase();
    if (!searched.some((item) => item.id === asset.id)) return false;
    if (text.includes("valve")) return layers.valves;
    if (asset.assetType === "RECTIFIER") return layers.rectifiers;
    if (asset.assetType === "TEST_POST") return layers.testPosts;
    if (text.includes("compressor")) return layers.compressors;
    if (text.includes("sensor")) return layers.sensors;
    if (asset.facilityType) return layers.stations;
    return layers.other;
  });

  useEffect(() => {
    if (!mapElement.current || (!located.length && !routeDataAvailable)) return;
    let cancelled = false;
    const loadLeaflet = new Promise<void>((resolve, reject) => {
      const win = window as unknown as { L?: any };
      if (win.L) { resolve(); return; }
      const existing = document.getElementById("leaflet-javascript-api");
      if (existing) { existing.addEventListener("load", () => resolve(), { once: true }); existing.addEventListener("error", () => reject(new Error("Leaflet failed to load.")), { once: true }); return; }
      const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; css.id = "leaflet-styles"; document.head.appendChild(css);
      const script = document.createElement("script"); script.id = "leaflet-javascript-api"; script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; script.async = true; script.onload = () => resolve(); script.onerror = () => reject(new Error("Leaflet failed to load.")); document.body.appendChild(script);
    });
    void loadLeaflet.then(() => {
      if (cancelled || !mapElement.current) return;
      const L = (window as unknown as { L: any }).L;
      const first = visible[0] ?? located[0];
      const routeFirst = routeLatLngs(pipeline?.routeGeometry)[0];
      if (!mapInstance.current) mapInstance.current = L.map(mapElement.current, { zoomControl: true, attributionControl: true }).setView(first ? [first.latitude, first.longitude] : routeFirst, 8);
      if (tileLayer.current) tileLayer.current.remove();
      const tileUrl = mapType === "satellite" ? ESRI_SATELLITE_TILE_URL : mapType === "terrain" ? ESRI_TERRAIN_TILE_URL : ESRI_STREET_TILE_URL;
      tileLayer.current = L.tileLayer(tileUrl, { maxZoom: 19, attribution: ESRI_ATTRIBUTION }).addTo(mapInstance.current);
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
      geometryLayers.current.forEach((layer) => layer.remove());
      geometryLayers.current = [];
      const bounds = L.latLngBounds([]);
      const routePoints = routeLatLngs(pipeline?.routeGeometry);
      if (showRoute && routePoints.length >= 2) {
        const routeLayer = L.polyline(routePoints, { color: "#2563eb", weight: 4 });
        routeLayer.addTo(mapInstance.current);
        geometryLayers.current.push(routeLayer);
        routePoints.forEach((point) => bounds.extend(point));
      }
      if (showSegments) {
        segments.forEach((segment) => {
          const points = routeLatLngs(segment.routeGeometry);
          if (points.length >= 2) {
            const segmentLayer = L.polyline(points, { color: "#0f766e", weight: 3, dashArray: "8 6" });
            segmentLayer.addTo(mapInstance.current);
            geometryLayers.current.push(segmentLayer);
            points.forEach((point) => bounds.extend(point));
          }
        });
      }
      visible.forEach((asset) => { const marker = L.marker([asset.latitude!, asset.longitude!]).addTo(mapInstance.current).bindTooltip(`${asset.assetId}${asset.kp ? ` · KP ${asset.kp}` : ""}`); marker.on("click", () => setSelectedId(asset.id)); markers.current.push(marker); bounds.extend([asset.latitude!, asset.longitude!]); });
      if (visible.length > 1) mapInstance.current.fitBounds(bounds, { padding: [24, 24] }); else if (visible.length === 1) { mapInstance.current.setView([visible[0].latitude!, visible[0].longitude!], 13); }
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [located.length, visible.map((asset) => asset.id).join(","), mapType, pipeline?.routeGeometry, routeDataAvailable, showRoute, showSegments, segments.map((segment) => `${segment.id}:${JSON.stringify(segment.routeGeometry ?? null)}`).join("|")]);

  function toggleFullscreen() { const element = mapElement.current; if (!element) return; if (document.fullscreenElement) void document.exitFullscreen(); else void element.requestFullscreen?.(); }
  function fitToAssets() { const L = (window as unknown as { L?: any }).L; if (!L || !mapInstance.current || !visible.length) return; mapInstance.current.fitBounds(L.latLngBounds(visible.map((asset) => [asset.latitude, asset.longitude])), { padding: [24, 24] }); }
  function fitToRoute() { const L = (window as unknown as { L?: any }).L; const points = routeLatLngs(pipeline?.routeGeometry); if (!L || !mapInstance.current || points.length < 2) return; mapInstance.current.fitBounds(L.latLngBounds(points), { padding: [24, 24] }); }
  function exportMapAssets() { const rows = ["Asset ID,Type,Name,KP,Latitude,Longitude,Status", ...visible.map((asset) => [asset.assetId, assetDisplayType(asset), asset.name ?? "", asset.kp ?? "", asset.latitude ?? "", asset.longitude ?? "", asset.physicalStatus].map(csvCell).join(","))]; const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "asset-master-map.csv"; link.click(); URL.revokeObjectURL(url); }
  if (!located.length && !routeDataAvailable) return <div className="grid gap-3 lg:grid-cols-[230px_minmax(0,1fr)_300px]"><MasterPanel title="Map Layers"><p className="text-sm text-slate-600">{segments.length} segments available; no verified asset coordinates.</p></MasterPanel><MasterPanel title="Map View"><Unavailable compact title="No verified coordinates" detail="Asset Master returned no latitude/longitude values. No marker or route was invented." /></MasterPanel><MasterPanel title="Selected Asset"><Unavailable compact title="No map selection" detail="Add verified GPS coordinates to an Asset Master record." /></MasterPanel></div>;
  return <div className="grid gap-3 lg:grid-cols-[230px_minmax(0,1fr)_300px]"><Panel className="h-fit p-4"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold text-slate-900">Map Layers</h2><ChevronDown size={18} className="text-slate-500" /></div><div className="space-y-2.5 text-sm"><div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><p className="font-semibold">Route Data Required</p><p className="mt-1">No saved route geometry is available. Real asset GPS points remain visible; no route or segment path is inferred.</p><button type="button" onClick={onOpenSegments} className="mt-2 font-semibold text-slateblue-700 underline">Open Segments workflow</button></div>{(["stations", "valves", "rectifiers", "testPosts", "compressors", "sensors", "other"] as const).map((key) => <label className="flex items-center gap-2.5 text-slateblue-700" key={key}><input type="checkbox" checked={layers[key]} onChange={(event) => setLayers({ ...layers, [key]: event.target.checked })} className="h-4 w-4 accent-blue-600" />{key === "testPosts" ? "Test Posts" : key[0].toUpperCase() + key.slice(1)}</label>)}<div className="mt-4 border-t border-slate-200 pt-3"><p className="mb-2 text-xs font-semibold text-slate-500">Base map</p>{(["street", "terrain", "satellite"] as const).map((key) => <label className="mb-2 flex items-center gap-2" key={key}><input type="radio" name="asset-map-type" checked={mapType === key} onChange={() => setMapType(key)} />{key === "street" ? "Street Map" : key === "terrain" ? "Terrain" : "Satellite imagery"}</label>)}</div></div></Panel><Panel className="relative z-0 min-w-0 overflow-hidden p-3 lg:col-start-2 lg:row-start-1"><div className="mb-3 flex flex-wrap gap-2"><label className="relative min-w-[220px] flex-1"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by KP, Asset ID, or location..." className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm" /></label><button type="button" onClick={fitToAssets} disabled={!visible.length} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slateblue-700 disabled:opacity-50">Fit to Assets</button><button type="button" disabled title="Route Data Required" className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-400">Fit to Route</button><select aria-label="Map type" value={mapType} onChange={(event) => setMapType(event.target.value as typeof mapType)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slateblue-700"><option value="street">Street Map</option><option value="satellite">Satellite</option><option value="terrain">Terrain</option></select><button type="button" onClick={exportMapAssets} disabled={!visible.length} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slateblue-700 disabled:opacity-50">Export</button><button type="button" onClick={toggleFullscreen} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slateblue-700">Fullscreen</button></div><div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{segments.length} saved segment{segments.length === 1 ? "" : "s"} linked to this pipeline. Segments: {segments.map((segment) => segment.segmentId).join(", ") || "none"}. KP ranges are available; map paths require saved route geometry.</div><div ref={mapElement} className="min-h-[540px] rounded-xl border border-slate-200 bg-slate-50" aria-label="OpenStreetMap of verified asset coordinates" /></Panel><Panel className="relative z-10 h-fit p-4 lg:col-start-3 lg:row-start-1"><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold text-slate-900">Selected Asset</h2>{selected ? <button type="button" onClick={() => setSelectedId("")} aria-label="Clear selected asset" className="text-xl text-slate-400">×</button> : null}</div>{selected ? <div className="space-y-3 text-sm"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-slateblue-800">{selected.assetId}</p><p className="text-xs text-slate-500">{assetDisplayType(selected)}</p></div><StatusBadge value={selected.physicalStatus} /></div><div className="divide-y divide-slate-100">{[["Segment", segments.find((segment) => segment.id === selected.segmentId)?.segmentId ?? selected.segmentId], ["KP Location", selected.kp], ["Name", selected.name], ["Pipeline", selected.pipelineId], ["Coordinates", selected.coordinates ?? `${selected.latitude}, ${selected.longitude}`], ["Installation Date", selected.installationDate], ["Manufacturer", selected.manufacturer], ["Model", selected.model], ["Status", selected.physicalStatus]].map(([label, value]) => <Info key={String(label)} label={String(label)} value={value} />)}</div><div className="grid gap-2"><Link href={`/asset-master/assets/${selected.id}`} className="rounded-lg bg-slateblue-600 px-3 py-2 text-center text-xs font-semibold text-white">View Full Details</Link><button type="button" onClick={onOpenAssetRegister} className="rounded-lg border border-slateblue-300 px-3 py-2 text-xs font-semibold text-slateblue-700">Open in Asset Register</button></div></div> : <Unavailable compact title="No map selection" detail="Select a marker to view its real location details." />}</Panel></div>;
}

function GoogleMapView({ assets, segments }: { assets: AssetMasterAssetRecord[]; segments: AssetMasterSegmentRecord[] }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
  const located = assets.filter((asset) => Number.isFinite(asset.latitude) && Number.isFinite(asset.longitude));
  const [selectedId, setSelectedId] = useState("");
  const [satellite, setSatellite] = useState(true);
  const [layers, setLayers] = useState({ stations: true, valves: true, rectifiers: true, testPosts: true, other: true });
  const mapElement = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markers = useRef<any[]>([]);
  const selected = assets.find((asset) => asset.id === selectedId) ?? null;
  const visible = located.filter((asset) => {
    const text = `${asset.assetType} ${asset.facilityType ?? ""} ${asset.equipmentType ?? ""}`.toLowerCase();
    if (text.includes("valve")) return layers.valves;
    if (asset.assetType === "RECTIFIER") return layers.rectifiers;
    if (asset.assetType === "TEST_POST") return layers.testPosts;
    if (asset.facilityType) return layers.stations;
    return layers.other;
  });

  useEffect(() => {
    if (!apiKey || !mapElement.current || !located.length) return;
    let cancelled = false;
    const load = new Promise<void>((resolve, reject) => {
      const existing = document.getElementById("google-maps-javascript-api");
      if ((window as Window & { google?: any }).google?.maps) { resolve(); return; }
      if (existing) { existing.addEventListener("load", () => resolve(), { once: true }); existing.addEventListener("error", () => reject(new Error("Google Maps API failed to load.")), { once: true }); return; }
      const script = document.createElement("script"); script.id = "google-maps-javascript-api"; script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&language=en&region=AE`; script.async = true; script.defer = true; script.onload = () => resolve(); script.onerror = () => reject(new Error("Google Maps API failed to load.")); document.head.appendChild(script);
    });
    void load.then(() => {
      if (cancelled || !mapElement.current) return;
      const maps = (window as unknown as Window & { google: any }).google.maps;
      const first = visible[0] ?? located[0];
      if (!mapInstance.current) mapInstance.current = new maps.Map(mapElement.current, { center: { lat: first.latitude, lng: first.longitude }, zoom: 8, mapTypeId: satellite ? "satellite" : "roadmap", streetViewControl: false, fullscreenControl: true, mapTypeControl: true, zoomControl: true });
      markers.current.forEach((marker) => marker.setMap(null)); markers.current = [];
      const bounds = new maps.LatLngBounds();
      visible.forEach((asset) => { const position = { lat: asset.latitude!, lng: asset.longitude! }; bounds.extend(position); const marker = new maps.Marker({ map: mapInstance.current, position, title: asset.assetId }); marker.addListener("click", () => setSelectedId(asset.id)); markers.current.push(marker); });
      if (visible.length > 1) mapInstance.current.fitBounds(bounds); else if (visible.length === 1) { mapInstance.current.setCenter(bounds.getCenter()); mapInstance.current.setZoom(12); }
      mapInstance.current.setMapTypeId(satellite ? "satellite" : "roadmap");
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [apiKey, located.length, visible.map((asset) => `${asset.id}:${asset.latitude}:${asset.longitude}`).join("|"), satellite]);

  if (!apiKey) return <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_280px]"><MasterPanel title="Map Layers"><p className="text-sm text-slate-600">Google Maps is not configured. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.</p></MasterPanel><MasterPanel title="Map View"><Unavailable compact title="Map API key missing" detail="No map was rendered because a Google Maps key is not configured." /></MasterPanel><MasterPanel title="Selected Asset"><Unavailable compact title="No map selection" detail="Map selection is unavailable until Google Maps is configured." /></MasterPanel></div>;
  if (!located.length) return <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_280px]"><MasterPanel title="Map Layers"><p className="text-sm text-slate-600">{segments.length} segments available; no asset layer coordinates.</p></MasterPanel><MasterPanel title="Map View"><Unavailable compact title="No verified coordinates" detail="Asset Master returned no latitude/longitude values. No marker or guessed route was created." /></MasterPanel><MasterPanel title="Selected Asset"><Unavailable compact title="No map selection" detail="Add verified GPS coordinates to an Asset Master record." /></MasterPanel></div>;
  return <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_280px]"><MasterPanel title="Map Layers"><div className="space-y-3 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={satellite} onChange={(event) => setSatellite(event.target.checked)} />Satellite imagery</label>{(["stations", "valves", "rectifiers", "testPosts", "other"] as const).map((key) => <label className="flex items-center gap-2" key={key}><input type="checkbox" checked={layers[key]} onChange={(event) => setLayers({ ...layers, [key]: event.target.checked })} />{key === "testPosts" ? "Test Posts" : key[0].toUpperCase() + key.slice(1)}</label>)}<p className="border-t pt-3 text-xs text-slate-500">Pipeline route geometry: unavailable from existing APIs.</p></div></MasterPanel><MasterPanel title="Map View" description="Only verified Asset Master coordinates are displayed."><div ref={mapElement} className="min-h-[420px] rounded-xl border border-slate-200 bg-slate-50" aria-label="Google map of verified asset coordinates" /></MasterPanel><MasterPanel title="Selected Asset">{selected ? <div className="space-y-2 text-sm"><Info label="Asset ID" value={selected.assetId} /><Info label="Name" value={selected.name} /><Info label="Type" value={selected.assetType} /><Info label="KP" value={selected.kp} /><Info label="Latitude" value={selected.latitude} /><Info label="Longitude" value={selected.longitude} /><Info label="Status" value={selected.physicalStatus} /></div> : <Unavailable compact title="No map selection" detail="Select a marker to view its real location details." />}</MasterPanel></div>;
}


function TablePanel({ title, empty, error, errorDetail, hasRows, children }: { title: string; empty: string; error: boolean; errorDetail: string; hasRows: boolean; children: ReactNode }) {
  return <MasterPanel title={title}>{error ? <Unavailable compact title={`${title} unavailable`} detail={errorDetail} /> : hasRows ? <div className="overflow-x-auto">{children}</div> : <EmptyState compact title={empty} detail="The API returned no records." />}</MasterPanel>;
}

function AssetTypeSummary({ summary, error }: { summary: AssetTypeSummaryRow[]; error: boolean }) {
  return <MasterPanel title="Assets by Type" description="Counts are derived from the returned Asset Master records only.">{error ? <Unavailable compact title="Asset summary unavailable" detail="The asset API could not be read." /> : summary.length === 0 ? <EmptyState compact title="No asset type records available" detail="The API returned no asset records." /> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="px-4 py-3">Asset Type</th><th className="px-4 py-3">Returned Records</th><th className="px-4 py-3">Active</th><th className="px-4 py-3">Inactive</th></tr></thead><tbody>{summary.map((row) => <tr className="border-b border-slate-100 last:border-0" key={row.type}><td className="px-4 py-3 font-semibold text-slate-900">{row.type}</td><td className="px-4 py-3">{row.total}</td><td className="px-4 py-3">{row.active}</td><td className="px-4 py-3">{row.inactive}</td></tr>)}</tbody></table></div>}</MasterPanel>;
}

function AssetStatusSummary({ summary, error }: { summary: AssetStatusSummaryRow[]; error: boolean }) {
  return <MasterPanel title="Asset Status Summary" description="Status counts are derived from returned Asset Master records.">{error ? <Unavailable compact title="Asset status summary unavailable" detail="The asset API could not be read." /> : summary.length === 0 ? <EmptyState compact title="No asset status records available" detail="The API returned no asset records." /> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="px-4 py-3">Physical Status</th><th className="px-4 py-3">Returned Records</th></tr></thead><tbody>{summary.map((row) => <tr className="border-b border-slate-100 last:border-0" key={row.status}><td className="px-4 py-3 font-semibold text-slate-900">{row.status}</td><td className="px-4 py-3">{row.total}</td></tr>)}</tbody></table></div>}</MasterPanel>;
}

function CompletenessPanel({ result }: { result: CompletenessResult }) {
  return <MasterPanel title="Master Data Completeness" description="Authoritative completeness KPI is not available from the existing read-only APIs."><Unavailable compact title="UNKNOWN" detail={`BLOCKED — no approved completeness source. Unsupported fields: ${result.unsupportedFields.join(", ")}.`} /></MasterPanel>;
}

function MasterPanel({ title, description, action, children, icon }: { title: string; description?: string; action?: ReactNode; children: ReactNode; icon?: ReactNode }) {
  return <Panel className="min-w-0"><div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">{icon ? <span className="shrink-0 text-slateblue-600">{icon}</span> : null}{title}</h2>{description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}</div>{action}</div>{children}</Panel>;
}

function Info({ label, value }: { label: string; value?: string | number }) {
  return <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-4 py-2.5"><dt className="font-semibold text-slate-600">{label}</dt><dd className="break-words text-slate-900">{displayText(value)}</dd></div>;
}

function Unavailable({ title, detail, compact = false }: { title: string; detail: string; compact?: boolean }) {
  return <div className={`rounded-xl border border-slate-200 bg-slate-50 text-slate-700 ${compact ? "px-4 py-3" : "px-5 py-6"}`}><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-slate-600">{detail}</p></div>;
}

function EmptyState({ title, detail, compact = false }: { title: string; detail: string; compact?: boolean }) {
  return <div className={`rounded-xl border border-slate-200 bg-white text-slate-700 ${compact ? "px-4 py-3" : "px-5 py-6"}`}><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-slate-600">{detail}</p></div>;
}

function StatusBadge({ value }: { value: string }) { const positive = /active|approved|completed|valid/i.test(value); return <span className={`inline-flex rounded-full px-3 py-1 font-semibold ${positive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{value}</span>; }
function unique(values: string[]) { return [...new Set(values.filter(Boolean))]; }

function Loading() { return <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-sm text-slate-600 shadow-panel">Loading master data...</div>; }
function parseRouteGeometryJson(value: string): GeoJsonLineString | undefined { return value.trim() ? { type: "LineString", coordinates: parseGisLineString(value) } : undefined; }
function routeGeometryText(value?: GeoJsonLineString) { return value ? JSON.stringify(value) : ""; }
function displayText(value: string | number | undefined | null) { return value === undefined || value === null || (typeof value === "string" && value.trim() === "") ? unknown : value; }
function unit(value: number | undefined, suffix?: string) { return value === undefined ? undefined : `${value}${suffix ? ` ${suffix}` : ""}`; }
function wallThicknessInputValue(pipeline: PipelineRecord) { return pipeline.wallThicknessInputValue ?? pipeline.nominalWallThickness; }
function pressure(value: number | undefined, pressureUnit?: string) { return value === undefined ? undefined : `${value}${pressureUnit ? ` ${pressureUnit}` : " (unit unavailable)"}`; }
function date(value: string) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString(); }
function summarizeAssetTypes(assets: AssetMasterAssetRecord[]): AssetTypeSummaryRow[] { const counts = new Map<string, AssetTypeSummaryRow>(); for (const asset of assets) { const type = assetDisplayType(asset); const row = counts.get(type) ?? { type, total: 0, active: 0, inactive: 0 }; row.total += 1; if (asset.physicalStatus === "Active") row.active += 1; if (asset.physicalStatus === "Inactive") row.inactive += 1; counts.set(type, row); } return [...counts.values()].sort((left, right) => left.type.localeCompare(right.type)); }
function summarizeAssetStatuses(assets: AssetMasterAssetRecord[]): AssetStatusSummaryRow[] { const counts = new Map<string, number>(); for (const asset of assets) counts.set(asset.physicalStatus, (counts.get(asset.physicalStatus) ?? 0) + 1); return [...counts.entries()].map(([status, total]) => ({ status, total })).sort((left, right) => left.status.localeCompare(right.status)); }
function calculateCompleteness(pipeline: PipelineRecord | null, segments: AssetMasterSegmentRecord[], assets: AssetMasterAssetRecord[], pipelineError: boolean, segmentsError: boolean, assetsError: boolean): CompletenessResult { const unsupportedFields = ["Owner", "Coating Type", "Description", "Segment Length", "Segment Status", "Pipeline Route"]; if (!pipeline || pipelineError || segmentsError || assetsError) return { status: "unavailable", percentage: null, missingFields: [], unsupportedFields }; const required: Array<[string, unknown]> = [["Pipeline ID", pipeline.pipelineCode], ["Pipeline Name", pipeline.pipelineName], ["Product / Service", pipeline.serviceOrProduct], ["Total Length", pipeline.pipeLengthKm], ["Diameter (OD)", pipeline.pipeOutsideDiameter], ["Diameter Unit", pipeline.diameterUnit], ["MAOP", pipeline.maopBar], ["Material", pipeline.pipeMaterial], ["Grade", pipeline.pipeGrade], ["Installation Date", pipeline.installationDate ?? pipeline.installationYear], ["Status", pipeline.status]]; segments.forEach((segment) => { required.push([`Segment ${segment.segmentId} ID`, segment.segmentId], [`Segment ${segment.segmentId} Pipeline`, segment.pipelineId], [`Segment ${segment.segmentId} From KP`, segment.startKp], [`Segment ${segment.segmentId} To KP`, segment.endKp]); }); assets.forEach((asset) => { required.push([`Asset ${asset.assetId} ID`, asset.assetId], [`Asset ${asset.assetId} Pipeline`, asset.pipelineId], [`Asset ${asset.assetId} Type`, asset.assetType], [`Asset ${asset.assetId} Status`, asset.physicalStatus]); }); const missingFields = required.filter(([, value]) => value === undefined || value === null || (typeof value === "string" && value.trim() === "")).map(([label]) => label); const percentage = required.length === 0 ? null : Math.round(((required.length - missingFields.length) / required.length) * 100); return { status: "calculated", percentage, missingFields, unsupportedFields }; }
