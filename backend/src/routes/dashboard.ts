import { Router } from "express";

import { getAiReadinessSnapshot } from "../aiPredictions/readinessData";
import { evaluateAiPredictionsReadiness } from "../aiPredictions/readiness";
import { store } from "../data/store";
import { ownerScope } from "../lib/access";
import { getPrismaClient } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { AuthUser, CpCalculationRecord, PipelineRecord, ReportRecord, RiskLevel, StoredAssessment } from "../types/domain";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

type DashboardStatus =
  | "available"
  | "not_connected"
  | "unavailable"
  | "no_readings"
  | "migration_pending"
  | "not_calculated"
  | "not_configured"
  | "blocked";

type CountRow = { count: number };
type ExistsRow = { exists: boolean };

type TimelineItem = {
  id: string;
  type: "assessment" | "report" | "cp_calculation";
  title: string;
  timestamp: string;
  pipelineId: string;
  routeLink?: string;
  riskLevel?: string;
  status: DashboardStatus;
};

function isRiskLevel(value: string | undefined): value is RiskLevel {
  return value === "High" || value === "Medium" || value === "Low";
}

function byNewestTimestamp<T extends { timestamp: string }>(a: T, b: T) {
  return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
}

function latestAssessmentDate(assessment: StoredAssessment) {
  return assessment.inspectionDate ?? assessment.createdAt;
}

function compareAssessmentsByReliableDate(a: StoredAssessment, b: StoredAssessment) {
  return new Date(latestAssessmentDate(b)).getTime() - new Date(latestAssessmentDate(a)).getTime();
}

function compareReportsByReliableDate(a: ReportRecord, b: ReportRecord) {
  return new Date(b.generatedAt ?? b.createdAt).getTime() - new Date(a.generatedAt ?? a.createdAt).getTime();
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function calculateMaopUtilisation(pipeline: PipelineRecord) {
  const maopBar = pipeline.maopBar;
  const operatingPressure = pipeline.operatingPressure;
  const operatingPressureUnit = pipeline.operatingPressureUnit?.trim().toLowerCase();
  const compatibleUnit = !operatingPressureUnit || operatingPressureUnit === "bar" || operatingPressureUnit === "barg";

  if (!finiteNumber(maopBar) || !finiteNumber(operatingPressure)) {
    return {
      status: "not_calculated" as const,
      value: null,
      unit: "%",
      reason: "MAOP utilisation requires stored MAOP and operating pressure values."
    };
  }

  if (!compatibleUnit) {
    return {
      status: "unavailable" as const,
      value: null,
      unit: "%",
      reason: `Operating pressure unit '${pipeline.operatingPressureUnit}' is not confirmed compatible with MAOP in bar.`
    };
  }

  if (maopBar <= 0) {
    return {
      status: "not_calculated" as const,
      value: null,
      unit: "%",
      reason: "MAOP must be greater than zero to calculate utilisation."
    };
  }

  return {
    status: "available" as const,
    value: Number(((operatingPressure / maopBar) * 100).toFixed(2)),
    unit: "%",
    reason: "Calculated from stored operating pressure and MAOP."
  };
}

function toPipelineInfo(pipeline: PipelineRecord) {
  return {
    id: pipeline.id,
    pipelineCode: pipeline.pipelineCode,
    pipelineName: pipeline.pipelineName,
    location: pipeline.location ?? null,
    serviceOrProduct: pipeline.serviceOrProduct ?? null,
    pipeMaterial: pipeline.pipeMaterial ?? null,
    pipeMaterialOther: pipeline.pipeMaterialOther ?? null,
    pipeGrade: pipeline.pipeGrade ?? null,
    pipeGradeOther: pipeline.pipeGradeOther ?? null,
    pipeLengthKm: pipeline.pipeLengthKm ?? null,
    diameter: {
      inside: pipeline.pipeInsideDiameter ?? null,
      outside: pipeline.pipeOutsideDiameter ?? null,
      unit: pipeline.diameterUnit ?? null
    },
    wallThickness: {
      value: pipeline.wallThicknessInputValue ?? pipeline.nominalWallThickness ?? null,
      unit: pipeline.wallThicknessUnit ?? null
    },
    maopBar: pipeline.maopBar ?? null,
    operatingPressure: pipeline.operatingPressure ?? null,
    operatingPressureUnit: pipeline.operatingPressureUnit ?? null,
    status: pipeline.status,
    createdAt: pipeline.createdAt,
    updatedAt: pipeline.updatedAt
  };
}

function buildRiskCounts(assessments: StoredAssessment[]) {
  const counts = { high: 0, medium: 0, low: 0, unknown: 0 };
  for (const assessment of assessments) {
    if (assessment.riskLevel === "High") counts.high += 1;
    else if (assessment.riskLevel === "Medium") counts.medium += 1;
    else if (assessment.riskLevel === "Low") counts.low += 1;
    else counts.unknown += 1;
  }
  return counts;
}

function buildTimeline(
  assessments: StoredAssessment[],
  reports: ReportRecord[],
  cpCalculations: CpCalculationRecord[]
): TimelineItem[] {
  return [
    ...assessments.map((assessment) => ({
      id: assessment.id,
      type: "assessment" as const,
      title: `${assessment.type} assessment${isRiskLevel(assessment.riskLevel) ? ` — ${assessment.riskLevel} risk` : ""}`,
      timestamp: latestAssessmentDate(assessment),
      pipelineId: assessment.pipelineId!,
      routeLink: "/risk-assessment",
      riskLevel: assessment.riskLevel,
      status: "available" as const
    })),
    ...reports.map((report) => ({
      id: report.id,
      type: "report" as const,
      title: `${report.assessmentType} report generated`,
      timestamp: report.generatedAt ?? report.createdAt,
      pipelineId: report.pipelineId!,
      routeLink: `/report?reportId=${encodeURIComponent(report.id)}`,
      riskLevel: report.riskLevel,
      status: "available" as const
    })),
    ...cpCalculations.map((calculation) => ({
      id: calculation.id,
      type: "cp_calculation" as const,
      title: `${calculation.calculationType} CP calculation`,
      timestamp: calculation.createdAt,
      pipelineId: calculation.pipelineId,
      routeLink: "/cp-dashboard",
      status: "available" as const
    }))
  ].sort(byNewestTimestamp).slice(0, 10);
}

async function tableExists(tableName: string): Promise<boolean> {
  const prisma = getPrismaClient();
  if (!prisma) return false;
  const rows = await prisma.$queryRawUnsafe<ExistsRow[]>(
    "SELECT to_regclass($1) IS NOT NULL AS exists",
    `public."${tableName}"`
  );
  return Boolean(rows[0]?.exists);
}

async function countQuery(query: string, values: unknown[] = []): Promise<number> {
  const prisma = getPrismaClient();
  if (!prisma) return 0;
  const rows = await prisma.$queryRawUnsafe<CountRow[]>(query, ...values);
  return Number(rows[0]?.count ?? 0);
}

async function getCpStatus(pipelineId: string, user: AuthUser, cpCalculations: CpCalculationRecord[]) {
  const cpReadingTableAvailable = await tableExists("CpReadingHistory");
  if (!cpReadingTableAvailable) {
    return {
      status: "migration_pending" as const,
      reason: "CP reading history storage is not available in the current database.",
      readingCount: 0,
      calculationCount: cpCalculations.length
    };
  }

  const ownerClause = user.role === "Admin" ? "" : ' AND "authorId" = $2';
  const values = user.role === "Admin" ? [pipelineId] : [pipelineId, user.id];
  const readingCount = await countQuery(
    `SELECT COUNT(*)::int AS count FROM public."CpReadingHistory" WHERE "pipelineId" = $1${ownerClause}`,
    values
  );

  if (readingCount === 0) {
    return {
      status: "no_readings" as const,
      reason: "No timestamped CP monitoring readings are available for this pipeline.",
      readingCount,
      calculationCount: cpCalculations.length
    };
  }

  return {
    status: "available" as const,
    reason: "Timestamped CP monitoring readings exist for this pipeline.",
    readingCount,
    calculationCount: cpCalculations.length
  };
}

async function getIliStatus(pipelineId: string, user: AuthUser) {
  const tableAvailability = await Promise.all([
    tableExists("IliInspectionRun"),
    tableExists("IliAnomaly"),
    tableExists("IliAssessmentResult")
  ]);

  if (!tableAvailability.every(Boolean)) {
    return {
      status: "migration_pending" as const,
      reason: "ILI analysis tables are not fully available in the current database.",
      inspectionRunCount: 0,
      anomalyCount: 0
    };
  }

  const runOwnerClause = user.role === "Admin" ? "" : ' AND "authorId" = $2';
  const runValues = user.role === "Admin" ? [pipelineId] : [pipelineId, user.id];
  const inspectionRunCount = await countQuery(
    `SELECT COUNT(*)::int AS count FROM public."IliInspectionRun" WHERE "pipelineId" = $1${runOwnerClause}`,
    runValues
  );
  const anomalyOwnerJoin = user.role === "Admin" ? "" : ' AND run."authorId" = $2';
  const anomalyValues = user.role === "Admin" ? [pipelineId] : [pipelineId, user.id];
  const anomalyCount = await countQuery(
    `SELECT COUNT(*)::int AS count
     FROM public."IliAnomaly" AS anomaly
     INNER JOIN public."IliInspectionRun" AS run ON run.id = anomaly."inspectionRunId"
     WHERE run."pipelineId" = $1${anomalyOwnerJoin}`,
    anomalyValues
  );

  if (inspectionRunCount === 0) {
    return {
      status: "unavailable" as const,
      reason: "No ILI inspection runs are available for this pipeline.",
      inspectionRunCount,
      anomalyCount
    };
  }

  return {
    status: "available" as const,
    reason: "ILI inspection records exist for this pipeline.",
    inspectionRunCount,
    anomalyCount
  };
}

dashboardRouter.get("/:pipelineId", async (request, response, next) => {
  try {
    const scope = ownerScope(request.user!);
    const pipeline = await store.findPipelineById(request.params.pipelineId, scope);
    if (!pipeline) {
      response.status(404).json({ message: "Pipeline not found." });
      return;
    }

    const [allPipelines, allAssessments, reports, cpCalculations, aiSnapshot] = await Promise.all([
      store.listPipelines(scope),
      store.listAssessments(scope),
      store.listReports({ pipelineId: pipeline.id, ...scope }),
      store.listCpCalculations({ pipelineId: pipeline.id, ...scope }),
      getAiReadinessSnapshot(request.user!)
    ]);

    const assessments = allAssessments.filter((assessment) => assessment.pipelineId === pipeline.id);
    const riskCounts = buildRiskCounts(assessments);
    const latestAssessment = [...assessments].sort(compareAssessmentsByReliableDate)[0] ?? null;
    const latestReport = [...reports].sort(compareReportsByReliableDate)[0] ?? null;
    const [cpStatus, iliStatus] = await Promise.all([
      getCpStatus(pipeline.id, request.user!, cpCalculations),
      getIliStatus(pipeline.id, request.user!)
    ]);
    const aiReadiness = evaluateAiPredictionsReadiness(aiSnapshot);

    response.json({
      pipeline: toPipelineInfo(pipeline),
      summary: {
        pipelineCount: allPipelines.length,
        assessmentCount: assessments.length,
        riskCounts,
        pipelineHealth: {
          status: "not_calculated" as const,
          value: null,
          reason: "No approved pipeline health calculation exists."
        },
        maopUtilisation: calculateMaopUtilisation(pipeline)
      },
      latestAssessment: latestAssessment
        ? {
            id: latestAssessment.id,
            type: latestAssessment.type,
            riskLevel: latestAssessment.riskLevel,
            riskScore: latestAssessment.riskScore,
            inspectionDate: latestAssessment.inspectionDate ?? null,
            createdAt: latestAssessment.createdAt,
            routeLink: "/risk-assessment"
          }
        : {
            status: "unavailable" as const,
            reason: "No assessments are available for this pipeline."
          },
      latestReport: latestReport
        ? {
            id: latestReport.id,
            assessmentId: latestReport.assessmentId,
            assessmentType: latestReport.assessmentType,
            riskLevel: latestReport.riskLevel,
            generatedAt: latestReport.generatedAt,
            createdAt: latestReport.createdAt,
            routeLink: `/report?reportId=${encodeURIComponent(latestReport.id)}`
          }
        : {
            status: "unavailable" as const,
            reason: "No reports are available for this pipeline."
          },
      activityTimeline: buildTimeline(assessments, reports, cpCalculations),
      modules: {
        scada: {
          status: "not_connected" as const,
          reason: "SCADA telemetry source is not connected.",
          telemetry: "unavailable" as const
        },
        cpMonitoring: cpStatus,
        iliAnalysis: iliStatus,
        alerts: {
          status: "not_configured" as const,
          reason: "No alert or notification backend is configured."
        },
        aiPredictions: {
          status: aiReadiness.overallStatus === "ready" ? "available" as const : "blocked" as const,
          readyCapabilities: aiReadiness.readyCapabilities,
          blockedCapabilities: aiReadiness.blockedCapabilities,
          reason: aiReadiness.overallStatus === "ready"
            ? "AI prediction readiness reports all capabilities ready."
            : "AI prediction readiness reports blocked capabilities.",
          capabilities: aiReadiness.capabilities
        }
      }
    });
  } catch (error) {
    next(error);
  }
});
