import { riskMatrixSchema, riskPolicySchema, riskResultSchema, riskScopeSnapshotSchema, riskSourceSnapshotSchema } from "../validation/riskAssessmentValidation";
import { MatrixCell, MethodologyRecord, RiskPolicy, RiskRecord } from "../types/riskAssessment";

export function unavailableOverview(status: "approval-needed" | "schema-unavailable" | "unavailable", reasons: string[], asOf = new Date()) {
  return { status, reasons, asOf: asOf.toISOString(), methodologyVersionId: null,
    basis: "Current approved risk", population: "Active official Risk_ID records", summary: null,
    matrix: [], byPipeline: [], byCategory: [], bySource: [], byStatus: [], latest: [], reviews: [], locationRecords: [],
    comparisons: { status: "approval-needed", reason: "APPROVAL NEEDED — comparable historical baseline and calculation rules." } };
}

function calendarDay(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (key: string) => Number(parts.find(part => part.type === key)?.value);
  return Date.UTC(value("year"), value("month") - 1, value("day")) / 86400000;
}

export function reviewDaysLeft(dueDate: Date, asOf: Date, policy: RiskPolicy) {
  // PostgreSQL DATE is a calendar date, not an instant to shift into a timezone.
  const dueDay = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate()) / 86400000;
  return dueDay - calendarDay(asOf, policy.calendarTimeZone);
}

function distribution(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function verifiedResult(value: unknown, cells: MatrixCell[]) {
  const result = riskResultSchema.parse(value);
  if (!cells.some(cell => cell.likelihood === result.likelihood && cell.consequence === result.consequence && cell.level === result.level)) {
    throw new Error("Stored classification does not match its approved matrix.");
  }
  return result;
}

/** Pure aggregation. No corrosion assessment inputs or implicit matrix thresholds. */
export function buildOfficialOverview(records: RiskRecord[], methodology: MethodologyRecord, asOf = new Date()) {
  try {
    if (methodology.approvalStatus !== "Approved" || methodology.matrixVersion.approvalStatus !== "Approved") throw new Error("Approved methodology and matrix required.");
    const policy = riskPolicySchema.parse(methodology.rules);
    const cells = riskMatrixSchema.parse(methodology.matrixVersion.cells);
    const groupedLevels = [...policy.highLevels, ...policy.mediumLevels, ...policy.lowLevels];
    if (cells.some(cell => !groupedLevels.includes(cell.level))) throw new Error("Every matrix level must have an approved KPI group.");
    const unique = new Set<string>();
    const rows = records.filter(record => policy.activeStatuses.includes(record.status)).map(record => {
      if (unique.has(record.riskId)) throw new Error("Duplicate official Risk_ID in population.");
      unique.add(record.riskId);
      const revision = record.currentApprovedRevision;
      if (!revision || revision.id !== record.currentApprovedRevisionId || revision.riskRecordId !== record.id || revision.approvalStatus !== "Approved" || !revision.approvedAt) throw new Error("Official approved revision binding is invalid.");
      if (revision.methodologyVersionId !== methodology.id || revision.matrixVersionId !== methodology.matrixVersion.id) throw new Error("Mixed methodology/matrix versions cannot be silently combined.");
      if (revision.dataSufficiency !== "Sufficient") throw new Error("Verified source snapshot and sufficient data required.");
      riskSourceSnapshotSchema.parse(revision.sourceSnapshot);
      const frozenScope = riskScopeSnapshotSchema.parse(revision.scopeScenarioSnapshot);
      if (!policy.categoryKeys.includes(revision.category) || !policy.sourceCategories.includes(revision.primarySourceCategory)) throw new Error("Category/source requires an approved dictionary entry.");
      return { riskId: record.riskId, title: frozenScope.title, pipelineId: record.pipelineId, pipelineName: record.pipeline.pipelineName, pipelineCode: record.pipeline.pipelineCode,
        category: revision.category, sourceCategory: revision.primarySourceCategory, status: record.status,
        inherent: verifiedResult(revision.inherentResult, cells), current: verifiedResult(revision.currentResult, cells), residual: verifiedResult(revision.residualResult, cells),
        revisionId: revision.id, assessmentDate: revision.assessmentDate.toISOString() };
    });
    const rowById = new Map(rows.map(row => [row.riskId, row]));
    const allReviews = records.flatMap(record => {
      if (!rowById.has(record.riskId)) return [];
      const pending = record.reviews.filter(review => !review.completedAt && review.revisionId === record.currentApprovedRevisionId).sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
      if (!pending.length) throw new Error("Official next review is missing; overdue count cannot be assumed zero.");
      return pending.length ? [{ riskId: record.riskId, title: rowById.get(record.riskId)!.title, dueDate: pending[0].dueDate.toISOString(), daysLeft: reviewDaysLeft(pending[0].dueDate, asOf, policy) }] : [];
    }).sort((a, b) => a.daysLeft - b.daysLeft);
    return { status: "available", reasons: [], asOf: asOf.toISOString(), methodologyVersionId: methodology.id, basis: "Current approved risk", population: "Active official Risk_ID records",
      summary: { total: rows.length, high: rows.filter(row => policy.highLevels.includes(row.current.level)).length,
        medium: rows.filter(row => policy.mediumLevels.includes(row.current.level)).length, low: rows.filter(row => policy.lowLevels.includes(row.current.level)).length,
        overdueReviews: allReviews.filter(review => review.daysLeft < 0).length },
      matrix: cells.map(cell => ({ ...cell, count: rows.filter(row => row.current.likelihood === cell.likelihood && row.current.consequence === cell.consequence).length })),
      // Group by canonical identity; equal display names/codes across owners are not one pipeline.
      byPipeline: [...new Set(rows.map(row => row.pipelineId))].map(id => {
        const pipelineRows = rows.filter(row => row.pipelineId === id), first = pipelineRows[0];
        return { label: `${first.pipelineName} (${first.pipelineCode})`, count: pipelineRows.length };
      }), byCategory: distribution(rows.map(row => row.category)),
      bySource: distribution(rows.map(row => row.sourceCategory)), byStatus: distribution(rows.map(row => row.status)),
      latest: [...rows].sort((a, b) => b.assessmentDate.localeCompare(a.assessmentDate)),
      reviews: allReviews.filter(review => review.daysLeft >= 0),
      locationRecords: records.flatMap(record => {
        const row = rowById.get(record.riskId), asset = record.asset;
        return row && asset && typeof asset.latitude === "number" && typeof asset.longitude === "number"
          ? [{ riskId: row.riskId, assetName: asset.name ?? row.pipelineName, latitude: asset.latitude, longitude: asset.longitude, level: row.current.level }] : [];
      }), comparisons: { status: "approval-needed", reason: "APPROVAL NEEDED — comparable historical baseline and calculation rules." } };
  } catch {
    return unavailableOverview("approval-needed", ["APPROVAL NEEDED — validated methodology, exact revision bindings, source sufficiency and calculation policies. No partial counts are published."], asOf);
  }
}
