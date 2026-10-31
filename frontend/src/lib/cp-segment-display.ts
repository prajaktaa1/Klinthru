export type LinkedSegmentLabel = { id: string; segmentId: string };

export function segmentDisplayName(segmentId: string | undefined, segments: LinkedSegmentLabel[]) {
  if (!segmentId) return "Unavailable";
  return segments.find((segment) => segment.id === segmentId)?.segmentId ?? segmentId;
}
