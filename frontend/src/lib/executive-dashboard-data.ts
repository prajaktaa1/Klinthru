import { tryKp } from "./chainage";
import type { AssetMasterAssetRecord, AssetMasterSegmentRecord } from "@/lib/types";
export const dashboardUnavailable = "Not Available";
export function dashboardValue(value: unknown, suffix = "") {
  return value === undefined || value === null || typeof value === "number" && !Number.isFinite(value) || typeof value === "string" && !value.trim() ? dashboardUnavailable : `${value}${suffix}`;
}
export function dashboardDate(value?: string | null) {
  return value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : dashboardUnavailable;
}
export type DashboardPeriod = "12m" | "6m" | "3m" | "30d" | "7d" | "24h" | "all";
export const dashboardPeriods: Record<DashboardPeriod, string> = { "12m": "Last 12 Months", "6m": "Last 6 Months", "3m": "Last 3 Months", "30d": "Last 30 Days", "7d": "Last 7 Days", "24h": "Last 24 Hours", all: "All Time" };
export function dashboardInPeriod(value: string | null | undefined, period: DashboardPeriod, now = new Date()) {
  if (period === "all") return true;
  if (!value || !Number.isFinite(Date.parse(value))) return false;
  const end = now.getTime(), date = Date.parse(value);
  const days = period === "24h" ? 1 : period === "7d" ? 7 : period === "30d" ? 30 : null;
  const start = new Date(now);
  if (days !== null) start.setTime(end - days * 86400000);
  else { const day = start.getUTCDate(); start.setUTCDate(1); start.setUTCMonth(start.getUTCMonth() - (period === "3m" ? 3 : period === "6m" ? 6 : 12)); const last = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate(); start.setUTCDate(Math.min(day, last)); }
  return date >= start.getTime() && date <= end;
}
export function dashboardAssets(assets: AssetMasterAssetRecord[] | null, pipelineId: string, segmentId: string) {
  return assets?.filter((asset) => asset.pipelineId === pipelineId && (!segmentId || asset.segmentId === segmentId)) ?? null;
}
export function dashboardLength(segments: AssetMasterSegmentRecord[], segmentId: string, pipelineLength?: number) {
  if (!segmentId) return pipelineLength;
  const segment = segments.find((item) => item.id === segmentId);
  if (!segment || segment.startKp === undefined || segment.endKp === undefined || !segment.startKp.trim() || !segment.endKp.trim()) return undefined;
  const start = (tryKp(segment.startKp) ?? NaN), end = (tryKp(segment.endKp) ?? NaN);
  return Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end > start ? end - start : undefined;
}
