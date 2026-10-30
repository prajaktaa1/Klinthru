import type { AuthUser } from "../types/domain";
import { AiContractError } from "./contracts";

export type AiAction = "read" | "run" | "review" | "accept" | "export" | "configure" | "retrain" | "validate" | "approve" | "promote" | "retire";
export type AiGrant = { userId: string; pipelineId: string; actions: readonly AiAction[]; policyVersion: string;
  approvedById: string; validFrom: string; expiresAt: string; revokedAt?: string | null };
/** Trusted server-side policy provider only. Existing application roles confer no AI action. */
export function authorizeAi(user: AuthUser, action: AiAction, pipelineId: string, grants: readonly AiGrant[], now: Date): AiGrant {
  const time = now.getTime();
  const grant = grants.find(g => g.userId === user.id && g.pipelineId === pipelineId && g.actions.includes(action) &&
    !!g.policyVersion && !!g.approvedById && g.approvedById !== g.userId && !g.revokedAt &&
    Number.isFinite(time) && Date.parse(g.validFrom) <= time && time < Date.parse(g.expiresAt));
  if (!grant) throw new AiContractError("ai_permission_denied", 403, "An explicit current AI action grant is required.");
  return grant;
}
