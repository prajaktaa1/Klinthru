import { NextFunction, Router } from "express";

import { store } from "../data/store";
import { ownerScope } from "../lib/access";
import { requireAuth } from "../middleware/auth";
import { validateCpCalculationInput } from "../validation/pipelineValidation";
import { assertNoDangerousKeys } from "../validation/validationErrors";

export const cpCalculationsRouter = Router();

cpCalculationsRouter.use(requireAuth);

cpCalculationsRouter.get("/", async (request, response) => {
  const records = await store.listCpCalculations({
    pipelineId: typeof request.query.pipelineId === "string" ? request.query.pipelineId : undefined,
    ...ownerScope(request.user!)
  });
  response.json(records);
});

cpCalculationsRouter.post("/", async (request, response, next: NextFunction) => {
  try {
    assertNoDangerousKeys(request.body);
    const input = validateCpCalculationInput(request.body);
    const pipeline = await store.findPipelineById(input.pipelineId, ownerScope(request.user!));
    if (!pipeline) {
      response.status(404).json({ message: "Pipeline not found." });
      return;
    }

    const created = await store.createCpCalculation({
      calculation: input,
      authorId: request.user?.id,
      viewerUserId: request.user?.id,
      viewerRole: request.user?.role
    });
    response.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

cpCalculationsRouter.get("/:id", async (request, response) => {
  const record = await store.findCpCalculationById(request.params.id, ownerScope(request.user!));
  if (!record) {
    response.status(404).json({ message: "CP calculation not found." });
    return;
  }

  response.json(record);
});
