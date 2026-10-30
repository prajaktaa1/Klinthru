export const MAP_DATA_CHANGED = "klinthru-master-map-data-changed";
const key = "klinthru-master-map-revision";
export function watchMapDataChanged(refresh: () => void) {
  const storage = (event: StorageEvent) => { if (event.key === key) refresh(); };
  window.addEventListener(MAP_DATA_CHANGED, refresh);
  window.addEventListener("storage", storage);
  window.addEventListener("focus", refresh);
  return () => { window.removeEventListener(MAP_DATA_CHANGED, refresh); window.removeEventListener("storage", storage); window.removeEventListener("focus", refresh); };
}
