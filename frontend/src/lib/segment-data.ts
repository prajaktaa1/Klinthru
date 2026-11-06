import { tryKp } from "./chainage";
import { savedMapRoute, savedSegmentMapRoute } from "./dashboard-map-data";
import type { DocumentRepositoryItem } from "./apiClient";
import type { AssetMasterSegmentRecord, PipelineRecord } from "./types";

export function segmentKp(value: string | undefined): number | null {
  return tryKp(value);
}

type CheckResult = "Passed" | "Failed" | "UNKNOWN" | "GIS Route Data Required";
export function segmentChecks(pipeline: PipelineRecord | null, segment: AssetMasterSegmentRecord | null, segments: AssetMasterSegmentRecord[], documents: DocumentRepositoryItem[], documentsError: boolean): Array<[string, CheckResult]> {
  const start = segmentKp(segment?.startKp);
  const end = segmentKp(segment?.endKp);
  const rangeValid = start !== null && end !== null && end > start && (pipeline?.pipeLengthKm === undefined || end <= pipeline.pipeLengthKm);
  const peers = segments.filter((item) => item.id !== segment?.id);
  const hasVerifiedRoute = Boolean(
    segment &&
    savedMapRoute(pipeline?.routeGeometry, pipeline?.pipeLengthKm) &&
    savedSegmentMapRoute(segment)
  );
  const peersKnown = peers.every((item) => { const a = segmentKp(item.startKp); const b = segmentKp(item.endKp); return a !== null && b !== null && b > a; });
  let overlap: CheckResult = "UNKNOWN";
  let gap: CheckResult = "UNKNOWN";
  if (rangeValid && start !== null && end !== null && peersKnown) {
    overlap = peers.some((item) => (segmentKp(item.startKp) ?? NaN) < end && (segmentKp(item.endKp) ?? NaN) > start) ? "Failed" : "Passed";
    const upstream = peers.filter((item) => (segmentKp(item.endKp) ?? NaN) <= start).sort((a, b) => (segmentKp(b.endKp) ?? NaN) - (segmentKp(a.endKp) ?? NaN))[0];
    const downstream = peers.filter((item) => (segmentKp(item.startKp) ?? NaN) >= end).sort((a, b) => (segmentKp(a.startKp) ?? NaN) - (segmentKp(b.startKp) ?? NaN))[0];
    const epsilon = 1e-6;
    const left = Math.abs(start - (upstream ? (segmentKp(upstream.endKp) ?? NaN) : 0)) < epsilon;
    const right = downstream ? Math.abs((segmentKp(downstream.startKp) ?? NaN) - end) < epsilon : pipeline?.pipeLengthKm === undefined ? null : Math.abs(pipeline.pipeLengthKm - end) < epsilon;
    gap = !left || right === false ? "Failed" : right === null ? "UNKNOWN" : "Passed";
  }
  return [
    ["No overlap with adjacent segments", overlap],
    ["No gap in KP range", gap],
    ["KP sequence is valid", !segment || start === null || end === null ? "UNKNOWN" : rangeValid ? "Passed" : "Failed"],
    ["Geometry linked to pipeline route", hasVerifiedRoute ? "Passed" : "GIS Route Data Required"],
    ["Source documents linked", !segment || documentsError ? "UNKNOWN" : documents.some((item) => item.links.some((link) => link.segment?.id === segment.id)) ? "Passed" : "UNKNOWN"]
  ];
}
