import { NextFunction, Router } from "express";

import { store } from "../data/store";
import { ownerScope } from "../lib/access";
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
    pipelineId: typeof request.query.pipelineId === "string" ? request.query.pipelineId : undefined,
    pipelineName: typeof request.query.pipelineName === "string" ? request.query.pipelineName : undefined,
    pipeId: typeof request.query.pipeId === "string" ? request.query.pipeId : undefined,
    locationId: typeof request.query.locationId === "string" ? request.query.locationId : undefined,
    inspectionYear: typeof request.query.inspectionYear === "string" ? request.query.inspectionYear : undefined,
    savedDate: typeof request.query.savedDate === "string" ? request.query.savedDate : undefined,
    ...ownerScope(request.user!)
  });

  response.json(records);
});

externalPipeDataRouter.get("/:id", async (request, response) => {
  const record = await store.findExternalPipeDataById(request.params.id, ownerScope(request.user!));
  if (!record) {
    response.status(404).json({ message: "Record not found." });
    return;
  }

  response.json(record);
});

externalPipeDataRouter.post("/", async (request, response, next: NextFunction) => {
  try {
    assertNoDangerousKeys(request.body);
    const pipeDataRequest = validatePipeDataRequest(request.body);
    const { assessment } = pipeDataRequest;
    if (!assessment.id?.trim()) {
      response.status(400).json({
        error: "Validation failed",
        fields: { id: "A stable assessment ID is required before saving pipe data." }
      });
      return;
    }

    if (!assessment.pipelineId) {
      response.status(400).json({
        error: "Validation failed",
        fields: { pipelineId: "Select or create a pipeline before saving pipe data." }
      });
      return;
    }

    const pipeline = await store.findPipelineById(assessment.pipelineId, ownerScope(request.user!));
    if (!pipeline) {
      response.status(404).json({ message: "Pipeline not found." });
      return;
    }

    const created = await store.saveExternalPipeData({
      assessment,
      authorId: request.user?.id
    });

    response.status(201).json(created);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "PIPE_DATA_ASSESSMENT_ID_OWNER_MISMATCH") {
      response.status(409).json({ message: "Pipe data assessment ID already exists." });
      return;
    }

    next(error);
  }
});

externalPipeDataRouter.put("/:id", async (request, response, next: NextFunction) => {
  try {
    assertNoDangerousKeys(request.body);
    const existing = await store.findExternalPipeDataById(request.params.id, ownerScope(request.user!));
    if (!existing) {
      response.status(404).json({ message: "Record not found." });
      return;
    }

    const pipeDataRequest = validatePipeDataRequest(request.body);
    const { assessment } = pipeDataRequest;
    if (!assessment.pipelineId) {
      response.status(400).json({
        error: "Validation failed",
        fields: { pipelineId: "Select or create a pipeline before saving pipe data." }
      });
      return;
    }

    const pipeline = await store.findPipelineById(assessment.pipelineId, ownerScope(request.user!));
    if (!pipeline) {
      response.status(404).json({ message: "Pipeline not found." });
      return;
    }

    const updated = await store.saveExternalPipeData({
      id: request.params.id,
      assessment,
      authorId: request.user?.id
    });

    response.json(updated);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "PIPE_DATA_ASSESSMENT_ID_OWNER_MISMATCH") {
      response.status(409).json({ message: "Pipe data assessment ID already exists." });
      return;
    }

    next(error);
  }
});

externalPipeDataRouter.get("/:id/download/:format", async (request, response) => {
  const record = await store.findExternalPipeDataById(request.params.id, ownerScope(request.user!));
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

externalPipeDataRouter.delete("/:id", async (request, response, next: NextFunction) => {
  try {
    const deleted = await store.deleteExternalPipeData(request.params.id, ownerScope(request.user!));
    if (!deleted) {
      response.status(404).json({ message: "Record not found." });
      return;
    }

    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

function validatePipeDataRequest(value: unknown): {
  assessment: StoredAssessment;
  source: "Manual" | "Document";
} {
  if (value && typeof value === "object" && "assessment" in value) {
    const body = value as {
      assessment?: unknown;
      source?: unknown;
      pipelineMasterDataUpdateConfirmed?: unknown;
    };
    const source = body.source === "Document" ? "Document" : "Manual";
    if (source === "Document" && body.pipelineMasterDataUpdateConfirmed !== true) {
      throw createValidationError({
        pipelineMasterDataUpdateConfirmed:
          "Confirm document-extracted values before saving pipe data history."
      });
    }

    return {
      assessment: validatePipeDataAssessment(body.assessment),
      source
    };
  }

  return {
    assessment: validatePipeDataAssessment(value),
    source: "Manual"
  };
}

function validatePipeDataAssessment(value: unknown): StoredAssessment {
  const parsed = validateNewAssessmentSubmission(value) as StoredAssessment;
  if (parsed.type !== "External" && parsed.type !== "Internal") {
    throw createValidationError({
      type: "Only External or Internal assessment data can be saved in pipe data history."
    });
  }

  return parsed;
}
