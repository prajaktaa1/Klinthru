import type { AuthUser } from "../types/domain";
import { AiContractError, type Json } from "./contracts";
import { authorizeAi, type AiGrant } from "./permissions";
import { verifyHash } from "./integrity";
import { reserveAiRun, type RunFingerprint, type RunReservationStore } from "./idempotency";

export type RunEvidence = { pipelineId: string; ownerId: string; nativePipelineAccess: boolean;
  snapshotId: string; snapshot: Json; snapshotHash: string; snapshotModelVersionId: string; snapshotConfigurationRevisionId: string;
  modelVersionId: string; lifecycle: string; artifactHash: string; artifactVerified: boolean; artifactDocumentApproved: boolean;
  configurationRevisionId: string; configurationApproved: boolean; featureSetVersion: string; methodologyVersion: string | null;
  sourcesAuthorized: boolean; inputSchemaVersion: string; validateInput: (input: Json) => boolean;
  validateRequest: (input: { predictionType: string; horizon: Json; parameters: Json; executionManifest: Json }) => boolean };
/** Control-plane preflight only. No model implementation, automatic approval or live-source setter. */
export async function prepareAiRun(user: AuthUser, grants: readonly AiGrant[], evidence: RunEvidence, input: {
  pipelineId: string; modelVersionId: string; configurationRevisionId: string; snapshotId: string; predictionType: string;
  horizon: Json; parameters: Json; executionManifest: Json }, requestKey: string, store: RunReservationStore, now: Date) {
  authorizeAi(user, "run", input.pipelineId, grants, now);
  if (!evidence.nativePipelineAccess || !evidence.sourcesAuthorized || evidence.ownerId !== user.id || evidence.pipelineId !== input.pipelineId)
    throw new AiContractError("source_permission_denied", 403, "Native pipeline and all snapshot-source permissions are required.");
  if (evidence.snapshotId !== input.snapshotId || evidence.modelVersionId !== input.modelVersionId || evidence.configurationRevisionId !== input.configurationRevisionId ||
    evidence.snapshotModelVersionId !== input.modelVersionId || evidence.snapshotConfigurationRevisionId !== input.configurationRevisionId)
    throw new AiContractError("run_lineage_mismatch", 409, "Snapshot, configuration and model versions do not match the run.");
  if (!["Approved", "Production"].includes(evidence.lifecycle) || !evidence.artifactVerified || !evidence.artifactDocumentApproved ||
    !evidence.configurationApproved || !evidence.methodologyVersion || !evidence.inputSchemaVersion || !evidence.validateInput(evidence.snapshot) || !evidence.validateRequest(input))
    throw new AiContractError("model_not_ready", 423, "Approved artifact, configuration, methodology and model input contract are required.");
  verifyHash(evidence.snapshot, evidence.snapshotHash);
  const manifest = evidence.snapshot as Record<string, Json> | null;
  if (!manifest || Array.isArray(manifest) || manifest.ownerId !== user.id || manifest.pipelineId !== input.pipelineId ||
    manifest.modelVersionId !== input.modelVersionId || manifest.configurationRevisionId !== input.configurationRevisionId || manifest.featureSetVersion !== evidence.featureSetVersion)
    throw new AiContractError("snapshot_scope_mismatch", 409, "Frozen snapshot content does not match the authorized run manifest.");
  const fingerprint: RunFingerprint = { ownerId: user.id, pipelineId: input.pipelineId, snapshotHash: evidence.snapshotHash,
    modelVersionId: input.modelVersionId, artifactHash: evidence.artifactHash, featureSetVersion: evidence.featureSetVersion,
    configurationRevisionId: input.configurationRevisionId, predictionType: input.predictionType, horizon: input.horizon,
    parameters: input.parameters, purpose: "prediction", executionManifest: input.executionManifest, scenarioBaseline: null };
  return reserveAiRun(store, requestKey, fingerprint);
}
