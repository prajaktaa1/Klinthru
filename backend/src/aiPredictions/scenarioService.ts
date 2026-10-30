import { AiContractError, type Json } from "./contracts";
import { immutableJson, manifestHash, verifyHash } from "./integrity";

export type ParameterRule = { unit: string; minimum: number; maximum: number };
/** Clones frozen hypothetical parameters only; no live module writer or simulator is accepted. */
export function prepareScenario(base: { manifest: Json; contentHash: string }, parameters: Record<string, { value: number; unit: string }>,
  policy: { approved: boolean; version: string; parameters: Record<string, ParameterRule> } | null) {
  if (!policy?.approved || !policy.version) throw new AiContractError("scenario_policy_missing", 423, "Approved model-specific scenario bounds/units are unavailable.");
  verifyHash(base.manifest, base.contentHash);
  if (!Object.keys(parameters).length) throw new AiContractError("scenario_parameters_missing", 422, "Hypothetical parameters are required.");
  for (const [key, parameter] of Object.entries(parameters)) {
    const rule = Object.prototype.hasOwnProperty.call(policy.parameters, key) ? policy.parameters[key] : null;
    if (!rule || !Number.isFinite(rule.minimum) || !Number.isFinite(rule.maximum) || rule.minimum > rule.maximum || !rule.unit ||
      !Number.isFinite(parameter.value) || parameter.unit !== rule.unit || parameter.value < rule.minimum || parameter.value > rule.maximum)
      throw new AiContractError("scenario_parameter_invalid", 422, "Hypothetical parameter is outside its approved schema/bounds/units.");
  }
  const manifest = immutableJson({ baseSnapshotHash: base.contentHash, baseSnapshot: base.manifest,
    parameterSchemaVersion: policy.version, hypotheticalParameters: parameters } as Json);
  return Object.freeze({ manifest, contentHash: manifestHash(manifest), simulated: false as const });
}
