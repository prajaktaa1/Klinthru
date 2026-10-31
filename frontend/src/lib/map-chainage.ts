import { alignmentReadiness, calculateRangeLength, coordinateAtChainage, kmToMeters, parseKp, validateAgainstPipelineLength, type Alignment } from "./chainage";
import type { PipelineRecord, AssetMasterSegmentRecord } from "./types";
import { savedMapRoute } from "./dashboard-map-data";
export function pipelineAlignment(pipeline: PipelineRecord | null) {
  const length = pipeline?.pipeLengthKm;
  const validLength = typeof length === "number" && Number.isFinite(length) && length > 0;
  const alignment = alignmentReadiness(pipeline?.routeGeometry, validLength ? kmToMeters(length) : undefined);
  if (alignment.ready && !savedMapRoute(pipeline?.routeGeometry)) return { ...alignment, ready: false, reason: "GIS Route Data Required: supply a saved alignment with intermediate survey points before positioning KP markers." };
  if (alignment.ready && !validLength) return { ...alignment, ready: false, reason: "A positive saved pipeline length is required before positioning KP markers." };
  if (alignment.ready && !Number.isFinite(pipeline?.chainageOriginMeters)) return { ...alignment, ready: false, reason: "Saved chainage origin is required before positioning KP markers on the alignment." };
  return alignment;
}
export function segmentChainageLabel(segment: AssetMasterSegmentRecord) {
  try {
    if (!segment.startKp || !segment.endKp) return segment.segmentId;
    const start = parseKp(segment.startKp), end = parseKp(segment.endKp);
    return `${segment.segmentId}: From CH ${start.chainage} / KP ${start.kilometers} to CH ${end.chainage} / KP ${end.kilometers}; ${calculateRangeLength(start.meters, end.meters)} m`;
  } catch { return `${segment.segmentId}: invalid saved chainage`; }
}
export function savedAlignmentPosition(pipeline: PipelineRecord, kp: string) {
  const readiness = pipelineAlignment(pipeline);
  if (!readiness.ready) throw new Error(readiness.reason ?? "Verified saved alignment required.");
  const meters = parseKp(kp).meters;
  validateAgainstPipelineLength(meters, { pipelineId: pipeline.id, originMeters: pipeline.chainageOriginMeters, lengthMeters: kmToMeters(pipeline.pipeLengthKm!) });
  return coordinateAtChainage(pipeline.routeGeometry as Alignment, meters, pipeline.chainageOriginMeters);
}
