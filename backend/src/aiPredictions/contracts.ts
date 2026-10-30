import { z } from "zod";

export type Json = null | boolean | number | string | readonly Json[] | { readonly [key: string]: Json };
export class AiContractError extends Error {
  constructor(public readonly code: string, public readonly status: number, message: string) { super(message); }
}
export const identity = z.string().trim().min(1);
export const runInput = z.object({ pipelineId: identity, modelVersionId: identity, configurationRevisionId: identity,
  snapshotId: identity, predictionType: identity, horizon: z.json(), parameters: z.json() }).strict();
export const scenarioInput = z.object({ pipelineId: identity, baseSnapshotId: identity, baselineRunId: identity,
  modelVersionId: identity, configurationRevisionId: identity, parameterSchemaVersion: identity, hypotheticalParameters: z.json() }).strict();
export const decisionInput = z.object({ action: z.enum(["approve", "promote", "retire"]), expectedSequence: z.number().int().nonnegative(),
  validationId: identity, evidenceDocumentVersionId: identity, reason: identity }).strict();
export const aiOwnerDestinations = Object.freeze({ reports: "/report", documents: "/document-upload", connections: "/integration-hub" });
