import { alignmentReadiness, parseKp } from "./chainage";
import type { AssetMasterAssetRecord, AssetMasterSegmentRecord, PipelineRecord } from "@/lib/types";

export type DashboardMasterMapBundle = { pipeline: PipelineRecord; segments: AssetMasterSegmentRecord[]; assets: AssetMasterAssetRecord[]; errors: string[] };

export function savedMapCoordinate(latitude: unknown, longitude: unknown): latitude is number {
  return typeof latitude === "number" && typeof longitude === "number" && Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}

// Reject the entire invalid line; dropping bad points could invent a connecting
// route between otherwise unrelated locations.
export function savedMapRoute(geometry: unknown, lengthKm?: number): [number, number][] | null {
  if (!geometry || typeof geometry !== "object" || !("type" in geometry) || geometry.type !== "LineString" || !("coordinates" in geometry) || !Array.isArray(geometry.coordinates) || geometry.coordinates.length < 3) return null;
  const coordinates = geometry.coordinates;
  if (!coordinates.every((point) => Array.isArray(point) && point.length === 2 && savedMapCoordinate(point[1], point[0]))) return null;
  if (!coordinates.some((point) => point[0] !== coordinates[0][0] || point[1] !== coordinates[0][1])) return null;
  if (lengthKm !== undefined && (!Number.isFinite(lengthKm) || lengthKm <= 0 || !alignmentReadiness(geometry as any, lengthKm * 1000).ready)) return null;
  return coordinates.map(([longitude, latitude]) => [latitude, longitude]);
}

export function savedSegmentMapRoute(segment: AssetMasterSegmentRecord): [number, number][] | null {
  if (!segment.startKp || !segment.endKp) return null;
  try { return savedMapRoute(segment.routeGeometry, (parseKp(segment.endKp).meters - parseKp(segment.startKp).meters) / 1000); } catch { return null; }
}

export function scopeMasterMap(bundles: DashboardMasterMapBundle[], pipelineId: string | null, segmentId: string) {
  return bundles.filter((bundle) => pipelineId === null || bundle.pipeline.id === pipelineId).map((bundle) => ({
    ...bundle,
    segments: bundle.segments.filter((item) => item.pipelineId === bundle.pipeline.id && (!segmentId || item.id === segmentId || item.segmentId === segmentId)),
    assets: bundle.assets.filter((item) => item.pipelineId === bundle.pipeline.id && (!segmentId || bundle.segments.some(segment => (segment.id === segmentId || segment.segmentId === segmentId) && (item.segmentId === segment.id || item.segmentId === segment.segmentId))))
  }));
}
