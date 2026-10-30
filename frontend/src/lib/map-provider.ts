/** Official Google Maps JavaScript API under the existing Leaflet vector layers. */
export type MapBasemap = "satellite" | "hybrid" | "street" | "terrain";
export const UAE_VIEW: [number, number] = [24.4, 54.4]; // Viewport only, never route geometry.
export const GEOGRAPHIC_MAP_OPTIONS = { minZoom: 2, maxZoom: 21, maxBounds: [[-85.05112878, -180], [85.05112878, 180]], maxBoundsViscosity: 1 };
let googlePromise: Promise<any> | undefined;
let authFailed = false;
export function loadGoogleMaps(): Promise<any> {
  const win = window as any;
  if (authFailed) return Promise.reject(new Error("Google Maps authorization failed."));
  if (win.google?.maps?.Map) return Promise.resolve(win.google.maps);
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (!key) return Promise.reject(new Error("Google Maps key is not configured."));
  if (googlePromise) return googlePromise;
  googlePromise = new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Google Maps timed out.")), 12000);
    win.__klinthruGoogleMapsReady = () => { clearTimeout(timer); win.google?.maps?.Map ? resolve(win.google.maps) : reject(new Error("Google Maps unavailable.")); };
    const previous = win.gm_authFailure;
    win.gm_authFailure = () => { authFailed = true; clearTimeout(timer); reject(new Error("Google Maps authorization failed.")); window.dispatchEvent(new Event("klinthru-google-map-failed")); previous?.(); };
    const script = document.createElement("script");
    script.id = "klinthru-google-maps-api";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&callback=__klinthruGoogleMapsReady&region=AE&language=en&v=quarterly`;
    script.async = true; script.onerror = () => { clearTimeout(timer); reject(new Error("Google Maps failed to load.")); };
    document.head.appendChild(script);
  });
  return googlePromise;
}

// No undocumented Google tile URLs. SDK controls, logo and attribution remain visible.
export function attachBasemap(map: any, L: any, type: MapBasemap, onProvider?: (provider: string) => void) {
  let providerNotice: HTMLElement | undefined;
  let disposed = false, esri: any, googleMap: any, observer: ResizeObserver | undefined;
  const container = map.getContainer() as HTMLElement;
  const host = document.createElement("div");
  host.style.cssText = "position:absolute;inset:0;z-index:0;pointer-events:none";
  container.prepend(host);
  const sync = () => {
    if (!googleMap || disposed) return;
    const center = map.getCenter(); googleMap.setCenter({ lat: center.lat, lng: center.lng }); googleMap.setZoom(Math.round(map.getZoom()));
  };
  const fallback = (error?: unknown) => {
    if (disposed || esri) return;
    googleMap = null; observer?.disconnect(); map.off("move zoom resize", sync); host.replaceChildren();
    const service = type === "street" ? "World_Street_Map" : type === "terrain" ? "World_Topo_Map" : "World_Imagery";
    esri = L.tileLayer(`https://server.arcgisonline.com/ArcGIS/rest/services/${service}/MapServer/tile/{z}/{y}/{x}`, { maxZoom: 19, attribution: "Tiles © Esri" }).addTo(map);
    const reason = error instanceof Error ? error.message : "Google Maps authorization failed.";
    container.dataset.mapProvider = "esri"; onProvider?.(`Google Maps BLOCKED: ${reason} Esri fallback`);
    providerNotice = document.createElement("div"); providerNotice.setAttribute("role", "status");
    providerNotice.style.cssText = "position:absolute;left:8px;bottom:28px;z-index:399;max-width:75%;background:white;padding:4px 8px;font-size:11px;color:#92400e;pointer-events:none";
    providerNotice.textContent = `Google Maps BLOCKED: ${reason} Showing Esri fallback.`; container.appendChild(providerNotice);
  };
  window.addEventListener("klinthru-google-map-failed", fallback);
  void loadGoogleMaps().then(g => {
    if (disposed) return;
    const center = map.getCenter();
    googleMap = new g.Map(host, { center: { lat: center.lat, lng: center.lng }, zoom: Math.round(map.getZoom()), mapTypeId: type === "street" ? "roadmap" : type,
      disableDefaultUI: true, gestureHandling: "none", keyboardShortcuts: false, clickableIcons: false, tilt: 0, heading: 0 });
    map.on("move zoom resize", sync);
    observer = new ResizeObserver(() => { g.event.trigger(googleMap, "resize"); sync(); }); observer.observe(container);
    container.dataset.mapProvider = "google"; onProvider?.("Google Maps");
  }).catch(fallback);
  return { remove() { if (disposed) return; disposed = true; window.removeEventListener("klinthru-google-map-failed", fallback); observer?.disconnect(); map.off("move zoom resize", sync); esri?.remove(); googleMap = null; providerNotice?.remove(); host.remove(); } };
}

export async function searchUaeLocation(query: string) {
  try {
    const g = await loadGoogleMaps();
    const { results } = await new g.Geocoder().geocode({ address: query, componentRestrictions: { country: "AE" }, region: "ae" });
    const result = results.find((item: any) => item.address_components.some((part: any) => part.types.includes("country") && part.short_name === "AE"));
    if (!result) throw new Error("No UAE location found.");
    return { latitude: String(result.geometry.location.lat()), longitude: String(result.geometry.location.lng()), name: result.formatted_address };
  } catch {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=ae&limit=1&q=${encodeURIComponent(query)}`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error("UAE location search unavailable. Enter verified latitude and longitude.");
    const [result] = await response.json();
    if (!result?.lat || !result?.lon || !Number.isFinite(Number(result.lat)) || !Number.isFinite(Number(result.lon))) throw new Error("No UAE location found. Enter verified latitude and longitude.");
    return { latitude: result.lat as string, longitude: result.lon as string, name: result.display_name as string };
  }
}
