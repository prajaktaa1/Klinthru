import { NextFunction, Router } from "express";

import { getAiReadinessSnapshot } from "../aiPredictions/readinessData";
import { evaluateAiPredictionsReadiness } from "../aiPredictions/readiness";
import { store } from "../data/store";
import { ownerScope } from "../lib/access";
import { createId } from "../lib/ids";
import { requireAuth } from "../middleware/auth";
import { AuthUser, ReportRecord, StoredAssessment } from "../types/domain";
import { createReportPdf, createReportWord } from "../utils/reportDocuments";
import { validateReportRequest } from "../validation/reportValidation";
import { assertNoDangerousKeys } from "../validation/validationErrors";
import { getScadaHistory, getScadaOverview } from "../utils/scadaData";

export const reportsRouter = Router();

reportsRouter.use(requireAuth);

reportsRouter.get("/scada-export", async (request, response, next) => {
  try {
    if (typeof request.query.pipelineId !== "string") return response.status(400).json({ message: "Pipeline ID is required" });
    const overview = await getScadaOverview(request.query.pipelineId, request.user!);
    if (request.query.format === "csv") {
      const ids = typeof request.query.tagIds === "string" ? request.query.tagIds.split(",") : [];
      if (!ids.length || ids.length > 5 || ids.some(id => !overview.tags.some(tag => tag.id === id))) return response.status(400).json({ message: "Select up to five accessible pipeline tags" });
      const date = (value: unknown) => typeof value === "string" ? new Date(value) : undefined;
      const start = date(request.query.start), end = date(request.query.end);
      if ((start && !Number.isFinite(start.getTime())) || (end && !Number.isFinite(end.getTime()))) return response.status(400).json({ message: "Invalid historical dates" });
      const histories = await Promise.all(ids.map(id => getScadaHistory(id, request.user!, Number(request.query.hours ?? 24), start, end, Number(request.query.resolutionMinutes ?? 5), String(request.query.aggregation ?? "Average"))));
      const cell = (value: unknown) => `"${(typeof value === "string" ? value.replace(/^[=+@-]/, "'$&") : String(value ?? "")).replaceAll('"', '""')}"`;
      const rows = ["Tag,Timestamp (UTC),Value,Units,Samples,Flagged Samples"];
      for (const history of histories) for (const point of history.points) rows.push([history.tagId, new Date(point.timestamp).toISOString(), point.value, history.engineeringUnit, point.samples, point.flaggedSamples].map(cell).join(","));
      response.setHeader("Content-Disposition", 'attachment; filename="scada-historical-data.csv"');
      return response.type("text/csv").send(rows.join("\r\n"));
    }
    const history = await Promise.all(overview.tags.map(tag => getScadaHistory(tag.id, request.user!, 24)));
    response.setHeader("Content-Disposition", 'attachment; filename="scada-operations.json"');
    response.json({ overview, history });
  } catch (error) { next(error); }
});

type ReportWorkspaceStatus = "available" | "partial" | "unavailable" | "blocked";

function isRiskLevel(value: string | undefined): value is StoredAssessment["riskLevel"] {
  return value === "High" || value === "Medium" || value === "Low";
}

function byNewestAssessmentDate(a: StoredAssessment, b: StoredAssessment) {
  const aDate = a.inspectionDate ?? a.createdAt;
  const bDate = b.inspectionDate ?? b.createdAt;
  return new Date(bDate).getTime() - new Date(aDate).getTime();
}

function byNewestCreatedAt<T extends { createdAt: string }>(a: T, b: T) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function countRiskLevels(assessments: StoredAssessment[]) {
  return assessments.reduce(
    (counts, assessment) => {
      if (isRiskLevel(assessment.riskLevel)) {
        counts[assessment.riskLevel.toLowerCase() as "high" | "medium" | "low"] += 1;
      } else {
        counts.unknown += 1;
      }
      return counts;
    },
    { high: 0, medium: 0, low: 0, unknown: 0 }
  );
}

function unavailable(status: ReportWorkspaceStatus, reason: string, source?: string) {
  return source ? { status, reason, source } : { status, reason };
}

async function toApiReport(report: ReportRecord, user: AuthUser) {
  const scope = ownerScope(user);
  const inspectionId = report.inspectionId ?? report.assessmentId;
  const [inspection, pipeline] = await Promise.all([
    inspectionId ? store.findAssessmentById(inspectionId, scope) : Promise.resolve(null),
    report.pipelineId ? store.findPipelineById(report.pipelineId, scope) : Promise.resolve(null)
  ]);

  return {
    ...report,
    inspectionDate: inspection?.inspectionDate,
    pipelineCode: pipeline?.pipelineCode
  };
}

reportsRouter.get("/", async (request, response) => {
  const reports = await store.listReports({
    pipelineName: typeof request.query.pipelineName === "string" ? request.query.pipelineName : undefined,
    reportId: typeof request.query.reportId === "string" ? request.query.reportId : undefined,
    pipelineId: typeof request.query.pipelineId === "string" ? request.query.pipelineId : undefined,
    ...ownerScope(request.user!)
  });
  response.json(await Promise.all(reports.map((report) => toApiReport(report, request.user!))));
});

reportsRouter.post("/", async (request, response, next: NextFunction) => {
  try {
    assertNoDangerousKeys(request.body);
    const body = validateReportRequest(request.body);
    const assessment = body.assessment as StoredAssessment;
    if (!assessment.pipelineId) {
      response.status(400).json({
        error: "Validation failed",
        fields: { pipelineId: "Select or create a pipeline before saving a report." }
      });
      return;
    }

    const pipeline = await store.findPipelineById(assessment.pipelineId, ownerScope(request.user!));
    if (!pipeline) {
      response.status(404).json({ message: "Pipeline not found." });
      return;
    }

    const assessmentId = body.assessmentId || assessment.id;
    if (!assessmentId) {
      response.status(400).json({
        error: "Validation failed",
        fields: { assessmentId: "A saved assessment ID is required before creating a report." }
      });
      return;
    }

    const inspection = await store.findAssessmentById(assessmentId, ownerScope(request.user!));
    if (!inspection) {
      response.status(404).json({ message: "Assessment not found." });
      return;
    }

    if (inspection.pipelineId !== pipeline.id) {
      response.status(400).json({
        error: "Validation failed",
        fields: { assessmentId: "Assessment must belong to the selected pipeline." }
      });
      return;
    }

    if (inspection.type !== assessment.type) {
      response.status(400).json({
        error: "Validation failed",
        fields: { "assessment.type": "Must match the saved assessment type." }
      });
      return;
    }

    const createdAt = new Date().toISOString();
    const report: ReportRecord = {
      id: createId("report"),
      assessmentId,
      inspectionId: inspection.id,
      assessmentType: assessment.type,
      pipelineId: assessment.pipelineId,
      pipelineName: assessment.pipelineName,
      riskLevel: assessment.riskLevel,
      input: assessment.input,
      result: assessment.result,
      generatedAt: createdAt,
      createdAt,
      authorId: request.user?.id
    };

    const created = await store.createReport(report);
    response.status(201).json(created);
  } catch (error) {
    next(error);
  }
});


reportsRouter.get("/workspace-data/:pipelineId", async (request, response, next: NextFunction) => {
  try {
    const scope = ownerScope(request.user!);
    const pipeline = await store.findPipelineById(request.params.pipelineId, scope);

    if (!pipeline) {
      response.status(404).json({ message: "Pipeline not found." });
      return;
    }

    const [allAssessments, reports, cpCalculations, aiSnapshot] = await Promise.all([
      store.listAssessments(scope),
      store.listReports({ pipelineId: pipeline.id, ...scope }),
      store.listCpCalculations({ pipelineId: pipeline.id, ...scope }),
      getAiReadinessSnapshot(request.user!)
    ]);

    const assessments = allAssessments
      .filter((assessment) => assessment.pipelineId === pipeline.id)
      .sort(byNewestAssessmentDate);
    const sortedReports = [...reports].sort(byNewestCreatedAt);
    const sortedCpCalculations = [...cpCalculations].sort(byNewestCreatedAt);
    const latestAssessment = assessments[0] ?? null;
    const latestReport = sortedReports[0] ?? null;
    const peakRiskAssessment = assessments.reduce<StoredAssessment | null>((peak, assessment) => {
      if (typeof assessment.riskScore !== "number") return peak;
      if (!peak || assessment.riskScore > peak.riskScore) return assessment;
      return peak;
    }, null);
    const aiReadiness = evaluateAiPredictionsReadiness(aiSnapshot);

    response.json({
      pipeline: {
        status: "available" as const,
        source: "Pipeline",
        data: {
          id: pipeline.id,
          pipelineCode: pipeline.pipelineCode,
          pipelineName: pipeline.pipelineName,
          location: pipeline.location ?? null,
          serviceOrProduct: pipeline.serviceOrProduct ?? null,
          pipeLengthKm: pipeline.pipeLengthKm ?? null,
          pipeInsideDiameter: pipeline.pipeInsideDiameter ?? null,
          pipeOutsideDiameter: pipeline.pipeOutsideDiameter ?? null,
          diameterUnit: pipeline.diameterUnit ?? null,
          pipeMaterial: pipeline.pipeMaterial ?? null,
          pipeMaterialOther: pipeline.pipeMaterialOther ?? null,
          pipeGrade: pipeline.pipeGrade ?? null,
          pipeGradeOther: pipeline.pipeGradeOther ?? null,
          smysMpa: pipeline.smysMpa ?? null,
          maopBar: pipeline.maopBar ?? null,
          nominalWallThickness: pipeline.nominalWallThickness ?? null,
          wallThicknessInputValue: pipeline.wallThicknessInputValue ?? null,
          wallThicknessUnit: pipeline.wallThicknessUnit ?? null,
          designPressure: pipeline.designPressure ?? null,
          operatingPressure: pipeline.operatingPressure ?? null,
          operatingPressureInputValue: pipeline.operatingPressureInputValue ?? null,
          operatingPressureUnit: pipeline.operatingPressureUnit ?? null,
          installationYear: pipeline.installationYear ?? null,
          inspectionYear: pipeline.inspectionYear ?? null,
          installationDate: pipeline.installationDate ?? null,
          designLife: pipeline.designLife ?? null,
          status: pipeline.status,
          createdAt: pipeline.createdAt,
          updatedAt: pipeline.updatedAt
        }
      },
      risk: {
        status: assessments.length ? "available" as const : "unavailable" as const,
        source: "Assessment",
        reason: assessments.length ? null : "no_assessments_for_pipeline",
        assessmentCount: assessments.length,
        counts: countRiskLevels(assessments),
        latestAssessment: latestAssessment
          ? {
              id: latestAssessment.id,
              type: latestAssessment.type,
              riskScore: latestAssessment.riskScore,
              riskLevel: isRiskLevel(latestAssessment.riskLevel) ? latestAssessment.riskLevel : null,
              inspectionDate: latestAssessment.inspectionDate ?? null,
              createdAt: latestAssessment.createdAt
            }
          : null,
        peakRisk: peakRiskAssessment
          ? {
              score: peakRiskAssessment.riskScore,
              riskLevel: isRiskLevel(peakRiskAssessment.riskLevel) ? peakRiskAssessment.riskLevel : null,
              assessmentId: peakRiskAssessment.id,
              semantics: "maximum persisted Assessment.riskScore for this pipeline"
            }
          : null
      },
      existingReports: {
        status: "available" as const,
        source: "Report",
        count: sortedReports.length,
        recent: sortedReports.slice(0, 5).map((report) => ({
          id: report.id,
          assessmentId: report.assessmentId,
          inspectionId: report.inspectionId ?? null,
          assessmentType: report.assessmentType,
          pipelineId: report.pipelineId ?? null,
          pipelineName: report.pipelineName,
          riskLevel: report.riskLevel,
          generatedAt: report.generatedAt,
          createdAt: report.createdAt,
          createdByName: report.createdByName ?? null
        }))
      },
      cpCalculations: {
        status: "available" as const,
        source: "CpCalculation",
        count: sortedCpCalculations.length,
        recent: sortedCpCalculations.slice(0, 5).map((calculation) => ({
          id: calculation.id,
          pipelineId: calculation.pipelineId,
          calculationType: calculation.calculationType,
          createdAt: calculation.createdAt,
          createdByName: calculation.createdByName ?? null
        })),
        note: "CP calculation history only; not CP monitoring survey, reading, rectifier, or compliance history."
      },
      aiReadiness: {
        status: "available" as const,
        source: "AIPredictionsReadiness",
        overallStatus: aiReadiness.overallStatus,
        readyCapabilities: aiReadiness.readyCapabilities,
        blockedCapabilities: aiReadiness.blockedCapabilities,
        capabilities: aiReadiness.capabilities
      },
      health: unavailable("unavailable", "health_score_not_implemented"),
      defects: unavailable("unavailable", "canonical_defect_source_not_implemented"),
      ili: unavailable("blocked", "ili_data_source_not_operational"),
      cpMonitoring: unavailable("blocked", "cp_monitoring_data_source_not_operational"),
      scada: unavailable("unavailable", "scada_telemetry_not_implemented"),
      aiPredictions: {
        status: "blocked" as const,
        source: "AIPredictionsReadiness",
        reason: "readiness_only_no_prediction_results_returned",
        readiness: {
          corrosionGrowth: aiReadiness.capabilities.corrosionGrowthForecasting.status,
          remainingUsefulLife: aiReadiness.capabilities.remainingUsefulLife.status,
          cpDrift: aiReadiness.capabilities.cpDriftPrediction.status,
          scadaAnomaly: aiReadiness.capabilities.scadaAnomalyDetection.status,
          defectPrediction: aiReadiness.capabilities.defectPrediction.status,
          modelConfidence: aiReadiness.capabilities.modelConfidence.status
        }
      },
      actions: unavailable("unavailable", "canonical_action_register_not_implemented"),
      delivery: unavailable("unavailable", "report_delivery_not_implemented")
    });
  } catch (error) {
    next(error);
  }
});

reportsRouter.get("/:id", async (request, response) => {
  const report = await store.findReportById(request.params.id, {
    ...ownerScope(request.user!)
  });

  if (!report) {
    response.status(404).json({ message: "Report not found." });
    return;
  }

  response.json(await toApiReport(report, request.user!));
});

reportsRouter.get("/:id/download/:format", async (request, response) => {
  const report = await store.findReportById(request.params.id, {
    ...ownerScope(request.user!)
  });

  if (!report) {
    response.status(404).json({ message: "Report not found." });
    return;
  }

  const safePipelineName =
    report.pipelineName.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "assessment-report";
  const scope = ownerScope(request.user!);
  const inspectionId = report.inspectionId ?? report.assessmentId;
  const [inspection, pipeline] = await Promise.all([
    inspectionId ? store.findAssessmentById(inspectionId, scope) : Promise.resolve(null),
    report.pipelineId ? store.findPipelineById(report.pipelineId, scope) : Promise.resolve(null)
  ]);
  const snapshotSource = { report, inspection, pipeline };

  if (request.params.format === "pdf") {
    const pdfBuffer = createReportPdf(snapshotSource);
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `attachment; filename="${safePipelineName}-${report.id}.pdf"`);
    response.send(pdfBuffer);
    return;
  }

  if (request.params.format === "word") {
    const wordBuffer = createReportWord(snapshotSource);
    response.setHeader("Content-Type", "application/msword");
    response.setHeader("Content-Disposition", `attachment; filename="${safePipelineName}-${report.id}.doc"`);
    response.send(wordBuffer);
    return;
  }

  response.status(400).json({ message: "Unsupported format." });
});

reportsRouter.delete("/:id", async (request, response, next: NextFunction) => {
  try {
    const deleted = await store.deleteReport(request.params.id, ownerScope(request.user!));
    if (!deleted) {
      response.status(404).json({ message: "Report not found." });
      return;
    }

    response.status(204).send();
  } catch (error) {
    next(error);
  }
});
