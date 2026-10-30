import type { CorrosionGrowthEndpointResponse, CpMonitoringRealData } from "./apiClient";

/** Bind existing read-only source DTOs to the selected subject, never a cached neighbour. */
export function scopedAiGrowth(pipelineId: string | undefined, data: CorrosionGrowthEndpointResponse | null) {
  if (!pipelineId || !data?.growth || !data.rul || data.pipelineId !== pipelineId) return null;
  if ([data.growth.pipelineId, data.rul.pipelineId].some(id => id !== null && id !== pipelineId)) return null;
  const featureIds = [data.featureId, data.growth.featureId, data.rul.featureId].filter(id => id !== null);
  if (featureIds.some(id => typeof id !== "string" || !id.trim()) || new Set(featureIds).size > 1) return null;
  if (data.growth.status === "calculated" && (featureIds.length !== 3 || data.growth.pipelineId !== pipelineId || data.rul.pipelineId !== pipelineId)) return null;
  return data;
}

export function scopedAiCp(pipelineId: string | undefined, data: CpMonitoringRealData | null) {
  return pipelineId && data?.pipeline?.id === pipelineId && data.pipelineId === pipelineId ? data : null;
}

/** Stored source history only. No series selection, electrode conversion or criterion inference. */
export function aiCpHistoricalSeries(data: CpMonitoringRealData) {
  const unavailable = (reason: string) => ({ readings: [], unit: null, reason });
  const rows = data.trend.filter(row => row.valueMv !== null);
  if (rows.length < 2) return unavailable("At least two stored CP readings are needed for a historical chart. No forecast is substituted.");
  if (rows.some(row => !row.id || !row.testPointId || !row.measurementType || !["CSE", "AgAgCl", "CuCuSO4"].includes(row.referenceElectrode) || !Number.isFinite(row.valueMv) || !Number.isFinite(Date.parse(row.readingAt)))) {
    return unavailable("Stored CP identity, electrode, timestamp or millivolt value could not be verified.");
  }
  const identities = new Set(rows.map(row => JSON.stringify([row.testPointId, row.measurementType, row.referenceElectrode])));
  if (identities.size !== 1) return unavailable("MISSING FIELD — APPROVAL NEEDED: select an exact CP test point, measurement type and reference electrode. Mixed histories are not one series.");
  const ordered = rows.slice().sort((a, b) => Date.parse(a.readingAt) - Date.parse(b.readingAt));
  if (new Set(ordered.map(row => Date.parse(row.readingAt))).size !== ordered.length || new Set(ordered.map(row => row.id)).size !== ordered.length) {
    return unavailable("MISSING FIELD — APPROVAL NEEDED: resolve ambiguous CP reading identities/timestamps in the authoritative source.");
  }
  return { readings: ordered.slice(-30), unit: `mV ${ordered[0].referenceElectrode}`, reason: null };
}
