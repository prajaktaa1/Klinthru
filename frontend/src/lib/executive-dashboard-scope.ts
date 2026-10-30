import { fetchCpMonitoringData, fetchCpTestPoints, fetchDashboardAggregation, fetchDocuments, fetchMasterAssets, fetchMasterSegments, fetchOfficialRiskOverview, fetchPipelineById, fetchRiskMatrix, fetchRiskTreatments, fetchRiskTreatmentSummary, fetchScadaOverview, type CpLinkedTestPointRecord, type CpMonitoringRealData, type DashboardAggregation, type ScadaOverview } from "@/lib/apiClient";
import type { AssetMasterAssetRecord, AssetMasterSegmentRecord, PipelineRecord } from "@/lib/types";
import type { RiskMatrixData } from "@/lib/risk-matrix-types";
import type { RiskOverview } from "@/lib/risk-assessment-types";
import type { TreatmentPage, TreatmentSummary } from "@/lib/risk-treatment-types";

export const ALL_PIPELINES = "ALL";
export type DashboardPipelineSource = { pipelineId: string; pipeline: PipelineRecord | null; segments: AssetMasterSegmentRecord[] | null; assets: AssetMasterAssetRecord[] | null; aggregation: DashboardAggregation | null; cp: CpMonitoringRealData | null; cpPoints: CpLinkedTestPointRecord[] | null; scada: ScadaOverview | null; risk: RiskOverview | null; matrix: RiskMatrixData | null; treatments: TreatmentPage | null; treatmentSummary: TreatmentSummary | null; documentCount: number | null; errors: string[] };

// Every request is scoped by the saved internal Pipeline_ID. No global API totals
// are used as pipeline totals. Segment-only APIs are used only when supported.
export async function loadDashboardPipeline(pipelineId: string, segmentId: string, method: string | undefined): Promise<DashboardPipelineSource> {
  const errors: string[] = [];
  async function read<T>(name: string, operation: () => Promise<T>): Promise<T | null> { try { return await operation(); } catch { errors.push(name); return null; } }
  const scope = { pipelineId, methodologyVersionId: method };
  const allTreatments = async () => {
    const first = await fetchRiskTreatments({ ...scope, page: 1, pageSize: 100 });
    if (first.actions.status !== "available" || first.actions.total === null || first.actions.total <= first.actions.items.length) return first;
    const pages = await Promise.all(Array.from({ length: Math.max(0, Math.ceil(first.actions.total / first.actions.pageSize) - 1) }, (_, index) => fetchRiskTreatments({ ...scope, page: index + 2, pageSize: first.actions.pageSize })));
    return { ...first, actions: { ...first.actions, items: [...new Map([first, ...pages].flatMap((item) => item.actions.items).map((item) => [item.actionId, item])).values()] } };
  };
  const [pipeline, segments, assets, aggregation, cp, cpPoints, scada, documents, risk, matrix, treatments, treatmentSummary] = await Promise.all([
    read("Pipeline", () => fetchPipelineById(pipelineId)), read("Segments", () => fetchMasterSegments(pipelineId)), read("Assets", () => fetchMasterAssets(pipelineId)),
    read("Dashboard summary", () => fetchDashboardAggregation(pipelineId)), read("CP Monitoring", () => fetchCpMonitoringData(pipelineId)), read("CP locations", () => fetchCpTestPoints(pipelineId)), read("SCADA", () => fetchScadaOverview(pipelineId)),
    read("Documents", () => fetchDocuments({ pipelineId, ...(segmentId ? { segmentId } : {}), page: 1, pageSize: 1 })),
    method && !segmentId ? read("Risk overview", () => fetchOfficialRiskOverview(scope)) : null, method && !segmentId ? read("Risk matrix", () => fetchRiskMatrix(scope)) : null,
    method && !segmentId ? read("Integrity activities", allTreatments) : null, method && !segmentId ? read("Integrity action summary", () => fetchRiskTreatmentSummary(scope)) : null
  ]);
  function owned<T>(name: string, item: T | null, owner: string | undefined) { if (!item) return null; if (owner === pipelineId) return item; errors.push(`${name} scope mismatch`); return null; }
  const safeRisk = risk?.latest?.some((item) => item.pipelineId !== pipelineId) ? null : risk;
  const safeMatrix = matrix?.item?.rows.some((item) => item.pipelineId !== pipelineId) ? null : matrix;
  if (risk && !safeRisk || matrix && !safeMatrix) errors.push("Risk scope mismatch");
  return { pipelineId, pipeline: owned("Pipeline", pipeline, pipeline?.id), segments: segments?.filter((item) => item.pipelineId === pipelineId) ?? null, assets: assets?.filter((item) => item.pipelineId === pipelineId) ?? null,
    aggregation: owned("Dashboard summary", aggregation, aggregation?.pipeline?.id), cp: owned("CP Monitoring", cp, cp?.pipelineId), cpPoints: cpPoints?.filter((item) => item.cp.pipelineId === pipelineId && (!item.asset || item.asset.pipelineId === pipelineId)) ?? null,
    scada: owned("SCADA", scada, scada?.pipeline?.id), documentCount: documents?.total ?? null, risk: safeRisk, matrix: safeMatrix, treatments, treatmentSummary, errors };
}

export function completeSum(values: Array<number | null | undefined>): number | null {
  return values.length && values.every((item) => typeof item === "number" && Number.isFinite(item)) ? values.reduce<number>((sum, item) => sum + item!, 0) : null;
}
export function mergeDashboardMatrix(sources: DashboardPipelineSource[]): RiskMatrixData["item"] {
  const items = sources.map((source) => source.matrix?.status === "available" ? source.matrix.item : null);
  const first = items[0];
  if (!first || items.some((item) => !item || item.methodology.id !== first.methodology.id || item.matrix.id !== first.matrix.id || JSON.stringify(item.matrix) !== JSON.stringify(first.matrix))) return null;
  const rows = [...new Map(items.flatMap((item) => item!.rows).map((row) => [row.riskId, row])).values()];
  const distributions = { ...first.distributions };
  for (const basis of ["current", "inherent", "residual"] as const) {
    if (items.some((item) => !item!.distributions[basis])) return null;
    distributions[basis] = first.distributions[basis].map((cell) => ({ ...cell, count: items.reduce((sum, item) => sum + (item!.distributions[basis].find((value) => value.likelihood === cell.likelihood && value.consequence === cell.consequence)?.count ?? 0), 0) }));
  }
  return { ...first, total: rows.length, rows, distributions };
}
