export type IliDepthObservation = {
  pipelineId: string;
  featureId: string;
  anomalyType: string;
  orientation: "Internal" | "External" | "Unknown";
  inspectionDate: string;
  depth: number;
  depthUnit: "mm" | "%";
};

export type FailureCriterion = {
  name: string;
  threshold: number;
  unit: "mm" | "%";
};

export type CorrosionGrowthStatus =
  | "calculated"
  | "ili_data_unavailable"
  | "insufficient_history"
  | "ambiguous_feature_identity"
  | "invalid_inspection_dates"
  | "zero_elapsed_time"
  | "incompatible_measurement_units"
  | "incompatible_feature_metadata"
  | "invalid_depth_values"
  | "non_positive_growth_rate"
  | "failure_criterion_not_configured"
  | "failure_threshold_reached";

export type CorrosionGrowthResult = {
  status: CorrosionGrowthStatus;
  methodology: "measured_corrosion_growth_deterministic_rul";
  sourceType: "repeated_ili_measurements";
  pipelineId: string | null;
  featureId: string | null;
  earlierInspectionDate: string | null;
  laterInspectionDate: string | null;
  earlierDepth: number | null;
  laterDepth: number | null;
  growthRate: number | null;
  growthRateUnit: string | null;
  rul: number | null;
  rulUnit: "years" | null;
  failureCriterion: string | null;
  reason: string;
  dataQuality: string[];
};

function blocked(
  status: Exclude<CorrosionGrowthStatus, "calculated">,
  reason: string,
  observations: IliDepthObservation[] = [],
  dataQuality: string[] = []
): CorrosionGrowthResult {
  const earlier = observations[0];
  const later = observations[1];
  return {
    status,
    methodology: "measured_corrosion_growth_deterministic_rul",
    sourceType: "repeated_ili_measurements",
    pipelineId: earlier?.pipelineId ?? null,
    featureId: earlier?.featureId ?? null,
    earlierInspectionDate: earlier?.inspectionDate ?? null,
    laterInspectionDate: later?.inspectionDate ?? null,
    earlierDepth: earlier?.depth ?? null,
    laterDepth: later?.depth ?? null,
    growthRate: null,
    growthRateUnit: null,
    rul: null,
    rulUnit: null,
    failureCriterion: null,
    reason,
    dataQuality
  };
}

export function calculateMeasuredCorrosionGrowth(
  earlier: IliDepthObservation,
  later: IliDepthObservation,
  failureCriterion?: FailureCriterion
): CorrosionGrowthResult {
  const observations = [earlier, later];
  if (!earlier.pipelineId || earlier.pipelineId !== later.pipelineId || !earlier.featureId || earlier.featureId !== later.featureId) {
    return blocked("ambiguous_feature_identity", "Both measurements must prove the same pipeline and stable feature identity.", observations, ["Pipeline or feature identity is ambiguous."]);
  }
  if (earlier.anomalyType !== later.anomalyType || earlier.orientation !== later.orientation || earlier.orientation === "Unknown") {
    return blocked("incompatible_feature_metadata", "Anomaly type and known orientation must be compatible across inspections.", observations, ["Anomaly type or orientation is incompatible."]);
  }
  if (earlier.depthUnit !== later.depthUnit) {
    return blocked("incompatible_measurement_units", "Depth measurements must use compatible units.", observations, ["Depth units differ between inspections."]);
  }
  if (!Number.isFinite(earlier.depth) || !Number.isFinite(later.depth) || earlier.depth < 0 || later.depth < 0) {
    return blocked("invalid_depth_values", "Depth values must be finite non-negative measurements.", observations, ["One or more depth values are invalid."]);
  }
  const earlierTime = Date.parse(earlier.inspectionDate);
  const laterTime = Date.parse(later.inspectionDate);
  if (Number.isNaN(earlierTime) || Number.isNaN(laterTime)) {
    return blocked("invalid_inspection_dates", "Inspection dates must be valid timestamps.", observations, ["An inspection date is invalid."]);
  }
  if (laterTime < earlierTime) {
    return blocked("invalid_inspection_dates", "Later inspection date must occur after the earlier inspection date.", observations, ["Inspection dates are reversed."]);
  }
  if (laterTime === earlierTime) {
    return blocked("zero_elapsed_time", "Inspection dates must have a positive elapsed interval.", observations, ["Elapsed inspection time is zero."]);
  }
  const elapsedYears = (laterTime - earlierTime) / (365.2425 * 24 * 60 * 60 * 1000);
  const growthRate = (later.depth - earlier.depth) / elapsedYears;
  if (!(growthRate > 0)) {
    return blocked("non_positive_growth_rate", "Measured growth rate must be positive before deterministic RUL can be calculated.", observations, ["Measured depth did not increase over the accepted interval."]);
  }
  const base: CorrosionGrowthResult = {
    status: "calculated",
    methodology: "measured_corrosion_growth_deterministic_rul",
    sourceType: "repeated_ili_measurements",
    pipelineId: earlier.pipelineId,
    featureId: earlier.featureId,
    earlierInspectionDate: earlier.inspectionDate,
    laterInspectionDate: later.inspectionDate,
    earlierDepth: earlier.depth,
    laterDepth: later.depth,
    growthRate,
    growthRateUnit: `${later.depthUnit}/year`,
    rul: null,
    rulUnit: null,
    failureCriterion: null,
    reason: "Measured corrosion growth calculated from two compatible repeated ILI measurements.",
    dataQuality: ["Stable feature identity verified.", "Compatible depth units verified."]
  };
  if (!failureCriterion) {
    return { ...base, status: "failure_criterion_not_configured", reason: "Measured growth is available, but no approved failure criterion is configured for deterministic RUL." };
  }
  if (failureCriterion.unit !== later.depthUnit || !Number.isFinite(failureCriterion.threshold)) {
    return { ...base, status: "incompatible_measurement_units", reason: "Failure criterion must use a compatible depth unit and finite threshold.", failureCriterion: failureCriterion.name };
  }
  if (later.depth >= failureCriterion.threshold) {
    return { ...base, status: "failure_threshold_reached", reason: "Current measured depth is at or beyond the approved failure threshold.", failureCriterion: failureCriterion.name };
  }
  return {
    ...base,
    rul: (failureCriterion.threshold - later.depth) / growthRate,
    rulUnit: "years",
    failureCriterion: failureCriterion.name,
    reason: "Measured corrosion growth and deterministic RUL calculated using the approved failure criterion."
  };
}

export function selectCorrosionGrowthSeries(observations: IliDepthObservation[]): CorrosionGrowthResult | { earlier: IliDepthObservation; later: IliDepthObservation } {
  if (observations.length < 2) return blocked("insufficient_history", "At least two accepted measurements for the same stable feature are required.", observations, ["Repeated ILI inspection history is unavailable."]);
  const featureIds = new Set(observations.map((observation) => observation.featureId));
  const pipelineIds = new Set(observations.map((observation) => observation.pipelineId));
  if (featureIds.size !== 1 || pipelineIds.size !== 1 || !observations[0].featureId || !observations[0].pipelineId) return blocked("ambiguous_feature_identity", "Select one stable pipeline and feature identity; records from multiple subjects cannot be combined.", observations, ["Pipeline or feature identity is ambiguous."]);
  // Validate the complete supplied history before selecting endpoints. Invalid or
  // conflicting middle records must not disappear as a side effect of sorting.
  const timestamps = observations.map(observation => Date.parse(observation.inspectionDate));
  if (timestamps.some(timestamp => !Number.isFinite(timestamp))) return blocked("invalid_inspection_dates", "Every inspection in the selected history must have a valid timestamp.");
  if (new Set(timestamps).size !== timestamps.length) return blocked("ambiguous_feature_identity", "Repeated timestamps do not identify a unique measurement; resolve duplicate observations in the authoritative source.");
  if (observations.some(observation => !Number.isFinite(observation.depth) || observation.depth < 0)) return blocked("invalid_depth_values", "Every supplied depth must be a finite non-negative measurement.");
  if (observations.some(observation => observation.depthUnit !== observations[0].depthUnit)) return blocked("incompatible_measurement_units", "All observations in the selected history must use compatible depth units.");
  if (observations.some(observation => observation.anomalyType !== observations[0].anomalyType || observation.orientation !== observations[0].orientation || observation.orientation === "Unknown")) return blocked("incompatible_feature_metadata", "Anomaly type and known orientation must be compatible throughout the supplied history.");
  const sorted = [...observations].sort((a, b) => Date.parse(a.inspectionDate) - Date.parse(b.inspectionDate));
  return { earlier: sorted[0], later: sorted[sorted.length - 1] };
}
