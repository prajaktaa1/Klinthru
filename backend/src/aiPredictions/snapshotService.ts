import type { AuthUser } from "../types/domain";
import { AiContractError, type Json } from "./contracts";
import { immutableJson, manifestHash, verifyHash } from "./integrity";

export type SourceReference = { sourceModule: string; sourceType: string; sourceRecordId: string; sourceRevision: string };
export type ResolvedSource = SourceReference & { pipelineId: string; observedAt: string; availableAt: string;
  values: Json; units: Json; quality: Json; sourceHash: string; revisionVerified: boolean };
/** Native owner adapter must check current ACL and resolve the exact historical revision. No writer interface. */
export type SourceReader = (user: AuthUser, pipelineId: string, reference: SourceReference, cutoffAt: string) => Promise<ResolvedSource | null>;
export async function captureAiSnapshot(input: { user: AuthUser; pipelineId: string; cutoffAt: string; capturedAt: string;
  modelVersionId: string; configurationRevisionId: string; featureSetVersion: string; featureSchemaVersion: string;
  featureValues: Json; sources: SourceReference[] }, read: SourceReader) {
  const cutoff = Date.parse(input.cutoffAt), captured = Date.parse(input.capturedAt);
  if (!Number.isFinite(cutoff) || !Number.isFinite(captured) || cutoff > captured || !input.sources.length ||
    [input.pipelineId, input.modelVersionId, input.configurationRevisionId, input.featureSetVersion, input.featureSchemaVersion].some(v => !v.trim()))
    throw new AiContractError("snapshot_incomplete", 422, "Exact scope, versioned features, sources and cutoff evidence are required.");
  const identities = new Set<string>(), sources: ResolvedSource[] = [];
  for (const ref of input.sources) {
    if (Object.values(ref).some(v => typeof v !== "string" || !v.trim())) throw new AiContractError("source_revision_missing", 422, "Original source identity and revision are required.");
    const key = manifestHash(ref);
    if (identities.has(key)) throw new AiContractError("duplicate_source", 409, "Duplicate source reference.");
    identities.add(key);
    const source = await read(input.user, input.pipelineId, ref, input.cutoffAt);
    if (!source || !source.revisionVerified || source.pipelineId !== input.pipelineId ||
      Object.entries(ref).some(([k,v]) => source[k as keyof SourceReference] !== v)) throw new AiContractError("source_unavailable", 422, "Exact authorized source revision is unavailable.");
    const observed = Date.parse(source.observedAt), available = Date.parse(source.availableAt);
    if (!Number.isFinite(observed) || !Number.isFinite(available) || observed > cutoff || available > cutoff)
      throw new AiContractError("future_source", 422, "Source observation and historical availability must precede the cutoff.");
    const { sourceHash, revisionVerified: _verified, ...content } = source;
    verifyHash(content, sourceHash); sources.push(source);
  }
  const manifest = immutableJson({ ownerId: input.user.id, pipelineId: input.pipelineId, cutoffAt: input.cutoffAt,
    capturedAt: input.capturedAt, modelVersionId: input.modelVersionId, configurationRevisionId: input.configurationRevisionId,
    featureSetVersion: input.featureSetVersion, featureSchemaVersion: input.featureSchemaVersion, featureValues: input.featureValues,
    sources: sources.map(({ revisionVerified: _verified, ...source }) => source) } as Json);
  return Object.freeze({ manifest, contentHash: manifestHash(manifest) });
}
