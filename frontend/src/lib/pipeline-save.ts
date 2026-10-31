import { parseLineString } from "./gis-route";
import type { GeoJsonLineString } from "./types";

/**
 * Preserve an existing route exactly for metadata-only edits. Route parsing is
 * intentionally strict only when the route value has changed.
 */
export function routeGeometryForSave(
  routeText: string,
  originalRouteText: string,
  originalRouteGeometry?: GeoJsonLineString
): GeoJsonLineString | null {
  if (originalRouteGeometry !== undefined && routeText === originalRouteText) {
    return originalRouteGeometry;
  }

  if (!routeText.trim()) {
    if (originalRouteGeometry !== undefined) {
      throw new Error("GIS Route Data Required: existing route geometry cannot be cleared during a metadata-only save.");
    }
    return null;
  }

  return { type: "LineString", coordinates: parseLineString(routeText) };
}
