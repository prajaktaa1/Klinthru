/** Separate from corrosion RiskLevel / StoredAssessment and their existing contracts. */
export type RiskResult = Readonly<{ likelihood: number; consequence: number; score: number; level: string }>;
export type MatrixCell = { likelihood: number; consequence: number; level: string };
export type RiskPolicy = {
  activeStatuses: string[];
  highLevels: string[];
  mediumLevels: string[];
  lowLevels: string[];
  categoryKeys: string[];
  sourceCategories: string[];
  calendarTimeZone: string;
  sourceCounting: "primary-source-per-risk";
  percentageRounding: "counts-only";
  reviewSelection: "earliest-open-current-revision";
  missingReview: "unavailable";
};
export type RiskRecord = {
  id: string;
  riskId: string;
  title: string;
  status: string;
  pipelineId: string;
  currentApprovedRevisionId: string | null;
  pipeline: { pipelineName: string; pipelineCode: string; createdById: string | null };
  asset: { name: string | null; latitude: number | null; longitude: number | null } | null;
  currentApprovedRevision: null | {
    id: string;
    riskRecordId: string;
    approvalStatus: string;
    methodologyVersionId: string;
    matrixVersionId: string;
    assessmentDate: Date;
    approvedAt: Date | null;
    category: string;
    primarySourceCategory: string;
    inherentResult: unknown;
    currentResult: unknown;
    residualResult: unknown;
    scopeScenarioSnapshot: unknown;
    sourceSnapshot: unknown;
    dataSufficiency: string;
  };
  reviews: { dueDate: Date; completedAt: Date | null; revisionId: string }[];
};
export type MethodologyRecord = {
  id: string;
  methodologyId: string;
  version: string;
  name: string;
  approvalStatus: string;
  rules: unknown;
  matrixVersion: { id: string; approvalStatus: string; cells: unknown };
};
/** Read delegates only: this increment intentionally exposes no persistence writes. */
export type RiskReadClient = {
  risk: { findMany(args: unknown): Promise<RiskRecord[]> };
  riskMethodologyVersion: { findMany(args: unknown): Promise<MethodologyRecord[]>; findFirst(args: unknown): Promise<MethodologyRecord | null> };
};
export type RiskScope = { pipelineId?: string; methodologyVersionId?: string };
