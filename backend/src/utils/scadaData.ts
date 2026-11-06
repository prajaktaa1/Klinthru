import {validateLocalInboundIngestion} from "../integrations/localInbound";
import {scadaReadingSchema,normalizeScadaReading} from "../validation/scadaReading";
import {realSensorAssetBlockers} from "../validation/sensorAssetRegistration";
import {type SourceChannel,type IngestionIdentity,apiReadingPayload,readingProvenance} from "./readingProvenance";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { DatabaseUnavailableError, store } from "../data/store";
import { getPrismaClient } from "../lib/prisma";
import { ownerScope } from "../lib/access";
import { AuthUser } from "../types/domain";
import { createValidationError, createValidationErrorFromZod } from "../validation/validationErrors";

const text = z.string().trim().min(1).max(500);
const timestamp = z.iso.datetime({ offset: true });
export const scadaTagSchema = z.object({
  id: text, sourceTagName: text, displayName: text, description: z.string().max(1000).optional(),
  measurementType: text, engineeringUnit: text, pipelineId: text, assetId: text, connectorId: text,
  sourceSystemId: text, scanIntervalSeconds: z.number().int().min(1).max(86400),
  staleAfterSeconds: z.number().int().min(1).max(604800),
  highHigh: z.number().finite().optional(), high: z.number().finite().optional(),
  low: z.number().finite().optional(), lowLow: z.number().finite().optional(),
  thresholdSource: text.optional(), sensorAssignmentId: text.optional(), active: z.boolean().default(true)
}).strict().superRefine((tag, ctx) => {
  if (tag.staleAfterSeconds < tag.scanIntervalSeconds) ctx.addIssue({ code: "custom", path: ["staleAfterSeconds"], message: "Must be at least the scan interval" });
  const limits = [tag.lowLow, tag.low, tag.high, tag.highHigh].filter((n): n is number => n !== undefined);
  if (limits.some((n, i) => i > 0 && n <= limits[i - 1])) ctx.addIssue({ code: "custom", path: ["high"], message: "Limits must increase from low-low to high-high" });
  if (limits.length && !tag.thresholdSource) ctx.addIssue({ code: "custom", path: ["thresholdSource"], message: "Threshold source/type is required" });
});
export const scadaBatchSchema = z.object({
  readings: z.array(scadaReadingSchema).max(500).default([]),
  alarms: z.array(z.object({
    tagId: text, sourceAlarmId: text, description: text, sourcePriority: text,
    severity: z.enum(["Info", "Low", "Medium", "High", "Critical"]),
    measuredValue: z.number().finite().optional(), threshold: z.number().finite().optional(),
    comparator: z.enum([">", ">=", "<", "<=", "=", "!="]).optional(),
    raisedAt: timestamp, clearedAt: timestamp.optional(), sourceStatus: z.enum(["Active", "Cleared"])
  }).strict().refine(a => a.sourceStatus !== "Cleared" || !!a.clearedAt, "Cleared alarms require clearedAt")
    .refine(a => !a.clearedAt || Date.parse(a.clearedAt) >= Date.parse(a.raisedAt), "Clear time precedes raise time"))
    .max(100).default([]),
  events: z.array(z.object({
    eventId: text, pipelineId: text, tagId: text.optional(), eventType: text, severity: text, description: text,
    value: z.number().finite().optional(), engineeringUnit: text.optional(), occurredAt: timestamp,
    status: text.default("Open"), sourceSystemId: text
  }).strict()).max(500).default([]),
  anomalies: z.array(z.object({
    anomalyId: text, tagId: text.optional(), anomalyType: text, severity: text, description: text,
    detectedAt: timestamp, sourceReadingId: text.optional()
  }).strict()).max(500).default([]),
  indicators: z.array(z.object({
    indicatorId: text, pipelineId: text, name: text, value: z.number().finite().optional(),
    engineeringUnit: text.optional(), measuredAt: timestamp, sourceSystemId: text
  }).strict()).max(100).default([]),
  qualityRecords: z.array(z.object({
    recordId: text, tagId: text, quality: text, reason: z.string().max(1000).optional(), recordedAt: timestamp
  }).strict()).max(1000).default([])
}).strict().refine(b => b.readings.length + b.alarms.length + b.events.length + b.anomalies.length + b.indicators.length + b.qualityRecords.length > 0, "At least one SCADA record is required");

export function parseScada<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw createValidationErrorFromZod(parsed.error);
  return parsed.data;
}
export function scadaDatabase() {
  const db = getPrismaClient();
  if (!db) throw new DatabaseUnavailableError();
  return db;
}
/** A logical SCADA tag may be independent; a claimed device assignment must be real and match the saved asset. */
export async function validateTagDeviceLink(tag: {sensorAssignmentId?:string|null;assetId:string;pipelineId:string},user:AuthUser) {
 const scope=ownerScope(user);
 const asset=await store.findAssetById(tag.assetId,scope);
 if(asset?.assetType==="SENSOR"&&realSensorAssetBlockers(asset).length)throw createValidationError({assetId:"Saved sensor asset is quarantined or illustrative."});
 if(asset?.assetType==="SENSOR"&&(await store.listDevices(scope)).some(device=>device.deviceId===asset.assetId&&device.isDemoData))throw createValidationError({assetId:"DEMO devices cannot be linked to REAL SCADA tags."});
 if(!tag.sensorAssignmentId)return;
 const [assignment,devices]=await Promise.all([store.findSensorAssignmentById(tag.sensorAssignmentId,scope),store.listDevices(scope)]);
 if(!assignment||assignment.activeTo||!asset||asset.pipelineId!==tag.pipelineId||asset.assetType!=="SENSOR"||asset.assetId!==assignment.sensorId) throw createValidationError({sensorAssignmentId:"Active assignment must identify the saved sensor asset in this pipeline"});
 if(realSensorAssetBlockers(asset).length)throw createValidationError({sensorAssignmentId:"Saved sensor asset is quarantined or illustrative."});
 const matches=devices.filter(device=>device.deviceId===assignment.sensorId&&!device.isDemoData);
 if(matches.length!==1) throw createValidationError({sensorAssignmentId:"A unique registered REAL device is required"});
}

export async function accessiblePipeline(pipelineId: string, user: AuthUser) {
  const pipeline = await store.findPipelineById(pipelineId, ownerScope(user));
  if (!pipeline) throw createValidationError({ pipelineId: "Pipeline not found or access denied" });
  return pipeline;
}

export type ScadaTagRow = {
  id: string; sourceTagName: string; displayName: string; description: string | null;
  measurementType: string; engineeringUnit: string; pipelineId: string; assetId: string;
  connectorId: string; sourceSystemId: string; scanIntervalSeconds: number; staleAfterSeconds: number;
  highHigh: number | null; high: number | null; low: number | null; lowLow: number | null;
  thresholdSource: string | null; documentIds: string[]; sensorAssignmentId: string | null;
  activeFrom: Date; active: boolean;
};
export type ScadaReadingRow = {
  rawValue?: unknown; id: string; tagId: string; sourceTimestamp: Date; normalizedUtcTimestamp: Date; sourceTimezone: string;
  receiveTimestamp: Date; value: number | null; state: string | null; engineeringUnit: string; quality: string;
};
type ScadaQualityExceptionRow = { readingId: string; tagId: string; tagName: string; assetId: string; assetName: string | null; station: string | null; sourceTimestamp: Date; value: number | null; engineeringUnit: string; quality: string };
type ScadaQualityTrendRow = { bucket: Date; total: number; valid: number; missing: number };
type ScadaHeatmapRow = { tagId: string; bucket: Date; quality: string | null };
export function readingStatus(tag: Pick<ScadaTagRow, "staleAfterSeconds" | "highHigh" | "high" | "low" | "lowLow" | "engineeringUnit">, reading: ScadaReadingRow | undefined, now: Date) {
  if (!reading) return { freshness: "Missing", processStatus: "Unknown" };
  const age = now.getTime() - new Date(reading.sourceTimestamp).getTime();
  if (age < -60000) return { freshness: "Unknown", processStatus: "Unknown" };
  if (age > tag.staleAfterSeconds * 1000 || reading.quality === "Stale") return { freshness: "Stale", processStatus: "Stale" };
  if (reading.engineeringUnit !== tag.engineeringUnit || reading.quality !== "Good") return { freshness: "Unknown", processStatus: "Unknown" };
  if (reading.state) return { freshness: "Live", processStatus: reading.state };
  if (reading.value === null) return { freshness: "Missing", processStatus: "Unknown" };
  const limits = [tag.lowLow, tag.low, tag.high, tag.highHigh];
  if (limits.every(n => n === null)) return { freshness: "Live", processStatus: "Unknown" };
  const alarm = (tag.highHigh !== null && reading.value > tag.highHigh) || (tag.lowLow !== null && reading.value < tag.lowLow);
  const attention = (tag.high !== null && reading.value > tag.high) || (tag.low !== null && reading.value < tag.low);
  return { freshness: "Live", processStatus: alarm ? "Alarm" : attention ? "Attention" : "Normal" };
}

export async function getScadaOverview(pipelineId: string, user: AuthUser) {
  const pipeline = await accessiblePipeline(pipelineId, user);
  const db = scadaDatabase();
  const assets = await store.listAssets({ pipelineId, ...ownerScope(user) });
  const segments = await store.listSegments({ pipelineId, ...ownerScope(user) });
  const now = new Date();
  const tags = await db.$queryRawUnsafe<ScadaTagRow[]>(`SELECT t.* FROM "ScadaTag" t JOIN "IntegrationConnector" c ON c.id=t."connectorId" WHERE t."pipelineId"=$1 AND t.active=true AND ($2 OR c."authorId"=$3) ORDER BY t."displayName"`, pipelineId, user.role === "Admin", user.id);
  const ids = tags.map(t => t.id);
  const [latest, alarms, quality, rate, sources, coverage, qualityExceptions, qualityTrend, events, anomalies, indicators, heatmap] = await Promise.all([
    db.$queryRawUnsafe<ScadaReadingRow[]>(`SELECT DISTINCT ON ("tagId") * FROM "SharedTimeSeriesReading" WHERE "tagId"=ANY($1::text[]) ORDER BY "tagId", "sourceTimestamp" DESC, "receiveTimestamp" DESC`, ids),
    db.$queryRawUnsafe<any[]>(`SELECT a.*, t."displayName" AS "tagName", t."engineeringUnit", COALESCE((SELECT json_agg(json_build_object('id',n.id,'note',n.note,'followUp',n."followUp",'createdAt',n."createdAt") ORDER BY n."createdAt" DESC) FROM "ScadaAlarmNote" n WHERE n."alarmId"=a.id),'[]'::json) AS notes FROM "ScadaAlarm" a JOIN "ScadaTag" t ON t.id=a."tagId" WHERE a."tagId"=ANY($1::text[]) ORDER BY a."raisedAt" DESC LIMIT 500`, ids),
    db.$queryRawUnsafe<Array<{ quality: string; count: number }>>(`SELECT quality, COUNT(*)::int AS count FROM "SharedTimeSeriesReading" WHERE "tagId"=ANY($1::text[]) AND "sourceTimestamp">=$2::timestamp AND "sourceTimestamp"<=$3::timestamp GROUP BY quality`, ids, new Date(now.getTime() - 86400000).toISOString(), now.toISOString()),
    db.$queryRawUnsafe<Array<{ count: number }>>(`SELECT COUNT(*)::int AS count FROM "SharedTimeSeriesReading" WHERE "tagId"=ANY($1::text[]) AND "receiveTimestamp">=$2::timestamp AND "receiveTimestamp"<=$3::timestamp`, ids, new Date(now.getTime() - 60000).toISOString(), now.toISOString()),
    db.$queryRawUnsafe<any[]>(`SELECT DISTINCT c.id,c.name,c."connectorType",c.enabled,c.status,c."lastSuccessfulTestAt" FROM "IntegrationConnector" c JOIN "ScadaTag" t ON t."connectorId"=c.id WHERE t.id=ANY($1::text[])`, ids),
    db.$queryRawUnsafe<Array<{ id: string; expected: number; observed: number }>>(`SELECT t.id,
      floor(GREATEST(0,extract(epoch from ($2::timestamp-GREATEST(t."activeFrom",$3::timestamp)))) / t."scanIntervalSeconds")::int AS expected,
      COUNT(DISTINCT floor(extract(epoch from (r."sourceTimestamp"-GREATEST(t."activeFrom",$3::timestamp))) / t."scanIntervalSeconds"))::int AS observed
      FROM "ScadaTag" t LEFT JOIN "SharedTimeSeriesReading" r ON r."tagId"=t.id
      AND r."sourceTimestamp">=GREATEST(t."activeFrom",$3::timestamp)
      AND r."sourceTimestamp"<GREATEST(t."activeFrom",$3::timestamp)+floor(GREATEST(0,extract(epoch from ($2::timestamp-GREATEST(t."activeFrom",$3::timestamp)))) / t."scanIntervalSeconds") * t."scanIntervalSeconds" * interval '1 second'
      WHERE t.id=ANY($1::text[]) GROUP BY t.id`, ids, now.toISOString(), new Date(now.getTime() - 30 * 86400000).toISOString()),
    db.$queryRawUnsafe<ScadaQualityExceptionRow[]>(`SELECT r.id AS "readingId",t.id AS "tagId",t."displayName" AS "tagName",a."assetId",a.name AS "assetName",COALESCE(a."facilityType",a."equipmentType") AS station,r."sourceTimestamp",r.value,r."engineeringUnit",r.quality FROM "SharedTimeSeriesReading" r JOIN "ScadaTag" t ON t.id=r."tagId" JOIN "Asset" a ON a.id=t."assetId" WHERE r."tagId"=ANY($1::text[]) AND r.quality!='Good' AND r."sourceTimestamp">=$2::timestamp ORDER BY r."sourceTimestamp" DESC LIMIT 100`, ids, new Date(now.getTime() - 86400000).toISOString()),
    db.$queryRawUnsafe<ScadaQualityTrendRow[]>(`SELECT buckets.bucket,COUNT(r.id)::int AS total,COUNT(r.id) FILTER (WHERE r.quality='Good')::int AS valid,COUNT(r.id) FILTER (WHERE r.quality='Missing')::int AS missing FROM generate_series(date_trunc('hour',$2::timestamp),date_trunc('hour',$3::timestamp),interval '1 hour') buckets(bucket) LEFT JOIN "SharedTimeSeriesReading" r ON r."tagId"=ANY($1::text[]) AND r."sourceTimestamp">=buckets.bucket AND r."sourceTimestamp"<buckets.bucket+interval '1 hour' GROUP BY buckets.bucket ORDER BY buckets.bucket`, ids, new Date(now.getTime() - 23 * 3600000).toISOString(), now.toISOString()),
    db.$queryRawUnsafe<any[]>(`SELECT e.* FROM "ScadaEvent" e WHERE e."pipelineId"=$1 AND e."occurredAt">=$2::timestamp AND ($3 OR EXISTS (SELECT 1 FROM "ScadaTag" t JOIN "IntegrationConnector" c ON c.id=t."connectorId" WHERE t."pipelineId"=e."pipelineId" AND t."sourceSystemId"=e."sourceSystemId" AND c."authorId"=$4 AND (e."tagId" IS NULL OR e."tagId"=t.id)) AND NOT EXISTS (SELECT 1 FROM "ScadaTag" t JOIN "IntegrationConnector" c ON c.id=t."connectorId" WHERE t."pipelineId"=e."pipelineId" AND t."sourceSystemId"=e."sourceSystemId" AND c."authorId"!=$4)) ORDER BY e."occurredAt" DESC LIMIT 500`, pipelineId, new Date(now.getTime() - 30 * 86400000).toISOString(), user.role === "Admin", user.id),
    db.$queryRawUnsafe<any[]>(`SELECT a.* FROM "ScadaAnomaly" a WHERE a."pipelineId"=$1 AND a."detectedAt">=$2::timestamp AND ($3 OR a."tagId"=ANY($4::text[])) ORDER BY a."detectedAt" DESC LIMIT 500`, pipelineId, new Date(now.getTime() - 30 * 86400000).toISOString(), user.role === "Admin", ids),
    db.$queryRawUnsafe<any[]>(`SELECT i.* FROM "ScadaIndicator" i WHERE i."pipelineId"=$1 AND ($2 OR EXISTS (SELECT 1 FROM "ScadaTag" t JOIN "IntegrationConnector" c ON c.id=t."connectorId" WHERE t."pipelineId"=i."pipelineId" AND t."sourceSystemId"=i."sourceSystemId" AND c."authorId"=$3) AND NOT EXISTS (SELECT 1 FROM "ScadaTag" t JOIN "IntegrationConnector" c ON c.id=t."connectorId" WHERE t."pipelineId"=i."pipelineId" AND t."sourceSystemId"=i."sourceSystemId" AND c."authorId"!=$3)) ORDER BY i."measuredAt" DESC LIMIT 100`, pipelineId, user.role === "Admin", user.id),
    db.$queryRawUnsafe<ScadaHeatmapRow[]>(`SELECT t.id AS "tagId", buckets.bucket, COALESCE((SELECT records.quality FROM (SELECT r.quality,r."sourceTimestamp" AS recorded FROM "SharedTimeSeriesReading" r WHERE r."tagId"=t.id UNION ALL SELECT q.quality,q."recordedAt" AS recorded FROM "DataQualityRecord" q WHERE q."tagId"=t.id) records WHERE records.recorded>=buckets.bucket AND records.recorded<buckets.bucket+interval '1 hour' ORDER BY records.recorded DESC LIMIT 1),'Missing') AS quality FROM "ScadaTag" t CROSS JOIN generate_series(date_trunc('hour',$2::timestamp),date_trunc('hour',$3::timestamp),interval '1 hour') buckets(bucket) WHERE t.id=ANY($1::text[]) ORDER BY t.id,buckets.bucket`, ids, new Date(now.getTime() - 23 * 3600000).toISOString(), now.toISOString())
  ]);
  const activeCounts = await db.$queryRawUnsafe<Array<{ severity: string; count: number }>>(`SELECT severity,COUNT(*)::int AS count FROM "ScadaAlarm" WHERE "tagId"=ANY($1::text[]) AND "sourceStatus"='Active' GROUP BY severity`, ids);
  const readings = new Map(latest.map(r => [r.tagId, r]));
  const connectors = new Map(sources.map(c => [c.id, c]));
  const currentTags = tags.map(tag => {
    const reading = readings.get(tag.id);
    const source = connectors.get(tag.connectorId);
    const status = readingStatus(tag, reading, now);
    if (!source?.enabled || source.status === "Failed" || source.status === "Disabled") {
      status.freshness = reading ? "Stale" : "Missing";
      status.processStatus = reading ? "Stale" : "Unknown";
    }
    return { ...tag, reading: reading ? {...reading,...readingProvenance(reading.rawValue,tag.connectorId)} : null, ...status };
  });
  const stations = assets.filter(a => a.facilityType);
  const online = stations.filter(a => currentTags.some(t => (t.assetId === a.id || assets.find(e => e.id === t.assetId)?.parentAssetId === a.id) && t.freshness === "Live")).length;
  const total = quality.reduce((sum, r) => sum + r.count, 0);
  const qualityCount = (names: string[]) => quality.filter(q => names.includes(q.quality)).reduce((sum, q) => sum + q.count, 0);
  const staleTags = currentTags.filter(t => t.freshness === "Stale").length;
  const issueAssets = new Set(currentTags.filter(t => ["Alarm", "Attention", "Fault", "Trip", "Mismatch"].includes(t.processStatus)).map(t => t.assetId));
  const latestTime = latest.reduce<Date | null>((max, r) => !max || new Date(r.sourceTimestamp) > max ? new Date(r.sourceTimestamp) : max, null);
  const expectedSlots = coverage.reduce((n, row) => n + row.expected, 0);
  const observedSlots = coverage.reduce((n, row) => n + Math.min(row.observed, row.expected), 0);
  return {
    pipeline, segments, assets, tags: currentTags, alarms, sources, fetchedAt: now.toISOString(),
    lastUpdated: latestTime?.toISOString() ?? null,
    status: currentTags.length && currentTags.every(t => t.freshness === "Live") ? "Live" : currentTags.some(t => t.freshness === "Live") ? "Partial" : latest.length ? "Stale" : "Not Connected",
    kpis: {
      stationsOnline: stations.length ? online : null, stationsExpected: stations.length || null,
      totalTags: tags.length, healthyTagsPercent: tags.length ? currentTags.filter(t => t.freshness === "Live").length / tags.length * 100 : null,
      activeAlarms: sources.length ? activeCounts.reduce((n, row) => n + row.count, 0) : null, alarmSeverityCounts: activeCounts,
      equipmentIssues: currentTags.some(t => t.freshness === "Live") ? issueAssets.size : null, readingsPerMinute: latest.length ? rate[0].count : null,
      dataAvailabilityPercent: expectedSlots && latest.length ? observedSlots / expectedSlots * 100 : null,
      availabilityReason: "Observed sampling slots / expected sampling slots, per configured scan interval since tag activation, within the last 30 days. Not physical pipeline availability or service uptime."
    },
    dataQuality: { totalReadings: total, valid: qualityCount(["Good"]), suspect: qualityCount(["Uncertain", "Substituted"]), invalid: qualityCount(["Bad"]), missing: qualityCount(["Missing"]), staleReadings: qualityCount(["Stale"]), staleTags, totalTags: tags.length, exceptions: qualityExceptions, trend: qualityTrend, heatmap },
    events, anomalies, indicators,
    limitations: ["Data availability measures sampling-slot coverage since active tag registration, within the last 30 days; it does not measure physical pipeline availability.", "Missing Readings counts explicit source-quality Missing records; absent sampling slots are reflected in data availability."]
  };
}

export async function getScadaHistory(tagId: string, user: AuthUser, hours = 24, requestedStart?: Date, requestedEnd?: Date, requestedResolutionMinutes?: number, aggregation = "Average") {
  const functions: Record<string, string> = { Average: "AVG", Min: "MIN", Max: "MAX", Sum: "SUM" };
  if (aggregation !== "Raw" && !Object.hasOwn(functions, aggregation)) throw createValidationError({ aggregation: "Choose Raw, Average, Min, Max or Sum" });
  if (!Number.isFinite(hours) || hours < 0.5 || hours > 720) throw createValidationError({ hours: "Must be between 0.5 and 720" });
  if (requestedResolutionMinutes !== undefined && (!Number.isInteger(requestedResolutionMinutes) || requestedResolutionMinutes < 1 || requestedResolutionMinutes > 1440)) throw createValidationError({ resolutionMinutes: "Must be between 1 and 1440" });
  const db = scadaDatabase();
  const tags = await db.$queryRawUnsafe<ScadaTagRow[]>(`SELECT * FROM "ScadaTag" WHERE id=$1`, tagId);
  const tag = tags[0];
  if (!tag) throw createValidationError({ tagId: "Tag not found" });
  await accessiblePipeline(tag.pipelineId, user);
  const connector = await db.integrationConnector.findFirst({ where: { id: tag.connectorId, ...(user.role === "Admin" ? {} : { authorId: user.id }) } });
  if (!connector) throw createValidationError({ tagId: "Tag not found or access denied" });
  const end = requestedEnd ?? new Date();
  const start = requestedStart ?? new Date(end.getTime() - hours * 3600000);
  if (start >= end || end.getTime() - start.getTime() > 720 * 3600000) throw createValidationError({ range: "Historical range must be positive and no longer than 30 days" });
  const resolutionSeconds = requestedResolutionMinutes ? requestedResolutionMinutes * 60 : Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 1000 / 480));
  const points = await db.$queryRawUnsafe<any[]>(`SELECT to_timestamp(floor(extract(epoch from "sourceTimestamp") / $4) * $4) AS timestamp,
    ${functions[aggregation] ?? "AVG"}(value) FILTER (WHERE quality='Good' AND "engineeringUnit"=$5) AS value,
    MIN(value) FILTER (WHERE quality='Good' AND "engineeringUnit"=$5) AS min,
    MAX(value) FILTER (WHERE quality='Good' AND "engineeringUnit"=$5) AS max,
    COUNT(*)::int AS samples, COUNT(*) FILTER (WHERE quality!='Good' OR "engineeringUnit"!=$5)::int AS "flaggedSamples"
    FROM "SharedTimeSeriesReading" WHERE "tagId"=$1 AND "sourceTimestamp">=$2::timestamp AND "sourceTimestamp"<$3::timestamp
    GROUP BY 1 ORDER BY 1`, tagId, start.toISOString(), end.toISOString(), resolutionSeconds, tag.engineeringUnit);
  const rawPoints = aggregation === "Raw" ? await db.$queryRawUnsafe<any[]>(`SELECT "sourceTimestamp" AS timestamp,
    CASE WHEN quality='Good' AND "engineeringUnit"=$4 THEN value ELSE NULL END AS value,
    CASE WHEN quality='Good' AND "engineeringUnit"=$4 THEN value ELSE NULL END AS min,
    CASE WHEN quality='Good' AND "engineeringUnit"=$4 THEN value ELSE NULL END AS max,
    1 AS samples, CASE WHEN quality!='Good' OR "engineeringUnit"!=$4 THEN 1 ELSE 0 END AS "flaggedSamples"
    FROM "SharedTimeSeriesReading" WHERE "tagId"=$1 AND "sourceTimestamp">=$2::timestamp AND "sourceTimestamp"<$3::timestamp ORDER BY "sourceTimestamp",sequence LIMIT 5001`, tagId, start.toISOString(), end.toISOString(), tag.engineeringUnit) : null;
  if (rawPoints && rawPoints.length > 5000) throw createValidationError({ range: "Raw data exceeds 5000 samples; shorten the range or select an aggregation" });
  const summaryRows = await db.$queryRawUnsafe<any[]>(`SELECT
    MIN(value) FILTER (WHERE quality='Good' AND "engineeringUnit"=$4) AS min,
    MAX(value) FILTER (WHERE quality='Good' AND "engineeringUnit"=$4) AS max,
    AVG(value) FILTER (WHERE quality='Good' AND "engineeringUnit"=$4) AS average,
    COUNT(*)::int AS samples,
    COUNT(*) FILTER (WHERE quality='Good' AND "engineeringUnit"=$4 AND value IS NOT NULL)::int AS "validSamples",
    COUNT(DISTINCT floor(extract(epoch from ("sourceTimestamp"-$2::timestamp)) / $5)) FILTER (WHERE quality!='Missing')::int AS "observedSlots"
    FROM "SharedTimeSeriesReading" WHERE "tagId"=$1 AND "sourceTimestamp">=$2::timestamp AND "sourceTimestamp"<$3::timestamp`,
    tagId, start.toISOString(), end.toISOString(), tag.engineeringUnit, tag.scanIntervalSeconds);
  const summary = summaryRows[0];
  const expectedSlots = Math.ceil((end.getTime() - start.getTime()) / (tag.scanIntervalSeconds * 1000));
  return { tagId, engineeringUnit: tag.engineeringUnit, start, end, resolutionSeconds: aggregation === "Raw" ? tag.scanIntervalSeconds : resolutionSeconds, aggregation, points: rawPoints ?? points,
    summary: { ...summary, expectedSlots, completenessPercent: summary.samples && expectedSlots ? Math.min(100, summary.observedSlots / expectedSlots * 100) : null } };
}

export async function getScadaConfiguration(pipelineId: string, user: AuthUser) {
  await accessiblePipeline(pipelineId, user);
  const db = scadaDatabase();
  const changes = await db.$queryRawUnsafe<any[]>(`SELECT c.*,u.name AS "actorName" FROM "ScadaConfigChange" c LEFT JOIN "User" u ON u.id=c."actorId" WHERE c."pipelineId"=$1 AND ($2 OR c."actorId"=$3) ORDER BY c."createdAt" DESC LIMIT 100`, pipelineId, user.role === "Admin", user.id);
  const tags = await db.$queryRawUnsafe<any[]>(`SELECT t.* FROM "ScadaTag" t JOIN "IntegrationConnector" c ON c.id=t."connectorId" WHERE t."pipelineId"=$1 AND ($2 OR c."authorId"=$3) ORDER BY t."displayName"`, pipelineId, user.role === "Admin", user.id);
  // Legacy SCADA copies are not authoritative Integration Hub settings or approved units.
  return { polling: null, routing: null, units: [], changes, tags, unitDictionaryAvailable: false,
    ownershipLimitations: ["Polling and routing require an Integration Hub-owned read contract.", "Unit conversions require the approved Settings Unit Dictionary."] };
}

export async function getScadaQuality(pipelineId: string, user: AuthUser, hours = 24) {
  if (![24, 168, 720].includes(hours)) throw createValidationError({ hours: "Choose 24 hours, 7 days or 30 days" });
  const overview = await getScadaOverview(pipelineId, user), db = scadaDatabase(), ids = overview.tags.map(tag => tag.id);
  const end = new Date(), start = new Date(end.getTime() - hours * 3600000), seconds = hours * 3600 / 24;
  const coverageFor = (from: Date, to: Date) => db.$queryRawUnsafe<any[]>(`WITH windows AS (
    SELECT t.id AS "tagId",t."connectorId",t."scanIntervalSeconds",b.bucket,
      GREATEST(t."activeFrom",$2::timestamp) AS origin,
      GREATEST(t."activeFrom",b.bucket) AS beginning,LEAST(b.bucket+$4*interval '1 second',$3::timestamp) AS ending
    FROM "ScadaTag" t CROSS JOIN generate_series($2::timestamp,$3::timestamp-interval '1 millisecond',$4*interval '1 second') b(bucket)
    WHERE t.id=ANY($1::text[]))
    SELECT w."tagId",w."connectorId",w.bucket,
      GREATEST(0,ceil(extract(epoch from (w.ending-w.origin))/w."scanIntervalSeconds")-ceil(extract(epoch from (w.beginning-w.origin))/w."scanIntervalSeconds"))::int AS expected,
      COUNT(DISTINCT floor(extract(epoch from (r."sourceTimestamp"-w.origin))/w."scanIntervalSeconds")) FILTER (WHERE r.quality!='Missing')::int AS observed
    FROM windows w LEFT JOIN "SharedTimeSeriesReading" r ON r."tagId"=w."tagId" AND r."sourceTimestamp">=w.origin AND r."sourceTimestamp"<$3::timestamp
      AND floor(extract(epoch from (r."sourceTimestamp"-w.origin))/w."scanIntervalSeconds")>=ceil(extract(epoch from (w.beginning-w.origin))/w."scanIntervalSeconds")
      AND floor(extract(epoch from (r."sourceTimestamp"-w.origin))/w."scanIntervalSeconds")<ceil(extract(epoch from (w.ending-w.origin))/w."scanIntervalSeconds")
    GROUP BY w."tagId",w."connectorId",w.bucket,w.origin,w.beginning,w.ending,w."scanIntervalSeconds" ORDER BY w.bucket`, ids, from.toISOString(), to.toISOString(), seconds);
  const previousStart = new Date(start.getTime() - hours * 3600000);
  const coverage = await coverageFor(start, end), previousCoverage = await coverageFor(previousStart, start);
  const [counts, heatmap, exceptions] = await Promise.all([
    db.$queryRawUnsafe<any[]>(`SELECT quality,COUNT(*)::int AS count FROM "SharedTimeSeriesReading" WHERE "tagId"=ANY($1::text[]) AND "sourceTimestamp">=$2::timestamp AND "sourceTimestamp"<$3::timestamp GROUP BY quality`, ids, start.toISOString(), end.toISOString()),
    db.$queryRawUnsafe<any[]>(`SELECT t.id AS "tagId",b.bucket,COALESCE((SELECT records.quality FROM (
      SELECT r.quality,r."sourceTimestamp" AS at FROM "SharedTimeSeriesReading" r WHERE r."tagId"=t.id
      UNION ALL SELECT q.quality,q."recordedAt" FROM "DataQualityRecord" q WHERE q."tagId"=t.id) records
      WHERE records.at>=b.bucket AND records.at<LEAST(b.bucket+$4*interval '1 second',$3::timestamp) ORDER BY records.at DESC LIMIT 1),'Missing') AS quality
      FROM "ScadaTag" t CROSS JOIN generate_series($2::timestamp,$3::timestamp-interval '1 millisecond',$4*interval '1 second') b(bucket) WHERE t.id=ANY($1::text[]) ORDER BY t.id,b.bucket`, ids, start.toISOString(), end.toISOString(), seconds),
    db.$queryRawUnsafe<any[]>(`SELECT records.*,t."displayName" AS "tagName",t."assetId",t."connectorId",a.name AS "assetName",a."facilityType" AS station,
      CASE WHEN records.quality='Bad' THEN 'High' ELSE 'Medium' END AS severity FROM (
      SELECT r.id AS "readingId",r."tagId",r."sourceTimestamp",r.value,r."engineeringUnit",r.quality,
        COALESCE((SELECT q.reason FROM "DataQualityRecord" q WHERE q."tagId"=r."tagId" AND q."recordedAt"=r."sourceTimestamp" LIMIT 1),'Source quality: '||r.quality) AS details
        FROM "SharedTimeSeriesReading" r WHERE r.quality!='Good'
      UNION ALL SELECT q.id,q."tagId",q."recordedAt",NULL,NULL,q.quality,q.reason FROM "DataQualityRecord" q WHERE q.quality!='Good'
        AND NOT EXISTS (SELECT 1 FROM "SharedTimeSeriesReading" r WHERE r."tagId"=q."tagId" AND r."sourceTimestamp"=q."recordedAt" AND r.quality=q.quality)
      ) records JOIN "ScadaTag" t ON t.id=records."tagId" JOIN "Asset" a ON a.id=t."assetId"
      WHERE t.id=ANY($1::text[]) AND records."sourceTimestamp">=$2::timestamp AND records."sourceTimestamp"<$3::timestamp ORDER BY records."sourceTimestamp" DESC LIMIT 1000`, ids, start.toISOString(), end.toISOString())
  ]);
  const coverageStats = (rows: any[]) => { const expected = rows.reduce((sum, row) => sum + row.expected, 0), observed = rows.reduce((sum, row) => sum + Math.min(row.observed, row.expected), 0); return { expected, observed, availabilityPercent: expected ? observed / expected * 100 : null, missingPercent: expected ? (expected-observed)/expected*100 : null }; };
  const totalReadings = counts.reduce((sum, row) => sum + row.count, 0), count = (qualities: string[]) => counts.filter(row => qualities.includes(row.quality)).reduce((sum, row) => sum + row.count, 0);
  const previousCounts = await db.$queryRawUnsafe<Array<{ quality: string; count: number }>>(`SELECT quality,COUNT(*)::int AS count FROM "SharedTimeSeriesReading" WHERE "tagId"=ANY($1::text[]) AND "sourceTimestamp">=$2::timestamp AND "sourceTimestamp"<$3::timestamp GROUP BY quality`, ids, previousStart.toISOString(), start.toISOString());
  const previousTotal = previousCounts.reduce((sum,row) => sum+row.count,0);
  const delta = (qualities: string[]) => totalReadings && previousTotal ? count(qualities)/totalReadings*100 - previousCounts.filter(row => qualities.includes(row.quality)).reduce((sum,row) => sum+row.count,0)/previousTotal*100 : null;
  const availability = coverageStats(coverage), previousAvailability = coverageStats(previousCoverage);
  const availabilityDelta = availability.availabilityPercent !== null && previousAvailability.availabilityPercent !== null ? availability.availabilityPercent-previousAvailability.availabilityPercent : null;
  const trend = Array.from({ length: 24 }, (_, index) => { const bucket = new Date(start.getTime() + index * seconds * 1000); return { bucket, ...coverageStats(coverage.filter(row => new Date(row.bucket).getTime() === bucket.getTime())) }; });
  return { hours, start, end, totalReadings, valid: count(['Good']), suspect: count(['Uncertain','Substituted']), invalid: count(['Bad']), staleReadings: count(['Stale']), missing: count(['Missing']),
    ...availability, previous: { start: previousStart, end: start, totalReadings: previousTotal, ...previousAvailability }, deltas: { availability: availabilityDelta, valid: delta(['Good']), suspect: delta(['Uncertain','Substituted']), invalid: delta(['Bad']), stale: delta(['Stale']) }, trend, heatmap, exceptions, sources: overview.sources.map(source => { const current = coverageStats(coverage.filter(row => row.connectorId === source.id)), previous = coverageStats(previousCoverage.filter(row => row.connectorId === source.id)); return { ...source, ...current, availabilityDelta: current.availabilityPercent !== null && previous.availabilityPercent !== null ? current.availabilityPercent-previous.availabilityPercent : null }; }),
    limitations: ['Availability measures configured sampling-slot coverage, not connector uptime. Exception severity is a KLINTHRU display policy, not source alarm priority.', 'Exception results are capped at the newest 1000 records.'] };
}

export async function ingestScadaBatch(connectorId: string, input: unknown, user: AuthUser, context:{channel:SourceChannel;identity:IngestionIdentity;tagId:string}|undefined=undefined) {
  const batch = parseScada(scadaBatchSchema, input);
  return scadaDatabase().$transaction(db => ingestValidatedScadaBatch(connectorId, batch, user, db,context), { timeout: 60000 });
}

async function ingestValidatedScadaBatch(connectorId: string, batch: z.infer<typeof scadaBatchSchema>, user: AuthUser, db: Pick<ReturnType<typeof scadaDatabase>, "$queryRawUnsafe" | "integrationConnector" | "asset">,context?:{channel:SourceChannel;identity:IngestionIdentity;tagId:string}) {
  const connector = await db.integrationConnector.findFirst({ where: { id: connectorId, authorId: user.id, enabled: true } });
  if (!connector) throw createValidationError({ connectorId: "Enabled connector owned by the ingesting user is required" });
  if(connector.connectorType!=="REST") throw createValidationError({connectorId:"API ingestion requires a REST connector"});
  const configuration=connector.configuration as {dataMode?:string;integrationScope?:{pipelineId?:string;assetId?:string}}|null;
  if(configuration?.dataMode&&configuration.dataMode!=="REAL") throw createValidationError({connectorId:"Demo connectors cannot ingest real readings"});
  await validateLocalInboundIngestion(db,connector,user,context);
  const ids = [...new Set([...batch.readings, ...batch.alarms, ...batch.events.filter(r => r.tagId), ...batch.anomalies.filter(r => r.tagId), ...batch.qualityRecords].map(r => r.tagId).filter((id): id is string => Boolean(id)))];
  const tags = await db.$queryRawUnsafe<ScadaTagRow[]>(`SELECT * FROM "ScadaTag" WHERE "connectorId"=$1 AND id=ANY($2::text[]) AND active=true`, connectorId, ids);
  if (tags.length !== ids.length) throw createValidationError({ tagId: "Unknown, inactive or unmapped connector tag" });
  for (const tag of tags) {
    await accessiblePipeline(tag.pipelineId, user);
    await validateTagDeviceLink(tag,user);
    if(context){
      const asset=await store.findAssetById(tag.assetId,ownerScope(user));
      const devices=await store.listDevices(ownerScope(user));
      if(asset&&realSensorAssetBlockers(asset).length)throw createValidationError({deviceId:"Saved sensor asset is quarantined or illustrative."});
      if(tag.id!==context.tagId||tag.pipelineId!==context.identity.pipelineId||asset?.pipelineId!==context.identity.pipelineId||asset.assetType!=="SENSOR"||asset.assetId!==context.identity.deviceId||devices.filter(device=>device.deviceId===context.identity.deviceId&&!device.isDemoData).length!==1)throw createValidationError({deviceId:"Registered REAL device and tag must match the selected sensor asset and pipeline"});
    }
    if(configuration?.integrationScope?.pipelineId&&configuration.integrationScope.pipelineId!==tag.pipelineId||configuration?.integrationScope?.assetId&&configuration.integrationScope.assetId!==tag.assetId) throw createValidationError({tagId:"Tag is outside the connector scope"});
  }
  const byId = new Map(tags.map(t => [t.id, t]));
  async function validateSource(pipelineId: string, sourceSystemId: string, tagId?: string) {
    if (tagId && byId.get(tagId)?.sourceSystemId !== sourceSystemId) throw createValidationError({ sourceSystemId: "Source system must match the registered tag" });
    const mappings = await db.$queryRawUnsafe<Array<{ connectorId: string }>>(`SELECT DISTINCT "connectorId" FROM "ScadaTag" WHERE "pipelineId"=$1 AND "sourceSystemId"=$2`, pipelineId, sourceSystemId);
    if (mappings.length !== 1 || mappings[0].connectorId !== connectorId) throw createValidationError({ sourceSystemId: "A unique registered connector/source mapping is required" });
  }
  async function validateRecordIdentity(table: "ScadaEvent" | "ScadaAnomaly" | "ScadaIndicator" | "DataQualityRecord", column: "eventId" | "anomalyId" | "indicatorId" | "recordId", identifier: string, pipelineId: string, tagId?: string, sourceSystemId?: string) {
    const rows = await db.$queryRawUnsafe<any[]>(`SELECT * FROM "${table}" WHERE "${column}"=$1`, identifier);
    const existing = rows[0];
    if (existing && (existing.pipelineId !== pipelineId || (existing.tagId ?? null) !== (tagId ?? null) || (sourceSystemId !== undefined && existing.sourceSystemId !== sourceSystemId))) {
      throw createValidationError({ recordId: "Record ID already belongs to a different pipeline, tag or source" });
    }
  }
  for (const event of batch.events) {
    await accessiblePipeline(event.pipelineId, user);
    await validateSource(event.pipelineId, event.sourceSystemId, event.tagId);
    if (event.tagId && byId.get(event.tagId)?.pipelineId !== event.pipelineId) throw createValidationError({ pipelineId: "Event pipeline must match the tag pipeline" });
    await validateRecordIdentity("ScadaEvent", "eventId", event.eventId, event.pipelineId, event.tagId, event.sourceSystemId);
  }
  for (const anomaly of batch.anomalies) {
    const tag = anomaly.tagId ? byId.get(anomaly.tagId) : undefined;
    if (!tag) throw createValidationError({ tagId: "Anomaly tag is required for connector ingestion" });
    await validateRecordIdentity("ScadaAnomaly", "anomalyId", anomaly.anomalyId, tag.pipelineId, anomaly.tagId);
  }
  for (const indicator of batch.indicators) {
    await accessiblePipeline(indicator.pipelineId, user);
    await validateSource(indicator.pipelineId, indicator.sourceSystemId);
    await validateRecordIdentity("ScadaIndicator", "indicatorId", indicator.indicatorId, indicator.pipelineId, undefined, indicator.sourceSystemId);
  }
  for (const record of batch.qualityRecords) {
    await validateRecordIdentity("DataQualityRecord", "recordId", record.recordId, byId.get(record.tagId)!.pipelineId, record.tagId);
  }
  let accepted = 0, duplicate = 0;
  for (const r of batch.readings) {
    const tag = byId.get(r.tagId)!;
    const {value,quality}=normalizeScadaReading(r,tag.engineeringUnit);
    const rows = await db.$queryRawUnsafe<any[]>(`INSERT INTO "SharedTimeSeriesReading" (id,"tagId","sourceTimestamp","sourceTimezone","normalizedUtcTimestamp",sequence,value,"rawValue",state,"engineeringUnit",quality)
      VALUES ($1,$2,$3::timestamp,$4,$3::timestamp,$5,$6,$7::jsonb,$8,$9,$10) ON CONFLICT ("tagId","sourceTimestamp",sequence) DO NOTHING RETURNING id`,
      randomUUID(), r.tagId, new Date(r.sourceTimestamp).toISOString(), r.sourceTimezone, r.sequence, value, JSON.stringify(apiReadingPayload(r.value,connectorId,context?.channel??"API",context?.identity)), r.state ?? null, r.engineeringUnit, quality);
    if (rows.length) accepted++; else duplicate++;
  }
  for (const a of batch.alarms) {
    await db.$queryRawUnsafe(`INSERT INTO "ScadaAlarm" (id,"tagId","sourceAlarmId",description,"sourcePriority",severity,"measuredValue",threshold,comparator,"raisedAt","clearedAt","sourceStatus")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::timestamp,$11::timestamp,$12) ON CONFLICT ("tagId","sourceAlarmId") DO UPDATE SET "sourceStatus"=EXCLUDED."sourceStatus","clearedAt"=EXCLUDED."clearedAt"
      WHERE "ScadaAlarm"."raisedAt"=EXCLUDED."raisedAt" AND "ScadaAlarm"."sourceStatus"!='Cleared'`, randomUUID(), a.tagId, a.sourceAlarmId, a.description, a.sourcePriority, a.severity, a.measuredValue ?? null, a.threshold ?? null, a.comparator ?? null, new Date(a.raisedAt).toISOString(), a.clearedAt ? new Date(a.clearedAt).toISOString() : null, a.sourceStatus);
  }
  for (const event of batch.events) {
    const tag = event.tagId ? byId.get(event.tagId) : undefined;
    if (event.tagId && !tag) throw createValidationError({ tagId: "Event tag is not mapped to this connector" });
    await accessiblePipeline(event.pipelineId, user);
    if (tag && tag.pipelineId !== event.pipelineId) throw createValidationError({ pipelineId: "Event pipeline must match the tag pipeline" });
    await db.$queryRawUnsafe(`INSERT INTO "ScadaEvent" (id,"eventId","pipelineId","tagId","eventType",severity,description,value,"engineeringUnit","occurredAt",status,"sourceSystemId") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::timestamp,$11,$12) ON CONFLICT ("eventId") DO UPDATE SET severity=EXCLUDED.severity,description=EXCLUDED.description,value=EXCLUDED.value,status=EXCLUDED.status WHERE "ScadaEvent"."pipelineId"=EXCLUDED."pipelineId" AND "ScadaEvent"."tagId" IS NOT DISTINCT FROM EXCLUDED."tagId" AND "ScadaEvent"."sourceSystemId"=EXCLUDED."sourceSystemId"`, randomUUID(), event.eventId, event.pipelineId, event.tagId ?? null, event.eventType, event.severity, event.description, event.value ?? null, event.engineeringUnit ?? null, new Date(event.occurredAt).toISOString(), event.status, event.sourceSystemId);
  }
  for (const anomaly of batch.anomalies) {
    const tag = anomaly.tagId ? byId.get(anomaly.tagId) : undefined;
    if (anomaly.tagId && !tag) throw createValidationError({ tagId: "Anomaly tag is not mapped to this connector" });
    if (!tag) throw createValidationError({ tagId: "Anomaly tag is required for connector ingestion" });
    await db.$queryRawUnsafe(`INSERT INTO "ScadaAnomaly" (id,"anomalyId","pipelineId","tagId","anomalyType",severity,description,"detectedAt","sourceReadingId") VALUES ($1,$2,$3,$4,$5,$6,$7,$8::timestamp,$9) ON CONFLICT ("anomalyId") DO UPDATE SET severity=EXCLUDED.severity,description=EXCLUDED.description WHERE "ScadaAnomaly"."pipelineId"=EXCLUDED."pipelineId" AND "ScadaAnomaly"."tagId" IS NOT DISTINCT FROM EXCLUDED."tagId"`, randomUUID(), anomaly.anomalyId, tag.pipelineId, anomaly.tagId, anomaly.anomalyType, anomaly.severity, anomaly.description, new Date(anomaly.detectedAt).toISOString(), anomaly.sourceReadingId ?? null);
  }
  for (const indicator of batch.indicators) {
    await accessiblePipeline(indicator.pipelineId, user);
    await db.$queryRawUnsafe(`INSERT INTO "ScadaIndicator" (id,"indicatorId","pipelineId",name,value,"engineeringUnit","measuredAt","sourceSystemId") VALUES ($1,$2,$3,$4,$5,$6,$7::timestamp,$8) ON CONFLICT ("indicatorId") DO UPDATE SET value=EXCLUDED.value,"measuredAt"=EXCLUDED."measuredAt" WHERE "ScadaIndicator"."pipelineId"=EXCLUDED."pipelineId" AND "ScadaIndicator"."sourceSystemId"=EXCLUDED."sourceSystemId"`, randomUUID(), indicator.indicatorId, indicator.pipelineId, indicator.name, indicator.value ?? null, indicator.engineeringUnit ?? null, new Date(indicator.measuredAt).toISOString(), indicator.sourceSystemId);
  }
  for (const record of batch.qualityRecords) {
    const tag = byId.get(record.tagId)!;
    await db.$queryRawUnsafe(`INSERT INTO "DataQualityRecord" (id,"recordId","pipelineId","tagId",quality,reason,"recordedAt") VALUES ($1,$2,$3,$4,$5,$6,$7::timestamp) ON CONFLICT ("recordId") DO UPDATE SET quality=EXCLUDED.quality,reason=EXCLUDED.reason WHERE "DataQualityRecord"."pipelineId"=EXCLUDED."pipelineId" AND "DataQualityRecord"."tagId" IS NOT DISTINCT FROM EXCLUDED."tagId"`, randomUUID(), record.recordId, tag.pipelineId, record.tagId, record.quality, record.reason ?? null, new Date(record.recordedAt).toISOString());
  }
  for (const reading of batch.readings) {
    const tag = byId.get(reading.tagId)!;
    const persisted = await db.$queryRawUnsafe<Array<{ quality: string }>>(`SELECT quality FROM "SharedTimeSeriesReading" WHERE "tagId"=$1 AND "sourceTimestamp"=$2::timestamp AND sequence=$3`, reading.tagId, new Date(reading.sourceTimestamp).toISOString(), reading.sequence);
    const quality = persisted[0].quality;
    const recordId = `${reading.tagId}:${new Date(reading.sourceTimestamp).toISOString()}:${reading.sequence}`;
    await db.$queryRawUnsafe(`INSERT INTO "DataQualityRecord" (id,"recordId","pipelineId","tagId",quality,reason,"recordedAt") VALUES ($1,$2,$3,$4,$5,$6,$7::timestamp) ON CONFLICT ("recordId") DO NOTHING`, randomUUID(), recordId, tag.pipelineId, reading.tagId, quality, quality === "Good" ? null : `Validated reading quality: ${quality}`, new Date(reading.sourceTimestamp).toISOString());
  }
  return { accepted, duplicate, alarmsProcessed: batch.alarms.length, eventsProcessed: batch.events.length, anomaliesProcessed: batch.anomalies.length, indicatorsProcessed: batch.indicators.length, qualityRecordsProcessed: batch.qualityRecords.length + batch.readings.length };
}
