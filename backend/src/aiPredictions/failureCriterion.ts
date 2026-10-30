import { FailureCriterion } from "./corrosionGrowth";

export type FailureCriterionResolution = {
  status: "resolved" | "failure_criterion_not_configured" | "invalid_failure_criterion";
  criterionType: string | null;
  threshold: number | null;
  unit: "mm" | "%" | null;
  methodology: string | null;
  methodologyVersion: string | null;
  source: string | null;
  reason: string;
  criterion?: FailureCriterion;
};

/**
 * This is deliberately an input abstraction, rather than an inferred pipeline
 * property. Pipeline wall thickness, MAOP, SMYS and operating pressure are not
 * approved corrosion failure criteria on their own.
 */
export type ApprovedFailureCriterionConfiguration = {
  approved: boolean;
  criterionType: string;
  threshold: number;
  unit: "mm" | "%";
  methodology: string;
  methodologyVersion: string;
  source: string;
};

export function resolveFailureCriterion(
  configuration?: ApprovedFailureCriterionConfiguration
): FailureCriterionResolution {
  if (!configuration) {
    return {
      status: "failure_criterion_not_configured", criterionType: null, threshold: null, unit: null,
      methodology: null, methodologyVersion: null, source: null,
      reason: "No approved pipeline or feature failure criterion is persisted or explicitly configured."
    };
  }
  if (!configuration.approved || !configuration.criterionType || !configuration.methodology || !configuration.methodologyVersion || !configuration.source) {
    return {
      status: "invalid_failure_criterion", criterionType: configuration.criterionType || null, threshold: null, unit: configuration.unit ?? null,
      methodology: configuration.methodology || null, methodologyVersion: configuration.methodologyVersion || null, source: configuration.source || null,
      reason: "A failure criterion must be explicitly approved and include its type, methodology, version, and source."
    };
  }
  if (!(configuration.threshold > 0) || !Number.isFinite(configuration.threshold)) {
    return {
      status: "invalid_failure_criterion", criterionType: configuration.criterionType, threshold: null, unit: configuration.unit,
      methodology: configuration.methodology, methodologyVersion: configuration.methodologyVersion, source: configuration.source,
      reason: "The approved failure-criterion threshold must be a positive finite value."
    };
  }
  return {
    status: "resolved", criterionType: configuration.criterionType, threshold: configuration.threshold, unit: configuration.unit,
    methodology: configuration.methodology, methodologyVersion: configuration.methodologyVersion, source: configuration.source,
    reason: "An approved explicit failure criterion is available.",
    criterion: { name: configuration.criterionType, threshold: configuration.threshold, unit: configuration.unit }
  };
}
