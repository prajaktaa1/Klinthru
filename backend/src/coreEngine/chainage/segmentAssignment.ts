import { parseKp, type ChainageInput } from "./ChainageAgent";

type SegmentRange = { id: string; pipelineId: string; segmentId: string; startKp?: string | null; endKp?: string | null };

/** Preserve valid boundary assignments. Never guess between overlapping ranges. */
export function resolveSegmentForKp<T extends SegmentRange>(pipelineId: string, kp: ChainageInput | null | undefined, currentSegmentId: string | null | undefined, segments: T[]) {
  if (kp === null || kp === undefined || kp === "") return { status: "unknown" as const, segment: undefined, matches: [] as T[] };
  let meters: number;
  try { meters = parseKp(kp).meters; }
  catch { return { status: "unknown" as const, segment: undefined, matches: [] as T[] }; }
  const matches = segments.filter(segment => {
    if (segment.pipelineId !== pipelineId || segment.startKp == null || segment.endKp == null || segment.startKp === "" || segment.endKp === "") return false;
    try { const start = parseKp(segment.startKp).meters, end = parseKp(segment.endKp).meters; return end > start && meters >= start && meters <= end; }
    catch { return false; }
  });
  const existing = matches.find(segment => segment.id === currentSegmentId || segment.segmentId === currentSegmentId);
  if (existing) return { status: "valid" as const, segment: existing, matches };
  if (matches.length === 1) return { status: "correction" as const, segment: matches[0], matches };
  return { status: matches.length ? "ambiguous" as const : "outside" as const, segment: undefined, matches };
}
