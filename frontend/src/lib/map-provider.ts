/** Shared Leaflet + Esri basemaps. Optional Google geocoding is separate. */
export type MapBasemap = "satellite" | "hybrid" | "street" | "terrain";
export const UAE_VIEW: [number, number] = [24.4, 54.4]; // Viewport only, never route geometry.
export const GEOGRAPHIC_MAP_OPTIONS = { minZoom: 2, maxZoom: 21, maxBounds: [[-85.05112878, -180], [85.05112878, 180]], maxBoundsViscosity: 1 };
const ESRI_CREDIT = 'Powered by <a href="https://www.esri.com/" target="_blank" rel="noopener noreferrer">Esri</a>';
const ESRI_SOURCES: Record<string, string> = {
  World_Imagery: "Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community",
  World_Street_Map: "Sources: Esri, HERE, Garmin, USGS, Intermap, INCREMENT P, NRCan, Esri Japan, METI, Esri China (Hong Kong), Esri Korea, Esri (Thailand), NGCC, © OpenStreetMap contributors, and the GIS User Community",
  World_Topo_Map: "Sources: Esri, HERE, Garmin, Intermap, increment P Corp., GEBCO, USGS, FAO, NPS, NRCAN, GeoBase, IGN, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), © OpenStreetMap contributors, and the GIS User Community"
};
// Existing public raster services only. No account creation, metered API, Google
// request, offline harvesting or tile proxy. Commercial entitlement is external.
export function attachBasemap(map: any, L: any, type: MapBasemap, onProvider?: (provider: string) => void) {
  let providerNotice: HTMLElement | undefined, disposed = false;
  const container = map.getContainer() as HTMLElement;
  const service = type === "street" ? "World_Street_Map" : type === "terrain" ? "World_Topo_Map" : "World_Imagery";
  const layers: any[] = [], errors = new Set<string>();
  const notice = () => {
    if (disposed) return;
    container.dataset.basemapStatus = errors.size ? "degraded" : "ready";
    if (!errors.size) { providerNotice?.remove(); providerNotice = undefined; return; }
    if (!providerNotice) {
      providerNotice = document.createElement("div"); providerNotice.setAttribute("role", "status");
      providerNotice.style.cssText = "position:absolute;left:8px;top:64px;z-index:399;max-width:75%;background:white;padding:4px 8px;font-size:11px;color:#92400e;pointer-events:none";
      container.appendChild(providerNotice);
    }
    providerNotice.textContent = `Esri ${[...errors].join(" and ")} unavailable. Check network access and zoom or reload the map. Saved GIS data is unchanged.`;
  };
  const addTiles = (url: string, attribution: string, name: string, zIndex: number) => {
    const layer = L.tileLayer(url, { maxNativeZoom: 19, maxZoom: GEOGRAPHIC_MAP_OPTIONS.maxZoom, zIndex, attribution });
    layer.on("tileerror", () => { errors.add(name); notice(); });
    layer.on("tileload", () => { errors.delete(name); notice(); });
    layer.addTo(map); layers.push(layer);
  };
  container.dataset.mapProvider = "esri"; container.dataset.basemapStatus = "loading";
  addTiles(`https://server.arcgisonline.com/ArcGIS/rest/services/${service}/MapServer/tile/{z}/{y}/{x}`, `${ESRI_CREDIT} | ${ESRI_SOURCES[service]}`, "imagery/base tiles", 0);
  if (type === "hybrid") addTiles("https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", "Labels: Esri, HERE, Garmin, © OpenStreetMap contributors, and the GIS User Community", "reference labels", 1);
  onProvider?.("Esri");
  return { remove() { if (disposed) return; disposed = true; layers.forEach(layer => { layer.off(); layer.remove(); }); providerNotice?.remove(); } };
}

export async function searchUaeLocation(query: string) {
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=ae&limit=1&q=${encodeURIComponent(query)}`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error("UAE location search unavailable. Enter verified latitude and longitude.");
  const [result] = await response.json();
  if (!result?.lat?.trim() || !result?.lon?.trim() || result.address?.country_code?.toLowerCase() !== "ae" || !validPlace(Number(result.lat), Number(result.lon))) throw new Error("No UAE location found. Enter verified latitude and longitude.");
  return { latitude: result.lat as string, longitude: result.lon as string, name: result.display_name as string };
}
function validPlace(latitude: unknown, longitude: unknown) {
  return typeof latitude === "number" && typeof longitude === "number" && Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}
