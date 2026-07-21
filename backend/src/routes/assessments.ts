import { NextFunction, Router } from "express";

import { store } from "../data/store";
import { createId } from "../lib/ids";
import { requireAuth } from "../middleware/auth";
import { StoredAssessment } from "../types/domain";
import { validateNewAssessmentSubmission } from "../validation/assessmentValidation";
import { assertNoDangerousKeys } from "../validation/validationErrors";

export const assessmentsRouter = Router();

assessmentsRouter.use(requireAuth);

assessmentsRouter.get("/", async (_request, response) => {
  const assessments = await store.listAssessments();
  response.json(assessments);
});

assessmentsRouter.post("/", async (request, response, next: NextFunction) => {
  try {
    assertNoDangerousKeys(request.body);
    const incoming = validateNewAssessmentSubmission(request.body);
    const assessment: StoredAssessment = {
      id: incoming.id || createId("assessment"),
      type: incoming.type,
      pipelineName: incoming.pipelineName,
      createdAt: incoming.createdAt || new Date().toISOString(),
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
