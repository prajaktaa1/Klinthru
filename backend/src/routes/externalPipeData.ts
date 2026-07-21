import { NextFunction, Router } from "express";

import { store } from "../data/store";
import { requireAuth } from "../middleware/auth";
import { StoredAssessment } from "../types/domain";
import { validateNewAssessmentSubmission } from "../validation/assessmentValidation";
import { assertNoDangerousKeys, createValidationError } from "../validation/validationErrors";
import { createAssessmentPipeDataPdf, createAssessmentPipeDataWord } from "../utils/externalPipeDataDocuments";

export const externalPipeDataRouter = Router();

externalPipeDataRouter.use(requireAuth);

externalPipeDataRouter.get("/", async (request, response) => {
  const records = await store.listExternalPipeData({
    assessmentType: typeof request.query.assessmentType === "string" ? request.query.assessmentType as "External" | "Internal" | "All" : undefined,
    pipelineName: typeof request.query.pipelineName === "string" ? request.query.pipelineName : undefined,
    pipeId: typeof request.query.pipeId === "string" ? request.query.pipeId : undefined,
    locationId: typeof request.query.locationId === "string" ? request.query.locationId : undefined,
    savedDate: typeof request.query.savedDate === "string" ? request.query.savedDate : undefined
  });

  response.json(records);
});

externalPipeDataRouter.get("/:id", async (request, response) => {
  const record = await store.findExternalPipeDataById(request.params.id);
  if (!record) {
    response.status(404).json({ message: "Record not found." });
    return;
  }

  response.json(record);
});

externalPipeDataRouter.post("/", async (request, response, next: NextFunction) => {
  try {
    assertNoDangerousKeys(request.body);
    const assessment = validatePipeDataAssessment(request.body);
    const created = await store.saveExternalPipeData({
      assessment,
      authorId: request.user?.id
    });

    response.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

externalPipeDataRouter.put("/:id", async (request, response, next: NextFunction) => {
  try {
    assertNoDangerousKeys(request.body);
    const existing = await store.findExternalPipeDataById(request.params.id);
    if (!existing) {
      response.status(404).json({ message: "Record not found." });
      return;
    }

    const assessment = validatePipeDataAssessment(request.body);
    const updated = await store.saveExternalPipeData({
      id: request.params.id,
      assessment,
      authorId: request.user?.id
    });

    response.json(updated);
  } catch (error) {
    next(error);
  }
});

externalPipeDataRouter.get("/:id/download/:format", async (request, response) => {
  const record = await store.findExternalPipeDataById(request.params.id);
  if (!record) {
    response.status(404).json({ message: "Record not found." });
    return;
  }

  const safePipelineName = record.pipelineName.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "assessment-pipe-data";

  if (request.params.format === "pdf") {
    const pdfBuffer = createAssessmentPipeDataPdf(record);
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `attachment; filename="${safePipelineName}.pdf"`);
    response.send(pdfBuffer);
    return;
  }

  if (request.params.format === "word") {
    const wordBuffer = createAssessmentPipeDataWord(record);
    response.setHeader("Content-Type", "application/msword");
    response.setHeader("Content-Disposition", `attachment; filename="${safePipelineName}.doc"`);
    response.send(wordBuffer);
    return;
  }

  response.status(400).json({ message: "Unsupported format." });
});

function validatePipeDataAssessment(value: unknown): StoredAssessment {
  const parsed = validateNewAssessmentSubmission(value) as StoredAssessment;
  if (parsed.type !== "External" && parsed.type !== "Internal") {
    throw createValidationError({
      type: "Only External or Internal assessment data can be saved in pipe data history."
    });
  }

  return parsed;
}
