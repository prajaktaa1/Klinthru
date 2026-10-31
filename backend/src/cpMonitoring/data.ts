import { getPrismaClient } from "../lib/prisma";

type Availability = { available: boolean; reason: string };

type TestPointRow = {
  id: string;
  code: string;
  name: string | null;
  location: string | null;
  kp: string | null;
  assetStatus: string;
  readingId: string | null;
  readingAt: Date | null;
  measurementType: string | null;
  referenceElectrode: string | null;
  valueMv: number | null;
  valueV: number | null;
  strayCurrentMa: number | null;
  protectionStatus: string | null;
  interferenceStatus: string | null;
  eOnMv: number | null;
  eOnAt: Date | null;
  eOffMv: number | null;
  eOffAt: Date | null;
};

type TrendRow = {
  id: string;
  testPointId: string;
  readingAt: Date;
  measurementType: string;
  referenceElectrode: string;
  valueMv: number | null;
  valueV: number | null;
  protectionStatus: string;
};

type RectifierRow = {
  id: string;
  rectifierCode: string;
  name: string | null;
  location: string | null;
  kp: string | null;
  assetStatus: string;
  readingAt: Date | null;
  readingStatus: string | null;
  outputVoltageV: number | null;
  outputCurrentA: number | null;
};

type SurveyRow = { id: string; surveyDate: Date; surveyName: string | null; status: string };
type RuleRow = { protectionThresholdMv: number; referenceElectrode: string; measurementType: string };
type ApprovedCriteriaRow = {
  criteriaSetId: string;
  criteriaSetName: string;
  criteriaVersionId: string;
  version: string;
  standardReference: string | null;
  measurementType: string;
  referenceElectrode: string | null;
  protectionThresholdMv: number | null;
  marginalThresholdMv: number | null;
  overProtectionThresholdMv: number | null;
  unit: string;
};
type StrayRow = { testPointId: string; code: string; location: string | null; readingAt: Date; strayCurrentMa: number | null; interferenceStatus: string | null };
type ExistsRow = { exists: boolean };

async function tableExists(tableName: string) {
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

function availability(available: boolean, source: string): Availability {
  return {
    available,
    reason: available ? `${source} is connected.` : `${source} storage is unavailable in the current database.`
  };
}

export async function getCpMonitoringData(pipelineId: string) {
  const prisma = getPrismaClient();
  const [surveysAvailable, testPointsAvailable, readingsAvailable, rectifiersAvailable, rectifierReadingsAvailable, rulesAvailable, criteriaSetsAvailable, criteriaVersionsAvailable, criteriaDefinitionsAvailable] = await Promise.all([
    tableExists("CpMonitoringSurvey"),
    tableExists("CpTestPoint"),
    tableExists("CpReadingHistory"),
    tableExists("CpRectifier"),
    tableExists("CpRectifierReadingHistory"),
    tableExists("CpProtectionRule"),
    tableExists("CpCriteriaSet"),
    tableExists("CpCriteriaVersion"),
    tableExists("CpCriterionDefinition")
  ]);

  const testPointsConnected = Boolean(prisma && testPointsAvailable && readingsAvailable);
  const rectifiersConnected = Boolean(prisma && rectifiersAvailable && rectifierReadingsAvailable);
  let testPoints: TestPointRow[] = [];
  let trend: TrendRow[] = [];
  let rectifiers: RectifierRow[] = [];
  let surveys: SurveyRow[] = [];
  let rule: RuleRow | null = null;
  let approvedCriteria: ApprovedCriteriaRow[] = [];
  let strayCurrent: StrayRow[] = [];

  if (prisma && rulesAvailable) {
    const rules = await prisma.$queryRawUnsafe<RuleRow[]>(
      `SELECT "protectionThresholdMv", "referenceElectrode", "measurementType"
       FROM public."CpProtectionRule"
       WHERE "pipelineId" = $1 OR "pipelineId" IS NULL
       ORDER BY ("pipelineId" = $1) DESC, "isDefault" DESC, "createdAt" DESC LIMIT 1`,
      pipelineId
    );
    rule = rules[0] ?? null;
  }

  if (prisma && criteriaSetsAvailable && criteriaVersionsAvailable && criteriaDefinitionsAvailable) {
    approvedCriteria = await prisma.$queryRawUnsafe<ApprovedCriteriaRow[]>(
      `SELECT criteria_set."criteriaSetId", criteria_set.name AS "criteriaSetName",
              criteria_version."criteriaVersionId", criteria_version.version,
              criteria_set."standardReference", definition."measurementType"::text AS "measurementType",
              definition."referenceElectrode"::text AS "referenceElectrode",
              definition."protectionThresholdMv", definition."marginalThresholdMv",
              definition."overProtectionThresholdMv", definition.unit
       FROM public."CpCriteriaSet" criteria_set
       INNER JOIN public."CpCriteriaVersion" criteria_version ON criteria_version."criteriaSetId" = criteria_set.id
       INNER JOIN public."CpCriterionDefinition" definition ON definition."criteriaVersionId" = criteria_version.id
       WHERE criteria_version."approvalStatus" = 'Approved'
         AND (criteria_set."pipelineId" = $1 OR criteria_set."pipelineId" IS NULL)
       ORDER BY (criteria_set."pipelineId" = $1) DESC, criteria_version."effectiveDate" DESC, definition."createdAt" ASC`,
      pipelineId
    );
  }

  if (prisma && testPointsConnected) {
    testPoints = await prisma.$queryRawUnsafe<TestPointRow[]>(
      `SELECT tp.id, tp.code, tp.name, tp.location, tp.kp, tp."assetStatus",
              latest.id AS "readingId", latest."readingAt", latest."measurementType",
              latest."referenceElectrode", latest."valueMv", latest."valueV",
              latest."strayCurrentMa", latest."protectionStatus", latest."interferenceStatus",
              eon."valueMv" AS "eOnMv", eon."readingAt" AS "eOnAt",
              eoff."valueMv" AS "eOffMv", eoff."readingAt" AS "eOffAt"
       FROM public."CpTestPoint" tp
       LEFT JOIN LATERAL (
         SELECT reading.* FROM public."CpReadingHistory" reading
         WHERE reading."pipelineId" = tp."pipelineId" AND reading."testPointId" = tp.id
           AND reading."measurementType" IN ('INSTANT_OFF_POTENTIAL', 'PIPE_TO_SOIL_POTENTIAL', 'ON_POTENTIAL')
           AND ($2::text IS NULL OR reading."measurementType"::text = $2)
         ORDER BY reading."readingAt" DESC LIMIT 1
       ) latest ON TRUE
       LEFT JOIN LATERAL (
         SELECT reading."valueMv", reading."readingAt" FROM public."CpReadingHistory" reading
         WHERE reading."pipelineId" = tp."pipelineId" AND reading."testPointId" = tp.id
           AND reading."measurementType" = 'ON_POTENTIAL'
         ORDER BY reading."readingAt" DESC LIMIT 1
       ) eon ON TRUE
       LEFT JOIN LATERAL (
         SELECT reading."valueMv", reading."readingAt" FROM public."CpReadingHistory" reading
         WHERE reading."pipelineId" = tp."pipelineId" AND reading."testPointId" = tp.id
           AND reading."measurementType" = 'INSTANT_OFF_POTENTIAL'
         ORDER BY reading."readingAt" DESC LIMIT 1
       ) eoff ON TRUE
       WHERE tp."pipelineId" = $1
       ORDER BY tp.code ASC`,
      pipelineId,
      rule?.measurementType ?? null
    );
    trend = await prisma.$queryRawUnsafe<TrendRow[]>(
      `SELECT id, "testPointId", "readingAt", "measurementType", "referenceElectrode",
              "valueMv", "valueV", "protectionStatus"
       FROM public."CpReadingHistory"
       WHERE "pipelineId" = $1 AND "readingAt" >= NOW() - INTERVAL '30 days'
         AND "measurementType" IN ('INSTANT_OFF_POTENTIAL', 'PIPE_TO_SOIL_POTENTIAL', 'ON_POTENTIAL')
       ORDER BY "readingAt" ASC`,
      pipelineId
    );
    strayCurrent = await prisma.$queryRawUnsafe<StrayRow[]>(
      `SELECT DISTINCT ON (reading."testPointId") reading."testPointId", tp.code, tp.location,
              reading."readingAt", reading."strayCurrentMa", reading."interferenceStatus"
       FROM public."CpReadingHistory" reading
       INNER JOIN public."CpTestPoint" tp ON tp.id = reading."testPointId" AND tp."pipelineId" = reading."pipelineId"
       WHERE reading."pipelineId" = $1 AND reading."measurementType" = 'STRAY_CURRENT'
       ORDER BY reading."testPointId", reading."readingAt" DESC`,
      pipelineId
    );
  }

  if (prisma && rectifiersConnected) {
    rectifiers = await prisma.$queryRawUnsafe<RectifierRow[]>(
      `SELECT rectifier.id, rectifier."rectifierCode", rectifier.name, rectifier.location,
              rectifier.kp, rectifier.status AS "assetStatus", latest."readingAt",
              latest.status AS "readingStatus", latest."outputVoltageV", latest."outputCurrentA"
       FROM public."CpRectifier" rectifier
       LEFT JOIN LATERAL (
         SELECT reading.* FROM public."CpRectifierReadingHistory" reading
         WHERE reading."pipelineId" = rectifier."pipelineId" AND reading."rectifierId" = rectifier.id
         ORDER BY reading."readingAt" DESC LIMIT 1
       ) latest ON TRUE
       WHERE rectifier."pipelineId" = $1
       ORDER BY rectifier."rectifierCode" ASC`,
      pipelineId
    );
  }

  if (prisma && surveysAvailable) {
    surveys = await prisma.$queryRawUnsafe<SurveyRow[]>(
      `SELECT id, "surveyDate", "surveyName", status FROM public."CpMonitoringSurvey"
       WHERE "pipelineId" = $1 ORDER BY "surveyDate" DESC`,
      pipelineId
    );
  }

  const latestReadings = testPoints.filter((point) => point.readingId);
  const protectedCount = latestReadings.filter((point) => point.protectionStatus === "Protected").length;
  const underProtected = latestReadings.filter((point) => point.protectionStatus === "UnderProtected" || point.protectionStatus === "Critical");
  // Asset/master status is configuration metadata. Operational counts must only
  // use a status supplied by an actual latest telemetry reading.
  const activeRectifiers = rectifiers.filter((item) => item.readingStatus === "Active");
  const totalCurrentA = activeRectifiers.reduce((sum, item) => sum + (item.outputCurrentA ?? 0), 0);

  return {
    pipelineId,
    availability: {
      surveys: availability(Boolean(prisma && surveysAvailable), "CpMonitoringSurvey"),
      testPoints: availability(testPointsConnected, "CP test points and readings"),
      rectifiers: availability(rectifiersConnected, "CP rectifiers and readings"),
      protectionRule: availability(Boolean(prisma && rulesAvailable), "CP protection rules"),
      approvedCriteria: availability(Boolean(prisma && criteriaSetsAvailable && criteriaVersionsAvailable && criteriaDefinitionsAvailable && approvedCriteria.length), "Approved CP criteria"),
      strayCurrent: {
        available: testPointsConnected && strayCurrent.length > 0,
        reason: testPointsConnected && strayCurrent.length > 0
          ? "Stray-current readings are connected from CpReadingHistory."
          : "No real stray-current source is connected for this pipeline."
      }
    },
    summary: {
      protectedCount,
      monitoredCount: latestReadings.length,
      protectionCoveragePercent: latestReadings.length ? Number(((protectedCount / latestReadings.length) * 100).toFixed(1)) : null,
      underProtectedCount: underProtected.length,
      underProtectedCodes: underProtected.map((point) => point.code),
      activeRectifierCount: activeRectifiers.length,
      rectifierCount: rectifiers.length,
      totalCurrentA: Number(totalCurrentA.toFixed(1)),
      lastSurveyAt: surveys[0]?.surveyDate.toISOString() ?? null
    },
    criterion: rule ? { valueMv: rule.protectionThresholdMv, referenceElectrode: rule.referenceElectrode, measurementType: rule.measurementType } : null,
    approvedCriteria,
    surveys: surveys.map((survey) => ({ ...survey, surveyDate: survey.surveyDate.toISOString() })),
    testPoints: testPoints.map((point) => ({
      ...point,
      readingAt: point.readingAt?.toISOString() ?? null,
      eOnAt: point.eOnAt?.toISOString() ?? null,
      eOffAt: point.eOffAt?.toISOString() ?? null,
      irDropMv: point.eOnMv !== null && point.eOffMv !== null ? Number(Math.abs(point.eOnMv - point.eOffMv).toFixed(3)) : null,
      polarizationMv: null,
      polarizationReason: "Not connected: CpReadingHistory does not identify a native or depolarized potential measurement."
    })),
    trend: trend.map((reading) => ({ ...reading, readingAt: reading.readingAt.toISOString() })),
    rectifiers: rectifiers.map((rectifier) => ({ ...rectifier, readingAt: rectifier.readingAt?.toISOString() ?? null })),
    strayCurrent: strayCurrent.map((reading) => ({ ...reading, readingAt: reading.readingAt.toISOString() }))
  };
}
