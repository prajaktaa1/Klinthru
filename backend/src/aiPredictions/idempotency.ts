import { AiContractError, type Json } from "./contracts";
import { manifestHash } from "./integrity";

export type RunFingerprint = { ownerId: string; pipelineId: string; snapshotHash: string; modelVersionId: string;
  artifactHash: string; featureSetVersion: string; configurationRevisionId: string; predictionType: string;
  horizon: Json; parameters: Json; purpose: string; executionManifest: Json; scenarioBaseline: Json };
export function runFingerprint(input: RunFingerprint): string {
  if ([input.ownerId,input.pipelineId,input.modelVersionId,input.featureSetVersion,input.configurationRevisionId,input.predictionType,input.purpose].some(v => !v.trim()) ||
    !/^[a-f0-9]{64}$/.test(input.snapshotHash) || !/^[a-f0-9]{64}$/.test(input.artifactHash)) throw new AiContractError("run_manifest_incomplete", 422, "Exact run identity and artifact/snapshot hashes are required.");
  return manifestHash({ version: "ai-run-fingerprint-v1", ...input });
}
export type RunReservation = { requestId: string; runId: string | null; payloadHash: string; fingerprint: string };
/** Adapter must claim atomically using both database UNIQUE constraints, including concurrent retries. */
export interface RunReservationStore { claim(input: { ownerId: string; pipelineId: string; requestKey: string; payloadHash: string; fingerprint: string }): Promise<RunReservation>; }
export async function reserveAiRun(store: RunReservationStore, requestKey: string, input: RunFingerprint) {
  if (!requestKey.trim()) throw new AiContractError("idempotency_key_required", 400, "Idempotency-Key is required.");
  const fingerprint = runFingerprint(input), payloadHash = manifestHash(input);
  const row = await store.claim({ ownerId: input.ownerId, pipelineId: input.pipelineId, requestKey, payloadHash, fingerprint });
  if (row.payloadHash !== payloadHash || row.fingerprint !== fingerprint) throw new AiContractError("idempotency_conflict", 409, "Retry key is already bound to different input.");
  return row;
}
