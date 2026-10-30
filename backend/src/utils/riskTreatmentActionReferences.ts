import type { AuthUser } from "../types/domain";
import type { CentralActionGateway } from "../types/riskTreatment";
import { centralActionSchema } from "../validation/riskTreatmentValidation";

// No provider, endpoint, credentials or duplicate task storage is invented here.
// A verified provider must enforce central source access; technical setup stays in Integration Hub.
export async function readCentralActionReferences(ids: string[], user: AuthUser, gateway?: CentralActionGateway) {
  if (!gateway) return { status: "unavailable" as const, reason: "MISSING FIELD — APPROVAL NEEDED: authoritative Central Action Register read/access contract.", actions: null };
  try {
    const unique = [...new Set(ids)];
    const response = await gateway.read(unique, user);
    if (response.status !== "available") return { status: "unavailable" as const, reason: response.reason, actions: null };
    const actions = response.actions.map(action => centralActionSchema.parse(action));
    if (new Set(actions.map(action => action.actionId)).size !== actions.length || actions.length !== unique.length || actions.some(action => !unique.includes(action.actionId))) throw new Error("Central action response must exactly match authorized references.");
    return { status: "available" as const, reason: null, actions };
  } catch { return { status: "unavailable" as const, reason: "Central action records could not be verified. No fallback tasks or success are fabricated.", actions: null }; }
}
