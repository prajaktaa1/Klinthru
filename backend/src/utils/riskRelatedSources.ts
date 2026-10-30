import { listIliAnomaliesForPipeline, listIliAssessmentResultsForPipeline } from "../ili/data";
import { getCpMonitoringData } from "../cpMonitoring/data";
import { getScadaOverview } from "./scadaData";
import { getReadableDocument } from "../routes/documents";
import type { RelatedGroup, SourceReference, SourceResolver, SourceMetadata } from "../types/riskRelatedData";

export const relatedMissing = "MISSING FIELD — APPROVAL NEEDED";
// Documented owner names only. Unknown identifiers are not guessed or normalized.
export function relatedGroup(link: SourceReference): RelatedGroup {
  if (["Defects", "Defect Manager"].includes(link.sourceModule)) return "Defects";
  if (["ILI", "ILI Analysis"].includes(link.sourceModule)) return "ILI Anomalies";
  if (link.sourceModule === "ECDA") return "ECDA Findings";
  if (["Corrosion", "Internal Corrosion", "External Corrosion"].includes(link.sourceModule)) return "Corrosion Findings";
  if (["CP", "CP Monitoring"].includes(link.sourceModule)) return "CP Records";
  if (link.sourceModule === "SCADA") return "SCADA Influences";
  if (["Documents", "Document Management"].includes(link.sourceModule)) return "Documents";
  if (["Central Action Register", "Central Integrity Action Register"].includes(link.sourceModule)) return "Linked Actions";
  return "Other";
}
const iso = (value: unknown) => { if (!value) return null; const d = new Date(String(value)); return Number.isNaN(d.getTime()) ? null : d.toISOString(); };
const missing = (reason: string) => ({ status: "unavailable" as const, reason: `${relatedMissing}: ${reason}` });
const available = (metadata: SourceMetadata) => ({ status: "available" as const, metadata });

/** Request-local caches only. No persistent copies, network credentials, memory seeds or writes. */
export function createAuthoritativeRelatedResolver(): SourceResolver {
  const calls = new Map<string, Promise<any>>();
  const once = <T,>(key: string, read: () => Promise<T>): Promise<T> => { if (!calls.has(key)) calls.set(key, read()); return calls.get(key)!; };
  return async (link, { pipelineId, user }) => {
    try {
      const group = relatedGroup(link);
      if (group === "ILI Anomalies" && link.sourceRecordType === "IliAnomaly") {
        const list = await once(`ili:${pipelineId}:${user.id}`, () => listIliAnomaliesForPipeline(pipelineId, user));
        if (list.status !== "available") return missing("authoritative ILI anomaly reader unavailable");
        const row = list.data.find((r: any) => r.id === link.sourceRecordId);
        if (!row || row.pipelineId !== pipelineId) return missing("ILI canonical ID not found or inaccessible");
        return available({ canonicalId: row.id, displayId: row.featureId, title: row.anomalyType, location: row.location ?? (row.kpKm === null ? null : `KP ${row.kpKm} km`), status: null, date: row.inspectionDate, dateLabel: "Inspection Date", updatedAt: row.updatedAt, result: row.depthMm !== null ? `Depth: ${row.depthMm} mm${row.depthPercent !== null ? ` (${row.depthPercent}% WT)` : ""}` : row.depthPercent !== null ? `Depth: ${row.depthPercent}% WT` : null, version: null, navigation: null });
      }
      if (group === "ILI Anomalies" && link.sourceRecordType === "IliAssessmentResult") {
        const list = await once(`ili-results:${pipelineId}:${user.id}`, () => listIliAssessmentResultsForPipeline(pipelineId, user));
        const row = list.status === "available" ? list.data.find((r: any) => r.id === link.sourceRecordId && r.pipelineId === pipelineId) : null;
        if (!row) return missing("ILI assessment not found or inaccessible");
        return available({ canonicalId: row.id, displayId: row.id, title: row.methodology, location: null, status: row.status, date: row.calculatedAt, dateLabel: "Calculated At", updatedAt: null, result: null, version: null, navigation: null });
      }
      if (group === "CP Records" && ["CpTestPoint", "CpMonitoringSurvey", "CpReadingHistory"].includes(link.sourceRecordType)) {
        const data = await once(`cp:${pipelineId}:${user.id}`, () => getCpMonitoringData(pipelineId));
        const kind = link.sourceRecordType;
        const connected = kind === "CpMonitoringSurvey" ? data.availability.surveys.available : data.availability.testPoints.available;
        if (!connected) return missing("authoritative CP reader unavailable");
        const base = { location: null, status: null, updatedAt: null, result: null, version: null, navigation: null };
        if (kind === "CpMonitoringSurvey") {
          const row = data.surveys.find(r => r.id === link.sourceRecordId);
          if (row) return available({ ...base, canonicalId: row.id, displayId: row.id, title: row.surveyName ?? row.id, status: row.status, date: row.surveyDate, dateLabel: "Survey Date" });
        } else if (kind === "CpTestPoint") {
          const row = data.testPoints.find(r => r.id === link.sourceRecordId);
          if (row) return available({ ...base, canonicalId: row.id, displayId: row.code, title: row.name ?? row.code, location: row.location ?? (row.kp ? `KP ${row.kp}` : null), date: row.readingAt, dateLabel: "Latest Reading Date" });
        } else {
          const row = data.trend.find(r => r.id === link.sourceRecordId);
          if (row) return available({ ...base, canonicalId: row.id, displayId: row.id, title: row.measurementType, date: row.readingAt, dateLabel: "Reading Date" });
        }
        return missing("CP canonical reference not found in authoritative reader; absence from a time window does not establish deletion");
      }
      if (group === "SCADA Influences" && ["ScadaIndicator", "ScadaEvent"].includes(link.sourceRecordType)) {
        // Original reader applies pipeline, connector and source-system authorization.
        const data = await once(`scada:${pipelineId}:${user.id}`, () => getScadaOverview(pipelineId, user));
        const rows = link.sourceRecordType === "ScadaIndicator" ? data.indicators : data.events;
        const row = rows.find((r: any) => r.id === link.sourceRecordId && r.pipelineId === pipelineId);
        if (!row) return missing("SCADA canonical reference not found or inaccessible; reader is windowed/capped");
        return available({ canonicalId: row.id, displayId: row.indicatorId ?? row.eventId, title: row.name ?? row.description, location: null, status: row.status ?? null, date: iso(row.measuredAt ?? row.occurredAt), dateLabel: row.measuredAt ? "Measured At" : "Occurred At", updatedAt: null, result: null, version: null, navigation: null });
      }
      if (group === "Documents" && link.sourceRecordType === "ManagedDocument") {
        const document = await once(`doc:${link.sourceRecordId}:${user.id}`, () => getReadableDocument(link.sourceRecordId, user));
        if (!document) return missing("Document_ID not found or inaccessible");
        const version = link.sourceVersion ? document.versions.find((v: any) => v.documentVersionId === link.sourceVersion || v.revision === link.sourceVersion) : null;
        if (link.sourceVersion && !version) return missing("referenced document version not found");
        return available({ canonicalId: document.documentId, displayId: document.documentNumber ?? document.documentId, title: document.title, location: null, status: version?.approvalStatus ?? null, date: iso(version?.issueDate ?? version?.uploadedAt ?? document.createdAt), dateLabel: version ? "Version Date" : "Created At", updatedAt: iso(document.updatedAt), result: null, version: version ? link.sourceVersion : null, navigation: null });
      }
      return missing(`${link.sourceModule} / ${link.sourceRecordType} source identity, permissions and read integration`);
    } catch { return missing("source unavailable or access could not be verified; no source values substituted"); }
  };
}
