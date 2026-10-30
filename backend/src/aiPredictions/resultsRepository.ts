import type { AuthUser } from "../types/domain";
import { AiContractError } from "./contracts";

type ReadDatabase = { $queryRawUnsafe<T>(sql: string, ...values: unknown[]): Promise<T> };
const resources = { results: "AiPrediction", forecasts: "AiForecast", recommendations: "AiRecommendation", scenarios: "AiScenario",
  runs: "AiModelRun", snapshots: "AiInputSnapshot", models: "AiModel", versions: "AiModelVersion", configuration: "AiConfigurationRevision", performance: "AiModelValidation" } as const;
export type AiResource = keyof typeof resources;
export type SourceAccess = (user: AuthUser, pipelineId: string, sources: Record<string, unknown>[]) => Promise<boolean>;
/** SELECT-only reader. No fallback to demo, native assessment rows, readiness counts or zero metrics. */
export function createAiResultsRepository(database: () => ReadDatabase | null, sourceAccess: SourceAccess) {
  return { async read(resource: AiResource, user: AuthUser, pipelineId: string, id?: string, modelId?: string) {
    const db = database();
    if (!db) throw new AiContractError("ai_storage_unavailable", 503, "AI schema/client deployment is not verified.");
    const table = resources[resource];
    const global = ["models", "versions", "configuration"].includes(resource);
    const values: unknown[] = [user.id];
    const conditions = ['t."ownerId" = $1'];
    if (!global) { values.push(pipelineId); conditions.push(`t."pipelineId" = $${values.length}`); }
    if (id) { values.push(id); conditions.push(`t.id = $${values.length}`); }
    if (modelId) {
      values.push(modelId);
      if (resource === "versions") conditions.push(`t."modelId" = $${values.length}`);
      else if (resource === "performance") conditions.push(`EXISTS (SELECT 1 FROM public."AiModelVersion" v WHERE v.id = t."modelVersionId" AND v."ownerId" = $1 AND v."modelId" = $${values.length})`);
      else throw new AiContractError("ai_model_filter_invalid", 400, "Model filter is not supported for this resource.");
    }
    let rows: Record<string, unknown>[];
    try { rows = await db.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT to_jsonb(t) AS item FROM public."${table}" t WHERE ${conditions.join(" AND ")} ORDER BY t."createdAt", t.id`, ...values); }
    catch { throw new AiContractError("ai_storage_unavailable", 503, "Authoritative AI records are unavailable."); }
    const items: Record<string, unknown>[] = [];
    for (const row of rows) {
      const item = row.item as Record<string, unknown>;
      if (!item || item.ownerId !== user.id || (!global && item.pipelineId !== pipelineId)) throw new AiContractError("ai_scope_mismatch", 503, "AI record scope is inconsistent.");
      if (!global) {
        const snapshotId = resource === "snapshots" ? item.id : item.snapshotId;
        const runId = resource === "runs" ? item.id : (item.runId ?? item.scenarioRunId ?? item.evaluationRunId);
        const snapshots = snapshotId ? [{ snapshotId }] : runId ? await db.$queryRawUnsafe<Record<string, unknown>[]>(
          'SELECT "snapshotId" FROM public."AiModelRun" WHERE id = $1 AND "ownerId" = $2 AND "pipelineId" = $3', runId, user.id, pipelineId) : [];
        if (snapshots.length !== 1) throw new AiContractError("ai_lineage_unavailable", 503, "Exact run/snapshot lineage is unavailable.");
        const sources = await db.$queryRawUnsafe<Record<string, unknown>[]>(
          'SELECT "sourceModule", "sourceType", "sourceRecordId", "sourceRevision", "observedAt", "availableAt", "sourceHash" FROM public."AiSnapshotSource" WHERE "snapshotId" = $1 AND "ownerId" = $2', snapshots[0].snapshotId, user.id);
        if (!sources.length || !await sourceAccess(user, pipelineId, sources)) throw new AiContractError("ai_source_access_unavailable", 403, "Current original-source authorization is required.");
      }
      items.push(item);
    }
    if (id && !items.length) throw new AiContractError("ai_record_unavailable", 404, "AI record unavailable.");
    return { status: "available", items, nextCursor: null, availability: "saved_records_only" };
  } };
}
