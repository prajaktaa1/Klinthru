import { NextFunction, Router } from "express";

import { store } from "../data/store";
import { createId } from "../lib/ids";
import { ownerScope } from "../lib/access";
import { requireAuth } from "../middleware/auth";
import { StoredAssessment } from "../types/domain";
import { validateNewAssessmentSubmission } from "../validation/assessmentValidation";
import { assertNoDangerousKeys } from "../validation/validationErrors";

export const assessmentsRouter = Router();

assessmentsRouter.use(requireAuth);

assessmentsRouter.get("/", async (request, response) => {
  const assessments = await store.listAssessments(ownerScope(request.user!));
  response.json(assessments);
});

assessmentsRouter.get("/:id", async (request, response) => {
  const assessment = await store.findAssessmentById(request.params.id, ownerScope(request.user!));
  if (!assessment) {
    response.status(404).json({ message: "Assessment not found." });
    return;
  }

  response.json(assessment);
});

assessmentsRouter.post("/", async (request, response, next: NextFunction) => {
  try {
    assertNoDangerousKeys(request.body);
    const incoming = validateNewAssessmentSubmission(request.body);
    if (!incoming.pipelineId) {
      response.status(400).json({
        error: "Validation failed",
        fields: { pipelineId: "Select or create a pipeline before saving an assessment." }
      });
      return;
    }

    const pipeline = await store.findPipelineById(incoming.pipelineId, ownerScope(request.user!));
    if (!pipeline) {
      response.status(404).json({ message: "Pipeline not found." });
      return;
    }

    const receivedAt = new Date().toISOString();
    const assessment: StoredAssessment = {
      id: incoming.id || createId("assessment"),
      type: incoming.type,
      pipelineId: incoming.pipelineId,
      pipelineName: incoming.pipelineName,
      createdAt: incoming.createdAt || receivedAt,
      inspectionDate: incoming.inspectionDate ? new Date(incoming.inspectionDate).toISOString() : receivedAt,
      riskLevel: incoming.riskLevel,
      riskScore: incoming.riskScore,
      input: incoming.input as StoredAssessment["input"],
      result: incoming.result as StoredAssessment["result"],
      authorId: request.user?.id
    };

    const created = await store.createAssessment(assessment);
    response.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

assessmentsRouter.delete("/:id", async (request, response, next: NextFunction) => {
  try {
    const deleted = await store.deleteAssessment(request.params.id, ownerScope(request.user!));
    if (!deleted) {
      response.status(404).json({ message: "Assessment not found." });
      return;
    }

    response.status(204).send();
  } catch (error) {
    next(error);
  }
});
