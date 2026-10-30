import { getPrismaClient } from "../lib/prisma";
import { AuthUser } from "../types/domain";
import { AiReadinessSnapshot, AiUnavailableSource } from "./readiness";

type CountRow = { count: number };
type ExistsRow = { exists: boolean };

type ReadDatabase = Pick<NonNullable<ReturnType<typeof getPrismaClient>>, "$queryRawUnsafe">;

export function createAiReadinessSnapshotReader(database: () => ReadDatabase | null = getPrismaClient) {
 return async function read(user: AuthUser): Promise<AiReadinessSnapshot> {
  const prisma = database();
  const unavailableSources: AiUnavailableSource[] = [];
  async function tableExists(tableName: string): Promise<boolean> {
    if (!prisma) return false;
    const rows = await prisma.$queryRawUnsafe<ExistsRow[]>(
    "SELECT to_regclass($1) IS NOT NULL AS exists",
    `public."${tableName}"`
  );
    return Boolean(rows[0]?.exists);
  }

  async function countQuery(query: string, values: unknown[] = []): Promise<number> {
    if (!prisma) throw new Error("Authoritative AI source storage unavailable");
    const rows = await prisma.$queryRawUnsafe<CountRow[]>(query, ...values);
    const count = rows[0]?.count;
    if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) throw new Error("Invalid authoritative source count");
    return count;
  }

  const ownerValues = user.role === "Admin" ? [] : [user.id];
  // Read-only native fields only. Never initialize storage or fall back to demo/memory records.
  async function sourceCount(table: string, source: AiUnavailableSource, ownerColumn: string, extra = "") {
    if (!await tableExists(table)) { unavailableSources.push(source); return 0; }
    const conditions = [user.role === "Admin" ? "" : `"${ownerColumn}" = $1`, extra].filter(Boolean);
    return countQuery(`SELECT COUNT(*)::int AS count FROM public."${table}"${conditions.length ? ` WHERE ${conditions.join(" AND ")}` : ""}`, ownerValues);
  }
  const [assessmentCount, pipelineCount, deviceRecordCount] = await Promise.all([
    sourceCount("Assessment", "assessments", "authorId"),
    sourceCount("Pipeline", "pipelines", "createdById"),
    sourceCount("DeviceRecord", "devices", "authorId", '"isDemoData" = false')
  ]);
  const cpTableAvailable = await tableExists("CpReadingHistory");
  const iliTablesAvailable = await Promise.all([
    tableExists("IliInspectionRun"),
    tableExists("IliAnomaly"),
    tableExists("IliAssessmentResult")
  ]);
  const iliSchemaAvailable = iliTablesAvailable.every(Boolean);
  if (!cpTableAvailable) unavailableSources.push("cp");
  if (!iliSchemaAvailable) unavailableSources.push("ili");
  const ownerFilter = user.role === "Admin" ? "" : ' WHERE "authorId" = $1';
  const cpReadingCount = cpTableAvailable
    ? await countQuery(`SELECT COUNT(*)::int AS count FROM public."CpReadingHistory"${ownerFilter}`, ownerValues)
    : 0;
  const comparableCpSeriesCount = cpTableAvailable
    ? await countQuery(
      `SELECT COUNT(*)::int AS count FROM (
        SELECT "pipelineId", "testPointId", "measurementType", "referenceElectrode"
        FROM public."CpReadingHistory"${ownerFilter}
        GROUP BY "pipelineId", "testPointId", "measurementType", "referenceElectrode"
        HAVING COUNT(*) >= 3
      ) AS comparable_series`,
      ownerValues
    )
    : 0;
  const correlatedIliDefectCount = iliSchemaAvailable
    ? await countQuery(
      `SELECT COUNT(*)::int AS count FROM (
        SELECT run."pipelineId", anomaly."featureId"
        FROM public."IliAnomaly" AS anomaly
        INNER JOIN public."IliInspectionRun" AS run ON run.id = anomaly."inspectionRunId"
        ${user.role === "Admin" ? "" : "WHERE run.\"authorId\" = $1"}
        GROUP BY run."pipelineId", anomaly."featureId"
        HAVING COUNT(DISTINCT run."inspectionDate") >= 2
      ) AS correlated_defects`,
      ownerValues
    )
    : 0;

  return {
    assessmentCount,
    pipelineCount,
    deviceRecordCount,
    cpReadingCount,
    comparableCpSeriesCount,
    iliSchemaAvailable,
    correlatedIliDefectCount,
    unavailableSources
  };
 };
}

export const getAiReadinessSnapshot = createAiReadinessSnapshotReader();
