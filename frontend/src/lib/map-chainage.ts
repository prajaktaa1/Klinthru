import { alignmentReadiness, calculateRangeLength, coordinateAtChainage, kmToMeters, parseKp, type Alignment } from "./chainage";
import type { PipelineRecord, AssetMasterSegmentRecord } from "./types";
export function pipelineAlignment(pipeline: PipelineRecord | null) {
  const alignment = alignmentReadiness(pipeline?.routeGeometry, pipeline?.pipeLengthKm === undefined ? undefined : kmToMeters(pipeline.pipeLengthKm));
  if (alignment.ready && (pipeline?.pipeLengthKm === undefined || !Number.isFinite(pipeline.pipeLengthKm) || pipeline.pipeLengthKm <= 0)) return { ...alignment, ready: false, reason: "A positive saved pipeline length is required before positioning KP markers." };
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
  return coordinateAtChainage(pipeline.routeGeometry as Alignment, parseKp(kp).meters, pipeline.chainageOriginMeters);
}
