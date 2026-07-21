import { NextFunction, Router } from "express";

import { store } from "../data/store";
import { createId } from "../lib/ids";
import { requireAuth } from "../middleware/auth";
import { ReportRecord, StoredAssessment } from "../types/domain";
import { createReportPdf, createReportWord } from "../utils/reportDocuments";
import { validateReportRequest } from "../validation/reportValidation";
import { assertNoDangerousKeys } from "../validation/validationErrors";

export const reportsRouter = Router();

reportsRouter.use(requireAuth);

reportsRouter.get("/", async (request, response) => {
  const reports = await store.listReports({
    pipelineName: typeof request.query.pipelineName === "string" ? request.query.pipelineName : undefined,
    reportId: typeof request.query.reportId === "string" ? request.query.reportId : undefined,
    viewerUserId: request.user?.id,
    viewerRole: request.user?.role
  });
  response.json(reports);
});

reportsRouter.post("/", async (request, response, next: NextFunction) => {
  try {
    assertNoDangerousKeys(request.body);
    const body = validateReportRequest(request.body);
    const assessment = body.assessment as StoredAssessment;

    const report: ReportRecord = {
      id: createId("report"),
      assessmentId: body.assessmentId || assessment.id || createId("assessment"),
      assessmentType: assessment.type,
      pipelineName: assessment.pipelineName,
      riskLevel: assessment.riskLevel,
      input: assessment.input,
      result: assessment.result,
      generatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      authorId: request.user?.id
    };

    const created = await store.createReport(report);
    response.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

reportsRouter.get("/:id", async (request, response) => {
  const report = await store.findReportById(request.params.id, {
    viewerUserId: request.user?.id,
    viewerRole: request.user?.role
  });

  if (!report) {
    response.status(404).json({ message: "Report not found." });
    return;
  }

  response.json(report);
});

reportsRouter.get("/:id/download/:format", async (request, response) => {
  const report = await store.findReportById(request.params.id, {
    viewerUserId: request.user?.id,
    viewerRole: request.user?.role
  });

  if (!report) {
    response.status(404).json({ message: "Report not found." });
    return;
  }

  const safePipelineName =
    report.pipelineName.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "assessment-report";

  if (request.params.format === "pdf") {
    const pdfBuffer = createReportPdf(report);
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `attachment; filename="${safePipelineName}-${report.id}.pdf"`);
    response.send(pdfBuffer);
    return;
  }

  if (request.params.format === "word") {
    const wordBuffer = createReportWord(report);
    response.setHeader("Content-Type", "application/msword");
    response.setHeader("Content-Disposition", `attachment; filename="${safePipelineName}-${report.id}.doc"`);
    response.send(wordBuffer);
    return;
  }

  response.status(400).json({ message: "Unsupported format." });
});
