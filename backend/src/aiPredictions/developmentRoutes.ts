import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import type { AuthUser } from "../types/domain";
import { AiContractError, aiOwnerDestinations, identity, runInput, scenarioInput, decisionInput } from "./contracts";
import { authorizeAi, type AiGrant, type AiAction } from "./permissions";
import { createAiResultsRepository, type AiResource } from "./resultsRepository";

type Dependencies = { grants: (user: AuthUser) => Promise<readonly AiGrant[]>;
  pipelineAccess: (user: AuthUser, pipelineId: string) => Promise<boolean>;
  repository: ReturnType<typeof createAiResultsRepository>; now: () => Date };
const defaultDependencies: Dependencies = { grants: async () => [], pipelineAccess: async () => false,
  repository: createAiResultsRepository(() => null, async () => false), now: () => new Date() };
/** Development contracts only. No runtime DB/policy/engine provider is enabled by this approval. */
export function createAiDevelopmentRouter(deps: Dependencies = defaultDependencies) {
  const router = Router();
  router.use((_req,res,next) => { res.set("Cache-Control", "private, no-store"); next(); });
  router.use(requireAuth);
  async function scope(user: AuthUser, pipelineId: string, action: AiAction) {
    const grant = authorizeAi(user, action, pipelineId, await deps.grants(user), deps.now());
    if (!await deps.pipelineAccess(user, pipelineId)) throw new AiContractError("ai_scope_unavailable", 404, "Authorized pipeline unavailable.");
    return grant;
  }
  const query = z.object({ pipelineId: identity }).strict();
  const reads: Array<[string, AiResource]> = [["/results","results"],["/results/:id","results"],["/forecasts","forecasts"],
    ["/recommendations","recommendations"],["/scenarios","scenarios"],["/runs/:id","runs"],["/snapshots/:id","snapshots"],
    ["/models","models"],["/models/:modelId/versions","versions"],["/models/:modelId/performance","performance"],["/configuration","configuration"]];
  for (const [path, resource] of reads) router.get(path, async (req,res,next) => {
    try {
      const parsed = query.safeParse(req.query);
      if (!parsed.success) throw new AiContractError("ai_query_invalid", 400, "An exact pipelineId is required; unsupported filters are not silently ignored.");
      await scope(req.user!, parsed.data.pipelineId, "read");
      const id = req.params.id;
      const modelId = req.params.modelId;
      if ((id !== undefined && typeof id !== "string") || (modelId !== undefined && typeof modelId !== "string")) throw new AiContractError("ai_identity_invalid", 400, "One exact record identity is required.");
      res.json(await deps.repository.read(resource, req.user!, parsed.data.pipelineId, id, modelId));
    } catch (error) { next(error); }
  });
  const mutations: Array<[string,AiAction,z.ZodType]> = [["/runs","run",runInput],["/scenarios","run",scenarioInput],
    ["/models/:modelId/retraining-candidates","retrain",z.object({ pipelineId: identity, datasetSnapshotId: identity, configurationRevisionId: identity }).strict()],
    ["/models/:modelId/versions/:versionId/decisions","promote",decisionInput.extend({ pipelineId: identity })],
    ["/results/:id/reviews","review",z.object({ pipelineId: identity, decision: identity, expectedSequence: z.number().int().nonnegative(), reason: identity }).strict()],
    ["/recommendations/:id/reviews","accept",z.object({ pipelineId: identity, decision: identity, expectedSequence: z.number().int().nonnegative(), reason: identity }).strict()],
    ["/configuration/revisions","configure",z.object({ pipelineId: identity, modelVersionId: identity, settingsSchemaVersion: identity, settings: z.json() }).strict()],
    ["/configuration/revisions/:id/decisions","approve",z.object({ pipelineId: identity, expectedSequence: z.number().int().nonnegative(), reason: identity }).strict()]];
  for (const [path,action,schema] of mutations) router.post(path, async (req,_res,next) => {
    try {
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) throw new AiContractError("ai_input_invalid", 400, "AI request does not match the approved development contract.");
      if ((path === "/runs" || path === "/scenarios" || path.endsWith("/retraining-candidates")) && !identity.safeParse(req.get("Idempotency-Key")).success)
        throw new AiContractError("idempotency_key_required", 400, "Idempotency-Key is required for execution requests.");
      const data = parsed.data as { pipelineId: string; action?: "approve" | "promote" | "retire" };
      await scope(req.user!, data.pipelineId, path.includes("/versions/") && data.action ? data.action : action);
      throw new AiContractError("ai_execution_not_enabled", 423, "Verified storage, approved model/engineering criteria and independent named policy are required. No record changed.");
    } catch (error) { next(error); }
  });
  router.use((error: unknown,_req: import("express").Request,res: import("express").Response,next: import("express").NextFunction) => {
    if (!(error instanceof AiContractError)) { next(error); return; }
    res.status(error.status).json({ status: "blocked", code: error.code, message: error.message, items: null, owners: aiOwnerDestinations });
  });
  return router;
}
