export type ReadinessStatus =
  | "ready"
  | "insufficient_history"
  | "data_source_not_connected"
  | "model_not_configured"
  | "backend_not_implemented"
  | "failure_criterion_not_configured";

export type CapabilityReadiness = {
  status: ReadinessStatus;
  ready: boolean;
  reason: string;
  requiredData: string[];
  availableData: string[];
};

export type AiUnavailableSource = "assessments" | "pipelines" | "devices" | "cp" | "ili";
export type AiReadinessSnapshot = {
  assessmentCount: number;
  pipelineCount: number;
  deviceRecordCount: number;
  cpReadingCount: number;
  comparableCpSeriesCount: number;
  iliSchemaAvailable: boolean;
  correlatedIliDefectCount: number;
  // Internal collection metadata; never added to the public readiness response.
  unavailableSources?: AiUnavailableSource[];
};

export type AiPredictionsReadiness = {
  overallStatus: "ready" | "blocked";
  readyCapabilities: number;
  blockedCapabilities: number;
  capabilities: Record<
    | "corrosionGrowthForecasting"
    | "remainingUsefulLife"
    | "cpDriftPrediction"
    | "scadaAnomalyDetection"
    | "defectPrediction"
    | "modelConfidence"
    | "predictionScan"
    | "retraining",
    CapabilityReadiness
  >;
};

function blocked(
  status: Exclude<ReadinessStatus, "ready">,
  reason: string,
  requiredData: string[],
  availableData: string[]
): CapabilityReadiness {
  return { status, ready: false, reason, requiredData, availableData };
}

const noModelReason = "No trained and evaluated prediction model is configured.";

export function evaluateAiPredictionsReadiness(snapshot: AiReadinessSnapshot): AiPredictionsReadiness {
  const unavailable = new Set(snapshot.unavailableSources);
  const assessmentAvailability = unavailable.has("assessments") ? ["Authoritative assessment storage unavailable; population not verified"] : snapshot.assessmentCount
    ? [`${snapshot.assessmentCount} stored assessment record${snapshot.assessmentCount === 1 ? "" : "s"} (deterministic assessment outputs, not model training data)`]
    : ["No stored assessment records"];
  const pipelineAvailability = unavailable.has("pipelines") ? ["Authoritative pipeline storage unavailable; population not verified"] : snapshot.pipelineCount
    ? [`${snapshot.pipelineCount} pipeline master record${snapshot.pipelineCount === 1 ? "" : "s"}`]
    : ["No pipeline master records"];
  const iliAvailability = snapshot.iliSchemaAvailable
    ? snapshot.correlatedIliDefectCount
      ? [`${snapshot.correlatedIliDefectCount} candidate ILI feature histories with repeated inspection dates; identity/measurement compatibility remains unverified`]
      : ["ILI storage is available, but no candidate feature has repeated inspection history"]
    : ["ILI inspection storage is unavailable"];
  const cpAvailability = unavailable.has("cp") ? ["Authoritative CP history unavailable; no measured population verified"] : snapshot.cpReadingCount
    ? [`${snapshot.cpReadingCount} timestamped CP reading${snapshot.cpReadingCount === 1 ? "" : "s"}`, `${snapshot.comparableCpSeriesCount} candidate CP history groups with at least 3 readings; model compatibility remains unverified`]
    : ["No timestamped CP readings"];
  const scadaAvailability = unavailable.has("devices") ? ["Authoritative device inventory unavailable; SCADA AI history integration remains unverified"] : snapshot.deviceRecordCount
    ? [`${snapshot.deviceRecordCount} stored device record${snapshot.deviceRecordCount === 1 ? "" : "s"} (latest state only; no telemetry history)`]
      : ["No eligible device inventory records; this does not establish whether native SCADA telemetry history exists"];

  const capabilities = {
    corrosionGrowthForecasting: blocked(
      !snapshot.iliSchemaAvailable ? "data_source_not_connected" : "insufficient_history",
      !snapshot.iliSchemaAvailable
        ? "ILI inspection storage is not available in the current database."
        : "The deterministic corrosion-growth endpoint requires two compatible depth measurements for one stable feature; the readiness aggregate cannot prove that full compatibility.",
      ["Repeated comparable ILI measurements for the same defect", "Validated defect correlation across inspection runs"],
      iliAvailability
    ),
    remainingUsefulLife: blocked(
      !snapshot.iliSchemaAvailable ? "data_source_not_connected" : snapshot.correlatedIliDefectCount ? "failure_criterion_not_configured" : "insufficient_history",
      !snapshot.iliSchemaAvailable
        ? "ILI inspection storage is not available in the current database."
        : snapshot.correlatedIliDefectCount
          ? "Comparable defect history may exist, but no approved persisted failure criterion is configured for deterministic RUL."
          : "Validated remaining-useful-life forecasting needs repeated comparable defect measurements; stored assessments alone do not provide this history.",
      ["Repeated comparable defect measurements", "Validated remaining-life methodology and failure criteria"],
      [...iliAvailability, ...assessmentAvailability]
    ),
    cpDriftPrediction: blocked(
      unavailable.has("cp") ? "data_source_not_connected" : snapshot.comparableCpSeriesCount ? "backend_not_implemented" : "insufficient_history",
      unavailable.has("cp") ? "Authoritative CP history storage is unavailable; no forecast or zero-valued population is substituted." : snapshot.comparableCpSeriesCount
        ? "Candidate CP reading history exists, but no approved compatibility check, CP drift prediction service or configured model exists."
        : "Timestamped CP monitoring history is unavailable.",
      ["At least three timestamped readings in a comparable CP series", "Configured CP drift methodology or model"],
      cpAvailability
    ),
    scadaAnomalyDetection: blocked(
      "data_source_not_connected",
      "Native SCADA history and anomalies are not connected to an approved AI model/run. Device inventory cannot establish prediction readiness.",
      ["Timestamped pressure, flow or temperature telemetry history", "Validated telemetry units and quality metadata", "Anomaly detection service"],
      scadaAvailability
    ),
    defectPrediction: blocked(
      "backend_not_implemented",
      "Defect Manager has no persisted defect prediction backend or cross-inspection correlation service.",
      ["Persisted defect records", "Cross-inspection defect correlation", "Prediction methodology"],
      [...iliAvailability, ...pipelineAvailability]
    ),
    modelConfidence: blocked(
      "model_not_configured",
      noModelReason,
      ["Trained model version", "Held-out evaluation dataset", "Recorded calibration and performance metrics"],
      ["No model registry or evaluation records"]
    ),
    predictionScan: blocked(
      "backend_not_implemented",
      "No prediction scan orchestration service is implemented.",
      ["Configured prediction model", "Eligible source data", "Prediction scan job service"],
      [...assessmentAvailability, "No prediction scan service"]
    ),
    retraining: blocked(
      "model_not_configured",
      "No trainable model, dataset pipeline or retraining job service is configured.",
      ["Trainable model definition", "Versioned training dataset", "Retraining and evaluation job service"],
      ["No trainable model or dataset pipeline"]
    )
  };

  const readyCapabilities = Object.values(capabilities).filter((capability) => capability.ready).length;
  return {
    overallStatus: readyCapabilities === Object.keys(capabilities).length ? "ready" : "blocked",
    readyCapabilities,
    blockedCapabilities: Object.keys(capabilities).length - readyCapabilities,
    capabilities
  };
}
