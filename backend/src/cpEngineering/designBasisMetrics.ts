import { BasisRecord, Filters, MISSING, selectedRows } from "./designBasisDomain";

export type Metric = { value: number | null; numerator: number | null; denominator: number | null; excludedCount: number; availability: boolean; unavailableReason: string | null };
const unavailable = (): Metric => ({ value: null, numerator: null, denominator: null, excludedCount: 0, availability: false, unavailableReason: MISSING });
function fraction(checks: any[]): Metric {
  const included = checks.filter(c => c.applicability !== "NOT_APPLICABLE");
  if (!included.length) return { ...unavailable(), excludedCount: checks.length };
  const n = included.filter(c => c.applicability === "APPLICABLE" && c.outcome === "SATISFIED").length;
  return { value: Math.round(n / included.length * 100), numerator: n, denominator: included.length, excludedCount: checks.length - included.length, availability: true, unavailableReason: null };
}
export function basisSummary(records: BasisRecord[], filters: Filters) {
  const rows = selectedRows(records, filters);
  const documents = new Set(rows.flatMap(r => r.evidence.map(e => e.documentId)));
  const configured = rows.length > 0 && rows.every(r => r.checklistVersion && r.metricPolicyVersion && (r.metricPolicySnapshot as any).definitionVersion === "cp-basis-v1" && r.evidence.some(e => e.id === (r.metricPolicySnapshot as any).sourceEvidenceId) && Array.isArray((r.checklistSnapshot as any).requirements) && (r.checklistSnapshot as any).requirements.length > 0 && r.evidence.some(e => e.id === (r.checklistSnapshot as any).sourceEvidenceId));
  const allChecks = configured ? rows.flatMap(r => ((r.checklistSnapshot as any).requirements as any[]).map(req => {
    const c = r.checks.find(x => x.checkKey === req.checkKey);
    return { ...c, checkKey: req.checkKey, categoryKey: req.categoryKey ?? c?.categoryKey ?? MISSING, categoryLabel: c?.categoryLabel ?? req.categoryLabel ?? MISSING, required: req.required, critical: req.critical, applicability: c?.applicability ?? "UNKNOWN", outcome: c?.outcome ?? "UNKNOWN" };
  })) : rows.flatMap(r => r.checks);
  const categoryKeys = [...new Set(allChecks.map(c => c.categoryKey))];
  const requirements = rows.flatMap(r => ((r.checklistSnapshot as any).requirements ?? []).map((req: any) => ({ ...req, revision: r, check: r.checks.find(c => c.checkKey === req.checkKey) })));
  function subjectCoverage(metric: string): Metric {
    if (!configured) return unavailable();
    const reqs = requirements.filter(x => x.metric === metric && x.required);
    const subjectType = metric === "soil" ? "SEGMENT" : "ASSET";
    const ids = [...new Set(rows.flatMap(r => r.scope.flatMap(s => subjectType === "SEGMENT" ? (s.sourceSnapshot as any).segmentIds ?? (s.segmentId ? [s.segmentId] : []) : (s.sourceSnapshot as any).assetIds ?? (s.assetId ? [s.assetId] : []))))];
    if (!ids.length || !reqs.length || reqs.some(x => !x.subjectId || x.subjectType !== subjectType || !ids.includes(x.subjectId))) return unavailable();
    return fraction(ids.map(subjectId => {
      const group = reqs.filter(x => x.subjectId === subjectId);
      if (!group.length) return { applicability: "UNKNOWN", outcome: "UNSATISFIED" };
      const applicable = group.filter(x => x.check?.applicability !== "NOT_APPLICABLE");
      return { applicability: applicable.length ? "APPLICABLE" : "NOT_APPLICABLE", outcome: applicable.length && applicable.every(x => x.check?.applicability === "APPLICABLE" && x.check.outcome === "SATISFIED") ? "SATISFIED" : "UNSATISFIED" };
    }));
  }
  const standards = configured ? requirements.filter(x => x.metric === "standard" && x.required) : [];
  const standardKeys = [...new Set(standards.map(x => x.standardKey).filter(Boolean))];
  const approvedStandards = standardKeys.length ? fraction(standardKeys.map(key => {
    const group = standards.filter(x => x.standardKey === key);
    const applicable = group.filter(x => x.check?.applicability !== "NOT_APPLICABLE");
    return { applicability: applicable.length ? "APPLICABLE" : "NOT_APPLICABLE", outcome: applicable.every(x => x.revision.lifecycleStatus === "Approved" && x.check?.outcome === "SATISFIED" && x.check.applicability === "APPLICABLE") ? "SATISFIED" : "UNSATISFIED" };
  })) : unavailable();
  const readiness = configured ? fraction(allChecks.filter(c => c.required)) : unavailable();
  const statuses: Record<string, number> = {};
  if (configured) for (const req of requirements.filter(x => x.metric === "evidence")) {
    const check = req.check;
    const doc = req.revision.sourceDocuments.find((e: any) => e.id === check?.evidenceId);
    let status = "Missing";
    if (check?.applicability === "NOT_APPLICABLE") status = "Not Required";
    else if (doc) {
      const captured = doc.sourceSnapshot;
      if (captured.reviewDueDate && new Date(captured.reviewDueDate) < new Date(filters.asOf)) status = "Overdue";
      else if (["Approved", "ApprovedWithComments"].includes(captured.approvalStatus)) status = "Approved";
      else if (["UnderReview", "Submitted"].includes(captured.approvalStatus)) status = "In Review";
      else if (captured.approvalStatus === "Draft") status = "Draft";
      else status = "Other";
    }
    statuses[status] = (statuses[status] ?? 0) + 1;
  }
  const total = Object.values(statuses).reduce((a, b) => a + b, 0);
  return {
    kpis: {
      designBasisDocuments: { value: documents.size, numerator: documents.size, denominator: null, excludedCount: 0, availability: true, unavailableReason: null } satisfies Metric,
      approvedStandards, soilDataAvailability: subjectCoverage("soil"), coatingDataCompleteness: subjectCoverage("coating"), designBasisReadiness: readiness
    },
    meetsMinimumRequirements: readiness.availability && readiness.numerator === readiness.denominator && !allChecks.some(c => c.critical && c.applicability !== "NOT_APPLICABLE" && (c.outcome !== "SATISFIED" || c.applicability !== "APPLICABLE")),
    charts: {
      completenessByCategory: configured ? categoryKeys.map(key => ({ key, label: allChecks.find(c => c.categoryKey === key)!.categoryLabel, ...fraction(allChecks.filter(c => c.categoryKey === key && c.required)) })) : [],
      documentStatus: Object.entries(statuses).map(([label, count]) => ({ label, count, percent: total ? Math.round(count / total * 100) : null })),
      documentStatusTotal: total, availability: configured, unavailableReason: configured ? null : MISSING
    },
    totalBasisItems: rows.length, filterScope: filters, definitionVersion: "cp-basis-v1", calculatedAt: new Date().toISOString(),
    presentationConflicts: ["Document Status counts evidence requirements; document KPI counts distinct Document_ID values.", "Environmental & Third Party / Environment & Third Party remain source labels.", "All (ICCP / SACP) does not describe Hybrid; Hybrid remains an explicit source-supported option."]
  };
}
