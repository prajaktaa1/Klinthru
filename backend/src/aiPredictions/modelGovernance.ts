import type { AuthUser } from "../types/domain";
import { AiContractError } from "./contracts";
import { authorizeAi, type AiGrant } from "./permissions";

export type ModelEvidence = { modelVersionId: string; validationModelVersionId: string; pipelineId: string; candidateCreatedById: string; validationId: string;
  validatedById: string; passed: boolean; qualityPassed: boolean; benchmarkVersion: string; artifactHash: string;
  validationArtifactHash: string; evidenceDocumentVersionId: string; lifecycle: string; sequence: number };
export function validateHumanPromotion(user: AuthUser, grants: readonly AiGrant[], evidence: ModelEvidence,
  input: { expectedSequence: number; validationId: string; evidenceDocumentVersionId: string; reason: string }, now: Date) {
  const grant = authorizeAi(user, "promote", evidence.pipelineId, grants, now);
  if (user.id === evidence.candidateCreatedById || user.id === evidence.validatedById) throw new AiContractError("independent_approval_required", 403, "Candidate producer/validator cannot promote their own candidate.");
  if (evidence.lifecycle !== "Approved" || !evidence.passed || !evidence.qualityPassed || !evidence.benchmarkVersion ||
    !evidence.modelVersionId || evidence.validationModelVersionId !== evidence.modelVersionId || !evidence.candidateCreatedById || !evidence.validatedById || !/^[a-f0-9]{64}$/.test(evidence.artifactHash) || evidence.artifactHash !== evidence.validationArtifactHash ||
    !evidence.validationId || evidence.validationId !== input.validationId || !evidence.evidenceDocumentVersionId ||
    evidence.evidenceDocumentVersionId !== input.evidenceDocumentVersionId || !input.reason.trim()) throw new AiContractError("promotion_evidence_missing", 422, "Exact approved candidate and passing validation/quality/benchmark evidence are required.");
  if (input.expectedSequence !== evidence.sequence) throw new AiContractError("governance_conflict", 409, "Lifecycle history changed; review the current version.");
  return Object.freeze({ action: "promote", actorId: user.id, modelVersionId: evidence.modelVersionId,
    policyVersion: grant.policyVersion, validationId: evidence.validationId, evidenceDocumentVersionId: evidence.evidenceDocumentVersionId,
    expectedSequence: evidence.sequence, reason: input.reason });
}
export function candidateRetrainingPurpose(): "candidate-validation" { return "candidate-validation"; }
