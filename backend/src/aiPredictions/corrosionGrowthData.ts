import { getPrismaClient } from "../lib/prisma";
import { AuthUser } from "../types/domain";
import { CorrosionGrowthResult, IliDepthObservation, selectCorrosionGrowthSeries, calculateMeasuredCorrosionGrowth } from "./corrosionGrowth";
import { FailureCriterionResolution, resolveFailureCriterion } from "./failureCriterion";

type ExistsRow = { exists: boolean };
type IliRow = { pipelineId: string; featureId: string; anomalyType: string; orientation: IliDepthObservation["orientation"]; inspectionDate: Date; depthMm: number | null };

async function tableExists(name: string) {
  const prisma = getPrismaClient();
  if (!prisma) return false;
  const rows = await prisma.$queryRawUnsafe<ExistsRow[]>("SELECT to_regclass($1) IS NOT NULL AS exists", `public.\"${name}\"`);
  return Boolean(rows[0]?.exists);
}

export type CorrosionGrowthEndpointResponse = {
  pipelineId: string;
  featureId: string | null;
  growth: CorrosionGrowthResult;
  rul: CorrosionGrowthResult & { criterion: Omit<FailureCriterionResolution, "criterion"> };
};

export function splitGrowthAndRul(result: CorrosionGrowthResult, criterion: FailureCriterionResolution): Pick<CorrosionGrowthEndpointResponse, "growth" | "rul"> {
  const growthAvailable = result.growthRate !== null;
  const growth = growthAvailable
    ? { ...result, status: "calculated" as const, rul: null, rulUnit: null, failureCriterion: null, reason: "Measured corrosion growth is available from compatible repeated ILI measurements." }
    : result;
  return { growth, rul: { ...result, criterion: { status: criterion.status, criterionType: criterion.criterionType, threshold: criterion.threshold, unit: criterion.unit, methodology: criterion.methodology, methodologyVersion: criterion.methodologyVersion, source: criterion.source, reason: criterion.reason } } };
}

export async function getCorrosionGrowthForPipeline(pipelineId: string, featureId: string | undefined, user: AuthUser): Promise<CorrosionGrowthEndpointResponse> {
  const criterion = resolveFailureCriterion();
  const tablesAvailable = await Promise.all([tableExists("IliInspectionRun"), tableExists("IliAnomaly")]);
  if (!tablesAvailable.every(Boolean)) {
    const unavailable: CorrosionGrowthResult = { status: "ili_data_unavailable", methodology: "measured_corrosion_growth_deterministic_rul", sourceType: "repeated_ili_measurements", pipelineId, featureId: featureId ?? null, earlierInspectionDate: null, laterInspectionDate: null, earlierDepth: null, laterDepth: null, growthRate: null, growthRateUnit: null, rul: null, rulUnit: null, failureCriterion: null, reason: "ILI inspection storage is unavailable in the current database.", dataQuality: ["ILI migration or source data is unavailable."] };
    return { pipelineId, featureId: featureId ?? null, ...splitGrowthAndRul(unavailable, criterion) };
  }
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Database unavailable");
  const hasOwner = user.role !== "Admin";
  const rows = await prisma.$queryRawUnsafe<IliRow[]>(
    `SELECT run."pipelineId", anomaly."featureId", anomaly."anomalyType", anomaly."orientation"::text AS orientation, run."inspectionDate", anomaly."depthMm"
     FROM public."IliAnomaly" AS anomaly
     INNER JOIN public."IliInspectionRun" AS run ON run.id = anomaly."inspectionRunId"
     WHERE run."pipelineId" = $1 AND anomaly."depthMm" IS NOT NULL
       AND ($2::text IS NULL OR anomaly."featureId" = $2)
       AND ($3::text IS NULL OR run."authorId" = $3)`,
    pipelineId, featureId ?? null, hasOwner ? user.id : null
  );
  const observations: IliDepthObservation[] = rows.map((row) => ({ pipelineId: row.pipelineId, featureId: row.featureId, anomalyType: row.anomalyType, orientation: row.orientation, inspectionDate: new Date(row.inspectionDate).toISOString(), depth: Number(row.depthMm), depthUnit: "mm" }));
  const selected = selectCorrosionGrowthSeries(observations);
  if ("status" in selected) return { pipelineId, featureId: featureId ?? null, ...splitGrowthAndRul(selected, criterion) };
  const result = calculateMeasuredCorrosionGrowth(selected.earlier, selected.later, criterion.criterion);
  return { pipelineId, featureId: selected.earlier.featureId, ...splitGrowthAndRul(result, criterion) };
}
