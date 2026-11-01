"use client";
import { drawSavedPipelineOverlay, PIPELINE_BLUE } from "@/lib/saved-pipeline-overlay";
import Link from "next/link";
import { ChainageDetails } from "@/components/chainage-details";
import { alignmentReadiness, chainageSummary, coordinateAtChainage, parseKp, projectToAlignment, tryKp } from "@/lib/chainage";
import { renderToStaticMarkup } from "react-dom/server";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Activity, AlertTriangle, BatteryCharging, Building2, Check, ChevronDown, ChevronUp, Copy, Crosshair, Diamond, Download, ExternalLink, FileText, GitFork, Globe2, Layers3, Map as MapIcon, MapPin, Maximize2, Minus, Navigation2, Plus, RefreshCw, Route, Scan, Search, ShieldCheck, TrainFront, Wifi, Wrench, X, Cog, type LucideIcon } from "lucide-react";
import { Panel } from "@/components/ui";
import { AssetIcon, AssetPhoto, assetTypeLabels, exportAssetRegister } from "@/components/asset-register-workspace";
import { loadLeaflet } from "@/components/segment-map-card";
import { fetchCpMonitoringData, fetchCpTestPoints, fetchDocuments, type DocumentRepositoryItem } from "@/lib/apiClient";
import { pipelineAlignment, segmentChainageLabel, savedAlignmentPosition } from "@/lib/map-chainage";
import { attachBasemap, GEOGRAPHIC_MAP_OPTIONS, UAE_VIEW } from "@/lib/map-provider";
import { savedMapEndpoints, savedMapRoute, savedMapCoordinate, savedSegmentMapRoute } from "@/lib/dashboard-map-data";
import { segmentKp } from "@/lib/segment-data";
import type { AssetMasterAssetRecord, AssetMasterSegmentRecord, GeoJsonLineString, PipelineRecord } from "@/lib/types";
type Asset = AssetMasterAssetRecord & { description?: string; pressureRating?: string; lastInspection?: string; nextInspection?: string };
type Basemap = "satellite" | "hybrid" | "terrain" | "street";
type Layer = "route" | "segments" | "stations" | "valves" | "rectifiers" | "testPosts" | "compressors" | "sensors" | "other" | "roads" | "cp";
type CpPoint = { assetId: string; code: string; latitude: number; longitude: number; status: string };
const maps: Record<Basemap, { label: string; service: string }> = { hybrid: { label: "Satellite + English labels", service: "World_Imagery" }, satellite: { label: "Satellite imagery", service: "World_Imagery" }, terrain: { label: "Terrain", service: "World_Topo_Map" }, street: { label: "Street Map", service: "World_Street_Map" } };
const tiles = (type: Basemap) => `https://server.arcgisonline.com/ArcGIS/rest/services/${maps[type].service}/MapServer/tile/{z}/{y}/{x}`;
const button = "inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slateblue-700 hover:bg-slateblue-50 disabled:cursor-not-allowed disabled:opacity-50";
const primaryButton = "inline-flex items-center justify-center gap-1.5 rounded-md bg-slateblue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-slateblue-700 disabled:opacity-50";
const kinds: Array<{ key: Layer; type: Asset["assetType"]; label: string; icon: LucideIcon; color: string }> = [
  { key: "stations", type: "STATION", label: "Stations", icon: Building2, color: "text-slateblue-600" },
  { key: "valves", type: "VALVE", label: "Valves", icon: GitFork, color: "text-emerald-600" },
  { key: "rectifiers", type: "RECTIFIER", label: "Rectifiers", icon: BatteryCharging, color: "text-amber-500" },
  { key: "testPosts", type: "TEST_POST", label: "Test Posts", icon: MapPin, color: "text-violet-600" },
  { key: "compressors", type: "COMPRESSOR", label: "Compressors", icon: Cog, color: "text-red-600" },
  { key: "sensors", type: "SENSOR", label: "Sensors", icon: Wifi, color: "text-slateblue-600" }
];
const category = (asset: Asset): Layer => kinds.find((kind) => kind.type === asset.assetType)?.key ?? "other";
const located = (asset: Asset) => savedMapCoordinate(asset.latitude, asset.longitude);
const coordinates = (geometry?: GeoJsonLineString): [number, number][] => savedMapRoute(geometry) ?? [];
const text = (value: unknown) => value === undefined || value === null || value === "" ? "Not recorded" : String(value);
const cpColor = (status: string) => /under|unprotected/i.test(status) ? "#dc2626" : /marginal|interference/i.test(status) ? "#d97706" : /protected/i.test(status) ? "#16a34a" : "#7c3aed";
export function PipelineMapWorkspace({ pipeline, segments: allSegments, assets: allAssets, initialSelectedAssetId, initialSelectedSegmentId = "", onSelectAsset, onOpenAssetRegister, onOpenHistory }: {
  pipeline: PipelineRecord | null; segments: AssetMasterSegmentRecord[]; assets: Asset[]; initialSelectedAssetId: string; initialSelectedSegmentId?: string;
  onSelectAsset: (id: string) => void; onOpenAssetRegister: (id: string) => void; onOpenHistory: () => void;
}) {
  const savedPipeline = pipeline;
  pipeline = useMemo(() => savedPipeline, [savedPipeline]);
  const segments = useMemo(() => allSegments.filter(item => item.pipelineId === pipeline?.id).map(segment => ({ ...segment, routeGeometry: savedSegmentMapRoute(segment) ? segment.routeGeometry : undefined })), [allSegments, pipeline?.id]);
  const assets = allAssets.filter(item => item.pipelineId === pipeline?.id);
  const alignment = pipelineAlignment(savedPipeline);
  const [selectedId, setSelectedId] = useState(() => initialSelectedAssetId || assets.find(located)?.id || "");
  const [highlightedSegmentId, setHighlightedSegmentId] = useState("");
  const [basemap, setBasemap] = useState<Basemap>("hybrid");
  const [layersOpen, setLayersOpen] = useState(true);
  const [layers, setLayers] = useState<Record<Layer, boolean>>({ route: true, segments: true, stations: true, valves: true, rectifiers: true, testPosts: true, compressors: true, sensors: true, other: true, roads: false, cp: false });
  const [query, setQuery] = useState(""), [searchOpen, setSearchOpen] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading"), [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState(""), [copied, setCopied] = useState(false);
  const [documents, setDocuments] = useState<DocumentRepositoryItem[]>([]), [documentsKnown, setDocumentsKnown] = useState(false);
  const [cpPoints, setCpPoints] = useState<CpPoint[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const mapElement = useRef<HTMLDivElement>(null), miniElement = useRef<HTMLDivElement>(null), mapPanel = useRef<HTMLElement>(null);
  const toolbarElement = useRef<HTMLDivElement>(null);
  const [controlsTop, setControlsTop] = useState(112), [footerHeight, setFooterHeight] = useState(64);
  const map = useRef<any>(null), mini = useRef<any>(null), tile = useRef<any>(null), miniTile = useRef<any>(null), roads = useRef<any>(null);
  const vectors = useRef<any[]>([]), miniRectangle = useRef<any>(null), fitOnce = useRef(false);
  const selected = assets.find((asset) => asset.id === selectedId) ?? null;
  const selectedSegment = segments.find((segment) => segment.id === selected?.segmentId || segment.segmentId === selected?.segmentId);
  const gpsAssets = assets.filter(located);
  const hasCompleteRoute = Boolean(savedMapRoute(pipeline?.routeGeometry, pipeline?.pipeLengthKm ?? NaN));
  const hasRoute = hasCompleteRoute;
  const endpointRoute = savedMapEndpoints(pipeline?.routeGeometry) ?? [];
  const hasDisplayRoute = endpointRoute.length >= 2;
  const hasSegments = segments.some((segment) => coordinates(segment.routeGeometry).length >= 2);
  const hasLocations = hasRoute || hasSegments || gpsAssets.length > 0;
  const normalizedQuery = query.trim().toLowerCase().replace(/^kp\s*/, "");
  const queryKp = tryKp(query);
  const assetMatches = normalizedQuery ? assets.filter((asset) => [asset.assetId, asset.name, asset.kp, asset.coordinates, `${asset.latitude ?? ""}, ${asset.longitude ?? ""}`].some((value) => String(value ?? "").toLowerCase().includes(normalizedQuery)) || (queryKp !== null && queryKp === tryKp(asset.kp))) : [];
  const segmentMatches = normalizedQuery ? segments.filter(segment => segment.segmentId.toLowerCase().includes(normalizedQuery) || (queryKp !== null && segmentKp(segment.startKp) !== null && segmentKp(segment.endKp) !== null && queryKp >= segmentKp(segment.startKp)! && queryKp <= segmentKp(segment.endKp)!)) : [];
  useEffect(() => { setSelectedId(initialSelectedAssetId || ""); setHighlightedSegmentId(""); setQuery(""); setNotice(""); }, [pipeline?.id, initialSelectedAssetId]);
  useEffect(() => {
    const toolbar = toolbarElement.current;
    if (!toolbar) return;
    const measure = () => setControlsTop(Math.ceil(toolbar.getBoundingClientRect().height) + 24);
    measure(); const observer = new ResizeObserver(measure); observer.observe(toolbar);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (state !== "ready") return;
    const attribution = mapElement.current?.querySelector<HTMLElement>(".leaflet-control-attribution");
    if (!attribution) return;
    const measure = () => setFooterHeight(Math.max(48, Math.ceil(attribution.getBoundingClientRect().height) + 8));
    measure(); const observer = new ResizeObserver(measure); observer.observe(attribution);
    return () => observer.disconnect();
  }, [state, basemap]);
  useEffect(() => {
    let active = true; setDocuments([]); setDocumentsKnown(false); setCopied(false);
    if (selectedId) void fetchDocuments({ assetId: selectedId, page: 1, pageSize: 100 }).then((result) => { if (active) { setDocuments(result.items); setDocumentsKnown(true); } }).catch(() => {});
    return () => { active = false; };
  }, [selectedId]);
  useEffect(() => {
    let active = true; setCpPoints([]);
    if (pipeline) void Promise.allSettled([fetchCpTestPoints(pipeline.id), fetchCpMonitoringData(pipeline.id)]).then(([links, monitoring]) => {
      if (!active || links.status !== "fulfilled" || monitoring.status !== "fulfilled") return;
      const points = links.value.flatMap((link) => {
        const asset = link.asset;
        const status = monitoring.value.testPoints.find((point) => point.id === link.cp.id)?.protectionStatus;
        return asset && asset.pipelineId === pipeline.id && located(asset) && status ? [{ assetId: asset.id, code: link.cp.code, latitude: asset.latitude!, longitude: asset.longitude!, status }] : [];
      }); setCpPoints(points);
    }); return () => { active = false; };
  }, [pipeline?.id]);
  useEffect(() => {
    if (!mapElement.current || !miniElement.current) return;
    let cancelled = false; let resize: ResizeObserver | undefined;
    setState("loading"); fitOnce.current = false;
    void loadLeaflet().then((L) => {
      if (cancelled || !mapElement.current || !miniElement.current) return;
      const nextMap = L.map(mapElement.current, { ...GEOGRAPHIC_MAP_OPTIONS, zoomControl: false, attributionControl: true, zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false }).setView(UAE_VIEW, 7);
      map.current = nextMap;
      if (cancelled) { nextMap.remove(); map.current = null; return; }
      L.control.scale({ imperial: false, position: "bottomleft" }).addTo(nextMap);
      // The overview is part of this map and uses the same imagery/label sources;
      // the main map's always-visible attribution covers both views.
      const nextMini = L.map(miniElement.current, { ...GEOGRAPHIC_MAP_OPTIONS, zoomControl: false, attributionControl: false, zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false }).setView(UAE_VIEW, 5);
      mini.current = nextMini;
      if (cancelled) { nextMap.remove(); nextMini.remove(); map.current = null; mini.current = null; return; }
      const sync = () => {
        if (cancelled || !map.current || !mini.current || !mapElement.current) return;
        mini.current.setView(map.current.getCenter(), Math.max(map.current.getZoom() - 4, 1)); miniRectangle.current?.remove();
        const color = getComputedStyle(mapElement.current!).getPropertyValue("--app-primary").trim() || "#0891b2";
        miniRectangle.current = L.rectangle(map.current.getBounds(), { color, weight: 2, fillOpacity: 0.08, interactive: false }).addTo(mini.current);
      }; nextMap.on("moveend", sync);
      resize = new ResizeObserver(() => { if (!cancelled) { nextMap.invalidateSize({ pan: false }); nextMini.invalidateSize({ pan: false }); } }); resize.observe(mapElement.current); setState("ready");
    }).catch(() => { if (!cancelled) setState("error"); });
    return () => {
      cancelled = true;
      resize?.disconnect();
      const previousMap = map.current, previousMini = mini.current;
      map.current = null; mini.current = null;
      vectors.current.forEach((layer) => { try { layer.remove(); } catch {} });
      vectors.current = [];
      miniRectangle.current = null;
      try { tile.current?.remove(); } catch {}
      try { miniTile.current?.remove(); } catch {}
      try { roads.current?.remove(); } catch {}
      tile.current = null; miniTile.current = null; roads.current = null;
      try { previousMap?.stop(); } catch {}
      try { previousMini?.stop?.(); } catch {}
      previousMap?.off("moveend");
      try { previousMap?.remove(); } catch {}
      try { previousMini?.remove(); } catch {}
    };
  }, [attempt, pipeline?.id]);
  useEffect(() => {
    if (state !== "ready" || !map.current || !mini.current) return;
    const L = (window as unknown as { L: any }).L;
    tile.current?.remove(); miniTile.current?.remove(); roads.current?.remove(); roads.current = null;
    tile.current = attachBasemap(map.current, L, basemap);
    miniTile.current = attachBasemap(mini.current, L, basemap);
    if (layers.roads) roads.current = L.tileLayer("https://services.arcgisonline.com/arcgis/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Esri, HERE, Garmin, OpenStreetMap contributors" }).addTo(map.current);
    return () => { tile.current?.remove(); miniTile.current?.remove(); roads.current?.remove(); };
  }, [state, basemap, layers.roads]);
  useEffect(() => {
    if (state !== "ready" || !map.current || !mapElement.current) return;
    const L = (window as unknown as { L: any }).L;
    const primary = PIPELINE_BLUE;
    vectors.current.forEach((layer) => layer.remove()); vectors.current = [];
    const bounds = L.latLngBounds([]);
    const add = (layer: any) => { layer.addTo(map.current); vectors.current.push(layer); return layer; };
    const label = (value: string) => { const element = document.createElement("span"); element.textContent = value; return element; };
    const draw = (geometry: GeoJsonLineString | undefined, color: string, weight: number, title: string, dashed = false, allowEndpointDisplay = false) => {
      const points = allowEndpointDisplay ? (savedMapEndpoints(geometry) ?? []) : coordinates(geometry); if (points.length < 2) return;
      const line = add(L.polyline(points, { color, weight, opacity: 0.95, dashArray: dashed ? "7 5" : undefined })).bindTooltip(label(title));
      if (!dashed && pipeline?.routeGeometry) line.on("click", (event: { latlng: { lng: number; lat: number } }) => {
        if (!alignment.ready) { setNotice(alignment.reason ?? "Verified GIS calibration is required."); return; }
        const projected = projectToAlignment(pipeline.routeGeometry!, [event.latlng.lng, event.latlng.lat], pipeline.chainageOriginMeters);
        setNotice(`Approximate CH ${projected.chainage}; ${projected.offset_m.toFixed(1)} m from saved route. No location data changed.`);
      });
      points.forEach((point) => bounds.extend(point));
    };
    if (layers.route) drawSavedPipelineOverlay(L, map.current, pipeline, add).forEach(point => bounds.extend(point));
    if (layers.route && alignment.ready && pipeline?.routeGeometry) {
      const length = Math.min(alignment.length_m ?? 0, (pipeline.pipeLengthKm ?? Infinity) * 1000);
      const interval = Math.max(1000, Math.ceil(length / 100000) * 1000);
      for (let m = 0; m <= length; m += interval) {
        const [lng, lat] = coordinateAtChainage(pipeline.routeGeometry, m + (pipeline.chainageOriginMeters ?? 0), pipeline.chainageOriginMeters);
        const station = parseKp(`${m + pipeline.chainageOriginMeters!} m`);
        add(L.circleMarker([lat, lng], { radius: 3, color: primary, fillOpacity: 1 })).bindTooltip(label(`CH ${station.chainage} · KP ${station.kilometers} (alignment estimate)`));
      }
    }
    if (layers.segments) segments.forEach((segment, segmentIndex) => {
      const points = coordinates(segment.routeGeometry); if (points.length < 2) return;
      draw(segment.routeGeometry, segment.id === (highlightedSegmentId || selectedSegment?.id) ? primary : "#fbbf24", segment.id === (highlightedSegmentId || selectedSegment?.id) ? 7 : 4, segmentChainageLabel(segment), true);
      const content = label(segment.segmentId); content.className = "rounded border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slateblue-700 shadow-sm";
      add(L.marker(points[Math.floor(points.length / 2)], { interactive: false, icon: L.divIcon({ className: "client-demo-segment-label", html: content.outerHTML, iconSize: [90, 24], iconAnchor: [45, segmentIndex % 2 ? 42 : 30] }) }));
      [points[0], points[points.length - 1]].forEach((point) => add(L.circleMarker(point, { radius: 5, color: primary, fillColor: "#ffffff", fillOpacity: 1, weight: 2 })));
    });
    gpsAssets.filter((asset) => layers[category(asset)]).forEach((asset) => {
      const kind = kinds.find((item) => item.type === asset.assetType);
      const color = asset.id === selectedId ? primary : asset.assetType === "VALVE" ? "#16a34a" : asset.assetType === "RECTIFIER" ? "#f59e0b" : asset.assetType === "TEST_POST" ? "#7c3aed" : asset.assetType === "COMPRESSOR" ? "#dc2626" : primary;
      const symbol = document.createElement("span");
      symbol.className = "flex h-7 w-7 items-center justify-center border-2 border-white text-xs font-bold text-white shadow-md";
      symbol.style.backgroundColor = color; symbol.style.borderRadius = asset.assetType === "STATION" ? "3px" : "50%";
      const Icon = kind?.icon ?? MapPin;
      symbol.innerHTML = renderToStaticMarkup(<Icon size={17} color="#ffffff" strokeWidth={2.5} />); symbol.setAttribute("aria-hidden", "true");
      const marker = add(L.marker([asset.latitude, asset.longitude], { title: asset.assetId, alt: `Select ${asset.assetId}`, keyboard: true, icon: L.divIcon({ className: "", html: symbol.outerHTML, iconSize: [28, 28], iconAnchor: [14, 14] }), zIndexOffset: asset.id === selectedId ? 1000 : 0 }));
      marker.bindTooltip(label(`${asset.assetId} · ${kind?.label ?? assetTypeLabels[asset.assetType]}${asset.kp ? ` · KP ${asset.kp}` : ""}`));
      marker.on("click", () => { setHighlightedSegmentId(""); setSelectedId(asset.id); onSelectAsset(asset.id); setNotice(""); }); bounds.extend([asset.latitude, asset.longitude]);
      if (asset.kp) { const kp = label(`KP ${asset.kp}`); kp.className = "rounded bg-white/90 px-1 text-xs font-semibold text-slate-800"; add(L.marker([asset.latitude, asset.longitude], { interactive: false, icon: L.divIcon({ className: "", html: kp.outerHTML, iconSize: [85, 20], iconAnchor: [42, -18] }) })); }
    });
    if (layers.cp) cpPoints.forEach((point) => { const halo = add(L.circleMarker([point.latitude, point.longitude], { radius: 18, color: cpColor(point.status), weight: 4, fillOpacity: 0.08 })); halo.bindTooltip(label(`${point.code}: ${point.status}`)); bounds.extend([point.latitude, point.longitude]); });
    if (!fitOnce.current && bounds.isValid()) { map.current.fitBounds(bounds, { padding: [72, 88], maxZoom: 14 }); fitOnce.current = true; }
  }, [state, pipeline, segments, assets, layers, selectedId, selectedSegment?.id, highlightedSegmentId, cpPoints, onSelectAsset]);
  useEffect(() => { const changed = () => setFullscreen(document.fullscreenElement === mapPanel.current); document.addEventListener("fullscreenchange", changed); return () => document.removeEventListener("fullscreenchange", changed); }, []);
  function fit(mode: "route" | "assets" | "selected") {
    if (!map.current || state !== "ready") return;
    const L = (window as unknown as { L: any }).L;
    if (mode === "selected") { if (selected && located(selected)) { setLayers((current) => ({ ...current, [category(selected)]: true })); map.current.flyTo([selected.latitude, selected.longitude], Math.max(map.current.getZoom(), 13)); setNotice(""); } else setNotice("The selected asset has no saved coordinates."); return; }
    const points = mode === "route" ? [...endpointRoute, ...segments.flatMap((segment) => coordinates(segment.routeGeometry))] : gpsAssets.map((asset) => [asset.latitude!, asset.longitude!] as [number, number]);
    if (points.length) { if (mode === "route") setLayers(current => ({ ...current, route: true, segments: true })); map.current.stop(); map.current.invalidateSize({ pan: false }); map.current.fitBounds(L.latLngBounds(points), { padding: [72, 88], maxZoom: 14, animate: false }); setNotice(""); }
    else setNotice(mode === "route" ? "GIS Route Data Required — no accepted pipeline or segment alignment is saved." : "No saved asset coordinates are available.");
  }
  function chooseAsset(asset: Asset) { setHighlightedSegmentId(""); setSelectedId(asset.id); onSelectAsset(asset.id); setLayers((current) => ({ ...current, [category(asset)]: true })); setSearchOpen(false); if (located(asset)) { map.current?.stop(); map.current?.flyTo([asset.latitude, asset.longitude], 13, { animate: false }); setNotice(""); } else setNotice(`${asset.assetId} has no saved map coordinates.`); }
  useEffect(() => { if (state !== "ready" || !initialSelectedSegmentId) return; const segment = segments.find(item => item.id === initialSelectedSegmentId || item.segmentId === initialSelectedSegmentId); if (segment) chooseSegment(segment); }, [state, pipeline?.id, initialSelectedSegmentId, segments]);
  function chooseSegment(segment: AssetMasterSegmentRecord) { setHighlightedSegmentId(segment.id); setSearchOpen(false); setLayers((current) => ({ ...current, segments: true })); const points = coordinates(segment.routeGeometry); if (points.length && map.current) { const L = (window as unknown as { L: any }).L; map.current.fitBounds(L.latLngBounds(points), { padding: [55, 65], maxZoom: 14 }); setNotice(""); } else setNotice(`${segment.segmentId}: KP ${text(segment.startKp)} – ${text(segment.endKp)}. No segment route coordinates saved.`); }
  function search() { if (!query.trim()) return;
    if (queryKp !== null && !assetMatches.length) {
      if (!alignment.ready || !pipeline?.routeGeometry) { setNotice(alignment.reason ?? "No saved pipeline alignment."); return; }
      try { const [lng, lat] = savedAlignmentPosition(pipeline, query); map.current?.flyTo([lat, lng], 14); setNotice(`CH ${parseKp(query).chainage} on saved alignment (approximate).`); setSearchOpen(false); } catch (error) { setNotice((error as Error).message); } return;
    } if (assetMatches.length) chooseAsset(assetMatches[0]); else if (segmentMatches.length) chooseSegment(segmentMatches[0]); else if ([pipeline?.pipelineCode, pipeline?.pipelineName].some((value) => value?.toLowerCase().includes(normalizedQuery))) { fit("route"); setSearchOpen(false); } else setNotice("No saved asset, segment or location matches this search."); }
  function downloadGeoJson() {
    const features: Array<Record<string, unknown>> = [];
    if (hasRoute && pipeline?.routeGeometry && layers.route) features.push({ type: "Feature", geometry: pipeline.routeGeometry, properties: { kind: "pipeline", pipelineId: pipeline.id, pipelineCode: pipeline.pipelineCode } });
    if (layers.segments) segments.filter((segment) => coordinates(segment.routeGeometry).length >= 2).forEach((segment) => features.push({ type: "Feature", geometry: segment.routeGeometry, properties: { kind: "segment", segmentId: segment.segmentId, startKp: segment.startKp, endKp: segment.endKp } }));
    gpsAssets.filter((asset) => layers[category(asset)]).forEach((asset) => features.push({ type: "Feature", geometry: { type: "Point", coordinates: [asset.longitude, asset.latitude] }, properties: { kind: "asset", assetId: asset.assetId, name: asset.name, assetType: asset.assetType, kp: asset.kp, status: asset.physicalStatus } }));
    if (layers.cp) cpPoints.forEach((point) => features.push({ type: "Feature", geometry: { type: "Point", coordinates: [point.longitude, point.latitude] }, properties: { kind: "cpStatus", code: point.code, status: point.status } }));
    const url = URL.createObjectURL(new Blob([JSON.stringify({ type: "FeatureCollection", features }, null, 2)], { type: "application/geo+json" })); const link = document.createElement("a"); link.href = url; link.download = `${pipeline?.pipelineCode ?? "pipeline"}-map.geojson`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function copyCoordinates() { if (!selected || !located(selected)) return; try { await navigator.clipboard.writeText(`${selected.latitude}, ${selected.longitude}`); setCopied(true); } catch { setNotice("Clipboard is unavailable. Select and copy the coordinates from the asset card."); } }
  function fullscreenMap() { if (document.fullscreenElement) void document.exitFullscreen(); else void mapPanel.current?.requestFullscreen().catch(() => setNotice("Fullscreen is not available in this browser.")); }
  const toggle = (key: Layer) => setLayers((current) => ({ ...current, [key]: !current[key] }));
  return <div className="grid min-w-0 items-start gap-3 text-xs lg:grid-cols-[180px_minmax(0,1fr)] xl:grid-cols-[185px_minmax(0,1fr)_310px] 2xl:grid-cols-[195px_minmax(0,1fr)_330px]" aria-label="Pipeline map workspace">
    <Panel className="min-w-0 !p-3 lg:sticky lg:top-3">
      <button type="button" onClick={() => setLayersOpen((open) => !open)} aria-expanded={layersOpen} className="mb-3 flex w-full items-center gap-2 text-left text-lg font-semibold text-slate-900"><Layers3 size={23} className="text-slateblue-600" />Map Layers{layersOpen ? <ChevronUp className="ml-auto" size={16} /> : <ChevronDown className="ml-auto" size={16} />}</button>
      {layersOpen ? <div className="space-y-1.5">
        <LayerControl label="Pipeline Route" icon={<Route size={20} />} checked={layers.route} onChange={() => toggle("route")} disabled={!hasDisplayRoute} reason={hasCompleteRoute ? "No pipeline route coordinates saved" : "Saved endpoints only; surveyed alignment required for a complete route"} />
        <LayerControl label="Segments" icon={<MapIcon size={20} />} checked={layers.segments} onChange={() => toggle("segments")} disabled={!hasSegments} reason="No segment route coordinates saved" />
        {kinds.map(({ key, label, icon: Icon, color }) => <LayerControl key={key} label={label} icon={<Icon size={20} className={color} />} checked={layers[key]} onChange={() => toggle(key)} count={gpsAssets.filter((asset) => category(asset) === key).length} />)}
        <LayerControl label="Other Assets" icon={<MapPin size={20} />} checked={layers.other} onChange={() => toggle("other")} count={gpsAssets.filter((asset) => category(asset) === "other").length} />
        <div className="my-2 border-t border-slate-100" />
        <LayerControl label="Roads" icon={<Minus size={20} className="text-slate-500" />} checked={layers.roads} onChange={() => toggle("roads")} />
        <LayerControl label="Rail" icon={<TrainFront size={20} className="text-slate-500" />} disabled reason="A separate railway layer is not available" />
        <LayerControl label="Defects" icon={<AlertTriangle size={20} className="text-red-600" />} disabled reason="No mapped defect locations available" />
        <LayerControl label="Risk" icon={<Diamond size={20} className="text-amber-500" />} disabled reason="No mapped risk locations available" />
        <LayerControl label="CP Status" icon={<Activity size={20} className="text-violet-600" />} checked={layers.cp} onChange={() => toggle("cp")} disabled={!cpPoints.length} reason="No linked CP readings with map coordinates available" />
        <fieldset className="space-y-2 border-t border-slate-100 pt-3"><legend className="sr-only">Base map</legend>{(Object.keys(maps) as Basemap[]).map((key) => <label key={key} className="flex cursor-pointer items-center gap-2 py-1 text-slate-700"><input type="radio" name="pipeline-basemap" value={key} checked={basemap === key} onChange={() => setBasemap(key)} className="accent-slateblue-600" /><span aria-hidden="true" className="flex h-7 w-8 items-center justify-center rounded border border-slate-200 bg-slate-50"><Globe2 size={19} className="text-slateblue-600" /></span>{key === "satellite" ? "Satellite Imagery" : maps[key].label}</label>)}</fieldset>
      </div> : null}
    </Panel>
    <section ref={mapPanel} className={`relative isolate min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 ${fullscreen ? "h-screen" : "h-[640px] lg:h-[690px]"}`} aria-label="Interactive pipeline map" data-pipeline-map-status={state}>
      <div ref={mapElement} className="absolute inset-0 z-0 font-[inherit] text-xs" aria-label="Saved pipeline route and asset locations" />
      <div ref={toolbarElement} className="absolute inset-x-3 top-3 z-[500] flex flex-wrap items-start gap-2">
        <form onSubmit={(event) => { event.preventDefault(); search(); }} className="relative min-w-[180px] flex-1"><div className="flex rounded-md border border-slate-300 bg-white shadow-sm"><button type="submit" aria-label="Search map" className="px-3 text-slateblue-700"><Search size={16} /></button><input aria-label="Search map by KP, asset, segment or location" placeholder="Search by KP, Asset ID, or location..." value={query} onChange={(event) => { setQuery(event.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} onKeyDown={(event) => { if (event.key === "Escape") setSearchOpen(false); }} className="min-w-0 flex-1 rounded-md bg-white py-2.5 pr-3 text-xs text-slate-800 outline-none" /><button type="button" aria-label="Clear map search" disabled={!query} onClick={() => { setQuery(""); setSearchOpen(false); setNotice(""); }} className="px-2 text-slate-400 disabled:opacity-30"><X size={14} /></button></div>
          {searchOpen && query.trim() ? <div className="absolute inset-x-0 top-full mt-1 max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-panel" role="listbox" aria-label="Map search results">{assetMatches.slice(0, 6).map((asset) => <button key={asset.id} type="button" role="option" aria-selected={asset.id === selectedId} onClick={() => chooseAsset(asset)} className="block w-full rounded px-3 py-2 text-left text-xs text-slate-700 hover:bg-slateblue-50"><strong>{asset.assetId}</strong> · {asset.name ?? assetTypeLabels[asset.assetType]}{asset.kp ? ` · KP ${asset.kp}` : ""}</button>)}{segmentMatches.slice(0, 4).map((segment) => <button key={segment.id} type="button" role="option" aria-selected={false} onClick={() => chooseSegment(segment)} className="block w-full rounded px-3 py-2 text-left text-xs text-slate-700 hover:bg-slateblue-50"><strong>{segment.segmentId}</strong> · KP {text(segment.startKp)} – {text(segment.endKp)}</button>)}{!assetMatches.length && !segmentMatches.length ? <p className="px-3 py-2 text-slate-500">No matching saved locations.</p> : null}</div> : null}
        </form>
        <div className="flex rounded-md bg-white shadow-sm"><button type="button" onClick={() => fit("route")} disabled={state !== "ready" || (!hasDisplayRoute && !hasSegments)} className={button}><Scan size={16} />Fit to Route</button><details className="relative"><summary aria-label="More map fitting options" className={`${button} cursor-pointer list-none px-1.5`}><ChevronDown size={15} /></summary><div className="absolute right-0 mt-1 min-w-40 rounded-md border border-slate-200 bg-white p-1 shadow-panel" onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); }}><button type="button" disabled={!gpsAssets.length || state !== "ready"} onClick={() => fit("assets")} className="block w-full px-3 py-2 text-left disabled:opacity-50">Fit all assets</button><button type="button" disabled={!selected || !located(selected) || state !== "ready"} onClick={() => fit("selected")} className="block w-full px-3 py-2 text-left disabled:opacity-50">Fit selected asset</button></div></details></div>
        <label className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 shadow-sm"><Globe2 size={16} className="text-slateblue-600" /><select aria-label="Map basemap" value={basemap} onChange={(event) => setBasemap(event.target.value as Basemap)} className="min-w-0 bg-white py-2.5 text-xs font-semibold text-slateblue-700">{(Object.keys(maps) as Basemap[]).map((key) => <option value={key} key={key}>{maps[key].label}</option>)}</select></label>
        <details className="relative"><summary aria-label="Export map" className={`${button} cursor-pointer list-none shadow-sm`}><Download size={16} />Export<ChevronDown size={14} /></summary><div className="absolute right-0 mt-1 min-w-44 rounded-md border border-slate-200 bg-white p-1 shadow-panel" onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); }}><button type="button" onClick={downloadGeoJson} className="block w-full rounded px-3 py-2 text-left hover:bg-slate-50">Export visible GeoJSON</button><button type="button" disabled={!assets.length} onClick={() => exportAssetRegister(assets)} className="block w-full rounded px-3 py-2 text-left hover:bg-slate-50 disabled:opacity-50">Export assets CSV</button></div></details>
      </div>
      <div style={{ top: controlsTop }} className="absolute left-3 z-[400] flex flex-col gap-1"><button type="button" aria-label="Zoom in" onClick={() => map.current?.zoomIn()} disabled={state !== "ready"} className={`${button} !p-2 shadow-sm`}><Plus size={18} /></button><button type="button" aria-label="Zoom out" onClick={() => map.current?.zoomOut()} disabled={state !== "ready"} className={`${button} !p-2 shadow-sm`}><Minus size={18} /></button><button type="button" aria-label="Center selected asset" disabled={!selected || !located(selected) || state !== "ready"} onClick={() => fit("selected")} className={`${button} !p-2 shadow-sm`}><Crosshair size={18} /></button><button type="button" aria-label={fullscreen ? "Exit fullscreen map" : "Fullscreen map"} onClick={fullscreenMap} className={`${button} !p-2 shadow-sm`}><Maximize2 size={17} /></button></div>
      <div style={{ top: controlsTop }} className="pointer-events-none absolute right-4 z-[400] text-center text-slate-900" aria-label="North"><strong>N</strong><Navigation2 size={27} className="fill-current" /></div>
      <div style={{ bottom: footerHeight + 12 }} className="pointer-events-none absolute right-3 z-[400] hidden h-[105px] w-[140px] overflow-hidden rounded-md border-2 border-white bg-slate-50 shadow-md sm:block"><div ref={miniElement} className="h-full w-full" role="region" aria-label="Map overview" /></div>
      {state === "loading" ? <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-slate-50/70 text-slate-600">Loading map...</div> : null}
      {state === "error" ? <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-50 text-slate-600"><MapPin size={36} className="text-slateblue-600" /><p>Map could not be loaded.</p><button type="button" onClick={() => setAttempt((value) => value + 1)} className={button}><RefreshCw size={15} />Retry map</button></div> : null}
      {state === "ready" && (!hasCompleteRoute || !hasDisplayRoute) ? <div style={{ bottom: footerHeight + 12 }} role="status" className="pointer-events-none absolute left-3 right-3 z-[400] rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-600 sm:right-[166px]">{hasDisplayRoute && !hasCompleteRoute ? `Incomplete Route ? Saved endpoint pair displayed — ${pipeline?.pipeLengthKm ?? "Configured"} km configured — GIS Route Data Required for complete surveyed alignment — ${pipeline?.pipelineCode}: ${pipeline?.pipelineName}` : `GIS Route Data Required — ${pipeline?.pipelineCode}: ${pipeline?.pipelineName}`}</div> : null}
      {state === "ready" && !alignment.ready ? <p style={{ bottom: footerHeight + 60 }} className="absolute left-3 right-3 z-[400] rounded-md border border-amber-200 bg-white px-3 py-2 text-xs text-slate-700" role="status">Chainage markers: BLOCKED - {alignment.reason}</p> : null}
      {notice ? <div style={{ bottom: footerHeight + 12 }} role="status" className="absolute left-3 right-3 z-[450] flex items-start gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-700 shadow-sm"><span className="flex-1">{notice}</span><button type="button" aria-label="Dismiss map message" onClick={() => setNotice("")}><X size={14} /></button></div> : null}
    </section>
    <Panel className="min-w-0 !p-3 lg:col-span-2 xl:col-span-1">
      <div className="mb-3 flex items-center gap-2"><MapPin size={22} className="text-slateblue-600" /><h2 className="text-lg font-semibold text-slate-900">Selected Asset</h2>{selected ? <button type="button" aria-label="Close selected asset" onClick={() => { setSelectedId(""); onSelectAsset(""); }} className="ml-auto text-slateblue-700"><X size={17} /></button> : null}</div>
      {selected ? <>
        <div className="mb-3 grid grid-cols-[96px_minmax(0,1fr)] gap-3"><AssetPhoto key={selected.id} asset={selected} documents={documents} compact /><div className="min-w-0"><div className="mb-2 flex flex-wrap items-center gap-2"><h3 className="break-all text-lg font-semibold text-slate-900">{selected.assetId}</h3><Status value={selected.physicalStatus} /></div><dl className="space-y-2"><Field label="Type"><span className="inline-flex items-center gap-1"><AssetIcon asset={selected} size={15} />{assetTypeLabels[selected.assetType]}</span></Field><Field label="Segment">{text(selectedSegment?.segmentId)}</Field><Field label="KP Location">{selected.kp ? `KP ${selected.kp}` : "Not recorded"}</Field><Field label="Name">{text(selected.name)}</Field><Field label="Description">{text(selected.description)}</Field></dl></div></div>
        <dl className="space-y-2 border-y border-slate-100 py-3"><Field label="Pipeline">{pipeline?.pipelineCode ?? "Not recorded"}</Field><Field label="Coordinates"><span className="inline-flex flex-wrap items-center gap-1">{located(selected) ? `${selected.latitude}, ${selected.longitude}` : "Not recorded"}{located(selected) ? <button type="button" aria-label="Copy asset coordinates" title={copied ? "Copied" : "Copy coordinates"} onClick={() => { void copyCoordinates(); }} className="text-slateblue-600">{copied ? <Check size={16} /> : <Copy size={16} />}</button> : null}</span></Field><Field label="Installation Date">{text(selected.installationDate?.slice(0, 10))}</Field><Field label="Manufacturer">{text(selected.manufacturer)}</Field><Field label="Model">{text(selected.model)}</Field><Field label="Pressure Rating">{text(selected.pressureRating)}</Field><Field label="Status"><Status value={selected.physicalStatus} /></Field><Field label="Last Inspection">{text(selected.lastInspection)}</Field><Field label="Next Inspection">{text(selected.nextInspection)}</Field></dl>
        <ChainageDetails key={selected.id} asset={selected} assets={assets} pipeline={pipeline} />
        <h3 className="mb-2 mt-3 font-semibold text-slate-900">Linked Records</h3><div className="space-y-2 text-slateblue-700"><button type="button" onClick={onOpenHistory} className="flex items-center gap-2 text-left"><ShieldCheck size={16} />Inspection History <span className="text-slate-500">(pipeline)</span></button><button type="button" disabled title="No linked maintenance records available" className="flex items-center gap-2 opacity-50"><Wrench size={16} />Maintenance Records</button><Link href={`/document-upload?assetId=${encodeURIComponent(selected.id)}`} className="flex items-center gap-2"><FileText size={16} />Associated Documents{documentsKnown ? ` (${documents.length})` : ""}</Link><Link href={`/defect-manager?pipelineId=${encodeURIComponent(selected.pipelineId)}&assetId=${encodeURIComponent(selected.id)}`} className="flex items-center gap-2"><AlertTriangle size={16} />Related Defects</Link><Link href={`/risk-assessment?pipelineId=${encodeURIComponent(selected.pipelineId)}`} className="flex items-center gap-2"><Diamond size={16} />Related Risks</Link></div>
        <div className="mt-4 grid grid-cols-2 gap-2"><Link href={`/asset-master/assets/${encodeURIComponent(selected.id)}`} className={primaryButton}>View Full Details</Link><button type="button" onClick={() => onOpenAssetRegister(selected.id)} className={`${button} px-2`}>Open in Asset Register <ExternalLink size={13} /></button></div>
      </> : <div className="py-6 text-center text-slate-500"><MapPin size={32} className="mx-auto mb-3 text-slateblue-600" /><p>Select an asset marker or search the map.</p>{assets.length ? <div className="mt-4 flex flex-col gap-2">{assets.slice(0, 5).map((asset) => <button key={asset.id} type="button" onClick={() => chooseAsset(asset)} className="rounded-md border border-slate-200 px-3 py-2 text-left text-slateblue-700">{asset.assetId} · {asset.name ?? assetTypeLabels[asset.assetType]}</button>)}</div> : null}</div>}
    </Panel>
  </div>;
}
function LayerControl({ label, icon, checked = false, onChange, disabled = false, reason, count }: { label: string; icon: ReactNode; checked?: boolean; onChange?: () => void; disabled?: boolean; reason?: string; count?: number }) { return <label title={disabled ? reason : undefined} className={`flex items-center gap-2 rounded py-1.5 text-xs text-slate-700 ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-slate-50"}`}><input type="checkbox" aria-label={`Map layer ${label}`} checked={!disabled && checked} onChange={onChange} disabled={disabled} className="accent-slateblue-600" /><span aria-hidden="true" className="shrink-0 text-slateblue-600">{icon}</span><span className="flex-1">{label}</span>{count !== undefined ? <span className="text-slate-400">{count}</span> : null}</label>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <div className="grid grid-cols-[minmax(65px,0.8fr)_minmax(0,1.2fr)] gap-2 text-xs"><dt className="text-slate-500">{label}</dt><dd className="break-words text-slate-800">{children}</dd></div>; }
function Status({ value }: { value: string }) { return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${value === "Active" ? "bg-emerald-100 text-emerald-700" : value === "Maintenance" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{value}</span>; }
