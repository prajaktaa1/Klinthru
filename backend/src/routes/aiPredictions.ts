import { Router } from "express";

import { getAiReadinessSnapshot } from "../aiPredictions/readinessData";
import { evaluateAiPredictionsReadiness } from "../aiPredictions/readiness";
import { getCorrosionGrowthForPipeline } from "../aiPredictions/corrosionGrowthData";
import { requireAuth } from "../middleware/auth";
import { createAiDevelopmentRouter } from "../aiPredictions/developmentRoutes";

export const aiPredictionsRouter = Router();

// Existing source reads may reveal private pipeline/engineering context.
aiPredictionsRouter.use((_request, response, next) => {
  response.set("Cache-Control", "private, no-store");
  next();
});
aiPredictionsRouter.use(requireAuth);

aiPredictionsRouter.get("/readiness", async (request, response, next) => {
  try {
    const snapshot = await getAiReadinessSnapshot(request.user!);
    response.json(evaluateAiPredictionsReadiness(snapshot));
  } catch (error) {
    next(error);
  }
});

aiPredictionsRouter.get("/corrosion-growth/:pipelineId", async (request, response, next) => {
  try {
    const featureId = typeof request.query.featureId === "string" ? request.query.featureId.trim() || undefined : undefined;
    response.json(await getCorrosionGrowthForPipeline(request.params.pipelineId, featureId, request.user!));
  } catch (error) {
    next(error);
  }
});

// Additive development contracts; legacy readiness/history routes remain unchanged.
aiPredictionsRouter.use(createAiDevelopmentRouter());
