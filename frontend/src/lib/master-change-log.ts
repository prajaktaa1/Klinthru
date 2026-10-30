import type { SettingsAuditLogResponse } from "@/lib/settings-types";
import type { AssetMasterAssetRecord, AssetMasterSegmentRecord, PipelineRecord } from "@/lib/types";

export const changeUnavailable = "Not Available";
export type ChangeEntity = "Pipeline" | "Segment" | "Asset";
export type MasterChangeRow = {
  key: string; eventId: string; occurredAt?: string; userId?: string; userName?: string;
  entity: ChangeEntity; recordId: string; recordLabel: string; changedField?: string;
  before?: unknown; after?: unknown; details?: string; action?: string; result?: string;
};
const string = (value: unknown) => typeof value === "string" && value.trim() ? value : undefined;
const object = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const canonical = (value: unknown): string => value === undefined ? "undefined" : JSON.stringify(value, (_key, next) => { const record = object(next); return record ? Object.fromEntries(Object.keys(record).sort().map((key) => [key, record[key]])) : next; });

// Only map the existing SettingsAuditEvent identity and before/after snapshots.
// An event result (for example Success) is not an approval decision. The current
// contract has no approval, reason-for-change or evidence relationship fields.
export function masterChangeRows(response: SettingsAuditLogResponse | null, pipeline: PipelineRecord | null, segments: AssetMasterSegmentRecord[], assets: AssetMasterAssetRecord[], users: Map<string, string>): MasterChangeRow[] {
  if (!pipeline || !response || response.contractStatus === "missing") return [];
  const records = new Map<string, { entity: ChangeEntity; label: string }>();
  records.set(`pipeline:${pipeline.id}`, { entity: "Pipeline", label: pipeline.pipelineCode });
  segments.filter((item) => item.pipelineId === pipeline.id).forEach((item) => records.set(`segment:${item.id}`, { entity: "Segment", label: item.segmentId }));
  assets.filter((item) => item.pipelineId === pipeline.id).forEach((item) => records.set(`asset:${item.id}`, { entity: "Asset", label: item.assetId }));
  const rows: MasterChangeRow[] = [];
  for (const event of response.events) {
    const id = string(event.id), recordId = string(event.objectId), entity = string(event.objectType)?.toLowerCase();
    if (!id || !recordId || !entity) continue;
    const target = records.get(`${entity}:${recordId}`);
    if (!target) continue;
    const before = object(event.beforeValues), after = object(event.afterValues);
    const fields = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])].filter((field) => canonical(before?.[field]) !== canonical(after?.[field]));
    const userId = string(event.userId);
    const base = { eventId: id, occurredAt: string(event.occurredAt), userId, userName: userId ? users.get(userId) : undefined,
      entity: target.entity, recordId, recordLabel: target.label, details: string(event.details), action: string(event.action), result: string(event.result) };
    if (!fields.length) rows.push({ ...base, key: `${id}:missing` });
    else fields.forEach((field) => rows.push({ ...base, key: JSON.stringify([id, field]), changedField: field, before: before?.[field], after: after?.[field] }));
  }
  return [...new Map(rows.map((row) => [row.key, row])).values()];
}

export function changeValue(value: unknown): string {
  if (value === undefined || value === null || typeof value === "string" && !value.trim()) return changeUnavailable;
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}
export function changeDay(value?: string): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  return ["year", "month", "day"].map((key) => parts.find((part) => part.type === key)?.value).join("-");
}
export function changeTimestamp(value?: string): string {
  const day = changeDay(value);
  if (!day) return changeUnavailable;
  return `${day} ${new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value!))}`;
}
export type ChangeFilters = { from: string; to: string; group: string; user: string; status: string; query: string };
export const emptyChangeFilters: ChangeFilters = { from: "", to: "", group: "ALL", user: "ALL", status: "ALL", query: "" };
export function filterMasterChanges(rows: MasterChangeRow[], filters: ChangeFilters) {
  const query = filters.query.trim().toLowerCase();
  return rows.filter((row) => (!filters.from || Boolean(changeDay(row.occurredAt) && changeDay(row.occurredAt) >= filters.from))
    && (!filters.to || Boolean(changeDay(row.occurredAt) && changeDay(row.occurredAt) <= filters.to))
    && (filters.group === "ALL" || row.entity === filters.group)
    && (filters.user === "ALL" || (row.userId ?? "MISSING") === filters.user)
    && (filters.status === "ALL" || filters.status === "MISSING")
    && (!query || [row.eventId, row.recordId, row.recordLabel, row.changedField, row.userId, row.userName, row.details, changeValue(row.before), changeValue(row.after)].some((value) => value?.toLowerCase().includes(query))));
}
export function monthlyChanges(rows: MasterChangeRow[], now = new Date()) {
  const month = changeDay(now.toISOString()).slice(0, 7), [year, number] = month.split("-").map(Number);
  const previous = `${number === 1 ? year - 1 : year}-${String(number === 1 ? 12 : number - 1).padStart(2, "0")}`;
  const count = (prefix: string) => new Set(rows.filter((row) => changeDay(row.occurredAt).startsWith(prefix)).map((row) => row.eventId)).size;
  const current = count(month), prior = count(previous);
  return { current, previous: prior, percent: prior > 0 ? Math.round((current - prior) / prior * 100) : null };
}
