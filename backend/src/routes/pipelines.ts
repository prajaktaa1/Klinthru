import { parseKp } from "../coreEngine/chainage/ChainageAgent";
import { createValidationError } from "../validation/validationErrors";
import { NextFunction, Router } from "express";

import { store } from "../data/store";
import { ownerScope, canModifyMasterData } from "../lib/access";
import { requireAuth } from "../middleware/auth";
import { validatePipelineInput } from "../validation/pipelineValidation";
import { assertNoDangerousKeys } from "../validation/validationErrors";

export const pipelinesRouter = Router();

pipelinesRouter.use(requireAuth);

pipelinesRouter.get("/", async (request, response) => {
  const pipelines = await store.listPipelines({
    search: typeof request.query.search === "string" ? request.query.search : undefined,
    ...ownerScope(request.user!)
  });
  response.json(pipelines);
});

pipelinesRouter.post("/", async (request, response, next: NextFunction) => {
  try {
    assertNoDangerousKeys(request.body);
    const input = validatePipelineInput(request.body);
    if (input.routeGeometry && !canModifyMasterData(request.user!)) { response.status(403).json({ message: "Route import requires Admin or Engineer permission." }); return; }
    const created = await store.createPipeline({
      pipeline: input,
      createdById: request.user?.id
    });
    response.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

pipelinesRouter.get("/:id", async (request, response) => {
  const pipeline = await store.findPipelineById(request.params.id, ownerScope(request.user!));
  if (!pipeline) {
    response.status(404).json({ message: "Pipeline not found." });
    return;
  }

  response.json(pipeline);
});

pipelinesRouter.put("/:id", async (request, response, next: NextFunction) => {
  try {
    assertNoDangerousKeys(request.body);
    const existing = await store.findPipelineById(request.params.id, ownerScope(request.user!));
    if (!existing) {
      response.status(404).json({ message: "Pipeline not found." });
      return;
    }

    const input = validatePipelineInput(request.body);
    if (input.routeGeometry !== undefined && JSON.stringify(input.routeGeometry?.coordinates ?? null) !== JSON.stringify(existing.routeGeometry?.coordinates ?? null) && !canModifyMasterData(request.user!)) { response.status(403).json({ message: "Route editing requires Admin or Engineer permission." }); return; }
    if (input.pipeLengthKm !== undefined && input.pipeLengthKm !== existing.pipeLengthKm) {
      const scope = ownerScope(request.user!);
      const [assets, segments] = await Promise.all([store.listAssets({ pipelineId: existing.id, ...scope }), store.listSegments({ pipelineId: existing.id, ...scope })]);
      const locations = [...assets.map(asset => asset.kp), ...segments.flatMap(segment => [segment.startKp, segment.endKp])].filter((value): value is string => Boolean(value?.trim()));
      if (locations.some(value => parseKp(value).kilometers > input.pipeLengthKm!)) throw createValidationError({ pipeLengthKm: "Pipeline length cannot exclude saved segment or asset chainages." });
    }
    const updated = await store.updatePipeline(request.params.id, {
      pipeline: input,
      createdById: existing.createdById
    });
    response.json(updated);
  } catch (error) {
    next(error);
  }
});

pipelinesRouter.delete("/:id", async (request, response, next: NextFunction) => {
  try {
    const existing = await store.findPipelineById(request.params.id, ownerScope(request.user!));
    if (!existing) {
      response.status(404).json({ message: "Pipeline not found." });
      return;
    }
    await store.deletePipeline(request.params.id, ownerScope(request.user!));
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

pipelinesRouter.get("/:id/history", async (request, response) => {
  const history = await store.getPipelineHistory(request.params.id, ownerScope(request.user!));
  if (!history) {
    response.status(404).json({ message: "Pipeline not found." });
    return;
  }

  response.json(history);
});
