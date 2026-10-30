import { AuthUser } from "../types/domain";
import { canAccessOwner } from "../lib/access";

/** Validate risk scope against authoritative records, without creating/copying them. */
export function assertRiskScopeLinks(user: AuthUser, pipeline: { id: string; createdById: string | null }, segment?: { id: string; pipelineId: string } | null, asset?: { pipelineId: string; segmentId: string | null } | null) {
  if (!canAccessOwner(user, pipeline.createdById)) throw new Error("Risk scope is not accessible.");
  if (segment && segment.pipelineId !== pipeline.id) throw new Error("Segment does not belong to risk pipeline.");
  if (asset && (asset.pipelineId !== pipeline.id || (segment && asset.segmentId !== segment.id))) throw new Error("Asset does not belong to risk scope.");
}

export function sourceLinkReadiness() {
  return { status: "approval-needed", reason: "APPROVAL NEEDED — source record type/version resolver and source-specific access validation before linking. No source values are copied." };
}
