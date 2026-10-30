import { Router } from "express";

import { store } from "../data/store";
import { ownerScope } from "../lib/access";
import { requireAuth } from "../middleware/auth";
import { getIliReadinessForPipeline } from "../ili/readiness";
import { listIliAnomaliesForPipeline, listIliAssessmentResultsForPipeline, listIliRunsForPipeline } from "../ili/data";

export const iliRouter = Router();

iliRouter.use(requireAuth);

iliRouter.get("/readiness/:pipelineId", async (request, response, next) => {
  try {
    const pipeline = await store.findPipelineById(request.params.pipelineId, ownerScope(request.user!));
    if (!pipeline) {
      response.status(404).json({ message: "Pipeline not found." });
      return;
    }

    response.json(await getIliReadinessForPipeline(pipeline.id, request.user!));
  } catch (error) {
    next(error);
  }
});

async function requirePipelineAccess(pipelineId: string, user: NonNullable<Express.Request["user"]>) {
  return store.findPipelineById(pipelineId, ownerScope(user));
}

iliRouter.get("/runs/:pipelineId", async (request, response, next) => {
  try {
    const pipeline = await requirePipelineAccess(request.params.pipelineId, request.user!);
    if (!pipeline) {
      response.status(404).json({ message: "Pipeline not found." });
      return;
    }

    response.json(await listIliRunsForPipeline(pipeline.id, request.user!));
  } catch (error) {
    next(error);
  }
});

iliRouter.get("/anomalies/:pipelineId", async (request, response, next) => {
  try {
    const pipeline = await requirePipelineAccess(request.params.pipelineId, request.user!);
    if (!pipeline) {
      response.status(404).json({ message: "Pipeline not found." });
      return;
    }

    response.json(await listIliAnomaliesForPipeline(pipeline.id, request.user!));
  } catch (error) {
    next(error);
  }
});

iliRouter.get("/assessment-results/:pipelineId", async (request, response, next) => {
  try {
    const pipeline = await requirePipelineAccess(request.params.pipelineId, request.user!);
    if (!pipeline) {
      response.status(404).json({ message: "Pipeline not found." });
      return;
    }

    response.json(await listIliAssessmentResultsForPipeline(pipeline.id, request.user!));
  } catch (error) {
    next(error);
  }
});
