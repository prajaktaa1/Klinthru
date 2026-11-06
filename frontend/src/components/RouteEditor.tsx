"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Edit3, FileUp, MousePointer2, Redo2, RefreshCw, RotateCcw, Trash2, Undo2 } from "lucide-react";

import { distanceKm, parseLineStringForDisplay, readImportedRoute, validCoordinate, type Coordinate } from "@/lib/gis-route";
import { attachBasemap, GEOGRAPHIC_MAP_OPTIONS, searchUaeLocation, UAE_VIEW, type MapBasemap } from "@/lib/map-provider";
import { loadLeaflet } from "@/components/segment-map-card";
import { fetchProposedPipelineRoute, removeProposedPipelineRoute, saveProposedPipelineRoute } from "@/lib/apiClient";
type LineString = { type: "LineString"; coordinates: Coordinate[] };

type RouteEditorProps = {
  value: string;
  pipelineName?: string;
  onChange: (value: string) => void;
  onPointCountChange?: (count: number) => void;
  mode?: "verified" | "proposed";
  onReload?: () => void;
  reloadDisabled?: boolean;
};

type LocationSlot = { name: string; latitude: string; longitude: string };
function toLineString(points: Coordinate[]): LineString { return { type: "LineString", coordinates: points }; }

export function RouteEditor({ value, pipelineName, onChange, onPointCountChange, mode = "verified", onReload, reloadDisabled }: RouteEditorProps) {
  const [points, setPoints] = useState<Coordinate[]>(() => { try { return parseLineStringForDisplay(value); } catch { return []; } });
  const [history, setHistory] = useState<Coordinate[][]>([]);
  const [future, setFuture] = useState<Coordinate[][]>([]);
  const [error, setError] = useState<string | null>(null);
  const [surveyConfirmed, setSurveyConfirmed] = useState(false);
  const [importing, setImporting] = useState(false);
  const [startLocation, setStartLocation] = useState<LocationSlot>({ name: "", latitude: "", longitude: "" });
  const [endLocation, setEndLocation] = useState<LocationSlot>({ name: "", latitude: "", longitude: "" });
  const [locationsOpen, setLocationsOpen] = useState(false);
  const [searching, setSearching] = useState<"start" | "end" | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [basemap, setBasemap] = useState<MapBasemap>("hybrid");
  const [provider, setProvider] = useState("");
  const [activeTool, setActiveTool] = useState<"draw" | "edit">("draw");
  const mapElement = useRef<HTMLDivElement>(null); const mapInstance = useRef<any>(null); const layerGroup = useRef<any>(null);
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value === lastEmitted.current) return;
    try { setPoints(parseLineStringForDisplay(value)); setHistory([]); setFuture([]); setError(null); lastEmitted.current = value; } catch { setError("Saved route data is not valid GeoJSON; correct it or clear it before saving."); }
  }, [value]);

  useEffect(() => { onPointCountChange?.(points.length); }, [onPointCountChange, points.length]);

  useEffect(() => {
    const first = points[0];
    const last = points.at(-1);
    setStartLocation((current) => current.latitude || current.longitude ? current : {
      ...current,
      latitude: first ? String(first[1]) : "",
      longitude: first ? String(first[0]) : ""
    });
    setEndLocation((current) => current.latitude || current.longitude ? current : {
      ...current,
      latitude: last ? String(last[1]) : "",
      longitude: last ? String(last[0]) : ""
    });
  }, [points]);

  function commit(next: Coordinate[], remember = true) {
    if (mode === "verified" && !surveyConfirmed) { setError("GIS Route Data Required: confirm that the points represent the surveyed alignment before editing or importing."); return; }
    if (!next.every(validCoordinate)) { setError("Invalid WGS84 coordinates. No route changes were applied."); return; }
    if (remember) setHistory((current) => [...current.slice(-39), points]);
    setFuture([]); setPoints(next); const serialized = next.length >= (mode === "proposed" ? 2 : 3) ? JSON.stringify(toLineString(next)) : ""; lastEmitted.current = serialized; onChange(serialized); setError(null);
  }
  function insertMapPoint(longitude: number, latitude: number) {
    if (points.length < 2 || !mapInstance.current) { commit([...points, [longitude, latitude]]); return; }
    const click = mapInstance.current.latLngToLayerPoint([latitude, longitude]);
    let bestSegment = 0; let bestDistance = Number.POSITIVE_INFINITY;
    points.slice(0, -1).forEach(([fromLongitude, fromLatitude], index) => {
      const from = mapInstance.current.latLngToLayerPoint([fromLatitude, fromLongitude]);
      const [toLongitude, toLatitude] = points[index + 1];
      const to = mapInstance.current.latLngToLayerPoint([toLatitude, toLongitude]);
      const dx = to.x - from.x; const dy = to.y - from.y; const lengthSquared = dx * dx + dy * dy;
      const ratio = lengthSquared ? Math.max(0, Math.min(1, ((click.x - from.x) * dx + (click.y - from.y) * dy) / lengthSquared)) : 0;
      const projectedX = from.x + ratio * dx; const projectedY = from.y + ratio * dy;
      const distance = (click.x - projectedX) ** 2 + (click.y - projectedY) ** 2;
      if (distance < bestDistance) { bestDistance = distance; bestSegment = index; }
    });
    const next = [...points.slice(0, bestSegment + 1), [longitude, latitude] as Coordinate, ...points.slice(bestSegment + 1)];
    commit(next);
  }
  function updatePoint(index: number, axis: 0 | 1, raw: string) { const number = Number(raw); const next = points.map((point) => [...point] as Coordinate); next[index][axis] = number; commit(next); }
  function restore(next: Coordinate[]) { setPoints(next); const serialized = next.length >= (mode === "proposed" ? 2 : 3) ? JSON.stringify(toLineString(next)) : ""; lastEmitted.current = serialized; onChange(serialized); setError(null); }
  function undo() { const previous = history.at(-1); if (!previous) return; setFuture((current) => [points, ...current]); setHistory((current) => current.slice(0, -1)); restore(previous); }
  function redo() { const next = future[0]; if (!next) return; setHistory((current) => [...current, points]); setFuture((current) => current.slice(1)); restore(next); }
  async function importFile(event: ChangeEvent<HTMLInputElement>) { event.preventDefault(); event.stopPropagation(); const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; setImporting(true); try { const imported = await readImportedRoute(file, { minimumPoints: mode === "proposed" ? 2 : 3 }); commit(imported); } catch (caught) { setError(caught instanceof Error ? caught.message : "Route file could not be imported."); } finally { setImporting(false); } }
  function updateLocation(slot: "start" | "end", field: keyof LocationSlot, value: string) { const update = slot === "start" ? setStartLocation : setEndLocation; update((current) => ({ ...current, [field]: value })); }
  async function searchLocation(slot: "start" | "end") {
    const location = slot === "start" ? startLocation : endLocation;
    if (!location.name.trim()) { setError(`Enter a ${slot} location name before searching.`); return; }
    setSearching(slot); setError(null);
    try {
      const next = await searchUaeLocation(location.name.trim());
      // Place search changes the viewport only. A geocoded place is not pipeline survey data.
      if (mapInstance.current) mapInstance.current.setView([Number(next.latitude), Number(next.longitude)], 12);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Location search failed."); } finally { setSearching(null); }
  }
  function addLocationPoint(slot: "start" | "end") { const location = slot === "start" ? startLocation : endLocation; const latitude = Number(location.latitude); const longitude = Number(location.longitude); if (!location.latitude.trim() || !location.longitude.trim() || !validCoordinate([longitude, latitude])) { setError(`${slot === "start" ? "Start" : "End"} location needs valid latitude and longitude.`); return; } if (points.some(([existingLongitude, existingLatitude]) => existingLongitude === longitude && existingLatitude === latitude)) { setError(`${slot === "start" ? "Start" : "End"} location is already a route point. Choose a distinct verified location.`); return; } const next = [...points]; if (slot === "start") next.unshift([longitude, latitude]); else next.push([longitude, latitude]); commit(next); }

  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;
    const base = attachBasemap(mapInstance.current, (window as any).L, basemap, setProvider);
    return () => base.remove();
  }, [mapReady, basemap]);
  useEffect(() => () => { mapInstance.current?.remove(); mapInstance.current = null; }, []);

  useEffect(() => {
    if (!mapElement.current) return;
    let cancelled = false;
    const load = loadLeaflet();
    void load.then(() => { if (cancelled || !mapElement.current) return; const L = (window as any).L; if (!mapInstance.current) { mapInstance.current = L.map(mapElement.current, GEOGRAPHIC_MAP_OPTIONS).setView(points[0] ? [points[0][1], points[0][0]] : UAE_VIEW, points.length ? 8 : 7);  setMapReady(true); }
      if (layerGroup.current) layerGroup.current.remove(); layerGroup.current = L.layerGroup().addTo(mapInstance.current); const latLngs = points.map(([longitude, latitude]) => [latitude, longitude]); if (points.length >= 2) L.polyline(latLngs, { color: "#2563eb", weight: 4 }).addTo(layerGroup.current); points.forEach((point, index) => { const marker = L.marker([point[1], point[0]], { draggable: activeTool === "edit" }).addTo(layerGroup.current).bindTooltip(`Point ${index + 1}`); marker.on("dragend", (event: any) => { const position = event.target.getLatLng(); const next = points.map((item) => [...item] as Coordinate); next[index] = [position.lng, position.lat]; commit(next); }); }); ([{ label: "Start", location: startLocation, color: "#16a34a" }, { label: "End", location: endLocation, color: "#dc2626" }] as const).forEach(({ label, location, color }) => { const latitude = Number(location.latitude); const longitude = Number(location.longitude); if (location.latitude.trim() && location.longitude.trim() && validCoordinate([longitude, latitude])) L.circleMarker([latitude, longitude], { radius: 8, color, fillColor: color, fillOpacity: 0.9 }).addTo(layerGroup.current).bindTooltip(`${label}${location.name ? `: ${location.name}` : ""}`); }); mapInstance.current.off("click"); mapInstance.current.on("click", (event: any) => { if (activeTool === "draw") insertMapPoint(event.latlng.lng, event.latlng.lat); }); if (points.length >= 2) mapInstance.current.fitBounds(L.latLngBounds(latLngs), { padding: [20, 20] }); mapInstance.current.invalidateSize({ pan: false }); window.requestAnimationFrame(() => { if (!cancelled && mapInstance.current) { mapInstance.current.invalidateSize({ pan: false }); if (points.length >= 2) mapInstance.current.fitBounds(L.latLngBounds(latLngs), { padding: [20, 20] }); } });
    }).catch(() => setError("Map preview could not load. GPS point editing remains available below."));
    return () => { cancelled = true; };
  }, [points, startLocation, endLocation, surveyConfirmed, activeTool]);

  useEffect(() => {
    if (!mapReady || !mapElement.current || !mapInstance.current) return;
    const element = mapElement.current;
    const map = mapInstance.current;
    const invalidate = () => map.invalidateSize({ pan: false });
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(invalidate);
    observer?.observe(element);
    invalidate();
    const frame = window.requestAnimationFrame(invalidate);
    return () => { observer?.disconnect(); window.cancelAnimationFrame(frame); };
  }, [mapReady, points.length, activeTool]);

  const distance = useMemo(() => { try { return distanceKm(points); } catch { return 0; } }, [points]);
  const proposed = mode === "proposed";
  const minimumPoints = proposed ? 2 : 3;
  const locations = <div className="grid gap-2 p-2 sm:grid-cols-2"><LocationFields label="Start location" location={startLocation} searching={searching === "start"} onChange={(field, next) => updateLocation("start", field, next)} onSearch={() => { void searchLocation("start"); }} onAdd={() => addLocationPoint("start")} /><LocationFields label="End location" location={endLocation} searching={searching === "end"} onChange={(field, next) => updateLocation("end", field, next)} onSearch={() => { void searchLocation("end"); }} onAdd={() => addLocationPoint("end")} /></div>;
  return <div className={`min-w-0 ${proposed ? "" : "sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4"}`}>
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1.5"><div className="flex items-center gap-1"><button type="button" onClick={() => setActiveTool("draw")} aria-pressed={activeTool === "draw"} className={`inline-flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-semibold ${activeTool === "draw" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-white"}`}><MousePointer2 size={14} />Draw</button><button type="button" onClick={() => setActiveTool("edit")} aria-pressed={activeTool === "edit"} className={`inline-flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-semibold ${activeTool === "edit" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-white"}`}><Edit3 size={14} />Edit</button><label onClick={(event) => event.stopPropagation()} className="inline-flex cursor-pointer items-center gap-1 rounded px-2.5 py-1.5 text-xs font-semibold text-slateblue-700 hover:bg-white"><FileUp size={14} />{importing ? "Importing" : "Import"}<input type="file" accept=".geojson,.json,.kml,.kmz,.csv,application/geo+json" onClick={(event) => event.stopPropagation()} onChange={(event) => { void importFile(event); }} className="hidden" /></label><button type="button" onClick={undo} disabled={!history.length} title="Undo" className="rounded p-1.5 text-slate-700 hover:bg-white disabled:opacity-30"><Undo2 size={15} /></button><button type="button" onClick={redo} disabled={!future.length} title="Redo" className="rounded p-1.5 text-slate-700 hover:bg-white disabled:opacity-30"><Redo2 size={15} /></button><button type="button" onClick={onReload} disabled={!onReload || reloadDisabled} title="Reload saved route" className="inline-flex items-center gap-1 rounded px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white disabled:opacity-30"><RefreshCw size={14} />Reload</button></div><div className="flex items-center gap-2 text-xs text-slate-500"><label>Imagery <select aria-label="Route editor basemap" value={basemap} onChange={(event) => setBasemap(event.target.value as MapBasemap)} className="ml-1 rounded border border-slate-300 bg-white px-1.5 py-1"><option value="hybrid">Hybrid</option><option value="satellite">Satellite</option><option value="street">Street</option></select></label><span className="hidden md:inline">{provider}</span></div></div>
    {!proposed ? <label className="mt-3 flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={surveyConfirmed} onChange={event => setSurveyConfirmed(event.target.checked)} />I confirm these are surveyed GIS points.</label> : <p className="mt-2 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs text-orange-900">Visual planning route only. It cannot be used for surveyed GIS approval or chainage calibration.</p>}
    {proposed ? <div className="mt-2 rounded-md border border-slate-200 bg-white"><button type="button" aria-expanded={locationsOpen} onClick={() => setLocationsOpen((open) => !open)} className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold text-slate-700">Start / End locations <span aria-hidden="true">{locationsOpen ? "−" : "+"}</span></button>{locationsOpen ? locations : null}</div> : locations}
    <div className="mt-2 grid min-w-0 gap-2 lg:grid-cols-[minmax(0,1fr)_250px]"><div ref={mapElement} className="h-[55vh] min-h-[360px] min-w-0 rounded-lg border border-slate-200 bg-white lg:h-[min(62vh,620px)] lg:min-h-[500px]" aria-label="Route editor map preview" /><aside className="flex min-h-0 min-w-0 flex-col rounded-lg border border-slate-200 bg-white p-2"><div className="flex items-center justify-between gap-2"><div><span className="text-xs font-semibold text-slate-800">Route points</span><span className="ml-1 text-[10px] text-slate-500">{points.length} · {distance.toFixed(1)} km</span></div><button type="button" onClick={() => commit([])} title="Clear route" className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button></div><div className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 lg:max-h-[min(62vh,620px)]">{points.map((point, index) => <div key={`${index}-${point.join("-")}`} className="rounded border border-slate-100 p-1.5 text-[10px]"><div className="mb-1 flex items-center justify-between font-semibold text-slate-600"><span>{index + 1}{index === 0 ? " Start" : index === points.length - 1 ? " End" : ""}</span><span className="font-normal text-slate-400">Lng / Lat</span></div><div className="grid grid-cols-2 gap-1"><input aria-label={`Point ${index + 1} longitude`} value={point[0]} onChange={(event) => updatePoint(index, 0, event.target.value)} className="min-w-0 rounded border border-slate-200 px-1.5 py-1" /><input aria-label={`Point ${index + 1} latitude`} value={point[1]} onChange={(event) => updatePoint(index, 1, event.target.value)} className="min-w-0 rounded border border-slate-200 px-1.5 py-1" /></div></div>)}{!points.length ? <p className="py-5 text-center text-xs text-slate-500">Use Draw or Import to add points.</p> : null}</div><div className="mt-2 border-t pt-2 text-[11px]">{points.length < minimumPoints ? <span className="text-amber-700">{minimumPoints - points.length} more point{minimumPoints - points.length === 1 ? "" : "s"} needed</span> : <span className="text-emerald-700">LineString ready</span>}{points.length >= minimumPoints ? <button type="button" onClick={() => { const L = (window as any).L; if (L && mapInstance.current) mapInstance.current.fitBounds(L.latLngBounds(points.map(([lon, lat]) => [lat, lon])), { padding: [20, 20] }); }} className="float-right inline-flex items-center gap-1 font-semibold text-slateblue-700"><RotateCcw size={13} />Fit</button> : null}</div></aside></div>{error ? <p role="alert" className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">{error}</p> : null}
  </div>;
}

function LocationFields({ label, location, searching, onChange, onSearch, onAdd }: { label: string; location: LocationSlot; searching: boolean; onChange: (field: keyof LocationSlot, value: string) => void; onSearch: () => void; onAdd: () => void }) {
  return <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><div className="mt-2 flex gap-2"><input value={location.name} onChange={(event) => onChange("name", event.target.value)} aria-label={`${label} UAE search`} placeholder="Search UAE place or facility" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" /><button type="button" onClick={onSearch} disabled={searching} className="rounded-lg border border-slateblue-300 px-3 py-2 text-xs font-semibold text-slateblue-700 disabled:opacity-50">{searching ? "Searching..." : "Find"}</button></div><div className="mt-2 grid grid-cols-2 gap-2"><label className="text-xs">Latitude<input aria-label={`${label} latitude`} value={location.latitude} onChange={(event) => onChange("latitude", event.target.value)} inputMode="decimal" className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="text-xs">Longitude<input aria-label={`${label} longitude`} value={location.longitude} onChange={(event) => onChange("longitude", event.target.value)} inputMode="decimal" className="mt-1 w-full rounded border border-slate-300 p-2" /></label></div><button type="button" onClick={onAdd} disabled={!location.latitude.trim() || !location.longitude.trim() || !validCoordinate([Number(location.longitude), Number(location.latitude)])} className="mt-2 text-xs font-semibold text-slateblue-700 underline disabled:cursor-not-allowed disabled:opacity-50">Use as route {label.startsWith("Start") ? "start" : "end"} point</button></div>;
}

export function ProposedRouteEditor({ pipelineId, pipelineName, onSaved, onCancel }: { pipelineId: string; pipelineName: string; onSaved?: () => void; onCancel?: () => void }) {
  const draftKey = `klinthru:proposed-route-draft:${pipelineId}`;
  const [value, setValue] = useState(""); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [removing, setRemoving] = useState(false); const [hasSavedRoute, setHasSavedRoute] = useState(false); const [message, setMessage] = useState(""); const [draftLoaded, setDraftLoaded] = useState(false);
  function clearDraft() { try { window.sessionStorage.removeItem(draftKey); } catch { /* Draft persistence is best effort. */ } }
  function readDraft() { try { const draft = window.sessionStorage.getItem(draftKey); if (!draft) return null; parseLineStringForDisplay(draft); return draft; } catch { clearDraft(); return null; } }
  const reload = async (preserveDraft = true) => { setLoading(true); try { const route = await fetchProposedPipelineRoute(pipelineId); const saved = route ? JSON.stringify(route.geometry) : ""; const draft = preserveDraft ? readDraft() : null; if (!preserveDraft) clearDraft(); setValue(draft ?? saved); setHasSavedRoute(Boolean(route)); setMessage(draft ? "Restored unsaved route draft. Save when ready." : route ? "Reloaded proposed route." : "No proposed route saved."); } catch { setMessage("Could not reload the proposed route."); } finally { setDraftLoaded(true); setLoading(false); } };
  useEffect(() => { setDraftLoaded(false); void reload(true); }, [pipelineId]);
  useEffect(() => { if (!draftLoaded) return; try { if (value) window.sessionStorage.setItem(draftKey, value); else clearDraft(); } catch { /* Draft persistence is best effort. */ } }, [draftKey, draftLoaded, value]);
  const save = async () => {
    try {
      const geometry = parseLineStringForDisplay(value);
      if (geometry.length < 2) { setMessage("Add at least two proposed route points before saving."); return; }
      if (!window.confirm("Save this proposed route? It will remain planning-only and will not change surveyed GIS data.")) return;
      setSaving(true);
      await saveProposedPipelineRoute(pipelineId, {
        geometry: { type: "LineString", coordinates: geometry },
        provenance: "PROPOSED_ENGINEERING",
        sourceMetadata: { editor: "Proposed Route Editor" }
      });
      clearDraft();
      setHasSavedRoute(true);
      setMessage("Proposed route saved. It is not surveyed or approved.");
      onSaved?.();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save the proposed route."); }
    finally { setSaving(false); }
  };
  const remove = async () => { if (!window.confirm("Remove this proposed route? The visual overlay will be removed, but its audit history will be retained.")) return; try { setRemoving(true); await removeProposedPipelineRoute(pipelineId); clearDraft(); setValue(""); setHasSavedRoute(false); setMessage("Proposed route removed."); onSaved?.(); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not remove proposed route."); } finally { setRemoving(false); } };
  const cancel = () => { clearDraft(); onCancel?.(); };
  return <section className="min-w-0"><div className="mb-2 flex items-center justify-between gap-2"><p className="text-xs text-slate-500">{value ? "Unsaved route changes" : "No proposed route saved"}</p>{hasSavedRoute ? <button type="button" onClick={() => void remove()} disabled={loading || saving || removing} className="rounded px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">{removing ? "Removing..." : "Remove route"}</button> : null}</div>{loading ? <p className="py-8 text-center text-xs text-slate-500">Loading route editor...</p> : <><RouteEditor mode="proposed" value={value} pipelineName={pipelineName} onChange={setValue} onReload={() => void reload(false)} reloadDisabled={saving || removing} /><div className="sticky bottom-0 z-10 mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-1 pt-3"><p className="min-w-0 text-xs text-slate-600" role="status">{message}</p><div className="ml-auto flex shrink-0 gap-2"><button type="button" onClick={cancel} disabled={saving || removing} className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700">Cancel</button><button type="button" onClick={() => void save()} disabled={saving || removing} className="rounded bg-orange-600 px-3 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-60">{saving ? "Saving..." : "Save Proposed Route"}</button></div></div></>}</section>;
}
