import { parseKp } from "../coreEngine/chainage/ChainageAgent";
import { createValidationError } from "./validationErrors";

type Range = { id?: string; pipelineId: string; segmentId: string; startKp?: string | null; endKp?: string | null };

/** Half-open intervals permit adjoining segments to share a boundary point. */
export function validateSegmentOverlap(candidate: Range, peers: Range[], excludeId?: string) {
  const hasStart = Boolean(candidate.startKp?.trim()), hasEnd = Boolean(candidate.endKp?.trim());
  if (!hasStart && !hasEnd) return; // Existing optional, unlocated draft segments remain supported.
  if (!hasStart || !hasEnd) throw createValidationError({ [hasStart ? "endKp" : "startKp"]: "Provide both From KP and To KP to validate the segment range." });
  const start = parseKp(candidate.startKp!).meters, end = parseKp(candidate.endKp!).meters;
  if (end <= start) throw createValidationError({ endKp: "To KP must be greater than From KP." });
  const overlaps = peers.filter(peer => {
    if (peer.pipelineId !== candidate.pipelineId || (excludeId && peer.id === excludeId)) return false;
    if (!peer.startKp?.trim() || !peer.endKp?.trim()) return false;
    const a = parseKp(peer.startKp).meters, b = parseKp(peer.endKp).meters;
    return start < b && end > a;
  });
  if (overlaps.length) throw createValidationError({ endKp: `Segment range overlaps ${overlaps.map(peer => peer.segmentId).join(", ")} on this pipeline. Choose a non-overlapping range.` });
}
