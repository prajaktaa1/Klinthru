"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { FileUp, Redo2, RotateCcw, Trash2, Undo2 } from "lucide-react";

import { distanceKm, parseLineString, readImportedRoute, validCoordinate, type Coordinate } from "@/lib/gis-route";
import { attachBasemap, GEOGRAPHIC_MAP_OPTIONS, searchUaeLocation, UAE_VIEW, type MapBasemap } from "@/lib/map-provider";
import { loadLeaflet } from "@/components/segment-map-card";
type LineString = { type: "LineString"; coordinates: Coordinate[] };

type RouteEditorProps = {
  value: string;
  pipelineName?: string;
  onChange: (value: string) => void;
  onPointCountChange?: (count: number) => void;
};

type LocationSlot = { name: string; latitude: string; longitude: string };
function toLineString(points: Coordinate[]): LineString { return { type: "LineString", coordinates: points }; }

export function RouteEditor({ value, pipelineName, onChange, onPointCountChange }: RouteEditorProps) {
  const [points, setPoints] = useState<Coordinate[]>(() => { try { return parseLineString(value); } catch { return []; } });
  const [history, setHistory] = useState<Coordinate[][]>([]);
  const [future, setFuture] = useState<Coordinate[][]>([]);
  const [error, setError] = useState<string | null>(null);
  const [surveyConfirmed, setSurveyConfirmed] = useState(false);
  const [importing, setImporting] = useState(false);
  const [startLocation, setStartLocation] = useState<LocationSlot>({ name: "", latitude: "", longitude: "" });
  const [endLocation, setEndLocation] = useState<LocationSlot>({ name: "", latitude: "", longitude: "" });
  const [searching, setSearching] = useState<"start" | "end" | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [basemap, setBasemap] = useState<MapBasemap>("hybrid");
  const [provider, setProvider] = useState("");
  const mapElement = useRef<HTMLDivElement>(null); const mapInstance = useRef<any>(null); const layerGroup = useRef<any>(null);
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value === lastEmitted.current) return;
    try { setPoints(parseLineString(value)); setHistory([]); setFuture([]); setError(null); lastEmitted.current = value; } catch { setError("Saved route data is not valid GeoJSON; correct it or clear it before saving."); }
  }, [value]);

  useEffect(() => { onPointCountChange?.(points.length); }, [onPointCountChange, points.length]);

  useEffect(() => {
    const first = points[0];
    const last = points.at(-1);
    setStartLocation((current) => ({
      ...current,
      latitude: first ? String(first[1]) : "",
      longitude: first ? String(first[0]) : ""
    }));
    setEndLocation((current) => ({
      ...current,
      latitude: last ? String(last[1]) : "",
      longitude: last ? String(last[0]) : ""
    }));
  }, [points]);

  function commit(next: Coordinate[], remember = true) {
    if (!surveyConfirmed) { setError("GIS Route Data Required: confirm that the points represent the surveyed alignment before editing or importing."); return; }
    if (!next.every(validCoordinate)) { setError("Invalid WGS84 coordinates. No route changes were applied."); return; }
    if (remember) setHistory((current) => [...current.slice(-39), points]);
    setFuture([]); setPoints(next); const serialized = next.length >= 3 ? JSON.stringify(toLineString(next)) : ""; lastEmitted.current = serialized; onChange(serialized); setError(null);
  }
  function updatePoint(index: number, axis: 0 | 1, raw: string) { const number = Number(raw); const next = points.map((point) => [...point] as Coordinate); next[index][axis] = number; commit(next); }
  function restore(next: Coordinate[]) { setPoints(next); const serialized = next.length >= 3 ? JSON.stringify(toLineString(next)) : ""; lastEmitted.current = serialized; onChange(serialized); setError(null); }
  function undo() { const previous = history.at(-1); if (!previous) return; setFuture((current) => [points, ...current]); setHistory((current) => current.slice(0, -1)); restore(previous); }
  function redo() { const next = future[0]; if (!next) return; setHistory((current) => [...current, points]); setFuture((current) => current.slice(1)); restore(next); }
  async function importFile(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; setImporting(true); try { const imported = await readImportedRoute(file); commit(imported); } catch (caught) { setError(caught instanceof Error ? caught.message : "Route file could not be imported."); } finally { setImporting(false); } }
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
      if (layerGroup.current) layerGroup.current.remove(); layerGroup.current = L.layerGroup().addTo(mapInstance.current); const latLngs = points.map(([longitude, latitude]) => [latitude, longitude]); if (points.length >= 3) L.polyline(latLngs, { color: "#2563eb", weight: 4 }).addTo(layerGroup.current); points.forEach((point, index) => { const marker = L.marker([point[1], point[0]], { draggable: true }).addTo(layerGroup.current).bindTooltip(`Point ${index + 1}`); marker.on("dragend", (event: any) => { const position = event.target.getLatLng(); const next = points.map((item) => [...item] as Coordinate); next[index] = [position.lng, position.lat]; commit(next); }); }); ([{ label: "Start", location: startLocation, color: "#16a34a" }, { label: "End", location: endLocation, color: "#dc2626" }] as const).forEach(({ label, location, color }) => { const latitude = Number(location.latitude); const longitude = Number(location.longitude); if (location.latitude.trim() && location.longitude.trim() && validCoordinate([longitude, latitude])) L.circleMarker([latitude, longitude], { radius: 8, color, fillColor: color, fillOpacity: 0.9 }).addTo(layerGroup.current).bindTooltip(`${label}${location.name ? `: ${location.name}` : ""}`); }); mapInstance.current.off("click"); mapInstance.current.on("click", (event: any) => commit([...points, [event.latlng.lng, event.latlng.lat]])); if (points.length >= 3) mapInstance.current.fitBounds(L.latLngBounds(latLngs), { padding: [20, 20] }); mapInstance.current.invalidateSize({ pan: false }); window.requestAnimationFrame(() => { if (!cancelled && mapInstance.current) { mapInstance.current.invalidateSize({ pan: false }); if (points.length >= 3) mapInstance.current.fitBounds(L.latLngBounds(latLngs), { padding: [20, 20] }); } });
    }).catch(() => setError("Map preview could not load. GPS point editing remains available below."));
    return () => { cancelled = true; };
  }, [points, startLocation, endLocation, surveyConfirmed]);

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
  }, [mapReady, points.length]);

  const distance = useMemo(() => { try { return distanceKm(points); } catch { return 0; } }, [points]);
  return <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-800">Easy Route Editor</p><p className="mt-1 text-xs text-slate-500">Import surveyed GIS coordinates or enter verified GPS points. Place search helps navigation; it does not locate underground pipe.</p><p className="mt-2 text-[11px] font-semibold text-slateblue-700">1. Set Start / End &nbsp; 2. Add or import verified points &nbsp; 3. Review the map &nbsp; 4. Save</p></div><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slateblue-300 bg-white px-3 py-2 text-xs font-semibold text-slateblue-700"><FileUp size={15} />{importing ? "Importing..." : "Import GIS route"}<input type="file" accept=".geojson,.json,.kml,.kmz,.csv,application/geo+json" onChange={(event) => { void importFile(event); }} className="hidden" /></label></div>
    <label className="mt-3 flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={surveyConfirmed} onChange={event => setSurveyConfirmed(event.target.checked)} />I confirm new route points come from the surveyed GIS alignment, including all bends; start/end locations alone do not establish the route.</label><div className="mt-2 flex items-center gap-2 text-xs"><label>Imagery <select aria-label="Route editor basemap" value={basemap} onChange={(event) => setBasemap(event.target.value as MapBasemap)} className="rounded border border-slate-300 bg-white p-1"><option value="hybrid">Hybrid</option><option value="satellite">Satellite</option><option value="street">Street</option></select></label><span>{provider}</span>{!points.length ? <span role="status">GIS Route Data Required{pipelineName ? ` — ${pipelineName}` : ""}</span> : null}</div><div className="mt-3 grid gap-3 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-2"><LocationFields label="Start location" location={startLocation} searching={searching === "start"} onChange={(field, value) => updateLocation("start", field, value)} onSearch={() => { void searchLocation("start"); }} onAdd={() => addLocationPoint("start")} /><LocationFields label="End location" location={endLocation} searching={searching === "end"} onChange={(field, value) => updateLocation("end", field, value)} onSearch={() => { void searchLocation("end"); }} onAdd={() => addLocationPoint("end")} /></div>
    <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]"><div ref={mapElement} className="h-[360px] min-w-0 rounded-lg border border-slate-200 bg-white sm:h-[440px] lg:h-[520px]" aria-label="Route editor map preview" /><div className="min-w-0 rounded-lg border border-slate-200 bg-white p-3"><div className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full bg-slateblue-50 px-2 py-1 font-semibold text-slateblue-700">{points.length} point{points.length === 1 ? "" : "s"}</span><span className="rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">{distance.toFixed(2)} km geometry</span><button type="button" onClick={undo} disabled={!history.length} title="Undo" className="ml-auto rounded border p-1.5 disabled:opacity-40"><Undo2 size={14} /></button><button type="button" onClick={redo} disabled={!future.length} title="Redo" className="rounded border p-1.5 disabled:opacity-40"><Redo2 size={14} /></button><button type="button" onClick={() => commit([])} title="Clear" className="rounded border border-red-200 p-1.5 text-red-600"><Trash2 size={14} /></button></div><div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">{points.length === 0 ? <p className="rounded border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">GIS Data Required. Select points on the map or import a verified route file.</p> : null}</div><div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs"><span className={points.length === 0 || points.length >= 3 ? "text-emerald-700" : "text-amber-700"}>{points.length < 3 ? "Route Data Required: supply the surveyed alignment including intermediate points." : "Valid LineString ready to save."}</span>{points.length >= 3 ? <button type="button" onClick={() => { const L = (window as any).L; if (L && mapInstance.current) { mapInstance.current.invalidateSize({ pan: false }); mapInstance.current.fitBounds(L.latLngBounds(points.map(([lon, lat]) => [lat, lon])), { padding: [20, 20] }); } }} className="inline-flex items-center gap-1 font-semibold text-slateblue-700"><RotateCcw size={13} />Fit to route</button> : null}</div>{error ? <p role="alert" className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">{error}</p> : null}</div></div>
  </div>;
}

function LocationFields({ label, location, searching, onChange, onSearch, onAdd }: { label: string; location: LocationSlot; searching: boolean; onChange: (field: keyof LocationSlot, value: string) => void; onSearch: () => void; onAdd: () => void }) {
  return <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><div className="mt-2 flex gap-2"><input value={location.name} onChange={(event) => onChange("name", event.target.value)} aria-label={`${label} UAE search`} placeholder="Search UAE place or facility" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" /><button type="button" onClick={onSearch} disabled={searching} className="rounded-lg border border-slateblue-300 px-3 py-2 text-xs font-semibold text-slateblue-700 disabled:opacity-50">{searching ? "Searching..." : "Find"}</button></div><div className="mt-2 grid grid-cols-2 gap-2"><label className="text-xs">Latitude<input aria-label={`${label} latitude`} value={location.latitude} onChange={(event) => onChange("latitude", event.target.value)} inputMode="decimal" className="mt-1 w-full rounded border border-slate-300 p-2" /></label><label className="text-xs">Longitude<input aria-label={`${label} longitude`} value={location.longitude} onChange={(event) => onChange("longitude", event.target.value)} inputMode="decimal" className="mt-1 w-full rounded border border-slate-300 p-2" /></label></div><button type="button" onClick={onAdd} disabled={!location.latitude.trim() || !location.longitude.trim() || !validCoordinate([Number(location.longitude), Number(location.latitude)])} className="mt-2 text-xs font-semibold text-slateblue-700 underline disabled:cursor-not-allowed disabled:opacity-50">Use as route {label.startsWith("Start") ? "start" : "end"} point</button></div>;
}
