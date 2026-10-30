import { getPrismaClient } from "../lib/prisma";
import { AuthUser } from "../types/domain";

type ExistsRow = { exists: boolean };

type IliDataStatus = "available" | "unavailable";

export type IliRunSummary = {
  id: string;
  pipelineId: string;
  runReference: string;
  toolType: string;
  vendor: string | null;
  inspectionDate: string;
  assessmentStandard: string | null;
  status: string;
  notes: string | null;
  sourceMetadata: unknown;
  createdAt: string;
  updatedAt: string;
  authorId: string | null;
};

export type IliAnomalySummary = {
  id: string;
  inspectionRunId: string;
  pipelineId: string;
  runReference: string;
  inspectionDate: string;
  featureId: string;
  anomalyType: string;
  kpKm: number | null;
  location: string | null;
  depthMm: number | null;
  depthPercent: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  clockPosition: string | null;
  orientation: string;
  measurementMetadata: unknown;
  createdAt: string;
  updatedAt: string;
  authorId: string | null;
};

export type IliAssessmentResultSummary = {
  id: string;
  anomalyId: string;
  inspectionRunId: string;
  pipelineId: string;
  featureId: string;
  methodology: string;
  methodologyVersion: string;
  status: string;
  inputSnapshot: unknown;
  result: unknown;
  calculationSteps: unknown;
  calculatedAt: string;
  createdAt: string;
  authorId: string | null;
};

export type IliDataResponse<T> = {
  pipelineId: string;
  status: IliDataStatus;
  tableAvailable: boolean;
  count: number;
  reason: string;
  data: T[];
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

function unavailable<T>(pipelineId: string, tableName: string): IliDataResponse<T> {
  return {
    pipelineId,
    status: "unavailable",
    tableAvailable: false,
    count: 0,
    reason: `${tableName} storage is unavailable in the current database.`,
    data: []
  };
}

function iso(value: Date | string | null): string {
  if (!value) return "";
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function ownerClause(user: AuthUser, alias?: string): string {
  if (user.role === "Admin") return "";
  return ` AND ${alias ? `${alias}.` : ""}\"authorId\" = $2`;
}

function ownerValues(pipelineId: string, user: AuthUser): unknown[] {
  return user.role === "Admin" ? [pipelineId] : [pipelineId, user.id];
}

export async function listIliRunsForPipeline(pipelineId: string, user: AuthUser): Promise<IliDataResponse<IliRunSummary>> {
  const prisma = getPrismaClient();
  if (!prisma || !(await tableExists("IliInspectionRun"))) return unavailable(pipelineId, "IliInspectionRun");

  const rows = await prisma.$queryRawUnsafe<Array<Omit<IliRunSummary, "inspectionDate" | "createdAt" | "updatedAt"> & { inspectionDate: Date; createdAt: Date; updatedAt: Date }>>(
    `SELECT id, "pipelineId", "runReference", "toolType", vendor, "inspectionDate", "assessmentStandard", status, notes, "sourceMetadata", "createdAt", "updatedAt", "authorId"
     FROM public.\"IliInspectionRun\"
     WHERE \"pipelineId\" = $1${ownerClause(user)}
     ORDER BY \"inspectionDate\" DESC, \"createdAt\" DESC`,
    ...ownerValues(pipelineId, user)
  );

  const data = rows.map((row) => ({ ...row, inspectionDate: iso(row.inspectionDate), createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) }));
  return {
    pipelineId,
    status: "available",
    tableAvailable: true,
    count: data.length,
    reason: data.length ? "ILI inspection runs loaded from IliInspectionRun." : "No ILI inspection runs are available for this pipeline.",
    data
  };
}

export async function listIliAnomaliesForPipeline(pipelineId: string, user: AuthUser): Promise<IliDataResponse<IliAnomalySummary>> {
  const prisma = getPrismaClient();
  const tablesAvailable = await Promise.all([tableExists("IliInspectionRun"), tableExists("IliAnomaly")]);
  if (!prisma || !tablesAvailable.every(Boolean)) return unavailable(pipelineId, "IliAnomaly");

  const rows = await prisma.$queryRawUnsafe<Array<Omit<IliAnomalySummary, "inspectionDate" | "createdAt" | "updatedAt"> & { inspectionDate: Date; createdAt: Date; updatedAt: Date }>>(
    `SELECT anomaly.id, anomaly.\"inspectionRunId\", run.\"pipelineId\", run.\"runReference\", run.\"inspectionDate\", anomaly.\"featureId\", anomaly.\"anomalyType\", anomaly.\"kpKm\", anomaly.location, anomaly.\"depthMm\", anomaly.\"depthPercent\", anomaly.\"lengthMm\", anomaly.\"widthMm\", anomaly.\"clockPosition\", anomaly.orientation, anomaly.\"measurementMetadata\", anomaly.\"createdAt\", anomaly.\"updatedAt\", anomaly.\"authorId\"
     FROM public.\"IliAnomaly\" AS anomaly
     INNER JOIN public.\"IliInspectionRun\" AS run ON run.id = anomaly.\"inspectionRunId\"
     WHERE run.\"pipelineId\" = $1${ownerClause(user, "run")}
     ORDER BY run.\"inspectionDate\" DESC, anomaly.\"kpKm\" ASC NULLS LAST, anomaly.\"featureId\" ASC`,
    ...ownerValues(pipelineId, user)
  );

  const data = rows.map((row) => ({ ...row, inspectionDate: iso(row.inspectionDate), createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) }));
  return {
    pipelineId,
    status: "available",
    tableAvailable: true,
    count: data.length,
    reason: data.length ? "ILI anomalies loaded from IliAnomaly." : "No ILI anomalies are available for this pipeline.",
    data
  };
}

export async function listIliAssessmentResultsForPipeline(pipelineId: string, user: AuthUser): Promise<IliDataResponse<IliAssessmentResultSummary>> {
  const prisma = getPrismaClient();
  const tablesAvailable = await Promise.all([tableExists("IliInspectionRun"), tableExists("IliAnomaly"), tableExists("IliAssessmentResult")]);
  if (!prisma || !tablesAvailable.every(Boolean)) return unavailable(pipelineId, "IliAssessmentResult");

  const rows = await prisma.$queryRawUnsafe<Array<Omit<IliAssessmentResultSummary, "calculatedAt" | "createdAt"> & { calculatedAt: Date; createdAt: Date }>>(
    `SELECT result.id, result.\"anomalyId\", anomaly.\"inspectionRunId\", run.\"pipelineId\", anomaly.\"featureId\", result.methodology, result.\"methodologyVersion\", result.status, result.\"inputSnapshot\", result.result, result.\"calculationSteps\", result.\"calculatedAt\", result.\"createdAt\", result.\"authorId\"
     FROM public.\"IliAssessmentResult\" AS result
     INNER JOIN public.\"IliAnomaly\" AS anomaly ON anomaly.id = result.\"anomalyId\"
     INNER JOIN public.\"IliInspectionRun\" AS run ON run.id = anomaly.\"inspectionRunId\"
     WHERE run.\"pipelineId\" = $1${ownerClause(user, "run")}
     ORDER BY result.\"calculatedAt\" DESC, result.\"createdAt\" DESC`,
    ...ownerValues(pipelineId, user)
  );

  const data = rows.map((row) => ({ ...row, calculatedAt: iso(row.calculatedAt), createdAt: iso(row.createdAt) }));
  return {
    pipelineId,
    status: "available",
    tableAvailable: true,
    count: data.length,
    reason: data.length ? "ILI assessment results loaded from IliAssessmentResult." : "No ILI assessment results are available for this pipeline.",
    data
  };
}
