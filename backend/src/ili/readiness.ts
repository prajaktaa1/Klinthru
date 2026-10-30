import { getCorrosionGrowthForPipeline } from "../aiPredictions/corrosionGrowthData";
import { resolveFailureCriterion } from "../aiPredictions/failureCriterion";
import { DatabaseUnavailableError } from "../data/store";
import { getPrismaClient } from "../lib/prisma";
import { AuthUser } from "../types/domain";

type IliReadinessStatus =
  | "available"
  | "unavailable"
  | "no_runs"
  | "no_anomalies"
  | "not_configured"
  | "failure_criterion_not_configured";

type CountRow = { count: number };
type ExistsRow = { exists: boolean };

export type IliReadinessResponse = {
  pipelineId: string;
  status: IliReadinessStatus;
  ready: boolean;
  reason: string;
  tables: {
    available: boolean;
    inspectionRuns: boolean;
    anomalies: boolean;
    assessmentResults: boolean;
  };
  counts: {
    inspectionRuns: number;
    anomalies: number;
    assessmentResults: number;
  };
  services: {
    b31gCalculation: {
      available: boolean;
      status: IliReadinessStatus;
      reason: string;
    };
    corrosionGrowthSource: {
      available: boolean;
      status: string;
      reason: string;
    };
    remainingUsefulLife: {
      available: boolean;
      status: IliReadinessStatus;
      reason: string;
    };
  };
  blockers: string[];
};

async function tableExists(tableName: string): Promise<boolean> {
  const prisma = getPrismaClient();
  if (!prisma) return false;

  try {
    const rows = await prisma.$queryRawUnsafe<ExistsRow[]>(
      "SELECT to_regclass($1) IS NOT NULL AS exists",
      `public.\"${tableName}\"`
    );
    return Boolean(rows[0]?.exists);
  } catch {
    return false;
  }
}

async function countQuery(query: string, values: unknown[]): Promise<number> {
  const prisma = getPrismaClient();
  if (!prisma) throw new DatabaseUnavailableError("ILI readiness counts are unavailable.");

  try {
    const rows = await prisma.$queryRawUnsafe<CountRow[]>(query, ...values);
    const count = rows[0]?.count;
    if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) {
      throw new DatabaseUnavailableError("ILI readiness counts are unavailable.");
    }
    return count;
  } catch {
    throw new DatabaseUnavailableError("ILI readiness counts are unavailable.");
  }
}

function overallStatus(tablesAvailable: boolean, runCount: number, anomalyCount: number): Pick<IliReadinessResponse, "status" | "ready" | "reason"> {
  if (!tablesAvailable) {
    return {
      status: "unavailable",
      ready: false,
      reason: "ILI tables are not available in the current database."
    };
  }

  if (runCount === 0) {
    return {
      status: "no_runs",
      ready: false,
      reason: "No ILI inspection runs are available for this pipeline."
    };
  }

  if (anomalyCount === 0) {
    return {
      status: "no_anomalies",
      ready: false,
      reason: "ILI inspection runs exist, but no anomaly records are available for this pipeline."
    };
  }

  return {
    status: "available",
    ready: true,
    reason: "ILI inspection runs and anomaly records are available for this pipeline."
  };
}

export async function getIliReadinessForPipeline(pipelineId: string, user: AuthUser): Promise<IliReadinessResponse> {
  const [inspectionRunsTable, anomaliesTable, assessmentResultsTable] = await Promise.all([
    tableExists("IliInspectionRun"),
    tableExists("IliAnomaly"),
    tableExists("IliAssessmentResult")
  ]);
  const tablesAvailable = inspectionRunsTable && anomaliesTable && assessmentResultsTable;

  let inspectionRuns = 0;
  let anomalies = 0;
  let assessmentResults = 0;

  if (tablesAvailable) {
    const runOwnerClause = user.role === "Admin" ? "" : ' AND "authorId" = $2';
    const runValues = user.role === "Admin" ? [pipelineId] : [pipelineId, user.id];
    inspectionRuns = await countQuery(
      `SELECT COUNT(*)::int AS count FROM public.\"IliInspectionRun\" WHERE \"pipelineId\" = $1${runOwnerClause}`,
      runValues
    );

    const anomalyOwnerClause = user.role === "Admin" ? "" : ' AND run."authorId" = $2';
    const joinedValues = user.role === "Admin" ? [pipelineId] : [pipelineId, user.id];
    anomalies = await countQuery(
      `SELECT COUNT(*)::int AS count
       FROM public.\"IliAnomaly\" AS anomaly
       INNER JOIN public.\"IliInspectionRun\" AS run ON run.id = anomaly.\"inspectionRunId\"
       WHERE run.\"pipelineId\" = $1${anomalyOwnerClause}`,
      joinedValues
    );

    assessmentResults = await countQuery(
      `SELECT COUNT(*)::int AS count
       FROM public.\"IliAssessmentResult\" AS result
       INNER JOIN public.\"IliAnomaly\" AS anomaly ON anomaly.id = result.\"anomalyId\"
       INNER JOIN public.\"IliInspectionRun\" AS run ON run.id = anomaly.\"inspectionRunId\"
       WHERE run.\"pipelineId\" = $1${anomalyOwnerClause}`,
      joinedValues
    );
  }

  const base = overallStatus(tablesAvailable, inspectionRuns, anomalies);
  const failureCriterion = resolveFailureCriterion();
  const corrosionGrowth = await getCorrosionGrowthForPipeline(pipelineId, undefined, user);
  const corrosionGrowthAvailable = corrosionGrowth.growth.status === "calculated";
  const rulAvailable = corrosionGrowth.rul.status === "calculated" && failureCriterion.status === "resolved";
  const rulStatus: IliReadinessStatus = rulAvailable
    ? "available"
    : failureCriterion.status === "failure_criterion_not_configured"
      ? "failure_criterion_not_configured"
      : "unavailable";

  const blockers = [
    !tablesAvailable ? "ILI table storage is unavailable or migration history is unresolved." : null,
    tablesAvailable && inspectionRuns === 0 ? "No ILI inspection runs exist for this pipeline." : null,
    tablesAvailable && inspectionRuns > 0 && anomalies === 0 ? "No ILI anomaly records exist for this pipeline." : null,
    tablesAvailable && anomalies > 0 && assessmentResults === 0 ? "No persisted ILI assessment results exist for this pipeline." : null,
    "Production B31G calculation service is not configured.",
    corrosionGrowthAvailable ? null : corrosionGrowth.growth.reason,
    rulAvailable ? null : failureCriterion.reason
  ].filter((item): item is string => Boolean(item));

  return {
    pipelineId,
    ...base,
    tables: {
      available: tablesAvailable,
      inspectionRuns: inspectionRunsTable,
      anomalies: anomaliesTable,
      assessmentResults: assessmentResultsTable
    },
    counts: {
      inspectionRuns,
      anomalies,
      assessmentResults
    },
    services: {
      b31gCalculation: {
        available: false,
        status: "not_configured",
        reason: "No approved production B31G calculation service is configured for the ILI module."
      },
      corrosionGrowthSource: {
        available: corrosionGrowthAvailable,
        status: corrosionGrowth.growth.status,
        reason: corrosionGrowth.growth.reason
      },
      remainingUsefulLife: {
        available: rulAvailable,
        status: rulStatus,
        reason: rulAvailable ? "RUL is available from measured growth and an approved failure criterion." : failureCriterion.reason
      }
    },
    blockers
  };
}

